# Crosst-NeXt 全面迁移 Socket.IO 可行性评估报告

作者: Sylphy 评估时间: 2025-04

本报告基于以下代码与资源进行评估：
- 后端：/hazel, /modules, main.ts, config.yml, config/config.yml
- 前端：/client.zip（已解包至 /client）

结论摘要
- 可行性：整体迁移到 Socket.IO 可行，建议采用“可插拔传输层适配器”的渐进式改造方案，先并行接入 Socket.IO，再逐步切换默认传输。
- 影响面：前端改动中等（替换原生 WebSocket API，事件名适配）；后端改动较大但局部可控（ws-server、心跳与清理逻辑、CSCWebSocket、socket/broadcast、handle-message、disconnect、ws-reply 等）。核心命令系统与业务模块（join/chat/ban/mute/roomlist 等）可基本复用。
- 风险：
  - 连接管理语义变化（Socket.IO 连接=Engine.IO 抽象，支持轮询回退）；
  - 反向代理配置、X-Forwarded-For 与 IP 获取语义；
  - 事件风格从“单信道 JSON(cmd)”向“多事件/命名空间/房间”迁移时的协议稳定性；
  - 与旧 WebSocket 客户端的共存/回退策略。
- 收益：
  - 自动重连、心跳与断线检测内置，减少自维护代码；
  - 房间广播、高级广播语义、ack、超时、命名空间、更丰富的中间件能力；
  - 更稳定的跨网络环境表现（HTTP 长轮询回退）。

一、当前架构与关键点
1. Hazel 模块化核心
- core：配置、日志、IP/CIDR 允许-拒绝树、速率限制、数据/存档、命令服务、统计与工具。
- ws：ws-server、ws-handler、cscsocket（扩展 WebSocket）、handle-message、socket（reply/broadcast/find）、disconnect、verify/can-speak/ws-reply 等。

2. 前端协议
- 使用原生 WebSocket：new WebSocket(wsAddress)
- 单管道 JSON 协议：客户端 send({cmd,...})，服务端按 cmd 路由（commandService.handle），服务端回包亦为 {cmd: 'info'|'warn'|'chat'|...}
- 心跳/断线处理：前端仅关注 onclose/onerror 提示；心跳主要由服务端维护。

3. 后端与 ws 强耦合点
- 心跳与清理：modules/ws/server.ts 定时 ping/pong 与 isAlive + 超时终止；activeClients 自维护；
- 连接封装：CSCWebSocket 继承 ws.WebSocket，增加运行期字段（connectionID、remoteAddress、level/permission/channel/isInvisible/lastWhisperFrom/isAlive 等）；
- 事件面向字符串消息：handle-message.ts 将 Buffer 转字符串，做长度/JSON/类型/净化校验，再交给 commandService；
- 广播/筛选：socket.ts 在 hold.wsServer.clients 与 hold.channel.socketList 上遍历；reply/broadcast 直接调用 socket.send(JSON.stringify(...))；
- 断开：disconnect.ts 直接 socket.terminate()，并做在线列表与频道清理与广播；
- IP 获取与风控：ws-handler.ts 通过 request.socket.remoteAddress 或 X-Forwarded-For；CIDR、ban、mute 都依赖此地址。

二、迁移到 Socket.IO 的影响面与映射
1. 连接与心跳
- Socket.IO 内置心跳（pingInterval/pingTimeout）与自动重连、连接状态；无需自写 ping/pong/isAlive/cleanup 定时器。
- server.ts 可删除：
  - 自维护 activeClients 与定时清理；
  - 心跳循环与 isAlive 字段；
  - WebSocket.OPEN/CONNECTING/terminate 语义切换为 socket.disconnect(true)。

2. 连接对象模型
- 无法继续通过继承来扩展 Socket（Socket.IO 的 Socket 非 class 继承扩展场景），应改为：
  - 使用 socket.data 保存运行期字段（nick/trip/permission/level/channel/isInvisible/lastWhisperFrom 等）；
  - 或在 core 层封装一层“会话”对象（推荐使用 socket.data 简化）。
- 原 CSCWebSocket 的功能迁移：
  - connectionID 可用 socket.id 或自有 ID 存入 socket.data.connectionID；
  - remoteAddress 使用 socket.handshake.address 或从 socket.handshake.headers['x-forwarded-for'] 解析；Nginx/反代需启用 trustProxy 语义（参见工程配置调整）。

3. 事件模型与协议
- 方案 A（最小改动）：保留单事件/单通道 JSON 协议
  - 客户端：将 ws.send(JSON.stringify(payload)) 改为 socket.emit('message', JSON.stringify(payload))；
  - 服务端：从 socket.on('message', (raw) => { JSON.parse(raw); ... }) 进入 commandService；
  - ws-reply/socket.reply/broadcast：改为 socket.emit('server', payload) 或仍用 'message' 事件（可同名）。
  - 优点：后端 commandService/requiredData 校验/业务 action 几乎不动；
  - 缺点：没有充分利用多事件语义，仍是单通道 JSON。
- 方案 B（合理演进）：将 cmd 作为事件名
  - 客户端：send({cmd:'join', ...}) 改为 socket.emit('join', {...})；
  - 服务端：socket.on('join', (data) => handleJoin(...))；
  - ws-reply/broadcast：按事件名直接 emit('chat'|'info'|'warn'...);
  - 优点：更贴合 Socket.IO 模型；
  - 缺点：commandService 需要拆分/改造（代价较大）。
- 建议策略：以方案 A 为第一阶段，保证服务端业务最小改动；稳定后再按需演进到方案 B。

4. 房间与广播
- Socket.IO 提供原生 rooms：socket.join(channel)，io.to(channel).emit(...)
- 现有 hold.channel: { isLocked,lastActive,socketList:Set } 建议保留其中 lastActive/isLocked 等状态，但 socketList 可选：
  - 方案 1（兼容现状）：继续维护 socketList（Set<Socket>），所有查找/广播逻辑保持不变（只把 send 改为 emit）。
  - 方案 2（拥抱 SIO）：放弃 socketList，借助 io.adapter rooms 管理；涉及 findSocket/extendedFindSockets 等函数需改写为基于 rooms + 内存映射（复杂度中等）。
- 建议：第一阶段沿用 socketList；第二阶段再考虑 rooms 的全面接管。

5. 消息处理、速率限制与校验
- handle-message.ts 改动：
  - 若走方案 A：socket.on('message', (raw:string) => parse/校验/commandService.handle)。
  - 若走方案 B：对每个事件定义 requiredData 与权限，命令服务做“分发器”或退场（工作量明显增加）。
- 速率限制（rate limiter）与数据长度校验、JSON 净化（purifyObject）逻辑保持不变；仅需将 remoteAddress 的来源切换到 handshake。

6. 断开、踢人与清理
- 'disconnect' 事件替代 'close'；
- 踢出：socket.disconnect(true)；
- 清理：删除 socketList & hold.channel 内容；若房间空则删房；广播 onlineRemove。

7. IP 与 CIDR、ban/mute、站点策略
- socket.handshake.address + X-Forwarded-For 解析后仍可沿用现有 CIDR/ban/mute 流程；
- 注意反代下的真实 IP 获取：需配置 server.httpServer.set('trust proxy', true) 或在 Socket.IO 层设置 trustProxy。

8. 配置与部署
- 新增配置项建议：
  - transport: 'ws' | 'socketio'（渐进切换）；
  - socketio: { path: '/socket.io', cors: {origin: [...], credentials: true}, pingInterval, pingTimeout, allowEIO3, connectionStateRecovery }
- 反向代理（Nginx/Caddy）需开放 /socket.io/ 路径的 WebSocket/HTTP 轮询；
- Docker 端口策略不变；若保持相同端口，Socket.IO 可内部自建 HTTP 服务器：new Server(port, {...})。

三、前端改造评估
1. 现状
- client/js/utility.js: wsAddress 固定为 ws://127.0.0.1:52764
- client/js/client.js: new WebSocket(wsAddress)，ws.onopen/onmessage/onclose；send(JSON.stringify(obj))；COMMANDS 映射。

2. 迁移要点
- 引入 socket.io-client（CDN 或 vendor 目录）
- 方案 A（最小改动）：
  - 连接：const socket = io('http://127.0.0.1:52764', { path:'/socket.io', transports:['websocket'] });
  - 发：function send(data){ socket.emit('message', JSON.stringify(data)) }
  - 收：socket.on('message', (raw)=>{ const args=JSON.parse(raw); const cmd=args.cmd; COMMANDS[cmd]?.(args) })
  - 错误/断线：socket.on('connect_error', ...); socket.on('disconnect', ...); socket.on('reconnect', ...)
  - 心跳：无需自制；
- 方案 B（事件驱动）：
  - 发：socket.emit(data.cmd, data)
  - 收：socket.on('chat'|'info'|'warn'|'onlineSet'|... , handler)
- 其他：保留 localStorage 登录信息与 UI 流程不变；可利用 Socket.IO 的自动重连提升体验。

3. 兼容旧客户端
- 过渡期建议在后端同时跑 ws 与 socket.io（不同 path/端口），前端提供“新连接方式”开关；稳定后默认启用 Socket.IO。

四、后端改造计划（建议按阶段推进）
阶段 0：预备工作（0.5 天）
- 添加依赖：socket.io（server），socket.io-client（用于本地联调可选）。
- 在配置中增加 transport 与 socketio 子配置（默认仍为 ws）。

阶段 1：传输层适配器（1 天）
- 新建 modules/transport/adapter.ts：
  - 统一导出 core.reply(payload,socket)、core.broadcast(payload,sockets)、core.prompt(socket) 等签名；
  - 当 transport === 'ws' 时，复用现有实现；当为 'socketio' 时，调用 SIO 语义（emit、to(room).emit 等）。
- 将 ws/socket.ts 中“查找/广播/回复”能力迁到适配层，其他业务模块仅依赖 core.* 接口，不直接持有 ws 实现细节。

阶段 2：接入 Socket.IO（1 天）
- 新建 modules/sio/server.ts：按 config.socketio 创建 new Server(port,{path,cors,pingInterval, pingTimeout})；
- 注册 'connection' 事件：封装为 core.handle_connection 的等价入口；
- 用 socket.data 替代 CSCWebSocket 字段；
- 复制/改写 ws-handler.ts 逻辑为 sio-handler.ts（IP/频控/ban 检查、错误处理、不合法关闭）。
- 逐步对接 handle-message、disconnect、ws-reply 到适配层。

阶段 3：频道与广播（0.5-1 天）
- 第一阶段继续使用 hold.channel.socketList；
- 或者切到 socket.join(channel) + io.to(channel).emit，保留 lastActive/isLocked；
- 验证 onlineAdd/onlineRemove、一致性（昵称去重、离线清理）。

阶段 4：联调与灰度（1-2 天）
- 前端切换到方案 A；
- 双栈运行（ws + sio）并对比日志/指标；
- 压测验证（连接数、广播延迟、历史消息、公告、命令/权限校验）。

阶段 5（可选）：事件化协议（1-2 天）
- 将 cmd 拆为多事件，逐步弱化 commandService 对“消息”事件的耦合；
- 人机可读性增强、便于按事件做权限/参数校验与限流策略。

五、工作量评估（人日）
- 适配层与 SIO 接入：2-3 天
- 前端适配与联调：0.5-1 天
- 压测、灰度与回归：1-2 天
- 事件化协议演进（可选）：1-2 天
合计：约 4-6 天（不含可选演进）。

六、风险与注意事项
- 反代与真实 IP：需验证 socket.handshake.address 与 X-Forwarded-For 在各种代理/容器场景下的行为；必要时开启 trustProxy。
- 轮询回退与限流：Engine.IO 的轮询可能带来不同的“请求频次”观感，但限流在“消息事件”维度执行，通常不受影响；如需精细化，可在连接层附加节流中间件。
- 断线/重连时在线列表：Socket.IO 自动重连可能短时间内触发 disconnect->reconnect 序列，onlineRemove/onlineAdd 视觉抖动需要通过超时抑制或状态合并处理。
- 旧客户端兼容：过渡期并行服务/路径隔离；禁用后需明确公告。
- CSCWebSocket 替换：不要尝试继承 Socket；一律改为 socket.data 存储状态。

七、示例代码片段（参考方向）
1) 服务器（最小改动的 message 通道）
```
// modules/sio/server.ts
import { Server } from 'socket.io';
export async function run(hazel, core, hold){
  if (hold.io) return;
  const io = hold.io = new Server(hazel.mainConfig.port, {
    path: hazel.mainConfig.socketio?.path ?? '/socket.io',
    cors: hazel.mainConfig.socketio?.cors ?? { origin: '*'} ,
    pingInterval: hazel.mainConfig.wsHeartbeatInterval,
    pingTimeout: hazel.mainConfig.wsHeartbeatTimeout,
  });
  io.on('connection', (socket) => {
    // 统一入口：等价于 ws-handler
    socket.data.remoteAddress = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    core.handle_connection_sio?.(socket);
    socket.on('message', async (raw) => core.handleData?.(socket, raw));
    socket.on('disconnect', () => core.removeSocket?.(socket));
  });
}
```

2) 适配层（reply/broadcast）
```
core.reply = (payload, socket) => socket.emit('message', JSON.stringify(payload));
core.broadcast = (payload, sockets) => sockets.forEach(s => s.emit('message', JSON.stringify(payload)));
```

3) 客户端（最小改动）
```
// 替换 new WebSocket(wsAddress)
const socket = io('http://127.0.0.1:52764', { path:'/socket.io', transports:['websocket'] });
function send(data){ socket.emit('message', JSON.stringify(data)); }
socket.on('message', (raw) => {
  const args = JSON.parse(raw);
  const cmd = args.cmd;
  COMMANDS[cmd]?.(args);
});
```

八、配置建议（示例）
```
# config.yml
socketio:
  path: "/socket.io"
  cors:
    origin: ["https://crosst.chat", "http://127.0.0.1:3000"]
    credentials: true
transport: "ws"   # 过渡期默认 ws；切换后置 "socketio"
```

九、结论与建议
- 迁移到 Socket.IO 在工程上完全可行，且能显著减少底层连接与心跳维护工作，提升端到端稳定性与用户体验；
- 强烈建议以“传输层适配器 + 双栈灰度”的方式进行，先实现协议保持不变的最小改动方案（方案 A），在不打扰业务模块的前提下上线；待稳定后再逐步事件化协议以释放 Socket.IO 能力；
- 切换过程中需重点关注：反代/真实 IP、在线列表抖动、限流一致性、旧客户端兼容与回退路径。

如需我落地 PoC，可在现分支下新增 modules/sio/* 与 transport 适配层，保持 join/chat 流程跑通并提供切换开关，预计 2~3 天可交付可测版本。
