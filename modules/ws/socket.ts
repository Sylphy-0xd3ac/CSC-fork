// 负责查找 socket、对 socket 发送消息、广播消息等操作

export async function run(hazel, core, hold) {
  // 向指定的 socket 发送消息
  core.reply = (payload, socket) => {
    try {
      if (socket.readyState === 1 /* OPEN */) {
        socket.send(JSON.stringify(payload));
      }
    } catch (error) {
      hazel.emit("error", error, socket);
    }
  };

  // 添加 prompt 方法
  core.prompt = (socket) =>
    new Promise((resolve) => {
      const messageHandler = (message) => {
        // 处理消息并解析
        const data = JSON.parse(message);
        // 移除事件监听器
        socket.off("message", messageHandler);
        // 解析并返回数据
        resolve(data);
      };

      // 添加事件监听器
      socket.on("message", messageHandler);
      socket.handlePrompt = true;
    });

  core.extendedFindSockets = (filter, sockets) => {
    const filterAttrs = Object.keys(filter);
    const reqCount = filterAttrs.length;
    const matches: any = [];
    const socketList: any = sockets || hold.wsServer.clients;

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
  // 本函数高度来源于 https://github.com/hack-chat/main/blob/master/server/src/serverLib/MainServer.js#L353
  // 功能太强一般用不到，先注释掉
  core.hackchatFindSockets = (filter) => {
    const filterAttrs = Object.keys(filter);
    const reqCount = filterAttrs.length;
    let curMatch = 0;
    const matches: any = [];
    const socketList: any = hold.wsServer.clients;
    socketList.forEach((socket) => {
      curMatch = 0;
      for (let loop = 0; loop < reqCount; loop += 1) {
        const filterAttrValue = filter[filterAttrs[loop]];
        if (typeof socket[filterAttrValue] !== "undefined") {
          switch (typeof filter[filterAttrValue]) {
            // 这里暂时删除根据数组匹配的功能
            case "object": {
              if (Array.isArray(filter[filterAttrs[loop]])) {
                if (filter[filterAttrs[loop]].indexOf(socket[filterAttrs[loop]]) !== -1) {
                  curMatch += 1;
                }
              } else if (socket[filterAttrs[loop]] === filter[filterAttrs[loop]]) {
                curMatch += 1;
              }
              break;
            }

            case "function": {
              if (filter[filterAttrValue](socket[filterAttrValue])) {
                curMatch += 1;
              }
              break;
            }

            default: {
              if (socket[filterAttrValue] === filter[filterAttrValue]) {
                curMatch += 1;
              }
              break;
            }
          }
        }
      }

      if (curMatch === reqCount) {
        matches.push(socket);
      }
    });

    return matches;
  };

  // 使用属性为字符串的过滤条件查找 socket
  core.findSocket = (filter, sockets) => {
    //检查属性
    if (typeof filter !== "object" || filter === null) {
      return [];
    }
    const attrCount = Object.keys(filter).length;
    let curMatch = 0;
    const matches: any = [];
    const socketList = sockets || hold.wsServer.clients;
    socketList.forEach((socket) => {
      curMatch = 0;
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
    hold.wsServer.clients.forEach((socket: any) => {
      if (socket[attr] === value) {
        matches.push(socket);
      }
    });
    return matches;
  };

  // 根据给定的用户等级查找 socket
  core.findSocketByLevel = (level, sockets) => {
    const matches: any = [];
    const socketList = sockets || hold.wsServer.clients;
    socketList.forEach((socket) => {
      if (socket.level >= level) {
        matches.push(socket);
      }
    });
    return matches;
  };

  core.findSocketByLevelDown = (level, sockets) => {
    const matches: any = [];
    const socketList = sockets || hold.wsServer.clients;
    socketList.forEach((socket) => {
      if (socket.level <= level) {
        matches.push(socket);
      }
    });
    return matches;
  };

  // 向指定的一些 socket 广播消息
  core.broadcast = (payload, sockets) => {
    sockets.forEach((socket) => {
      try {
        if (socket.readyState === 1 /* OPEN */) {
          socket.send(JSON.stringify(payload));
        }
      } catch (error) {
        hazel.emit("error", error, socket);
      }
    });
  };
}

export const name = "socket";
export const dependencies: string[] = [];
