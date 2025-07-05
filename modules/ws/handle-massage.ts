// 用于处理消息

export async function run(hazel, core, hold) {
  core.handleData = async function (socket, data) {
    // 检查该地址是否请求频率过高
    if (core.checkAddress(socket.remoteAddress, 1)) {
      // 防止在短时间内发送大量数据时程序占用过高，直接回复处理好的警告消息
      socket.send(
        '{"cmd":"warn","code":"RATE_LIMITED","text":"您的操作过于频繁，请稍后再试。"}',
      );
      return;
    }

    // 将消息转换为字符串
    data = data.toString("utf8");

    // 检测消息长度，不符合要求则忽略
    if (data.length > core.config.dataMaximumLength || data.length < 1) {
      return;
    }

    // 将消息转换为 JSON 对象
    try {
      data = JSON.parse(data);
    } catch (error) {
      // 记录在日志中
      const logger = new core.logger("Handle-message");
      logger.info(
        core.LOG_LEVEL.WARN,
        ["Malformed JSON data received from ", socket.remoteAddress, data],
        "Handle-Message",
      );
      // 按照惯例，如果消息不是 JSON 格式，则关闭连接
      if (socket.readyState === WebSocket.OPEN) {
        socket.terminate();
      }
      return;
    }
    if (typeof data !== "object") {
      socket.terminate();
      return;
    }

    // JSON 对象中每个属性都必须是字符串
    // 且属性名不应该是 __proto__  prototype constructor
    // 否则关闭连接
    for (const key in data) {
      if (typeof data[key] !== "string") {
        socket.terminate();
        return;
      }

      if (key === "__proto__" || key === "prototype" || key === "constructor") {
        // 记录攻击行为
        const logger = new core.logger("Handle-message");
        logger.info(core.LOG_LEVEL.WARN, [
          "Malformed JSON data received from ",
          socket.remoteAddress,
          JSON.stringify(data),
        ]);
        if (socket.readyState === WebSocket.OPEN) {
          socket.terminate();
        }
        return;
      }
    }

    if (!data.cmd) {
      return;
    } // 消息必须有 cmd 属性

    // 处理 prompt
    if (socket.handlePrompt) {
      socket.handlePrompt = false;
      return;
    }

    // 使用核心 commandService 处理命令
    if (
      core.commandService &&
      typeof core.commandService.handle === "function"
    ) {
      await core.commandService.handle(socket, data);
    }
  };
}

export const name = "handle-message";
export const dependencies: string[] = [
  "ws-reply",
  "command-service",
  "logger",
  "address-checker",
];
