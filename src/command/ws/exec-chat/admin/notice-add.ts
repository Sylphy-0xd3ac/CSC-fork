export async function run(hazel, core, hold, socket, data) {
    // push 到公告列表
    data.text = data.text.trim();
    hold.noticeList.push(data.text);
    core.reply({
        cmd: 'info',
        code: 'NOTICE_ADDED',
        text: `公告已添加, 编号为 ${hold.noticeList.length}。`,
    }, socket);

    core.broadcast({
        cmd: 'info',
        code: 'NOTICE_ADDED',
        text: `用户 ${socket.nick} 添加了一个公告, 编号为 ${hold.noticeList.length}, 内容为: ${data.text}。`,
    }, core.findSocketByLevel(core.config.level.user));
}
export async function execByChat(hazel, core, hold, socket, line) {
  let text = core.splitArgs(line)[1].trim();

    // 如果没有输入消息内容
  if (text.length == 0) {
    core.replyMalformedCommand(socket);
    return;
  }

  await run(hazel, core, hold, socket, { text });
}

export const name = 'add-notice';
export const requiredLevel = 4;
export const requiredData = {'text':{'description':'公告内容','value':[{'name':'any'}]}};
export const moduleType = 'ws-command';
export const description = '添加公告'; 