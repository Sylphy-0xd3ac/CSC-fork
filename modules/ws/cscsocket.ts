// 在 Socket.IO 模式下不再需要继承 WebSocket，本模块保留占位以维持加载顺序。

export async function run(_hazel, _core, _hold) {
  // no-op
}

export const name = "cscsocket";
export const dependencies: string[] = ["data"];
