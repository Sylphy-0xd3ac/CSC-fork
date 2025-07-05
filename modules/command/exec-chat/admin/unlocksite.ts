// 解锁全站
export async function action(hazel, core, hold, socket, line) {
  // 检查全站是否已经被锁定
  if (!hold.lockAllChannels) {
    core.replyWarn("SITE_ALREADY_UNLOCKED", "全部房间未被锁定", socket);
    return;
  }
  // 解锁全部聊天室
  hold.lockAllChannels = false;
  // 向所有成员广播锁定消息
  core.broadcastInfo(
    "SITE_ARE_UNLOCKED",
    "全部聊天室已解锁",
    core.findSocketByLevel(2),
  );
  // 写入存档
  core.archive("ULS", socket, "");
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

export const name = "unlocksite";
export const requiredLevel = 4;
export const requiredData = [];
export const description = "解锁全站";
export const dependencies = ["command-service", "ws-reply", "archive"];
