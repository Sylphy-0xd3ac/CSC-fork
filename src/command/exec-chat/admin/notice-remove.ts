export async function run(hazel, core, hold, socket, data) {
  if (data.removeAll) {
    // 删除所有公告
    hold.noticeList = [];
    core.reply(
      {
        cmd: "info",
        code: "NOTICE_REMOVED_ALL",
        text: `所有公告已删除。`,
      },
      socket,
    );
    core.broadcast(
      {
        cmd: "info",
        code: "NOTICE_REMOVED_ALL",
        text: `${socket.nick} 删除了所有公告。`,
      },
      core.findSocketByLevel(core.config.level.user),
    );
  } else {
    // 删除公告
    hold.noticeList.splice(data.id - 1, 1);
    core.reply(
      {
        cmd: "info",
        code: "NOTICE_REMOVED",
        text: `公告已删除, 编号为 ${data.id}。`,
      },
      socket,
    );
    core.broadcast(
      {
        cmd: "info",
        code: "NOTICE_REMOVED",
        text: `${socket.nick} 删除了一个公告, 编号为 ${data.id}。`,
      },
      core.findSocketByLevel(core.config.level.user),
    );
  }
}
export async function execByChat(hazel, core, hold, socket, line) {
  let id = core.splitArgs(line)[1].trim(); // 公告编号
  if (id === "undefined") {
    await run(hazel, core, hold, socket, { removeAll: true });
  } else {
    await run(hazel, core, hold, socket, {
      id: parseInt(id),
      removeAll: false,
    });
  }
}

export const name = "rm-notice";
export const requiredLevel = 4;
export const requiredData = [{ id: { description: "公告编号" } }];
export const moduleType = "ws-command";
export const description = "删除公告";
