// 解封某个 IP 地址
export async function action(hazel, core, hold, socket, line) {
  let data;
  if (typeof line === "string") {
    let address = line.slice(6).trim();
    data = { address };
  } else {
    data = line;
  }

  // 如果该 IP 地址不在封禁列表中
  if (!hold.bannedIPlist.includes(data.address)) {
    core.replyMalformedCommand(socket);
    return;
  }

  // 解封该 IP 地址
  core.removeFromArray(hold.bannedIPlist, data.address);

  // 通知全部管理员
  core.broadcastInfo(
    "UNBAN_IP",
    socket.nick + " 解封了 IP 地址 `" + data.address + "`。",
    core.findSocketByLevel(4),
    { from: socket.nick, address: data.address },
  );

  // 写入存档
  core.archive("UNB", socket, data.address);
}

export async function run(hazel, core, hold) {
  if (!core.commandService) return;
  core.commandService.registerSlashCommand?.(name, action, {
    requiredLevel,
    requiredData,
    description,
  });
}

// 常量全部放底部
export const name = "unban";
export const requiredLevel = 4;
export const requiredData = [{ address: { description: "IP 地址" } }];
export const description = "解封某个 IP 地址";
export const dependencies = [
  "command-service",
  "ws-reply",
  "archive",
  "utility",
  "data",
];
