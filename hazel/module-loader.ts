import recursiveReadDir from "./recursive-readdir";
import { pathToFileURL } from "node:url";

const cache: Record<string, any> = {};

export async function importModule(modulePath: string) {
  if (cache[modulePath]) {
    delete cache[modulePath];
  }

  const module = await import(`${modulePath}?ts=${Date.now()}`);
  cache[modulePath] = module;
  return module;
}

export default async function loadDir(
  hazel: any,
  dirName: string,
  loadType: string,
) {
  let existError = false;

  let moduleList;
  if (loadType === "function") {
    moduleList = new Map();
  } else if (loadType === "init") {
    moduleList = [];
  }

  for (const filePath of recursiveReadDir(dirName)) {
    if (
      (!filePath.includes("/_") &&
        (filePath.endsWith(".js") ||
          filePath.endsWith(".mjs") ||
          filePath.endsWith(".ts"))) ||
      filePath.endsWith(".cjs")
    ) {
      //if (!filePath.includes('/_') && (filePath.endsWith('.ts'))) {
      console.log("* Initializing " + filePath + " ...");
      let currentModule;
      try {
        currentModule = await importModule(pathToFileURL(filePath).toString());
      } catch (error) {
        hazel.emit("error", error);
        console.error(error);
        existError = true;
        continue;
      }

      if (typeof currentModule.run != "function") {
        hazel.emit(
          "error",
          new Error(filePath + ' should export a function named "run".'),
        );
        console.error(filePath + ' should export a function named "run".');
        existError = true;
        continue;
      }

      if (loadType === "function" && typeof currentModule.name != "string") {
        hazel.emit(
          "error",
          new Error(
            filePath +
              ' should export a string named "name" as the function name.',
          ),
        );
        console.error(
          filePath +
            ' should export a string named "name" as the function name.',
        );
        existError = true;
        continue;
      } else if (
        loadType === "init" &&
        typeof currentModule.priority != "number"
      ) {
        hazel.emit(
          "error",
          new Error(
            filePath +
              ' should export a number named "priority" to declare the priority of the module.',
          ),
        );
        console.error(
          filePath +
            ' should export a number named "priority" to declare the priority of the module.',
        );
        existError = true;
        continue;
      }

      if (loadType === "function") {
        moduleList.set(currentModule.name, currentModule);
      } else if (loadType === "init") {
        moduleList.push(currentModule);
      }
    }
  }

  if (loadType === "init") {
    moduleList.sort((first, last) => first.priority - last.priority);
  }

  return { moduleList, existError };
}
