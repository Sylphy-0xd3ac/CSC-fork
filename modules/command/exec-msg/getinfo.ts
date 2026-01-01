// 现在的用途是：在首页显示服务器信息
// 之后大概率会被废弃
export function action(hazel, core, hold, socket, _data) {
  // 频率限制器计数
  core.checkAddress(socket.remoteAddress, 2);

  // 回复客户端简易的服务器信息
  let online = 0;
  try {
    online = hold.io.of("/").sockets.size || 0;
  } catch (_e) {
    // ignore
  }
  socket.emit("setinfo", {
    ver: hazel.mainConfig.version,
    online,
  });

  // 之后断开连接
  socket.disconnect(true);

  // 因为访问一次首页就会触发一次 getinfo
  // 所以使用这个命令的数量约等于首页访问量
  core.increaseState("homepage-visit");

  // 写入存档
  core.archive("VHP", null, socket.remoteAddress);
}

export function run(_hazel, core, _hold) {
  if (!core.commandService) return;
  core.commandService.registerAction?.(name, action, {
    requiredLevel,
    requiredData,
  });
}

export const name = "getinfo";
export const requiredLevel = 0;
export const requiredData = {};
export const dependencies = ["command-service", "stats", "archive", "address-checker", "socket"];
