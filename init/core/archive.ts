// 存档记录器
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

export async function run(hazel, core, hold) {
  // 记录聊天和操作记录存档
  core.archive = function (logType, socket, ...logText: string[]) {
    // 生成日志内容
    let content = logType + " ";
    if (socket) {
      if (typeof socket.trip == "string") {
        content +=
          socket.channel +
          " [" +
          socket.trip +
          "]" +
          socket.nick +
          " " +
          logText.join(" ");
      } else {
        content += socket.channel + " []" + socket.nick + ": " + logText;
      }
    } else {
      content += logText;
    }

    // 替换 content 中的换行
    content = content.replace(/\n/g, "\\n");
    content = content.replace(/\r/g, "\\r");
    content += "\n";

    // 输出到控制台和文件
    let logger = new core.logger("ARCHIVE");
    logger.info(`${content.trim()}`);
  };
}

export const priority = 2;
