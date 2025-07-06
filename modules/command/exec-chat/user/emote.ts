// 用于处理用户发送的 @nick xxx 消息
export async function action(hazel, core, hold, socket, line) {
  let data;
  if (typeof line === "string") {
    // 从用户的输入中提取出消息内容
    let text = line.slice(4).trim();
    data = { text };
  } else {
    data = line;
  }

  // 频率限制器计数
  core.checkAddress(socket.remoteAddress, 2);

  // 如果是超长消息，进行频率限制
  if (data.text.length > 32) {
    core.checkAddress(socket.remoteAddress, 12);
  }

  // 去除首尾空格
  data.text = data.text.trim();

  // 如果是空消息，不处理
  if (data.text.length == 0) {
    return;
  }

  // 在聊天室广播消息
  if (typeof socket.trip == "string") {
    core.broadcast(
      {
        cmd: "info",
        code: "EMOTE",
        nick: socket.nick,
        trip: socket.trip,
        text: "@" + socket.nick + " " + data.text,
      },
      hold.channel.get(socket.channel).socketList,
    );
  } else {
    core.broadcast(
      {
        cmd: "info",
        code: "EMOTE",
        nick: socket.nick,
        text: "@" + socket.nick + " " + data.text,
      },
      hold.channel.get(socket.channel).socketList,
    );
  }

  // 记录 stats
  core.increaseState("messages-sent");

  // 写入存档
  core.archive("EMO", socket, data.text);
}

export async function run(hazel, core, hold) {
  if (!core.commandService) return;
  core.commandService.registerSlashCommand?.(name, action, {
    requiredLevel,
    requiredData,
    description,
  });
}

export const name = "me";
export const requiredLevel = 1;
export const requiredData = [{ text: { description: "消息内容" } }];
export const description = "发送状态消息";
export const dependencies = ["command-service", "address-checker", "server"];
