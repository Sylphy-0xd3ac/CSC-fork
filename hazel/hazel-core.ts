import loadModule, { importModule } from "./module-loader.js";
import EventEmitter2 from "node:events";
import process from "node:process";

export default class Hazel extends EventEmitter2 {
  mainConfig: any;
  loadedFunctions: Map<string, any>;
  loadedInits: any[];
  moduleDir: Map<string, string>;
  loadHistory: Map<string, string[]>;
  loadedStatics: any[];

  constructor(mainConfig: any) {
    super();
    this.mainConfig = mainConfig;
    this.loadedFunctions = new Map();
    this.loadedInits = [];
    this.loadedStatics = [];
    this.moduleDir = new Map();
    this.loadHistory = new Map();

    process.on("unhandledRejection", (error) => {
      this.emit("error", error);
    });
  }

  #core = {
    version: "0.3.6",
  };
  #hold = {};

  async randomLoadID() {
    return Math.random().toString(36).slice(4, 10);
  }

  async initialize(forceInit) {
    console.log("Initializing " + this.mainConfig.projectName + "...\n");

    if (!(await this.loadModules(forceInit)) || forceInit) {
      process.exit();
    }
    this.emit("initialized");
    console.log(
      "==" + this.mainConfig.projectName + " Initialize Complete==\n",
    );
  }

  async getModulePath(moduleName: string) {
    return this.moduleDir.get(moduleName);
  }

  async reloadModule(modulePath: string) {
    let loadID = await this.randomLoadID();
    const history = this.loadHistory.get(modulePath) || [];
    history.push(loadID);
    this.loadHistory.set(modulePath, history);
    let module = await importModule(modulePath, loadID);
    this.loadedFunctions.set(module.name, module);
  }

  async reloadInit(modulePath: string) {
    let loadID = await this.randomLoadID();
    const history = this.loadHistory.get(modulePath) || [];
    history.push(loadID);
    this.loadHistory.set(modulePath, history);
    let module = await importModule(modulePath, loadID);
    delete this.loadedInits[this.loadedInits.indexOf(module)];
    this.loadedInits.push(module);
    this.loadedInits.forEach((initFunction) => {
      initFunction.run(this, this.#core, this.#hold).catch((error) => {
        this.emit("error", error);
        console.error(error);
      });
    });
  }

  async reloadModuleByID(modulePath: string, loadID: string) {
    const history = this.loadHistory.get(modulePath) || [];
    history.push(loadID);
    this.loadHistory.set(modulePath, history);
    let module = await importModule(modulePath, loadID);
    this.loadedFunctions.set(module.name, module);
  }

  async reloadInitByID(modulePath: string, loadID: string) {
    const history = this.loadHistory.get(modulePath) || [];
    history.push(loadID);
    this.loadHistory.set(modulePath, history);
    let module = await importModule(modulePath, loadID);
    delete this.loadedInits[this.loadedInits.indexOf(module)];
    this.loadedInits.push(module);
    this.loadedInits.forEach((initFunction) => {
      initFunction.run(this, this.#core, this.#hold).catch((error) => {
        this.emit("error", error);
        console.error(error);
      });
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
      this.mainConfig.baseDir + this.mainConfig.hazel.moduleDirs.initsDir,
      "init",
      await this.randomLoadID,
    )) as { moduleList: any; existError: boolean };
    let { moduleList: loadedInits, existError: initsExistError } = result;
    if (!forceLoad && initsExistError) {
      return false;
    }

    this.loadedInits = loadedInits;

    this.removeAllListeners();
    this.on("error", () => {});

    for (let property in this.#core) {
      delete this.#core[property];
    }

    this.loadedInits.forEach((initFunction) => {
      initFunction.run(this, this.#core, this.#hold).catch((error) => {
        this.emit("error", error);
        console.error(error);
        if (!forceLoad) {
          return false;
        }
      });
    });

    console.log(`√ Initialize inits ${this.loadedInits.length} complete!\n`);

    let { moduleList: loadedFunctions, existError: functionExistError } =
      (await loadModule(
        this,
        this.mainConfig.baseDir + this.mainConfig.hazel.moduleDirs.functionsDir,
        "function",
        await this.randomLoadID,
      )) as { moduleList: any; existError: boolean };
    if (!forceLoad && functionExistError) {
      return false;
    }

    this.loadedFunctions = loadedFunctions;

    console.log(
      `√ Initialize functions ${this.loadedFunctions.size} complete!\n`,
    );

    let staticsDir = this.mainConfig.hazel.moduleDirs.staticsDir.split(",");

    let { moduleList: loadedStatics, existError: staticExistError } =
      (await loadModule(
        this,
        this.mainConfig.baseDir + staticsDir,
        "static",
        await this.randomLoadID,
      )) as { moduleList: any; existError: boolean };
    if (!forceLoad && staticExistError) {
      return false;
    }

    this.loadedStatics = loadedStatics;

    this.loadedStatics.forEach((staticFunction) => {
      staticFunction.run(this, this.#core, this.#hold).catch((error) => {
        this.emit("error", error);
        console.error(error);
        if (!forceLoad) {
          return false;
        }
      });
    });

    console.log(
      `√ Initialize statics ${this.loadedStatics.length} complete!\n`,
    );

    return !(initsExistError || functionExistError || staticExistError);
  }
}
