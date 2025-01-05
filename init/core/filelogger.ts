import { existsSync, mkdirSync, writeFileSync } from "node:fs";

export class Time {
  static readonly millisecond = 1;
  static readonly second = 1000;
  static readonly minute = Time.second * 60;
  static readonly hour = Time.minute * 60;
  static readonly day = Time.hour * 24;
  static readonly week = Time.day * 7;

  private static timezoneOffset = new Date().getTimezoneOffset();

  static setTimezoneOffset(offset: number) {
    this.timezoneOffset = offset;
  }

  static getTimezoneOffset() {
    return this.timezoneOffset;
  }

  static getDateNumber(date: number | Date = new Date(), offset?: number) {
    if (typeof date === "number") date = new Date(date);
    if (offset === undefined) offset = this.timezoneOffset;
    return Math.floor((date.valueOf() / this.minute - offset) / 1440);
  }

  static fromDateNumber(value: number, offset?: number) {
    const date = new Date(value * this.day);
    if (offset === undefined) offset = this.timezoneOffset;
    return new Date(+date + offset * this.minute);
  }

  private static numeric = /\d+(?:\.\d+)?/.source;
  private static timeRegExp = new RegExp(
    `^${[
      "w(?:eek(?:s)?)?",
      "d(?:ay(?:s)?)?",
      "h(?:our(?:s)?)?",
      "m(?:in(?:ute)?(?:s)?)?",
      "s(?:ec(?:ond)?(?:s)?)?",
    ]
      .map((unit) => `(${this.numeric}${unit})?`)
      .join("")}$`,
  );

  static parseTime(source: string) {
    const capture = this.timeRegExp.exec(source);
    if (!capture) return 0;
    return (
      (parseFloat(capture[1]) * this.week || 0) +
      (parseFloat(capture[2]) * this.day || 0) +
      (parseFloat(capture[3]) * this.hour || 0) +
      (parseFloat(capture[4]) * this.minute || 0) +
      (parseFloat(capture[5]) * this.second || 0)
    );
  }

  static parseDate(date: string) {
    const parsed = this.parseTime(date);
    if (parsed) {
      date = (Date.now() + parsed) as any;
    } else if (/^\d{1,2}(:\d{1,2}){1,2}$/.test(date)) {
      date = `${new Date().toLocaleDateString()}-${date}`;
    } else if (/^\d{1,2}-\d{1,2}-\d{1,2}(:\d{1,2}){1,2}$/.test(date)) {
      date = `${new Date().getFullYear()}-${date}`;
    }
    return date ? new Date(date) : new Date();
  }

  static format(ms: number) {
    const abs = Math.abs(ms);
    if (abs >= this.day - this.hour / 2) {
      return Math.round(ms / this.day) + "d";
    } else if (abs >= this.hour - this.minute / 2) {
      return Math.round(ms / this.hour) + "h";
    } else if (abs >= this.minute - this.second / 2) {
      return Math.round(ms / this.minute) + "m";
    } else if (abs >= this.second) {
      return Math.round(ms / this.second) + "s";
    }
    return ms + "ms";
  }

  static toDigits(source: number, length = 2) {
    return source.toString().padStart(length, "0");
  }

  static template(template: string, time = new Date()) {
    return template
      .replace("yyyy", time.getFullYear().toString())
      .replace("yy", time.getFullYear().toString().slice(2))
      .replace("MM", this.toDigits(time.getMonth() + 1))
      .replace("dd", this.toDigits(time.getDate()))
      .replace("hh", this.toDigits(time.getHours()))
      .replace("mm", this.toDigits(time.getMinutes()))
      .replace("ss", this.toDigits(time.getSeconds()))
      .replace("SSS", this.toDigits(time.getMilliseconds(), 3));
  }
}

const c16 = [6, 2, 3, 4, 5, 1];
const c256 = [
  20, 21, 26, 27, 32, 33, 38, 39, 40, 41, 42, 43, 44, 45, 56, 57, 62, 63, 68,
  69, 74, 75, 76, 77, 78, 79, 80, 81, 92, 93, 98, 99, 112, 113, 129, 134, 135,
  148, 149, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172,
  173, 178, 179, 184, 185, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205,
  206, 207, 208, 209, 214, 215, 220, 221,
];

export interface LevelConfig {
  base: number;
  [K: string]: Level;
}

export type Level = number | LevelConfig;
export type LogFunction = (format: any, ...param: any[]) => void;
export type LogType = "success" | "error" | "info" | "warn" | "debug";
export type Formatter = (value: any, target: Target, logger: Logger) => any;

export interface LabelStyle {
  width?: number;
  margin?: number;
  align?: "left" | "right";
}

export interface Record {
  id: number;
  meta: any;
  name: string;
  type: LogType;
  level: number;
  content: string;
  timestamp: number;
}

export interface Target {
  /**
   * - 0: no color support
   * - 1: 16 color support
   * - 2: 256 color support
   * - 3: truecolor support
   */
  colors?: false | number;
  showDiff?: boolean;
  showTime?: string;
  label?: LabelStyle;
  maxLength?: number;
  record?(record: Record): void;
  print?(text: string): void;
  levels?: LevelConfig;
  timestamp?: number;
}

function isAggregateError(error: any): error is Error & { errors: Error[] } {
  return error instanceof Error && Array.isArray((error as any)["errors"]);
}

export class Logger {
  constructor(
    public name: string,
    public meta?: any,
  ) {
    this.createMethod("success", Logger.SUCCESS);
    this.createMethod("error", Logger.ERROR);
    this.createMethod("info", Logger.INFO);
    this.createMethod("warn", Logger.WARN);
    this.createMethod("debug", Logger.DEBUG);
  }

  static readonly SILENT = 0;
  static readonly SUCCESS = 1;
  static readonly ERROR = 1;
  static readonly INFO = 2;
  static readonly WARN = 2;
  static readonly DEBUG = 3;

  // Global configuration
  static id = 0;
  static targets: Target[] = [];
  static formatters = Object.create(null);

  static levels: LevelConfig = {
    base: 2,
  };

  static format(name: string, formatter: Formatter) {
    this.formatters[name] = formatter;
  }

  static color(target: Target, code: number, value: any, decoration = "") {
    if (!target.colors) return "" + value;
    return `\u001b[3${code < 8 ? code : "8;5;" + code}${target.colors >= 2 ? decoration : ""}m${value}\u001b[0m`;
  }

  static code(name: string, target: Target) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash << 3) - hash + name.charCodeAt(i) + 13;
      hash |= 0;
    }
    const colors = !target.colors ? [] : target.colors >= 2 ? c256 : c16;
    return colors[Math.abs(hash) % colors.length];
  }

  static render(target: Target, record: Record) {
    const prefix = `[${record.type[0].toUpperCase()}]`;
    const space = " ".repeat(target.label?.margin ?? 1);
    let indent = 3 + space.length,
      output = "";
    if (target.showTime) {
      indent += target.showTime.length + space.length;
      output += Logger.color(target, 8, Time.template(target.showTime)) + space;
    }
    const code = Logger.code(record.name, target);
    const label = Logger.color(target, code, record.name, ";1");
    const padLength =
      (target.label?.width ?? 0) + label.length - record.name.length;
    if (target.label?.align === "right") {
      output += label.padStart(padLength) + space + prefix + space;
      indent += (target.label.width ?? 0) + space.length;
    } else {
      output += prefix + space + label.padEnd(padLength) + space;
    }
    output += record.content.replace(/\n/g, "\n" + " ".repeat(indent));
    if (target.showDiff && target.timestamp) {
      const diff = record.timestamp - target.timestamp;
      output += Logger.color(target, code, " +" + diff);
    }
    return output;
  }

  extend(namespace: string) {
    return new Logger(`${this.name}:${namespace}`, this.meta);
  }

  createMethod(type: LogType, level: number) {
    this[type] = (...args) => {
      if (args.length === 1 && args[0] instanceof Error) {
        if (args[0].cause) {
          this[type](args[0].cause);
        } else if (isAggregateError(args[0])) {
          args[0].errors.forEach((error) => this[type](error));
          return;
        }
      }
      const id = ++Logger.id;
      const timestamp = Date.now();
      for (const target of Logger.targets) {
        if (this.getLevel(target) < level) continue;
        const content = this.format(target, ...args);
        const record: Record = {
          id,
          type,
          level,
          name: this.name,
          meta: this.meta,
          content,
          timestamp,
        };
        if (target.record) {
          target.record(record);
        } else if (target.print) {
          target.print(Logger.render(target, record));
        }
        target.timestamp = timestamp;
      }
    };
  }

  private format(target: Target, ...args: any[]) {
    if (args[0] instanceof Error) {
      args[0] = args[0].stack || args[0].message;
      args.unshift("%s");
    } else if (typeof args[0] !== "string") {
      args.unshift("%o");
    }

    let format: string = args.shift();
    format = format.replace(/%([a-zA-Z%])/g, (match, char) => {
      if (match === "%%") return "%";
      const formatter = Logger.formatters[char];
      if (typeof formatter === "function") {
        const value = args.shift();
        return formatter(value, target, this);
      }
      return match;
    });

    const { maxLength = 10240 } = target;
    return format
      .split(/\r?\n/g)
      .map(
        (line) =>
          line.slice(0, maxLength) + (line.length > maxLength ? "..." : ""),
      )
      .join("\n");
  }

  getLevel(target?: Target) {
    const paths = this.name.split(":");
    let config: Level = target?.levels || Logger.levels;
    do {
      config = config[paths.shift()!] ?? config["base"];
    } while (paths.length && typeof config === "object");
    return config as number;
  }
}

Logger.format("s", (value) => value);
Logger.format("d", (value) => +value);
Logger.format("j", (value) => JSON.stringify(value));
Logger.format("c", (value, target, logger) => {
  return Logger.color(target, Logger.code(logger.name, target), value);
});
Logger.format("C", (value, target) => {
  return Logger.color(target, 15, value, ";1");
});

export async function run(hazel, core, hold) {
  Logger.targets = [];
  Logger.targets.push({
    showTime: "yyyy-MM-dd hh:mm:ss.SSS",
    print: function (text) {
      if (!existsSync(hazel.mainConfig.logDir)) {
        mkdirSync(hazel.mainConfig.logDir);
      }
      let textArray = text.split("\n");
      textArray.forEach((splitText) => {
        writeFileSync(
          hazel.mainConfig.logDir + "/" + Time.template("yyyy-MM-dd") + ".log",
          splitText + "\n",
          { encoding: "utf-8", flag: "a" },
        );
      });
    },
  });
  core.fileLogger = Logger;
}
export const priority = 0;
