// 日志记录器
import chalk from "chalk";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";

export async function run(hazel, core, hold) {
  // 日志级别
  core.LOG_LEVEL = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
  };

  core.LOG_LEVEL_COLOR = {
    DEBUG: chalk.cyan("<D>"),
    INFO: chalk.green("<I>"),
    WARN: chalk.yellow("<W>"),
    ERROR: chalk.red("<E>"),
  };

  // 记录技术性日志
  core.log = function (level, content, func = "Unknown") {
    // 去颜色日志
    let contentClean = "";

    if (level >= core.config.logLevel) {
      // 如果要求写入的日志级别高于设定的日志级别，写入日志
      // 如果 content 是数组，转为字符串
      if (Array.isArray(content)) {
        content = content.join(" ");
      } else if (typeof content == "object") {
        content = JSON.stringify(content);
      }

      // 记录日志
      if (level == core.LOG_LEVEL.DEBUG) {
        contentClean =
          `${core.getTimeStringLogger()} [D] ${func} ` + content + "\n";
        content =
          `${chalk.cyan(core.getTimeStringLogger())} ${core.LOG_LEVEL_COLOR.DEBUG} ${core.randomColor()(func)} ` +
          content +
          "\n";
        console.debug(content);
      } else if (level == core.LOG_LEVEL.INFO) {
        contentClean =
          `${core.getTimeStringLogger()} [I] ${func} ` + content + "\n";
        content =
          `${chalk.cyan(core.getTimeStringLogger())} ${core.LOG_LEVEL_COLOR.INFO} ${core.randomColor()(func)} ` +
          content +
          "\n";
        console.log(content);
      } else if (level == core.LOG_LEVEL.WARNING) {
        contentClean =
          `${core.getTimeStringLogger()} [W] ${func} ` + content + "\n";
        content =
          `${chalk.cyan(core.getTimeStringLogger())} ${core.LOG_LEVEL_COLOR.WARN} ${core.randomColor()(func)} ` +
          content +
          "\n";
        console.warn(content);
      } else if (level == core.LOG_LEVEL.ERROR) {
        contentClean =
          `${core.getTimeStringLogger()} [E] ${func} ` + content + "\n";
        content =
          `${chalk.cyan(core.getTimeStringLogger())} ${core.LOG_LEVEL_COLOR.ERROR} ${core.randomColor()(func)} ` +
          content +
          "\n";
        console.error(content);
      }
      // 写入日志
      // 如果日志目录不存在，则创建
      if (!existsSync(hazel.mainConfig.logDir)) {
        mkdirSync(hazel.mainConfig.logDir);
      }
      try {
        writeFileSync(
          hazel.mainConfig.logDir + "/" + core.getDateString() + ".log.txt",
          contentClean,
          { encoding: "utf-8", flag: "a" },
        );
      } catch (error) {
        hazel.emit("error", error);
      }
    }
  };

  // 记录聊天和操作记录存档
  core.archive = function (logType, socket, logText) {
    // 生成日志内容
    let content = core.getTimeString() + logType + " ";
    if (socket) {
      if (typeof socket.trip == "string") {
        content +=
          socket.channel +
          " [" +
          socket.trip +
          "]" +
          socket.nick +
          ": " +
          logText;
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

    // 写入日志
    // 如果日志目录不存在，则创建
    if (!existsSync(hazel.mainConfig.logDir)) {
      mkdirSync(hazel.mainConfig.logDir);
    }
    try {
      writeFileSync(
        hazel.mainConfig.logDir + "/" + core.getDateString() + ".archive.txt",
        content,
        { encoding: "utf-8", flag: "a" },
      );
    } catch (error) {
      hazel.emit("error", error);
    }
  };
}

export const priority = 2;
