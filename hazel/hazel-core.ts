import loadModule, { importModule } from "./module-loader.js";
import EventEmitter2 from "eventemitter2";
import process from "node:process";
import path from "node:path";

export interface Module {
  name: string;
  priority?: number;
  dependencies?: string[];
  run: (...args: any[]) => any;
  filePath: string;
  loadHistory: string[];
}

export default class Hazel extends EventEmitter2 {
  mainConfig: any;
  loadedModules: Map<string, Module>;

  constructor(mainConfig: any) {
    super();
    this.mainConfig = mainConfig;
    this.loadedModules = new Map();

    process.on("unhandledRejection", (error) => {
      this.emit("error", error);
    });

    console.log(
      " _   _               _    ____               \n" +
        "| | | | __ _ _______| |  / ___|___  _ __ ___ \n" +
        "| |_| |/ _` |_  / _ \\ | | |   / _ \\| '__/ _ \\\n" +
        "|  _  | (_| |/ /  __/ | | |__| (_) | | |  __/\n" +
        "|_| |_|\\____/___\\___|_|  \\____\\___/|_|  \\___|",
    );
    console.log(
      `(v${this.version} ${this.mainConfig.DevMode ? "Dev" : "Prod"})\n`.padStart(
        46,
      ),
    );
  }

  #core: any = {};
  #hold: any = {};

  version: string = "0.3.6";

  randomLoadID() {
    return Math.random().toString(36).slice(4, 10);
  }

  async initialize(forceInit) {
    console.log("Initializing " + this.mainConfig.projectName + "...\n");
    if (!(await this.loadModules(forceInit))) {
      process.exit();
    }
    this.emit("initialized");
    console.log(
      "==" + this.mainConfig.projectName + " Initialize Complete==\n",
    );
  }

  async getModule(moduleName: string) {
    if (this.loadedModules.has(moduleName)) {
      return this.loadedModules.get(moduleName);
    } else {
      return null;
    }
  }

  async reloadModule(moduleName: string) {
    let loadID = this.randomLoadID();
    let currentModule = await this.getModule(moduleName);
    let module = await importModule(currentModule.filePath, loadID);
    module.loadHistory = currentModule.loadHistory;
    module.loadHistory.push(loadID);
    module.filePath = currentModule.filePath;
    this.loadedModules.delete(moduleName);
    this.loadedModules.set(moduleName, module);
    module.run(this, this.#core, this.#hold).catch((error) => {
      this.emit("error", error);
      console.error(error);
    });
  }

  async reloadModuleByID(moduleName: string, loadID: string) {
    let currentModule = await this.getModule(moduleName);
    let module = await importModule(currentModule.filePath, loadID);
    module.loadHistory = currentModule.loadHistory;
    module.loadHistory.push(loadID);
    module.filePath = currentModule.filePath;
    this.loadedModules.delete(moduleName);
    this.loadedModules.set(moduleName, module);
    module.run(this, this.#core, this.#hold).catch((error) => {
      this.emit("error", error);
      console.error(error);
    });
  }

  async reloadModules(forceReload) {
    this.emit("reload-start");
    if (
      !forceReload &&
      (await this.loadModules(forceReload || false)) == false
    ) {
      return false;
    }
    this.emit("reload-complete");
    return true;
  }

  async loadModules(forceLoad: boolean) {
    let result = (await loadModule(
      this,
      path.join(this.mainConfig.baseDir, this.mainConfig.hazel.modulesDir),
      this.randomLoadID,
    )) as { moduleList: any; existError: boolean };
    let { moduleList: loadedModules, existError: modulesExistError } = result;
    if (!forceLoad && modulesExistError) {
      return false;
    }

    this.loadedModules = new Map(loadedModules);

    this.removeAllListeners();
    this.on("error", () => {});

    for (let property in this.#core) {
      delete this.#core[property];
    }

    try {
      this.loadedModules.forEach((moduleFunction, modulePath) => {
        moduleFunction.run(this, this.#core, this.#hold).catch((error) => {
          this.emit("error", error);
          console.error(error);
          if (!forceLoad) {
            return false;
          }
        });
      });
    } catch (error) {
      this.emit("error", error);
      console.error(`Error running module function:`, error);
      if (!forceLoad) {
        return false;
      }
    }

    console.log(`√ Initialize modules ${this.loadedModules.size} complete!\n`);

    return !modulesExistError;
  }
}
