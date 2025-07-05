// 向在线的所有用户广播消息
export async function action(hazel, core, hold, socket, line) {
  let data;
  if (typeof line === "string") {
    let text = core.splitArgs(line)[1].trim();
    if (text.length == 0) {
      core.replyMalformedCommand(socket);
      return;
    }
    data = { text, level: core.config.level.user };
  } else {
    data = line;
  }

  core.broadcast(
    {
      cmd: "info",
      code: "BROADCAST",
      trip: "BODCST",
      text: data.text,
    },
    core.findSocketByLevel(core.config.level.user),
  );

  // 写入存档
  core.archive("BOD", socket, data.text);
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
export const name = "broadcast";
export const requiredLevel = 4;
export const requiredData = [{ text: { description: "消息内容" } }];
export const description = "向在线的所有用户广播消息";
export const dependencies = [
  "command-service",
  "ws-reply",
  "app-config",
  "archive",
];
