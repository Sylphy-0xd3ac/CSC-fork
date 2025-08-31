// 锁定全站，禁止非成员进入
export async function action(_hazel, core, hold, socket, data) {
  // kick: 锁站后将所有非成员踢出站
  // no_kick: 锁站后不踢出非成员
  const lockType = data.type;

  // 如果锁房类型不是 kick 或 no_kick，则报错s
  if (lockType !== "kick" && lockType !== "no_kick") {
    core.replyMalformedCommand(socket);
    return;
  }

  // 检查全站是否已经被锁定
  if (hold.lockAllChannels) {
    core.replyWarn("SITE_ALREADY_LOCKED", "全部房间已经被锁定", socket);
    return;
  }

  // 锁定全部聊天室
  hold.lockAllChannels = true;

  // 踢出全部非成员
  if (lockType === "kick") {
    core.findSocketTiny("level", 1).forEach((targetSocket) => {
      core.replyWarn("CHANNEL_LOCKED", "该聊天室暂时不可用，请尝试加入其他聊天室。", targetSocket);
      targetSocket.close();
    });
  }

  // 向所有成员广播锁定消息
  core.broadcastInfo("SITE_LOCKED", "全部聊天室已锁定", core.findSocketByLevel(2));

  // 写入存档
  core.archive("LOS", socket, lockType);
}

export async function run(_hazel, core, _hold) {
  if (!core.commandService) return;
  core.commandService.registerSlashCommand?.(name, action, {
    requiredLevel,
    requiredData,
    description,
  });
}

export const name = "locksite";
export const requiredLevel = 4;
export const requiredData = {
  type: {
    description: "锁定类型",
    value: [{ kick: "锁定后踢出非成员" }, { no_kick: "锁定后不踢出非成员" }],
  },
};
export const description = "锁定全站，禁止非成员进入";
export const dependencies = ["command-service", "ws-reply", "data", "archive"];
