export async function action(hazel, core, hold, socket, data) {
  // push 到公告列表
  data.text = data.text.trim();
  hold.noticeList.push(data.text);
  core.reply(
    {
      cmd: "info",
      code: "NOTICE_ADDED",
      text: `公告已添加, 编号为 ${hold.noticeList.length}。`,
    },
    socket,
  );

  core.broadcast(
    {
      cmd: "info",
      code: "NOTICE_ADDED",
      text: `${socket.nick} 添加了一个公告, 编号为 ${hold.noticeList.length}, 内容为: ${data.text}。`,
    },
    core.findSocketByLevel(core.config.level.user),
  );
}

export async function run(hazel, core, hold) {
  if (!core.commandService) return;
  core.commandService.registerSlashCommand?.(name, action, {
    requiredLevel,
    requiredData,
    description,
  });
}

export const name = "add-notice";
export const requiredLevel = 4;
export const requiredData = {
  text: { description: "公告内容" },
};
export const description = "添加公告";
export const dependencies = ["command-service", "ws-reply", "data"];
