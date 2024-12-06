// 定时 ping 每个客户端，以清除未响应的客户端

export async function run(hazel, core, hold) {
  hold.wsServer.clients.forEach((socket) => {
    if (!socket.isAlive && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
    else {
      if (socket.readyState === WebSocket.OPEN) {
        socket.isAlive = true;
        socket.ping();
      }
    }
  });
}

export const name = 'heartbeat';
export const moduleType = 'system';
