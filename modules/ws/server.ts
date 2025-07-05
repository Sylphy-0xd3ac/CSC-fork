// 用于启动 WebSocket 服务器

import { WebSocketServer } from "ws";
import { WebSocket } from "ws"; // 引入 WebSocket 以便心跳检测使用

export async function run(hazel, core, hold) {
  // 如果 WebSocket 服务器已经启动，则不重新启动
  if (hold.wsServer) {
    return;
  }
  // 尽可能简单地创建一个 WebSocket 服务器
  hold.wsServer = new WebSocketServer({ port: hazel.mainConfig.port });
  // 绑定 WebSocket 服务器的事件
  hold.wsServer.on("error", (error) => {
    hazel.emit("error", error);
  });
  hold.wsServer.on("connection", (ws, request) => {
    if (typeof core.handle_connection === "function") {
      core.handle_connection(ws, request);
    } else {
      // 兜底：如果核心服务缺失，直接终止连接
      ws.terminate();
    }
  });
  // hold.wsServer.on('close', () => { hazel.runFunction('handle-close'); });
  // hold.wsServer.on('headers', ( headers, request ) => { hazel.runFunction('handle-headers', headers, request); });

  // 启动 WebSocket Heartbeat（逻辑合并自 src/ws/heartbeat.ts）
  await new Promise((resolve) => {
    setInterval(() => {
      hold.wsServer.clients.forEach((socket: any) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.isAlive = false;
          socket.ping();

          // 设置超时来检查响应
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
    }, hazel.mainConfig.wsHeartbeatInterval);
    resolve(true);
  });
}

export const name = "ws-server";
export const dependencies = ["ws-handler"];
