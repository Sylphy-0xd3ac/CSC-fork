// 负责查找 socket、对 socket 发送消息、广播消息等操作（基于 Socket.IO）

export function run(hazel, core, hold) {
  type Socket = { level: number } & Record<string, unknown> & {
      _boundActions?: Set<string>;
      on: (name: string, handler: (data: unknown) => unknown) => unknown;
      emit: (event: string, payload: unknown) => void;
      handshake: { address: string };
      disconnect: (...args: [true, ...unknown[]]) => void;
    } & {
      listeners: (arg0: string) => ((...args: unknown[]) => void)[];
      off: (arg0: string, arg1: (payload: unknown) => void) => void;
      on: (arg0: string, arg1: (payload: unknown) => void) => void;
      removeAllListeners: (arg0: string) => void;
    };
  /* 
    向指定的 socket 发送消息（事件名即 payload.cmd）
    @deprecated 使用 socket.emit 替代
  */
  core.reply = (event: string, payload: Record<string, unknown>, socket: Socket) => {
    try {
      if (payload) {
        socket.emit(event, payload);
      }
    } catch (error) {
      hazel.emit("error", error, socket);
    }
  };

  // 添加 prompt 方法（保留占位，未使用）
  core.prompt = (socket: Socket) =>
    new Promise((resolve) => {
      // 获取原事件监听器
      const listeners = socket.listeners("chat");
      const messageHandler = (payload: unknown) => {
        // 处理消息并解析
        let data = JSON.parse(payload as string);
        // 净化数据防止原型链污染
        data = core.purifyObject(data);
        // 移除事件监听器
        socket.off("chat", messageHandler);
        for (const listener of listeners) {
          socket.on("chat", listener);
        }
        // 解析并返回数据
        resolve(data.text);
      };

      // 添加事件监听器
      socket.removeAllListeners("chat");
      socket.on("chat", messageHandler);
    });
  const iterateAllSockets = (sourceSockets?: Set<Socket>): Socket[] => {
    if (sourceSockets) {
      // 传入特定集合（Set）
      return Array.from(sourceSockets);
    }
    // 全部在线 socket
    const allSockets = hold.io?.of("/")?.sockets?.values?.();
    return allSockets
      ? Array.from(allSockets).map((socket: Socket) => ({ ...socket, level: socket.level || 0 }))
      : [];
  };

  // 寻找符合条件的 socket
  core.findSocket = (filter, sockets) => {
    if (typeof filter !== "object" || filter === null) {
      return [];
    }
    const attrCount = Object.keys(filter).length;
    const matches: Socket[] = [];
    const socketList: Socket[] = iterateAllSockets(sockets);

    socketList.forEach((socket) => {
      let curMatch = 0;
      for (const attr in filter) {
        if (socket[attr] === filter[attr]) {
          curMatch += 1;
        }
      }
      if (curMatch === attrCount) {
        matches.push(socket);
      }
    });
    return matches;
  };

  // 使用一个属性作为过滤条件查找 socket
  core.findSocketTiny = (attr: string, value: unknown): Array<Record<string, unknown>> => {
    const matches: Array<Record<string, unknown>> = [];
    iterateAllSockets().forEach((socket: Record<string, unknown>) => {
      if (socket[attr] === value) {
        matches.push(socket);
      }
    });
    return matches;
  };

  // 根据给定的用户等级查找 socket
  core.findSocketByLevel = (level: number, sockets?: Set<Socket>): Array<{ level: number }> => {
    const matches: Array<{ level: number }> = [];
    const socketList = iterateAllSockets(sockets);
    socketList.forEach((socket: { level: number }) => {
      if (socket.level >= level) {
        matches.push(socket);
      }
    });
    return matches;
  };

  core.findSocketByLevelDown = (level: number, sockets?: Set<Socket>): Array<{ level: number }> => {
    const matches: Array<{ level: number }> = [];
    const socketList = iterateAllSockets(sockets);
    socketList.forEach((socket: { level: number }) => {
      if (socket.level <= level) {
        matches.push(socket);
      }
    });
    return matches;
  };

  // 向指定的一些 socket 广播消息
  core.broadcast = (event: string, payload: unknown, sockets?: Set<Socket>) => {
    iterateAllSockets(sockets).forEach(
      (socket: { emit: (cmd: string, payload: unknown) => void }) => {
        try {
          if (payload) {
            socket.emit(event, payload);
          }
        } catch (error) {
          hazel.emit("error", error, socket);
        }
      },
    );
  };
}

export const name = "socket";
export const dependencies: string[] = ["utility"];
