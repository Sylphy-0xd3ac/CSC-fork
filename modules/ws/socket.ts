// 负责查找 socket、对 socket 发送消息、广播消息等操作（基于 Socket.IO）

export async function run(hazel, core, hold) {
  // 向指定的 socket 发送消息（事件名即 payload.cmd）
  core.reply = (payload, socket) => {
    try {
      if (payload && typeof payload.cmd === "string") {
        socket.emit(payload.cmd, payload);
      }
    } catch (error) {
      hazel.emit("error", error, socket);
    }
  };

  // 添加 prompt 方法（保留占位，未使用）
  core.prompt = (_socket) =>
    new Promise((resolve) => {
      resolve(Object.create(null));
    });

  const iterateAllSockets = (sourceSockets?: any) => {
    if (sourceSockets) {
      // 传入特定集合（Set）
      return Array.from(sourceSockets);
    }
    // 全部在线 socket
    return Array.from(hold.io?.of("/")?.sockets?.values?.() || []);
  };

  core.extendedFindSockets = (filter, sockets) => {
    const filterAttrs = Object.keys(filter);
    const reqCount = filterAttrs.length;
    const matches: any = [];
    const socketList: any = iterateAllSockets(sockets);

    socketList.forEach((socket) => {
      let curMatch = 0;

      for (let loop = 0; loop < reqCount; loop += 1) {
        const filterAttr = filterAttrs[loop];
        const filterAttrValue = filter[filterAttr];
        let socketAttrValue = socket;

        // 支持深层属性
        const attrs = filterAttr.split(".");
        for (const attr of attrs) {
          if (socketAttrValue[attr] !== undefined) {
            socketAttrValue = socketAttrValue[attr];
          } else {
            socketAttrValue = undefined;
            break;
          }
        }

        if (socketAttrValue !== undefined) {
          // 区分值的类型进行比较
          switch (typeof filterAttrValue) {
            case "object":
              if (Array.isArray(filterAttrValue)) {
                if (filterAttrValue.includes(socketAttrValue)) {
                  curMatch++;
                }
              } else if (socketAttrValue === filterAttrValue) {
                curMatch++;
              }
              break;
            case "function":
              if (filterAttrValue(socketAttrValue)) {
                curMatch++;
              }
              break;
            default:
              if (
                socketAttrValue === filterAttrValue ||
                (typeof filterAttrValue === "number" && socketAttrValue > filterAttrValue)
              ) {
                curMatch++;
              }
              break;
          }
        }
      }

      if (curMatch === reqCount) {
        matches.push(socket);
      }
    });

    return matches;
  };

  // 寻找符合条件的 socket
  core.findSocket = (filter, sockets) => {
    if (typeof filter !== "object" || filter === null) {
      return [];
    }
    const attrCount = Object.keys(filter).length;
    const matches: any = [];
    const socketList: any = iterateAllSockets(sockets);

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
  core.findSocketTiny = (attr, value) => {
    const matches: any = [];
    iterateAllSockets().forEach((socket: any) => {
      if (socket[attr] === value) {
        matches.push(socket);
      }
    });
    return matches;
  };

  // 根据给定的用户等级查找 socket
  core.findSocketByLevel = (level, sockets) => {
    const matches: any = [];
    const socketList = iterateAllSockets(sockets);
    socketList.forEach((socket) => {
      if (socket.level >= level) {
        matches.push(socket);
      }
    });
    return matches;
  };

  core.findSocketByLevelDown = (level, sockets) => {
    const matches: any = [];
    const socketList = iterateAllSockets(sockets);
    socketList.forEach((socket) => {
      if (socket.level <= level) {
        matches.push(socket);
      }
    });
    return matches;
  };

  // 向指定的一些 socket 广播消息
  core.broadcast = (payload, sockets) => {
    iterateAllSockets(sockets).forEach((socket) => {
      try {
        if (payload && typeof payload.cmd === "string") {
          socket.emit(payload.cmd, payload);
        }
      } catch (error) {
        hazel.emit("error", error, socket);
      }
    });
  };
}

export const name = "socket";
export const dependencies: string[] = ["utility"];
