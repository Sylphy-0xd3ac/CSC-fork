// 踢人命令
export async function run(hazel, core, hold, socket, data) {
  // 先检查昵称
  if (!core.verifyNickname(data.nick)) {
    // 如果昵称格式不正确
    core.replyWarn('NICKNAME_INVALID', '昵称应当仅由汉字、字母、数字和不超过 3 个的特殊字符（_-+.:;）组成，而且不能太长。', socket);
    return;
  }
  // 查找目标用户
  let targetSockets = core.findSocket({ channel: socket.channel, remoteAddress: socket.remoteAddress });
  
  // 如果目标用户不存在
  if (targetSockets.length < 1) {
    core.replyWarn('USER_NOT_FOUND', '在这个聊天室找不到您指定的用户。', socket);
    return;
  }
  // 过滤掉自己
  targetSockets = targetSockets.filter(targetSocket => targetSocket.connectionID !== socket.connectionID);
  if (targetSockets.length < 1) {
    core.replyWarn('USER_NOT_FOUND', '在这个聊天室找不到其他用户。', socket);
    return;
  }
  // 告知用户共有多少个目标
  core.replyInfo('KICKED_INFO', '共有 ' + targetSockets.length + ' 个目标。', socket, { nick: socket.nick });
  // 逐个踢出
  targetSockets.forEach(targetSocket => {
    core.replyInfo('KICKED_SUCCESS', '已将 ' + targetSocket.nick + ' 断开连接。', socket, { nick: socket.nick });
    core.replyInfo('KICKED_BY_ADMIN', '您已经被管理员断开连接,如您有任何疑问,请联系管理员。', targetSocket);
    targetSocket.close();
  });
  // 通知全部管理员
  core.broadcastInfo(
    'KICK_USER',
    socket.nick + ' 在 ' + socket.channel + ' 踢出了 ' + targetSockets.map(targetSocket => targetSocket.nick).join(', ') + '。',
    core.findSocketByLevel(4),
    { from: socket.nick, channel: socket.channel, target: targetSockets.map(targetSocket => targetSocket.nick).join(', ')}
  );
  // 写入存档
  targetSockets.forEach(targetSocket => {
      core.archive('KME', socket, targetSocket.nick);
  });
}

// 用户通过 /kickme nick 的方式执行命令
export async function execByChat(hazel, core, hold, socket, line) {
  let targetNick = line.slice(8).trim();

  //验证输入的昵称
  if (!core.verifyNickname(targetNick)) {
    core.replyMalformedCommand(socket);
    return;
  }
  // 执行命令
  await run(hazel, core, hold, socket, { nick: targetNick });
}

export const name = 'kickme';
export const requiredLevel = 1;
export const requiredData = [];
export const moduleType = 'ws-command';
export const description = '踢出自己';
