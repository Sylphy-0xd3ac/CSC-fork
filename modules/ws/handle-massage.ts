// 处理消息（Socket.IO 事件化后，本模块保留占位，兼容加载顺序）

export async function run(_hazel, core, _hold) {
  core.handleData = async (_socket, _data) => {
    // 在 Socket.IO 模式下，命令通过事件直接触发，故这里无需处理。
    return;
  };
}

export const name = "handle-message";
export const dependencies: string[] = [
  "ws-reply",
  "command-service",
  "logger",
  "address-checker",
  "utility",
];
