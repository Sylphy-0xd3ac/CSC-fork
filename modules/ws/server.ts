// 用于启动 WebSocket 服务器

import { WebSocket, WebSocketServer } from "ws"; // 引入 WebSocket 以便心跳检测使用

// 启动客户端清理监测器
function startClientMonitor(hazel: any, core: any, hold: any) {
  // 定期检查客户端状态并清理断开的连接
  const cleanupInterval = setInterval(() => {
    // 获取当前服务器的活跃客户端
    const currentClients = new Set(hold.wsServer.clients);

    // 找出已经断开的客户端
    const disconnectedClients = [];
    for (const client of hold.activeClients) {
      if (!currentClients.has(client) || client.readyState !== WebSocket.OPEN) {
        disconnectedClients.push(client);
      }
    }

    // 清理断开的客户端
    for (const client of disconnectedClients) {
      hold.activeClients.delete(client);

      // 执行清理
      cleanupDisconnectedClient(hazel, core, hold, client);
    }
  }, 5000); // 每5秒检查一次

  // 监听服务器关闭事件，清理定时器
  hold.wsServer.on("close", () => {
    clearInterval(cleanupInterval);
    hold.activeClients.clear();
  });
}

/**
 * 清理断开的客户端资源
 */
function cleanupDisconnectedClient(hazel: any, core: any, _hold: any, client: any) {
  // 如果客户端在聊天室中，从聊天室移除
  if (typeof client.channel !== "undefined") {
    core.removeSocket?.(client);
  }

  // 清理客户端上的定时器和监听器
  if (client.heartbeatTimeout) {
    clearTimeout(client.heartbeatTimeout);
  }

  // 确保连接关闭
  if (client.readyState === WebSocket.OPEN || client.readyState === WebSocket.CONNECTING) {
    client.terminate();
  }

  // 触发清理完成事件
  hazel.emit("client-cleanup", client);
}

export async function run(hazel, core, hold) {
  // 如果 WebSocket 服务器已经启动，则不重新启动
  if (hold.wsServer) {
    return;
  }

  // 初始化客户端跟踪集合
  hold.activeClients = new Set();

  // 尽可能简单地创建一个 WebSocket 服务器
  hold.wsServer = new WebSocketServer({ port: hazel.mainConfig.port });

  // 绑定 WebSocket 服务器的事件
  hold.wsServer.on("error", (error) => {
    hazel.emit("error", error);
  });

  hold.wsServer.on("connection", (ws, request) => {
    // 添加到活动客户端集合
    hold.activeClients.add(ws);

    if (typeof core.handle_connection === "function") {
      core.handle_connection(ws, request);
    } else {
      // 兜底：如果核心服务缺失，直接终止连接
      ws.terminate();
    }
  });

  // 启动客户端清理监测器
  startClientMonitor(hazel, core, hold);
  // hold.wsServer.on('close', () => { hazel.runFunction('handle-close'); });
  // hold.wsServer.on('headers', ( headers, request ) => { hazel.runFunction('handle-headers', headers, request); });

  // 启动 WebSocket Heartbeat
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
