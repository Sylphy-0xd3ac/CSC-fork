// 私聊的 /w 快捷方式
export async function action(hazel, core, hold, socket, line) {
  let data;
  if (typeof line === "string") {
    // 先把 /w 去掉
    let text = line.slice(3).trim();
    // 如果没有参数，回复错误
    if (text.length == 0) {
      core.replyMalformedCommand(socket);
      return;
    }
    data = {
      nick: text.split(" ")[0],
      text: text.slice(text.split(" ")[0].length).trim(),
    };
  } else {
    data = line;
  }

  // 获取昵称
  let nick = data.nick;
  let text = data.text;

  // 验证输入的昵称
  if (!core.verifyNickname(nick)) {
    core.replyMalformedCommand(socket);
    return;
  }

  // 发送私聊消息
  await core.whisper(socket, { nick, text });
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

export const name = "w";
export const requiredLevel = 1;
export const requiredData = [
  { nick: { description: "用户昵称" } },
  { text: { description: "消息内容" } },
];
export const description = "发送私聊消息";
export const dependencies = ["command-service", "ws-reply", "verify"];
