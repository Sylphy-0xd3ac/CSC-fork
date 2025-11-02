// 用于启动 Socket.IO 服务器

import { Server } from "socket.io";

export async function run(hazel, core, hold) {
  // 如果服务器已经启动，则不重新启动
  if (hold.io) {
    return;
  }

  // 创建 Socket.IO 服务器
  hold.io = new Server(hazel.mainConfig.port, {
    // 允许跨域
    cors: { origin: "*" },
    path: hazel.mainConfig.path,
    // 心跳参数
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

      // 绑定断开事件
      socket.on("disconnect", () => {
        if (typeof core.removeSocket === "function") {
          core.removeSocket(socket);
        }
      });

      // 将命令服务绑定到 socket
      if (core.commandService && typeof core.commandService.bindSocket === "function") {
        core.commandService.bindSocket(socket);
      }

      // 连接错误
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

export const name = "ws-server";
export const dependencies = ["ws-handler"]; 
