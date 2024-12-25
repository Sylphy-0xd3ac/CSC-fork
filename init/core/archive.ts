// 日志记录器
import { writeFileSync, existsSync, mkdirSync } from "node:fs";

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
          socket.nick + " " +
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

    // 写入日志
    // 如果日志目录不存在，则创建
    if (!existsSync(hazel.mainConfig.logDir)) {
      mkdirSync(hazel.mainConfig.logDir);
    }
    try {
      writeFileSync(
        hazel.mainConfig.logDir + "/" + core.getDateString() + ".archive.txt",
        core.getTimeString() + content,
        { encoding: "utf-8", flag: "a" },
      );
    } catch (error) {
      hazel.emit("error", error);
    }
    let fileLogger = new core.fileLogger("ARCHIVE");
    fileLogger.info(`${content.trim()}`);
    let consoleLogger = new core.consoleLogger("ARCHIVE");
    consoleLogger.info(`${content.trim()}`);
  };
}

export const priority = 2;
