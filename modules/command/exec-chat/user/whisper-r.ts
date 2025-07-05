// 私聊的 /r 快捷方式
export async function action(hazel, core, hold, socket, line) {
  let data;
  if (typeof line === "string") {
    // 先把 /r 去掉
    let text = line.slice(3).trim();
    // 如果没有参数，回复错误
    if (text.length == 0) {
      core.replyMalformedCommand(socket);
      return;
    }
    data = { text };
  } else {
    data = line;
  }

  // 如果没有上一条私聊消息，回复错误
  if (typeof socket.lastWhisperFrom == "undefined") {
    core.replyWarn(
      "NO_LAST_WHISPER",
      "没有您之前的私聊记录，请使用 /w 进行私聊。",
      socket,
    );
    return;
  }

  // 回复私聊消息
  await core.whisper(socket, {
    nick: socket.lastWhisperFrom,
    text: data.text,
  });
}

// 自动注册到 commandService
export async function run(hazel, core, hold) {
  if (!core.commandService) return;
  core.commandService.registerSlashCommand?.(name, action, {
    requiredLevel,
    requiredData,
    description,
  });
}

export const name = "r";
export const requiredLevel = 1;
export const requiredData = [{ text: { description: "消息内容" } }];
export const description = "回复私聊消息";
export const dependencies = ["command-service", "ws-reply"];
