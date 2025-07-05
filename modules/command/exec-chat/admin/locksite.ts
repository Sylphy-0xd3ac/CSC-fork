// 锁定全站，禁止非成员进入
export async function action(hazel, core, hold, socket, line) {
  let data;
  if (typeof line === "string") {
    let lockType = line.slice(9).trim();
    if (lockType.length == 0) {
      lockType = "kick";
    }
    data = { type: lockType };
  } else {
    data = line;
  }

  // kick: 锁站后将所有非成员踢出站
  // no-kick: 锁站后不踢出非成员
  let lockType = data.type;

  // 如果锁房类型不是 kick 或 no-kick，则报错
  if (lockType != "kick" && lockType != "no-kick") {
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
  if (lockType == "kick") {
    core.findSocketTiny("level", 1).forEach((targetSocket) => {
      core.replyWarn(
        "CHANNEL_LOCKED",
        "该聊天室暂时不可用，请尝试加入其他聊天室。",
        targetSocket,
      );
      targetSocket.close();
    });
  }

  // 向所有成员广播锁定消息
  core.broadcastInfo(
    "SITE_LOCKED",
    "全部聊天室已锁定",
    core.findSocketByLevel(2),
  );

  // 写入存档
  core.archive("LOS", socket, lockType);
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

// 常量全部放底部
export const name = "locksite";
export const requiredLevel = 4;
export const requiredData = [
  {
    type: {
      description: "锁定类型",
      value: [
        { kick: "锁定后踢出非成员" },
        { "no-kick": "锁定后不踢出非成员" },
      ],
    },
  },
];
export const description = "锁定全站，禁止非成员进入";
export const dependencies = ["command-service", "ws-reply", "data", "archive"];
