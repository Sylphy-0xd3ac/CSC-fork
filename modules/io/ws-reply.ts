// 便捷地回复客户端各种消息

export async function run(_hazel, core, _hold) {
  // 回复提示消息
  core.replyInfo = (code, text, socket, extraData) => {
    if (typeof extraData === "object") {
      socket.emit("info", { code, text, ...extraData });
    } else {
      socket.emit("info", { code, text });
    }
  };

  // 回复警告消息
  core.replyWarn = (code, text, socket, extraData) => {
    if (typeof extraData === "object") {
      socket.emit("warn", { code, text, ...extraData });
    } else {
      socket.emit("warn", { code, text });
    }
  };

  // 广播提示消息
  core.broadcastInfo = (code, text, sockets, extraData) => {
    if (typeof extraData === "object") {
      core.broadcast("info", { code, text, ...extraData }, sockets);
    } else {
      core.broadcast("info", { code, text }, sockets);
    }
  };

  // 广播警告消息
  core.broadcastWarn = (code, text, sockets, extraData) => {
    if (typeof extraData === "object") {
      core.broadcast("warn", { code, text, ...extraData }, sockets);
    } else {
      core.broadcast("warn", { code, text }, sockets);
    }
  };

  // 回复“命令格式不正确”的警告消息
  core.replyMalformedCommand = (socket) => {
    core.replyWarn("MALFORMED_COMMAND", "命令格式不正确，请查阅帮助文档。", socket);
  };
}

export const name = "ws-reply";
export const dependencies: string[] = ["socket"];
