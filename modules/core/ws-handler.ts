export async function run(hazel, core, hold) {
  /**
   * 处理新的 Socket.IO 连接（替换原 WebSocket 版本）
   * @param socket   Socket.IO Socket
   * @param handshake HTTP 握手对象
   */
  core.handle_connection = async (socket: any, handshake: any) => {
    /* 前置检查 */
    // 获取客户端地址
    let remote;
    if (hazel.mainConfig.behindReverseProxy) {
      remote = handshake?.headers?.["x-forwarded-for"] || socket.handshake.address;
      if (Array.isArray(remote)) remote = remote[0];
    } else {
      remote = socket.handshake.address;
    }

    // 统一移除 IPv6 映射前缀 ::ffff:
    if (typeof remote === "string" && remote.startsWith("::ffff:")) {
      remote = remote.slice(7);
    }

    socket.remoteAddress = remote;

    // 检查该地址是否请求频率过高
    if (core.checkAddress?.(socket.remoteAddress, 3)) {
      socket.emit("warn", {
        cmd: "warn",
        code: "RATE_LIMITED",
        text: "您的操作过于频繁，请稍后再试。",
      });
      socket.disconnect(true);
      return;
    }

    // 检查该地址的 CIDR 是否在允许 / 禁止列表中
    const [allowed, denied] = core.checkIP?.(socket.remoteAddress) || [true, false];
    socket.isAllowedIP = allowed;
    socket.isDeniedIP = denied;

    // 检查该地址是否在封禁列表中
    if (hold.bannedIPlist?.includes(socket.remoteAddress) || !allowed || denied) {
      socket.emit("warn", {
        cmd: "warn",
        code: "BANNED",
        text: "您已经被全域封禁，如果您对此有任何疑问，请联系 mail@henrize.kim 。",
      });
      socket.disconnect(true);
      return;
    }

    // 结束部分：计入全局频率
    core.increaseGlobalRate?.();
  };
}

export const name = "ws-handler";
export const dependencies: string[] = ["address-checker"];
