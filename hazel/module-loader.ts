import { glob } from "node:fs";
import path from "node:path";
import supportsColor from "supports-color";
import type Hazel from "./hazel-core.js";
import type { Module } from "./hazel-core.js";
import { Logger, type LoggerType } from "./logger.js";

export async function recursiveReadDir(baseDir: string) {
  const matches: string[] = await new Promise((resolve) => {
    glob(path.join(baseDir, "**/*"), (_, files) => {
      resolve((files ?? []).filter((file) => !file.includes("node_modules")));
    });
  });
  return matches;
}

let logger: LoggerType;

export function randomLoadID() {
  return Math.random().toString(36).slice(4, 10);
}

export async function importModule(filePath: string, loadID: string) {
  const moduleName = path.basename(filePath, path.extname(filePath));
  const module = await import(`${filePath}?loadID=${loadID}`);
  logger.info(
    `apply module ${Logger.color({ colors: supportsColor.stdout ? supportsColor.stdout.level : 0 }, 45, `${moduleName}:${loadID}`)}`,
  );
  return Object.assign({}, module);
}

function topologicalSort(moduleMap: Map<string, Module>): Map<string, Module> {
  const sorted: Module[] = [];
  const state = new Uint8Array(moduleMap.size);
  const added = new Set<string>();

  const moduleNames = new Set<string>();
  const modules = [];
  for (const module of moduleMap.values()) {
    if (moduleNames.has(module.name)) {
      throw new Error(`Duplicate module name detected: ${module.name}`);
    }
    moduleNames.add(module.name);
    modules.push(module);
  }

  function dfs(moduleName: string, path: string[] = []): void {
    const moduleIndex = modules.findIndex((m) => m.name === moduleName);
    if (moduleIndex === -1) return;
    if (state[moduleIndex] === 1) {
      throw new Error("Circular dependency detected!");
    }
    const module = moduleMap.get(moduleName);
    const dependencies = module.dependencies || [];
    state[moduleIndex] = 1;
    path.push(moduleName);
    const sortedDependencies = dependencies.sort((a, b) => {
      const depA = moduleMap.get(a);
      const depB = moduleMap.get(b);
      if (!depA || !depB) return 0;
      const priorityA = depA.priority ?? Number.MAX_SAFE_INTEGER;
      const priorityB = depB.priority ?? Number.MAX_SAFE_INTEGER;
      return priorityA - priorityB;
    });
    for (const dependency of sortedDependencies) {
      const depModule = moduleMap.get(dependency);
      if (!depModule) {
        continue;
      }
      dfs(dependency, [...path]);
    }
    state[moduleIndex] = 2;
    if (!added.has(module.name)) {
      sorted.push(module);
      added.add(module.name);
    }
  }
  const sortedModules = [...modules].sort((a, b) => {
    const priorityA = a.priority ?? Number.MAX_SAFE_INTEGER;
    const priorityB = b.priority ?? Number.MAX_SAFE_INTEGER;
    return priorityA - priorityB;
  });
  for (const module of sortedModules) {
    const moduleIndex = modules.findIndex((m) => m.name === module.name);
    if (state[moduleIndex] === 2) continue;
    dfs(module.name);
  }
  if (sorted.length !== modules.length) {
    throw new Error("Module count mismatch after topological sort!");
  }

  return new Map(
    sorted.map((module) => {
      return [module.name, module];
    }),
  );
}

export default async function loadDir(hazel: Hazel, dirName: string) {
  let existError = false;
  let moduleList = new Map();
  logger = new hazel.logger("loader") as LoggerType;
  for (const filePath of await recursiveReadDir(dirName)) {
    if (
      await (async () => {
        return (
          !filePath.includes("/_") &&
          (filePath.endsWith(".js") ||
            filePath.endsWith(".mjs") ||
            filePath.endsWith(".cjs") ||
            filePath.endsWith(".ts"))
        );
      })()
    ) {
      const currentLoadID = randomLoadID();
      let currentModule: Module;
      try {
        currentModule = await importModule(filePath, currentLoadID);
      } catch (error) {
        hazel.emit("error", error);
        logger.error(`${error}`);
        existError = true;
        continue;
      }

      if (typeof currentModule.run !== "function") {
        hazel.emit("error", new Error(`${filePath} should export a function named "run".`));
        logger.error(`${filePath} should export a function named "run".`);
        existError = true;
        continue;
      }

      if (typeof currentModule.name !== "string") {
        hazel.emit("error", new Error(`${filePath} should export a string named "name".`));
        logger.error(`${filePath} should export a string named "name".`);
        existError = true;
        continue;
      }
      if (
        typeof currentModule.dependencies !== "undefined" &&
        !Array.isArray(currentModule.dependencies)
      ) {
        hazel.emit(
          "error",
          new Error(`${filePath} should export a string array named "dependencies".`),
        );
        logger.error(`${filePath} should export a string array named "dependencies".`);
        existError = true;
        continue;
      }

      moduleList.set(currentModule.name, currentModule);
      currentModule.filePath = filePath;
      currentModule.loadHistory = [currentLoadID];
    }
  }

  try {
    moduleList = topologicalSort(moduleList);
  } catch (error) {
    hazel.emit("error", error);
    logger.error(error);
    existError = true;
    throw error;
  }

  return { moduleList, existError };
}
