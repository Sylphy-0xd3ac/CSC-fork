// 用于处理用户断开连接（Socket.IO 版本）
export function run(_hazel, core, hold) {
  core.removeSocket = (socket) => {
    // 向所有用户广播用户退出的消息
    if (!socket.isInvisible) {
      if (typeof socket.channel === "string" && hold.channel.has(socket.channel)) {
        core.broadcast(
          "onlineRemove",
          {
            nick: socket.nick,
          },
          hold.channel.get(socket.channel).socketList,
        );

        // 从 hold.channel 中删除用户
        hold.channel.get(socket.channel).socketList.delete(socket);

        // 如果用户退出的房间是 hold.channel 中最后一个用户，则删除该房间
        if (hold.channel.get(socket.channel).socketList.size === 0) {
          hold.channel.delete(socket.channel);
        }

        // 写入存档
        core.archive("LEF", socket, "");
      }
    }
  };
}

export const name = "disconnect";
export const dependencies: string[] = ["socket", "data"];
