import { WebSocketServer } from 'ws';

export default async function (hazel, core, hold) {
  // 尽可能简单地创建一个无头 WebSocket 服务器
  hold.wsServer = new WebSocketServer({ noServer: true });

  // 创建一个 WebSocket 服务器
  // hold.wsServer = new WebSocketServer({ port: hazel.mainConfig.port });
  // 绑定 WebSocket 服务器的事件
  hold.wsServer.on('error', (error) => { hazel.emit('error', error); });
  hold.wsServer.on('connection', (ws, request, socket) => { hazel.runFunction('handle-connection', ws, request, socket); });
  // hold.wsServer.on('close', () => { hazel.runFunction('handle-close'); });
  // hold.wsServer.on('headers', ( headers, request ) => { hazel.runFunction('handle-headers', headers, request); });

  // 启动 WebSocket Heartbeat
  setInterval(() => { hazel.runFunction('heartbeat'); }, hazel.mainConfig.wsHeartbeatInterval);

  // 启动定时任务，每过半点执行一次
  // 这个暂时也不用
  /* 
  setTimeout(() => {
    hazel.runFunction('hourly-tasks');
    setInterval(() => { hazel.runFunction('hourly-tasks'); }, 3600000);
  }, 3600000 - (Date.now() + 1800000) % 3600000);
  */

  hazel.emit('ws_initialized')
};
