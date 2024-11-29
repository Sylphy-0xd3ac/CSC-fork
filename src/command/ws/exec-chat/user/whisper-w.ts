// 私聊的 /w 快捷方式
export async function run(hazel, core, hold, socket, data) {
  // 获取昵称
  let nick = data.nick;
  let text = data.text;

  // 验证输入的昵称
  if (!core.verifyNickname(nick)) {
    core.replyMalformedCommand(socket);
    return;
  }

  // 运行 whisper 命令
  await hazel.loadedFunctions.get('whisper').run(hazel, core, hold, socket, { nick, text });
}

// 用户使用 /w nick text 命令发送私聊消息
export async function execByChat(hazel, core, hold, socket, line) {
  // 先把 /w 去掉
  line = line.slice(3).trim();

  // 如果没有参数，回复错误
  if (line.length == 0) {
    core.replyMalformedCommand(socket);
    return;
  }

  await run(hazel, core, hold, socket, { nick: line.split(' ')[0], text: line.slice(line.split(' ')[0].length).trim() });
}

export const name = 'w';
export const requiredLevel = 1;
export const requiredData = {'nick':{'description':'用户昵称','value':'any'},'text':{'description':'消息内容','value':'any'}};
export const moduleType = 'ws-command';
export const description = '发送私聊消息';
