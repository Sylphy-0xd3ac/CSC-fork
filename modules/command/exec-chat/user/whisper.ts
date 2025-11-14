// 统一的私聊命令
// /whisper text [nick]  - 按顺序：消息内容 [用户昵称]
// /whisper --nick 张三 --text 你好  - 命名参数
// /whisper 你好  - 回复上次私聊
export async function action(_hazel, core, _hold, socket, data) {
  let nick: string;
  let text: string;

  if (data.nick) {
    // 有nick参数：指定用户私聊
    nick = data.nick;
    text = data.text;

    // 验证昵称
    if (!core.verifyNickname(nick)) {
      core.replyMalformedCommand(socket);
      return;
    }
  } else {
    // 没有nick参数：回复上次私聊
    if (typeof socket.lastWhisperFrom === "undefined") {
      core.replyWarn("NO_LAST_WHISPER", "没有您之前的私聊记录，请指定用户昵称。", socket);
      return;
    }
    nick = socket.lastWhisperFrom;
    text = data.text;
  }

  // 频率限制器计数
  core.checkAddress(socket.remoteAddress, 3);

  // 检查用户是否可以发送消息
  if (!core.canSpeak(socket)) {
    return;
  }

  // 如果是超长消息，进行频率限制
  if (text.length > 32) {
    core.checkAddress(socket.remoteAddress, 12);
  }

  // 去除首尾空格
  text = text.trim();

  // 如果是空消息
  if (text.length === 0) {
    core.replyMalformedCommand(socket);
    return;
  }

  // 查找目标用户
  const [targetSocket] = core.findSocket({
    channel: socket.channel,
    nick: nick,
  });

  // 如果目标用户不存在
  if (!targetSocket) {
    core.replyWarn("USER_NOT_FOUND", "在这个聊天室找不到您指定的用户。", socket);
    return;
  }

  // 如果目标用户是自己
  if (targetSocket === socket) {
    core.replyWarn("WHISPER_SELF", "您不能给自己发私聊消息。", socket);
    return;
  }

  // 发送私聊消息
  targetSocket.emit("chat", {
    type: "whisper",
    from: socket.nick,
    level: socket.level,
    utype: socket.permission,
    nick: `【收到私聊】 ${socket.nick}`,
    trip: socket.trip || " ",
    text: text,
  });

  // 保存到"上一次私聊"中
  targetSocket.lastWhisperFrom = socket.nick;

  // 回复发送成功
  socket.emit("chat", {
    type: "whisper",
    nick: `【发送私聊】 ${targetSocket.nick}`,
    trip: targetSocket.trip || " ",
    text: text,
  });

  // 保存到"上一次私聊"中
  socket.lastWhisperFrom = targetSocket.nick;

  // 写入存档
  core.archive("WHI", socket, `-> ${targetSocket.nick} ${text}`);
}

export async function run(_hazel, core, _hold) {
  if (!core.commandService) return;
  core.commandService.registerSlashCommand?.(name, action, {
    requiredLevel,
    requiredData,
    description,
  });
}

export const name = "whisper";
export const requiredLevel = 1;
export const requiredData = {
  text: { description: "消息内容" },
  nick: { description: "用户昵称", optional: true },
};
export const description = "发送私聊消息，如果无用户昵称则回复上次私聊";
export const dependencies = [
  "command-service",
  "ws-reply",
  "verify",
  "socket",
  "can-speak",
  "archive",
];
