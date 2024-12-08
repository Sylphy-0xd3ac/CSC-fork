import loadModule, { importModule } from "./module-loader";
import EventEmitter2 from "node:events";
import process from "node:process";

export default class Hazel extends EventEmitter2 {
  mainConfig: any;
  loadedFunctions: Map<string, any>;

  constructor(mainConfig: any) {
    super();
    this.mainConfig = mainConfig;
    this.loadedFunctions = new Map();

    process.on("unhandledRejection", (error) => {
      this.emit("error", error);
    });
  }

  #core = {
    version: "0.3.6",
  };
  #hold = {};
  moduleDir: Map<string, string> = new Map();
  initLoadID = 0;
  functionLoadID = 0;
  moduleLoadID: Map<string, number> = new Map();

  async initialize(forceInit) {
    console.log("Initializing " + this.mainConfig.projectName + "...\n");

    if ((await this.loadModules(forceInit)) || forceInit) {
      const staticDirs = this.mainConfig.hazel.moduleDirs.staticDir.split(",");
      for (const staticDir of staticDirs) {
        await import("file:///" + this.mainConfig.baseDir + staticDir)
          .then((module) => {
            module.default(this, this.#core, this.#hold);
          })
          .catch((error) => {
            this.emit("error", error);
            console.error(error);
            if (!forceInit) {
              process.exit();
            }
          });
        console.log(`√ Static function ${staticDir} executed.`);
      }
    } else {
      process.exit();
    }
    this.emit("initialized");
    console.log(
      "\n==" + this.mainConfig.projectName + " Initialize Complete==\n",
    );
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

  async reloadModule(moduleDir: string) {
    if (this.moduleLoadID.get(moduleDir) == undefined) {
      this.moduleLoadID.set(moduleDir, ++this.functionLoadID);
    } else {
      this.moduleLoadID.set(moduleDir, this.moduleLoadID.get(moduleDir) + 1);
    }
    let module = await importModule(
      moduleDir,
      this.moduleLoadID.get(moduleDir),
    );
    this.loadedFunctions.set(module.name, module);
  }

  async reloadModuleByID(moduleDir: string, moduleID: number) {
    this.moduleLoadID.set(moduleDir, moduleID);
    let module = await importModule(moduleDir, moduleID);
    this.loadedFunctions.set(module.name, module);
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

  async loadModules(forceLoad: boolean) {
    let result = (await loadModule(
      this,
      this.mainConfig.baseDir + this.mainConfig.hazel.moduleDirs.initsDir,
      "init",
      ++this.initLoadID,
    )) as { moduleList: any; existError: boolean };
    let { moduleList: loadedInits, existError: initsExistError } = result;
    if (!forceLoad && initsExistError) {
      return false;
    }

    this.removeAllListeners();
    this.on("error", () => {});

    for (let property in this.#core) {
      delete this.#core[property];
    }

    loadedInits.forEach((initFunction) => {
      initFunction.run(this, this.#core, this.#hold).catch((error) => {
        this.emit("error", error);
        console.error(error);
        if (!forceLoad) {
          return false;
        }
      });
    });

    console.log(`√ Initialize inits ${loadedInits.length} complete!\n`);

    let { moduleList: loadedFunctions, existError: functionExistError } =
      (await loadModule(
        this,
        this.mainConfig.baseDir + this.mainConfig.hazel.moduleDirs.functionsDir,
        "function",
        ++this.functionLoadID,
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
