// 定时 ping 每个客户端，以清除未响应的客户端

export async function run(hazel, core, hold) {
  hold.wsServer.clients.forEach((socket) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.isAlive = false;
      socket.ping();

      // 设置一个 10000 毫秒的超时来检查响应
      const timeout = setTimeout(() => {
        if (!socket.isAlive) {
          if (socket.readyState === WebSocket.OPEN) {
            socket.terminate();
          }
        }
      }, hazel.mainConfig.wsHeartbeatTimeout);

      // 监听 pong 事件以确认客户端仍然活跃
      socket.once("pong", () => {
        clearTimeout(timeout);
        socket.isAlive = true;
      });
    }
  });
}

export const name = "heartbeat";
export const moduleType = "system";
