// 用于处理用户发送的聊天消息
function getChatTimeStr() {
  const now = new Date();
  const hour = now.getHours();
  const min = now.getMinutes();
  return `${hour < 10 ? `0${hour}` : hour}:${min < 10 ? `0${min}` : min}`;
}
export async function action(_hazel, core, hold, socket, data: { text: string }) {
  // 频率限制器计数
  if (core.checkAddress(socket.remoteAddress, 3)) {
    core.replyWarn("RATE_LIMITED", "您的操作过于频繁，请稍后再试。", socket);
    return;
  }

  // 检查用户是否可以发送消息
  if (!core.canSpeak(socket)) {
    return;
  }

  // 如果是超长消息，进行频率限制
  if (data.text.length > 32) {
    core.checkAddress(socket.remoteAddress, 12);
  }

  // 如果消息以 / 开头，视为命令
  if (data.text[0] === "/") {
    // 检查是否存在命令服务
    if (core.commandService && typeof core.commandService.validateAndHandle === "function") {
      // 处理命令
      await core.commandService.validateAndHandle(
        data.text.split(" ")[0].slice(1),
        socket,
        data.text.split(" ").slice(1),
      );
    }
    return;
  }

  // 去除首尾空格
  data.text = data.text.trim();

  // 如果是空消息，不处理
  if (data.text.length === 0) {
    return;
  }

  // 将连续的三个以上的换行符替换为两个换行符
  // Markdown 引擎会把三个以上的换行符处理掉，这里就不用处理了
  // data.text = data.text.replace(/\n{3,}/g, '\n\n');
  // data.text = data.text.replace(/\r\n{3,}/g, '\r\n\r\n');

  // 如果该聊天室三分钟前未发送过消息，发送时间
  const timeNow = Date.now();
  if (hold.channel.get(socket.channel).lastActive + 180000 < timeNow) {
    core.broadcast(
      "info",
      {
        code: "CHAT_TIME",
        trip: "/Time/",
        text: getChatTimeStr(),
      },
      hold.channel.get(socket.channel).socketList,
    );
  }
  // 更新最后活跃时间
  hold.channel.get(socket.channel).lastActive = timeNow;

  // 在聊天室广播消息
  if (typeof socket.trip === "string") {
    core.broadcast(
      "chat",
      {
        type: "chat",
        nick: socket.nick,
        trip: socket.trip,
        level: socket.level,
        utype: socket.permission,
        member: socket.level >= core.config.level.member,
        admin: socket.level >= core.config.level.admin,
        text: data.text,
      },
      hold.channel.get(socket.channel).socketList,
    );
  } else {
    core.broadcast(
      "chat",
      {
        type: "chat",
        nick: socket.nick,
        level: socket.level,
        utype: socket.permission,
        text: data.text,
      },
      hold.channel.get(socket.channel).socketList,
    );
  }

  // 记录聊天室历史记录
  if (!hold.history.get(socket.channel)) {
    hold.history.set(socket.channel, []);
  }
  const history = hold.history.get(socket.channel);
  // 如果历史记录长度大于等于配置的最大长度且最大长度不为 0(不限制历史记录长度)，则移除最早的一条记录
  if (
    history.length >= core.config.historyMaximumLength &&
    core.config.historyMaximumLength !== 0
  ) {
    history.shift();
  }
  if (typeof socket.trip === "string") {
    history.push({
      nick: socket.nick,
      trip: socket.trip,
      level: socket.level,
      utype: socket.permission,
      member: socket.level >= core.config.level.member,
      admin: socket.level >= core.config.level.admin,
      text: data.text,
    });
  } else {
    history.push({
      nick: socket.nick,
      level: socket.level,
      utype: socket.permission,
      text: data.text,
    });
  }

  // 记录 stats
  core.increaseState("messages-sent");

  // 写入存档
  core.archive("MSG", socket, data.text);
}

export async function run(_hazel, core, _hold) {
  if (!core.commandService) return;
  core.commandService.registerAction?.(name, action, {
    requiredLevel,
    requiredData,
  });
}

export const name = "chat";
export const requiredLevel = 1;
export const requiredData = { text: { description: "聊天内容" } };
export const dependencies = [
  "command-service",
  "stats",
  "archive",
  "address-checker",
  "socket",
  "can-speak",
  "data",
];
