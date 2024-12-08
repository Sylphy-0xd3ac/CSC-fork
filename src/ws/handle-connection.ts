// 用于处理新的 WebSocket 连接
export async function run(hazel, core, hold, ws_socket, request) {
  /* 前置检查 */
  // 获取客户端地址
  if (hazel.mainConfig.behindReverseProxy) {
    ws_socket.remoteAddress =
      request.headers["x-forwarded-for"] || request.socket.remoteAddress;
    // 十字街现在不用 CDN 所以不用这个玩意
    // socket.remoteAddress = request.headers['x-forwarded-for'].split(',').pop().trim() || request.socket.remoteAddress;
  } else {
    ws_socket.remoteAddress = request.socket.remoteAddress;
  }

  if (
    ws_socket.remoteAddress !== undefined
  ) {
    ws_socket.remoteAddress = ws_socket.remoteAddress.slice(7);
  }

  // 检查该地址是否请求频率过高
  if (core.checkAddress(ws_socket.remoteAddress, 3)) {
    ws_socket.send(
      '{"cmd":"warn","code":"RATE_LIMITED","text":"您的操作过于频繁，请稍后再试。"}',
    );
    if (ws_socket.readyState === WebSocket.OPEN) {
      // 关闭连接
      ws_socket.terminate();
    }
    return;
  }

  // 检查该地址的 CIDR 是否在允许 / 禁止列表中
  ws_socket.isAllowedIP = core.checkIP(ws_socket.remoteAddress)[0];
  ws_socket.isDeniedIP = core.checkIP(ws_socket.remoteAddress)[1];

  // 检查该地址是否在封禁列表中
  if (
    hold.bannedIPlist.includes(ws_socket.remoteAddress) ||
    ws_socket.isDeniedIP
  ) {
    ws_socket.send(
      '{"cmd":"warn","code":"BANNED","text":"您已经被全域封禁，如果您对此有任何疑问，请联系 mail@henrize.kim 。"}',
    );
    // 关闭连接
    if (ws_socket.readyState === WebSocket.OPEN) {
      ws_socket.terminate();
    }
    return;
  }

  /* 绑定 WebSocket 事件 */
  // message 事件
  ws_socket.on("message", (message) => {
    core.handleData(ws_socket, message);
  });

  // close 事件
  ws_socket.on("close", function () {
    // 如果用户加入了聊天室，则从聊天室中移除
    if (typeof ws_socket.channel !== "undefined") {
      core.removeSocket(ws_socket);
    }
  });

  // pong 事件
  ws_socket.on("pong", (socket) => {
    socket.alive = true;
  });

  // error 事件
  ws_socket.on("error", (error) => {
    hazel.emit("error", error, ws_socket);
  });

  /* 结束部分 */
  // 记录日志
  // core.log(core.LOG_LEVEL.DEBUG, ['New connection from', ws_socket.remoteAddress, 'isAllowedIP:', ws_socket.isAllowedIP, 'isDeniedIP:', ws_socket.isDeniedIP]);

  // 计入全局频率
  core.increaseGlobalRate();
}

export const name = "handle-connection";
export const moduleType = "system";
