// 用于启动 Socket.IO 服务器（替换原 WebSocket 服务器）

import { Server } from "socket.io";

export async function run(hazel, core, hold) {
  // 如果服务器已经启动，则不重新启动
  if (hold.io) {
    return;
  }

  // 创建 Socket.IO 服务器
  hold.io = new Server(hazel.mainConfig.port, {
    // 允许跨域，方便本地直接打开前端页面
    cors: { origin: "*" },
    path: "/socket.io",
    // 复用原配置的心跳参数
    pingInterval: hazel.mainConfig.wsHeartbeatInterval,
    pingTimeout: hazel.mainConfig.wsHeartbeatTimeout,
  });

  // 错误转发
  hold.io.engine.on("connection_error", (err) => {
    hazel.emit("error", err);
  });

  // 新连接
  hold.io.on("connection", (socket) => {
    try {
      if (typeof core.handle_connection === "function") {
        core.handle_connection(socket, socket.handshake);
      }

      // 绑定断开事件，统一清理
      socket.on("disconnect", () => {
        if (typeof core.removeSocket === "function") {
          core.removeSocket(socket);
        }
      });

      // 将命令服务绑定到此 socket（事件化处理）
      if (core.commandService && typeof core.commandService.bindSocket === "function") {
        core.commandService.bindSocket(socket);
      }

      // 连接级错误
      socket.on("error", (error) => {
        hazel.emit("error", error, socket);
      });

      // 计入全局频率
      core.increaseGlobalRate?.();
    } catch (error) {
      hazel.emit("error", error, socket);
      socket.disconnect(true);
    }
  });
}

export const name = "ws-server"; // 保持模块名不变以满足依赖
export const dependencies = ["ws-handler"]; // 仍依赖连接前置处理
