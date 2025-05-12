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

interface InitModule {
    name: string;
    dependencies: string[];
    run: (...args: any[]) => any;
    filePath: string;
}

function topologicalSort(modules: InitModule[]): InitModule[] {
    const moduleMap = new Map<string, InitModule>();
    const sorted: Set<InitModule> = new Set();
    const state = new Uint8Array(modules.length); 

    modules.forEach((module, index) => {
        moduleMap.set(module.name, module);
    });

    function dfs(moduleName: string, path: string[] = []): void {
        const moduleIndex = modules.findIndex(m => m.name === moduleName);
        if (moduleIndex === -1) return;

        if (state[moduleIndex] === 1) {
            console.error(`Circular dependency detected: ${[...path, moduleName].join(" -> ")}`);
            throw new Error("Circular dependency detected!");
        }

        const module = moduleMap.get(moduleName)!;
        const dependencies = module.dependencies;

        state[moduleIndex] = 1;
        path.push(moduleName);

        for (const dependency of dependencies) {
            const depModule = moduleMap.get(dependency);
            if (!depModule) {
                console.warn(`Dependency "${dependency}" of module "${module.name}" not found.`);
                continue;
            }
            dfs(dependency, [...path]);
        }

        state[moduleIndex] = 2;
        sorted.add(module);
    }

    for (const module of modules) {
        const moduleIndex = modules.findIndex(m => m.name === module.name);
        if (state[moduleIndex] === 2) continue;  
        dfs(module.name);
    }

    if (sorted.size !== modules.length) {
        console.error("Duplicate module names detected!");
        throw new Error("Duplicate module names detected!");
    }

    return Array.from(sorted);
}

export default async function loadDir(
    hazel: any,
    dirName: string,
    loadType: string,
    loadID: (...args: any[]) => string,
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
                loadType === "init"
            ) {
                if (typeof currentModule.name != "string") {
                    hazel.emit(
                        "error",
                        new Error(
                            filePath +
                            ' should export a string named "name".',
                        ),
                    );
                    console.error(
                        filePath +
                        ' should export a string named "name".',
                    );
                    existError = true;
                    continue;
                }
                if (typeof currentModule.dependencies !== 'undefined' && !Array.isArray(currentModule.dependencies)) {
                    hazel.emit(
                        "error",
                        new Error(
                            filePath +
                            ' should export a string array named "dependencies".',
                        ));
                    console.error(
                        filePath +
                        ' should export a string array named "dependencies".',
                    );
                    existError = true;
                    continue;
                }
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
        try {
            moduleList = topologicalSort(moduleList);
        } catch (error) {
            hazel.emit("error", error);
            existError = true;
            throw error;
        }
    }

    return { moduleList, existError };
}
