// 解封全部 IP 地址
export async function action(hazel, core, hold, socket, data) {
  // 清空封禁列表
  hold.bannedIPlist = [];

  // 通知全部管理员
  core.broadcastInfo(
    "UNBAN_ALL",
    socket.nick + " 解封了全部 IP 地址。",
    core.findSocketByLevel(4),
    { from: socket.nick },
  );

  // 写入存档
  core.archive("UBA", socket, "");
}

export async function run(hazel, core, hold) {
  if (!core.commandService) return;
  core.commandService.registerSlashCommand?.(name, action, {
    requiredLevel,
    requiredData,
    description,
  });
}

export const name = "unbanall";
export const requiredLevel = 4;
export const requiredData = {};
export const description = "解封全部 IP 地址";
export const dependencies = [
  "command-service",
  "ws-reply",
  "archive",
  "data",
  "socket",
];
