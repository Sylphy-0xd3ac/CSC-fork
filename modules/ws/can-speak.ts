// 判断一个 socket 现在是否可以发言
export async function run(hazel, core, hold) {
  core.canSpeak = function (socket) {
    // 检查用户是否在聊天室内
    if (typeof socket.channel == "undefined") {
      return false;
    }

    // 检查聊天室是否存在
    if (!hold.channel.has(socket.channel)) {
      // 如果聊天室不存在，将用户的 channel 设置为 undefined
      socket.channel = undefined;
      return false;
    }

    // 检查用户是否被禁言
    if (hold.muteUntil.has(socket.remoteAddress)) {
      // 如果禁言时间已过
      if (hold.muteUntil.get(socket.remoteAddress) < Date.now()) {
        // 移除禁言时间
        hold.muteUntil.delete(socket.remoteAddress);
      } else {
        // 否则禁止发言
        // 发送禁言提示
        let time = hold.muteUntil.get(socket.remoteAddress) - Date.now();
        core.replyWarn(
          "MUTED",
          "您已经被管理员禁言，将于 " +
            Math.ceil(time / 60000) +
            " 分钟后解除禁言。",
          socket,
          { time },
        );

        // 频率计数器计数
        core.checkAddress(socket.remoteAddress, 5);
        return false;
      }
    }
    return true;
  };
}

export const name = "can-speak";
export const dependencies: string[] = ["ws-reply", "data"];
