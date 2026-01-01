// 向在线的所有用户广播消息
export function action(_hazel, core, _hold, socket, data) {
  if (data.text.length === 0) {
    core.replyMalformedCommand(socket);
    return;
  }

  core.broadcast(
    "info",
    {
      code: "BROADCAST",
      trip: "BODCST",
      text: data.text,
    },
    core.findSocketByLevel(core.config.level.user),
  );

  // 写入存档
  core.archive("BOD", socket, data.text);
}

export function run(_hazel, core, _hold) {
  if (!core.commandService) return;
  core.commandService.registerSlashCommand?.(name, action, {
    requiredLevel,
    requiredData,
    description,
  });
}

export const name = "broadcast";
export const requiredLevel = 4;
export const requiredData = { text: { description: "消息内容" } };
export const description = "向在线的所有用户广播消息";
export const dependencies = ["command-service", "ws-reply", "app-config", "archive"];
