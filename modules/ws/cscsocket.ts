// 修改 ws 包中原有的 WebSocket 对象以更好的支持十字街
import { WebSocket } from "ws";

export class CSCWebSocket extends WebSocket {
  constructor(...args: ConstructorParameters<typeof WebSocket>) {
    super(...args);

    // 生成一个随机的 connectionID
    this.connectionID = Math.random().toString(36).slice(2, 10);
  }

  // 十字街在运行时使用的属性
  connectionID: string;
  remoteAddress: string | undefined;
  isAllowedIP = false;
  isDeniedIP = false;
  handlePrompt = false;

  nick: string | undefined;
  trip: string | undefined;
  permission = "USER";
  level = 1;
  channel: string | undefined;
  isInvisible = false;
  lastWhisperFrom: string | undefined;
  isAlive: boolean;
}

export async function run(hazel, _core, hold) {
  // 在服务器初始化完毕后，替换 ws 包中的 WebSocket 对象
  hazel.on("initialized", () => {
    hold.wsServer.options.WebSocket = CSCWebSocket;
  });

  // 服务器代码重载后，替换 ws 包中的 WebSocket 对象
  hazel.on("reloaded-complete", () => {
    hold.wsServer.options.WebSocket = CSCWebSocket;
  });
}

export const name = "cscsocket";
export const dependencies: string[] = ["data"];
