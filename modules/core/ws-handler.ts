import { WebSocket } from "ws";

export async function run(hazel, core, hold) {
  /**
   * 处理新的 WebSocket 连接，原逻辑来自 src/ws/handle-connection.ts
   * @param ws_socket WebSocket
   * @param request   HTTP 请求
   */
  core.handle_connection = async (ws_socket: any, request: any) => {
    /* 前置检查 */
    // 获取客户端地址
    if (hazel.mainConfig.behindReverseProxy) {
      ws_socket.remoteAddress = request.headers["x-forwarded-for"] || request.socket.remoteAddress;
    } else {
      ws_socket.remoteAddress = request.socket.remoteAddress;
    }

    if (ws_socket.remoteAddress !== undefined) {
      ws_socket.remoteAddress = ws_socket.remoteAddress.slice(7);
    }

    // 检查该地址是否请求频率过高
    if (core.checkAddress?.(ws_socket.remoteAddress, 3)) {
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
    ws_socket.isAllowedIP = core.checkIP?.(ws_socket.remoteAddress)[0];
    ws_socket.isDeniedIP = core.checkIP?.(ws_socket.remoteAddress)[1];

    // 检查该地址是否在封禁列表中
    if (
      hold.bannedIPlist?.includes(ws_socket.remoteAddress) ||
      !ws_socket.isAllowedIP ||
      ws_socket.isDeniedIP
    ) {
      ws_socket.send(
        '{"cmd":"warn","code":"BANNED","text":"您已经被全域封禁，如果您对此有任何疑问，请联系 mail@henrize.kim 。"}',
      );
      if (ws_socket.readyState === WebSocket.OPEN) {
        ws_socket.terminate();
      }
      return;
    }

    /* 绑定 WebSocket 事件 */
    // message 事件
    ws_socket.on("message", (message: any) => {
      core.handleData?.(ws_socket, message);
    });

    // close 事件 - 现在由 server 模块处理
    ws_socket.on("close", () => {});

    // error 事件
    ws_socket.on("error", (error: any) => {
      hazel.emit("error", error, ws_socket);
    });

    /* 结束部分 */
    // 计入全局频率
    core.increaseGlobalRate?.();
  };
}

export const name = "ws-handler";
export const dependencies: string[] = ["address-checker"];
