export function action(_hazel, core, hold, socket, data) {
  if (data.id === "all") {
    // 删除所有公告
    hold.noticeList = [];
    core.replyInfo("NOTICE_REMOVED_ALL", `所有公告已删除。`, socket);
    core.broadcast(
      "info",
      {
        code: "NOTICE_REMOVED_ALL",
        text: `${socket.nick} 删除了所有公告。`,
      },
      core.findSocketByLevel(core.config.level.user),
    );
  } else {
    // 删除公告
    hold.noticeList.splice(data.id - 1, 1);
    core.replyInfo("NOTICE_REMOVED", `公告已删除, 编号为 ${data.id}。`, socket);
    core.broadcast(
      "info",
      {
        code: "NOTICE_REMOVED",
        text: `${socket.nick} 删除了一个公告, 编号为 ${data.id}。`,
      },
      core.findSocketByLevel(core.config.level.user),
    );
  }
}

export function run(_hazel, core, _hold) {
  if (!core.commandService) return;
  core.commandService.registerSlashCommand?.(name, action, {
    requiredLevel,
    requiredData,
    description,
  });
}

export const name = "rm-notice";
export const requiredLevel = 4;
export const requiredData = {
  id: { description: "公告编号" },
};
export const description = "删除公告";
export const dependencies = ["command-service", "socket"];
