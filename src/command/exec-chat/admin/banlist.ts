export async function run(hazel, core, hold, socket, data) {
  let text = "历史封禁 IP 列表：\n";
  hold.banList.forEach((ban) => {
    text += `${ban}\n`;
  });
  core.replyInfo(text, socket);
}
export async function execByChat(hazel, core, hold, socket, line) {
  await run(hazel, core, hold, socket, {});
}

export const name = "banlist";
export const requiredLevel = 0;
export const requiredData = {};
export const moduleType = "ws-command";
export const description = "查看历史封禁列表";
