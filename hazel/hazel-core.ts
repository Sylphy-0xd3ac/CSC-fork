import loadModule, { importModule } from "./module-loader";
import EventEmitter2 from "eventemitter2";
import process from "node:process";
import path from "node:path";

export interface InitModule {
  name: string;
  priority?: number;
  dependencies?: string[];
  run: (...args: any[]) => any;
  filePath: string;
  loadHistory: string[];
}

export interface FunctionModule {
  name: string;
  run: (...args: any[]) => any;
  filePath: string;
  loadHistory: string[];
}

export default class Hazel extends EventEmitter2 {
  mainConfig: any;
  loadedFunctions: Map<string, FunctionModule>;
  loadedInits: Map<string, InitModule>;

  constructor(mainConfig: any) {
    super();
    this.mainConfig = mainConfig;
    this.loadedFunctions = new Map();
    this.loadedInits = new Map();

    process.on("unhandledRejection", (error) => {
      this.emit("error", error);
    });
  }

  #core: any = {};
  #hold: any = {};

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
    if (this.loadedInits.has(moduleName)) {
      return this.loadedInits.get(moduleName);
    } else if (this.loadedFunctions.has(moduleName)) {
      return this.loadedFunctions.get(moduleName);
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
    this.loadedFunctions.delete(moduleName);
    this.loadedFunctions.set(moduleName, module);
  }

  async reloadInit(moduleName: string) {
    let loadID = this.randomLoadID(); 
    let currentModule = await this.getModule(moduleName);
    let module = await importModule(currentModule.filePath, loadID);
    module.loadHistory = currentModule.loadHistory;
    module.loadHistory.push(loadID);
    module.filePath = currentModule.filePath;
    this.loadedInits.delete(moduleName);
    this.loadedInits.set(moduleName, module);
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
    this.loadedFunctions.delete(moduleName);
    this.loadedFunctions.set(module.name, module);
  }

  async reloadInitByID(moduleName: string, loadID: string) {
    let currentModule = await this.getModule(moduleName);
    let module = await importModule(currentModule.filePath, loadID);
    module.loadHistory = currentModule.loadHistory;
    module.loadHistory.push(loadID);
    module.filePath = currentModule.filePath;
    this.loadedInits.delete(moduleName);
    this.loadedInits.set(moduleName, module);
    module.run(this, this.#core, this.#hold).catch((error) => {
      this.emit("error", error);
      console.error(error);
    });
  }

  async runFunction(functionName, ...functionArgs) {
    if (!this.loadedFunctions.has(functionName)) {
      this.emit(
        "error",
        new Error("The function name '" + functionName + "' do not exist."),
      );
      console.error("The function name '" + functionName + "' do not exist.");
      return false;
    }

    let result;
    let targetFunction = this.loadedFunctions.get(functionName).run;
    try {
      result = await targetFunction(
        this,
        this.#core,
        this.#hold,
        ...functionArgs,
      );
    } catch (error) {
      this.emit("error", error);
      console.error(error);
      return false;
    }

    return result;
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
      path.join(this.mainConfig.baseDir, this.mainConfig.hazel.moduleDirs.initsDir),
      "init",
      this.randomLoadID,
    )) as { moduleList: any; existError: boolean };
    let { moduleList: loadedInits, existError: initsExistError } = result;
    if (!forceLoad && initsExistError) {
      return false;
    }

    this.loadedInits = new Map(loadedInits);

    this.removeAllListeners();
    this.on("error", () => {});

    for (let property in this.#core) {
      delete this.#core[property];
    }

    try {
      this.loadedInits.forEach((initFunction, modulePath) => {
        initFunction.run(this, this.#core, this.#hold).catch((error) => {
          this.emit("error", error);
          console.error(error);
          if (!forceLoad) {
            return false;
          }
        });
      });
    } catch (error) {
      this.emit("error", error);
      console.error(`Error running init function:`, error);
      if (!forceLoad) {
        return false;
      }
    }

    console.log(`√ Initialize inits ${this.loadedInits.size} complete!\n`);

    let { moduleList: loadedFunctions, existError: functionExistError } =
      (await loadModule(
        this,
        path.join(this.mainConfig.baseDir, this.mainConfig.hazel.moduleDirs.functionsDir),
        "function",
        this.randomLoadID,
      )) as { moduleList: any; existError: boolean };
    if (!forceLoad && functionExistError) {
      return false;
    }

    this.loadedFunctions = loadedFunctions;

    console.log(
      `√ Initialize functions ${this.loadedFunctions.size} complete!\n`,
    );

    return !(initsExistError || functionExistError);
  }
}
