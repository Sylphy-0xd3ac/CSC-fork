import { sync } from "glob";
import path from "node:path";

export function recursiveReadDir(baseDir) {
  return sync(path.join(baseDir, "**/*"), {
    ignore: ["node_modules/**", "dist/**"],
  });
}

export async function importModule(filePath: string, loadID: string) {
  const module = await import(`${filePath}?loadID=${loadID}`);
  return Object.assign({}, module);
}

export default async function loadDir(
  hazel: any,
  dirName: string,
  loadType: string,
  loadID: () => string,
) {
  let existError = false;

  let moduleList;
  if (loadType === "function") {
    moduleList = new Map();
  } else if (loadType === "init" || loadType === "static") {
    moduleList = [];
  }

  for (const filePath of recursiveReadDir(dirName)) {
    if (
      await (async () => {
        if (hazel.mainConfig.runOnTS)
          return !filePath.includes("/_") && filePath.endsWith(".ts");
        else
          return (
            !filePath.includes("/_") &&
            (filePath.endsWith(".js") ||
              filePath.endsWith(".mjs") ||
              filePath.endsWith(".cjs"))
          );
      })()
    ) {
      //if (!filePath.includes('/_') && (filePath.endsWith('.ts'))) {
      console.log("* Initializing " + filePath + " ...");
      let currentModule;
      try {
        currentModule = await importModule(filePath, loadID());
      } catch (error) {
        hazel.emit("error", error);
        console.error(error);
        existError = true;
        continue;
      }

      if (typeof currentModule.run !== "function") {
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
        currentModule.filePath = filePath;
        const history = hazel.loadHistory.get(filePath) || [];
        history.push(await hazel.randomLoadID());
        hazel.loadHistory.set(filePath, history);
        hazel.moduleMap.set(currentModule.name, currentModule);
      } else if (loadType === "init") {
        moduleList.push(currentModule);
        currentModule.filePath = filePath;
        const history = hazel.loadHistory.get(filePath) || [];
        history.push(await hazel.randomLoadID());
        hazel.loadHistory.set(filePath, history);
        hazel.moduleMap.set(
          path.basename(filePath, path.extname(filePath)),
          currentModule,
        );
      } else if (loadType === "static") {
        moduleList.push(currentModule);
        currentModule.filePath = filePath;
        hazel.moduleMap.set(
          path.basename(filePath, path.extname(filePath)),
          currentModule,
        );
      }
    }
  }

  if (loadType === "init") {
    moduleList.sort((first, last) => last.priority - first.priority);
  }

  return { moduleList, existError };
}
