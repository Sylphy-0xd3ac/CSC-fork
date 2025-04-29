// 存档记录器
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
