export function action(_hazel, core, hold, socket, _data) {
  let text = "历史封禁列表：\n";
  hold.bannedIPlist.forEach((ip) => {
    text += `${ip}\n`;
  });
  core.replyInfo("BAN_LIST", text, socket);
}

export function run(_hazel, core, _hold) {
  if (!core.commandService) return;
  core.commandService.registerSlashCommand?.(name, action, {
    requiredLevel,
    requiredData,
    description,
  });
}

export const name = "banlist";
export const requiredLevel = 4;
export const requiredData = {};
export const description = "查看历史封禁列表";
export const dependencies = ["command-service", "ws-reply", "data"];
