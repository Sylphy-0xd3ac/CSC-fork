// 锁定房间，禁止非成员进入
export async function action(_hazel, core, hold, socket, data) {
  const targetChannel = socket.channel;
  // kick: 锁房后将所有非成员踢出房间
  // no_kick: 锁房后不踢出非成员
  const lockroomType = data.type;

  // 如果锁房类型不是 kick 或 no_kick，则报错
  if (lockroomType !== "kick" && lockroomType !== "no_kick") {
    core.replyMalformedCommand(socket);
    return;
  }

  // 检查房间是否已经被锁定
  if (hold.channel.get(targetChannel).isLocked) {
    core.replyWarn("CHANNEL_ALREADY_LOCKED", "房间已经被锁定", socket);
    return;
  }

  // 锁定房间
  hold.channel.get(targetChannel).isLocked = true;

  // 踢出全部非成员
  if (lockroomType === "kick") {
    core
      .findSocket({ level: 1 }, hold.channel.get(targetChannel).socketList)
      .forEach((targetSocket) => {
        core.replyWarn(
          "CHANNEL_LOCKED",
          "该聊天室暂时不可用，请尝试加入其他聊天室。",
          targetSocket,
        );
        targetSocket.close();
      });
  }

  // 向房间内所有成员广播锁定消息
  core.broadcastInfo(
    "CHANNEL_LOCKED",
    "已锁定本聊天室",
    core.findSocketByLevel(2, hold.channel.get(targetChannel).socketList),
  );

  // 写入存档
  core.archive("LOR", socket, lockroomType);
}

export async function run(_hazel, core, _hold) {
  if (!core.commandService) return;
  core.commandService.registerSlashCommand?.(name, action, {
    requiredLevel,
    requiredData,
    description,
  });
}

export const name = "lockroom";
export const requiredLevel = 4;
export const requiredData = {
  type: {
    description: "锁定类型",
    value: [{ kick: "锁定后踢出非成员" }, { no_kick: "锁定后不踢出非成员" }],
  },
};
export const description = "锁定聊天室, 禁止非成员进入";
export const dependencies = ["command-service", "ws-reply", "data", "archive"];
