export async function action(hazel, core, hold, socket, line) {
  let text = "历史封禁 IP 列表：\n";
  hold.banList.forEach((ban) => {
    text += `${ban}\n`;
  });
  core.replyInfo(text, socket);
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
export const name = "banlist";
export const requiredLevel = 0;
export const requiredData = {};
export const description = "查看历史封禁列表";
export const dependencies = ["command-service", "ws-reply", "data"];
