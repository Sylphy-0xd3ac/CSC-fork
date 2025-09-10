import path from "node:path";
import process from "node:process";
import EventEmitter2 from "eventemitter2";
import pkg from "fs-extra";
import supportsColor from "supports-color";

const { existsSync, mkdirSync, writeFileSync } = pkg;

import { Logger, Time } from "./logger.js";
import loadModule, { importModule } from "./module-loader.js";

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
  logger: any;

  constructor(mainConfig: any) {
    super();
    this.mainConfig = mainConfig;
    this.loadedModules = new Map();

    this.initializeLogger();

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
    console.log(`(v${this.version} ${this.mainConfig.DevMode ? "Dev" : "Prod"})\n`.padStart(46));
    new this.logger("app").info(
      `\x1b[1m${this.mainConfig.projectName}\x1b[0m ${this.mainConfig.version}`,
    );
  }

  #core: any = {};
  #hold: any = {};

  version = "0.3.6";

  randomLoadID() {
    return Math.random().toString(36).slice(4, 10);
  }

  initializeLogger() {
    Logger.targets = [];
    Logger.targets.push({
      showTime: "yyyy-MM-dd hh:mm:ss.SSS",
      colors: supportsColor.stdout ? supportsColor.stdout.level : 0,
      print(text) {
        console.log(`${text}`);
      },
    });
    Logger.targets.push({
      showTime: "yyyy-MM-dd hh:mm:ss.SSS",
      print: (text) => {
        if (!existsSync(this.mainConfig.logDir)) {
          mkdirSync(path.join(this.mainConfig.baseDir, this.mainConfig.logDir));
        }
        const textArray = text.split("\n");
        textArray.forEach((splitText) => {
          writeFileSync(
            `${this.mainConfig.logDir}/${Time.template("yyyy-MM-dd")}-log.txt`,
            `${splitText}\n`,
            { encoding: "utf-8", flag: "a" },
          );
        });
      },
    });
    this.logger = Logger;
  }

  async initialize(forceInit) {
    if (!(await this.loadModules(forceInit))) {
      process.exit();
    }
    this.emit("initialized");
  }

  async getModule(moduleName: string) {
    if (this.loadedModules.has(moduleName)) {
      return this.loadedModules.get(moduleName);
    }
    return null;
  }

  async reloadModule(moduleName: string) {
    const loadID = this.randomLoadID();
    const currentModule = await this.getModule(moduleName);
    const module = await importModule(currentModule.filePath, loadID);
    module.loadHistory = currentModule.loadHistory;
    module.loadHistory.push(loadID);
    module.filePath = currentModule.filePath;
    this.loadedModules.delete(moduleName);
    this.loadedModules.set(moduleName, module);
    module.run(this, this.#core, this.#hold).catch((error) => {
      this.emit("error", error);
      new this.logger("app").error(error);
    });
  }

  async reloadModuleByID(moduleName: string, loadID: string) {
    const currentModule = await this.getModule(moduleName);
    const module = await importModule(currentModule.filePath, loadID);
    module.loadHistory = currentModule.loadHistory;
    module.loadHistory.push(loadID);
    module.filePath = currentModule.filePath;
    this.loadedModules.delete(moduleName);
    this.loadedModules.set(moduleName, module);
    module.run(this, this.#core, this.#hold).catch((error) => {
      this.emit("error", error);
      new this.logger("app").error(error);
    });
  }

  async reloadModules(forceReload) {
    this.emit("reload-start");
    if (!forceReload && (await this.loadModules(forceReload || false)) === false) {
      return false;
    }
    this.emit("reload-complete");
    return true;
  }

  async loadModules(forceLoad: boolean) {
    const result = (await loadModule(
      this,
      path.join(this.mainConfig.baseDir, this.mainConfig.hazel.modulesDir),
      this.randomLoadID,
    )) as { moduleList: any; existError: boolean };
    const { moduleList: loadedModules, existError: modulesExistError } = result;
    if (!forceLoad && modulesExistError) {
      return false;
    }

    this.loadedModules = new Map(loadedModules);

    this.removeAllListeners();
    this.on("error", () => {});

    for (const property in this.#core) {
      delete this.#core[property];
    }

    try {
      this.loadedModules.forEach((moduleFunction, _modulePath) => {
        moduleFunction.run(this, this.#core, this.#hold).catch((error) => {
          this.emit("error", error);
          new this.logger("app").error(error);
          if (!forceLoad) {
            return false;
          }
        });
      });
    } catch (error) {
      this.emit("error", error);
      new this.logger("app").error(`Error running module function: ${error}`);
      if (!forceLoad) {
        return false;
      }
    }

    return !modulesExistError;
  }
}
