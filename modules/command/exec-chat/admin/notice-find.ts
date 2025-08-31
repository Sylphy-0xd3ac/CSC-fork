export async function action(_hazel, core, hold, socket, data) {
  if (data.find === "all") {
    const result = hold.noticeList.map(
      (notice) => `${notice}, 编号为: ${hold.noticeList.indexOf(notice) + 1}`,
    );
    core.reply(
      {
        cmd: "info",
        code: "NOTICE_LIST",
        text: `当前公告列表为: ${result.join(", \n")}`,
      },
      socket,
    );
  } else {
    if (data.find === "text") {
      const result = hold.noticeList.filter(
        (notice) =>
          `${notice.includes(data.value)}, 编号为: ${hold.noticeList.indexOf(notice) + 1}`,
      );
      if (result.length === 0) {
        core.reply(
          {
            cmd: "info",
            code: "NOTICE_NOT_FOUND",
            text: `没有找到任何包含 ${data.value} 的公告。`,
          },
          socket,
        );
      } else {
        core.reply(
          {
            cmd: "info",
            code: "NOTICE_FIND",
            text: `搜索结果: ${result.join(", \n")}, 共 ${result.length} 条。`,
          },
          socket,
        );
      }
    } else if (data.find === "num") {
      const result = hold.noticeList[data.value - 1];
      if (typeof result === "undefined") {
        core.reply(
          {
            cmd: "info",
            code: "NOTICE_NOT_FOUND",
            text: `没有找到编号为 ${data.value} 的公告。`,
          },
          socket,
        );
      } else {
        core.reply(
          {
            cmd: "info",
            code: "NOTICE_FIND",
            text: `搜索结果: ${result}`,
          },
          socket,
        );
      }
    } else {
      core.replyMalformedCommand(socket);
      return;
    }
  }
}

export async function run(_hazel, core, _hold) {
  if (!core.commandService) return;
  core.commandService.registerSlashCommand?.(name, action, {
    requiredLevel,
    requiredData,
    description,
  });
}

export const name = "find-notice";
export const requiredLevel = 4;
export const requiredData = {
  find: {
    description: "查找类型",
    value: [{ num: "编号查找" }, { text: "文本查找" }, { all: "全部公告" }],
  },
  value: { description: "查找关键字", optional: true },
};
export const description = "查看公告列表或搜索公告, 如果未输入参数或输入错误,则显示所有公告";
export const dependencies = ["command-service", "ws-reply", "data"];
