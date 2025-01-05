import { WebSocketServer } from "ws";

export async function run(hazel, core, hold) {
  // 尽可能简单地创建一个 WebSocket 服务器
  hold.wsServer = new WebSocketServer({ port: hazel.mainConfig.port });

  // 绑定 WebSocket 服务器的事件
  hold.wsServer.on("error", (error) => {
    hazel.emit("error", error);
  });
  hold.wsServer.on("connection", (ws, request) => {
    hazel.runFunction("handle-connection", ws, request);
  });
  // hold.wsServer.on('close', () => { hazel.runFunction('handle-close'); });
  // hold.wsServer.on('headers', ( headers, request ) => { hazel.runFunction('handle-headers', headers, request); });

  // 启动 WebSocket Heartbeat
  await new Promise((resolve) => {
    setInterval(() => {
      hazel.runFunction("heartbeat");
    }, hazel.mainConfig.wsHeartbeatInterval);
    resolve(true);
  });

  hazel.emit("ws_initialized");
}
