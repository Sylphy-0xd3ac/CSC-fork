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
    priority?: number;
    dependencies?: string[];
    run: Function;
    filePath: string;
}

function topologicalSort(modules: InitModule[]): InitModule[] {
    // Remove duplicate modules
    const uniqueModules = new Map<string, InitModule>();
    modules.forEach(module => {
        uniqueModules.set(module.name, module);
    });
    modules = Array.from(uniqueModules.values());

    const graph: { [key: string]: string[] } = {};
    const moduleMap: { [key: string]: InitModule } = {};
    const visited: { [key: string]: boolean } = {};
    const stack: { [key: string]: boolean } = {}; // 用于检测当前递归栈中的节点
    const sorted: InitModule[] = [];

    modules.forEach(module => {
        graph[module.name] = module.dependencies || [];
        moduleMap[module.name] = module;
        visited[module.name] = false;
        stack[module.name] = false;
    });

function detectCycle(moduleName: string, path: string[] = []): boolean {
        visited[moduleName] = true;
        stack[moduleName] = true;
    
        const dependencies = graph[moduleName];
        for (const dependency of dependencies) {
            if (!visited[dependency]) {
                const newPath = [...path, moduleName];
                if (detectCycle(dependency, newPath)) {
                    return true;
                }
            } else if (stack[dependency]) {
                const cyclePath = [...path, moduleName, dependency];
                console.error(`Circular dependency detected: ${cyclePath.join(" -> ")}`);
                return true;
            }
        }
    
        stack[moduleName] = false;
        return false;
    }

    for (const module of modules) {
        if (!visited[module.name]) {
            if (detectCycle(module.name)) {
                throw new Error("Circular dependency detected!");
            }
        }
    }

    // Kahn's Algorithm for Topological Sorting (if no cycle is detected)
    const inDegree: { [key: string]: number } = {};
    modules.forEach(module => {
        inDegree[module.name] = 0;
    });

    modules.forEach(module => {
        module.dependencies?.forEach(dependency => {
            if (moduleMap[dependency]) {
                inDegree[dependency]++;
            } else {
                console.warn(`Dependency "${dependency}" of module "${module.name}" not found.`);
            }
        });
    });

    const queue: string[] = [];
    modules.forEach(module => {
        if (inDegree[module.name] === 0) {
            queue.push(module.name);
        }
    });

    let count = 0;
    while (queue.length > 0) {
        const moduleName = queue.shift();
        const module = moduleMap[moduleName];
        sorted.push(module);

        graph[moduleName].forEach(dependency => {
            if (moduleMap[dependency]) {
                inDegree[dependency]--;
                if (inDegree[dependency] === 0) {
                    queue.push(dependency);
                }
            }
        });
        count++;
    }

    if (count !== modules.length) {
        console.error("Circular dependency detected (Kahn's algorithm)!");
        modules.forEach(module => {
            console.log(`Module: ${module.name}, Dependencies: ${module.dependencies}`);
        });
        throw new Error("Circular dependency detected (Kahn's algorithm)!");
    }

    // Sort by dependency count (least dependencies first)
    sorted.sort((a, b) => (a.dependencies?.length || 0) - (b.dependencies?.length || 0));

    // Then sort by priority (highest priority first)
    sorted.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    return sorted;
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
