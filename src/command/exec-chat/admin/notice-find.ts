export async function run(hazel, core, hold, socket, data) {
  if (data.find == "all") {
    let result = hold.noticeList.map(
      (notice) => notice + `, 编号为: ${hold.noticeList.indexOf(notice) + 1}`,
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
    if (data.type == "text") {
      let result = hold.noticeList.filter(
        (notice) =>
          notice.includes(data.find) +
          `, 编号为: ${hold.noticeList.indexOf(notice) + 1}`,
      );
      if (result.length == 0) {
        core.reply(
          {
            cmd: "info",
            code: "NOTICE_NOT_FOUND",
            text: `没有找到任何包含 ${data.find} 的公告。`,
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
    } else if (data.type == "num") {
      let result = hold.noticeList[data.find - 1];
      if (typeof result === "undefined") {
        core.reply(
          {
            cmd: "info",
            code: "NOTICE_NOT_FOUND",
            text: `没有找到编号为 ${data.find} 的公告。`,
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
export async function execByChat(hazel, core, hold, socket, line) {
  let text = core.splitArgs(line)[2];
  let type = core.splitArgs(line)[1];
  if (typeof text === "undefined") {
    await run(hazel, core, hold, socket, { find: "all" }); // 如果未输入参数,则显示所有公告
  } else {
    text = text.trim();
    await run(hazel, core, hold, socket, { find: text, type: type }); // 如果输入参数,则搜索公告
  }
}

export const name = "find-notice";
export const requiredLevel = 4;
export const requiredData = [
  { text: { description: "查找关键字" } },
  {
    type: {
      description: "查找类型",
      value: [{ num: "编号查找" }, { text: "文本查找" }],
    },
  },
];
export const moduleType = "ws-command";
export const description =
  "查看公告列表或搜索公告, 如果未输入参数或输入错误,则显示所有公告";
