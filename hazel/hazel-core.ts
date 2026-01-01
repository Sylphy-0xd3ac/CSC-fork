import path from "node:path";
import process from "node:process";
import EventEmitter2 from "eventemitter2";
import pkg from "fs-extra";
import supportsColor from "supports-color";

const { existsSync, mkdirSync, writeFileSync } = pkg;

import { Logger, type LoggerType, Time } from "./logger.js";
import loadModule, { importModule, randomLoadID } from "./module-loader.js";

export interface Module {
  name: string;
  priority?: number;
  dependencies?: string[];
  run: (...args: [Hazel, Data, Data]) => Promise<unknown>;
  filePath: string;
  loadHistory: string[];
}

export interface MainConfig {
  [key: string]: unknown;
  projectName: string;
  version: string;
  port: number;
  path: string;
  baseDir: string;
  DevMode: boolean;
  hazel: {
    modulesDir: string;
  };
  logDir: string;
  behindReverseProxy: boolean;
  wsHeartbeatInterval: number;
  wsCleanInterval: number;
  wsHeartbeatTimeout: number;
  appConfigDir: string;
  allowCIDRlistDir: string;
  denyCIDRlistDir: string;
  cidrPolicy: string;
  logLevel: number;
}
type Data = Record<string, unknown>;

export default class Hazel extends EventEmitter2 {
  mainConfig: MainConfig;
  loadedModules: Map<string, Module>;
  logger: LoggerType;

  constructor(mainConfig: MainConfig) {
    super();
    this.mainConfig = mainConfig;
    this.loadedModules = new Map();

    console.log(
      " _   _               _    ____               \n" +
        "| | | | __ _ _______| |  / ___|___  _ __ ___ \n" +
        "| |_| |/ _` |_  / _ \\ | | |   / _ \\| '__/ _ \\\n" +
        "|  _  | (_| |/ /  __/ | | |__| (_) | | |  __/\n" +
        "|_| |_|\\____/___\\___|_|  \\____\\___/|_|  \\___|",
    );
    console.log(`(v${this.version} ${this.mainConfig.DevMode ? "Dev" : "Prod"})\n`.padStart(46));

    this.initializeLogger();

    process.on("unhandledRejection", (error) => {
      this.emit("error", error);
    });

    process.on("SIGINT", () => {
      (new this.logger("app") as LoggerType).info("terminated by SIGINT");
      process.exit(0);
    });
    (new this.logger("app") as LoggerType).info(
      `\x1b[1m${this.mainConfig.projectName}\x1b[0m ${this.mainConfig.version}`,
    );
  }

  #core: Data = {};
  #hold: Data = {};

  version = "0.3.6";

  initializeLogger() {
    Logger.targets = [];
    Logger.targets.push({
      showTime: "yyyy-MM-dd hh:mm:ss.SSS",
      colors: supportsColor.stdout ? supportsColor.stdout.level : 0,
      print(_text) {
        /* ignore */
      },
    });
    Logger.targets.push({
      showTime: "yyyy-MM-dd hh:mm:ss.SSS",
      print: (text) => {
        if (!existsSync(this.mainConfig.logDir)) {
          mkdirSync(path.join(this.mainConfig.baseDir, this.mainConfig.logDir));
        }
        const textArray = text.split("\n");
        for (const splitText of textArray) {
          writeFileSync(
            `${this.mainConfig.logDir}/${Time.template("yyyy-MM-dd")}-log.txt`,
            `${splitText}\n`,
            { encoding: "utf-8", flag: "a" },
          );
        }
      },
    });
    this.logger = Logger as LoggerType;
  }

  async initialize(forceInit) {
    if (!(await this.loadModules(forceInit))) {
      process.exit();
    }
    this.emit("initialized");
  }

  getModule(moduleName: string) {
    return this.loadedModules.get(moduleName);
  }

  async reloadModule(moduleName: string) {
    const loadID = randomLoadID();
    const currentModule = await this.getModule(moduleName);
    const module = await importModule(currentModule.filePath, loadID);
    module.loadHistory = currentModule.loadHistory;
    module.loadHistory.push(loadID);
    module.filePath = currentModule.filePath;
    this.loadedModules.delete(moduleName);
    this.loadedModules.set(moduleName, module);
    module.run(this, this.#core, this.#hold).catch((error) => {
      this.emit("error", error);
      (new this.logger("app") as LoggerType).error(error);
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
      (new this.logger("app") as LoggerType).error(error);
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
    )) as { moduleList: Map<string, Module>; existError: boolean };
    const { moduleList: loadedModules, existError: modulesExistError } = result;
    if (!forceLoad && modulesExistError) {
      return false;
    }

    this.loadedModules = new Map(loadedModules);

    this.removeAllListeners();
    this.on("error", () => {
      /* ignore */
    });

    for (const property in this.#core) {
      if (Object.hasOwn(this.#core, property)) {
        delete this.#core[property];
      }
    }

    try {
      this.loadedModules.forEach((moduleFunction, _modulePath) => {
        moduleFunction.run(this, this.#core, this.#hold).catch((error) => {
          this.emit("error", error);
          (new this.logger("app") as LoggerType).error(error);
          if (!forceLoad) {
            return false;
          }
        });
      });
    } catch (error) {
      this.emit("error", error);
      (new this.logger("app") as LoggerType).error(`Error running module function: ${error}`);
      if (!forceLoad) {
        return false;
      }
    }

    return !modulesExistError;
  }
}
