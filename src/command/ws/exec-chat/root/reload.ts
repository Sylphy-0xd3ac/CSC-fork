// 重载十字街几乎全部的代码
export async function run(hazel, core, hold, socket, line) {
  core.replyInfo('ROOT', '重载请求已接收。', socket);

  // 重载十字街
  await hazel.reloadModules(false);

  // 记录重载时间
  hold.lastReloadTime = Date.now();

  // 发送重载完成消息
  core.replyInfo('ROOT', '重载完成。', socket);
}

// 使用 /reload 重载十字街
export async function execByChat(hazel, core, hold, socket, line) {
  if (line.trim() == '/reload') {
    await run(hazel, core, hold, socket, line);
  } else {
    core.replyMalformedCommand(socket);
    return;
  }
}

export const name = 'reload';
export const requiredLevel = 10;
export const requiredData = [];
export const moduleType = 'ws-command';
export const description = '重载十字街';
