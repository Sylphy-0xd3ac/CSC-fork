// 禁言某用户
export async function action(hazel, core, hold, socket, data) {
  // 检查昵称是否正确
  if (!core.verifyNickname(data.nick)) {
    core.replyMalformedCommand(socket);
    return;
  }
  // 未指定时间默认为 10 分钟
  if (!data.mins) {
    data.mins = "10";
  }

  let muteMins = parseInt(data.mins);

  // 如果 mins 不是整数
  if (muteMins.toString() !== data.mins) {
    core.replyMalformedCommand(socket);
    return;
  }

  // 如果 mins 小于 0
  if (muteMins < 0) {
    core.replyMalformedCommand(socket);
    return;
  }

  // 检查昵称
  if (!core.verifyNickname(data.nick)) {
    core.replyWarn(
      "NICKNAME_INVALID",
      "昵称应当仅由汉字、字母、数字和不超过 3 个的特殊字符（_-+.:;）组成，而且不能太长。",
      socket,
    );
    return;
  }

  // 查找目标用户
  let [targetSocket] = core.findSocket({
    channel: socket.channel,
    nick: data.nick,
  });

  // 如果目标用户不存在
  if (!targetSocket) {
    core.replyWarn(
      "USER_NOT_FOUND",
      "在这个聊天室找不到您指定的用户。",
      socket,
    );
    return;
  }

  // 检查是否越权
  if (targetSocket.level >= socket.level) {
    core.replyWarn("PERMISSION_DENIED", "越权操作。", socket);
    return;
  }

  // 记录禁言时间
  hold.muteUntil.set(
    targetSocket.remoteAddress,
    Date.now() + muteMins * 60 * 1000,
  );

  // 通知全部成员
  core.broadcastInfo(
    "MUTE_USER",
    socket.nick +
      " 在 " +
      socket.channel +
      " 禁言了 " +
      targetSocket.nick +
      "，时长 " +
      muteMins +
      " 分钟，IP 地址 `" +
      targetSocket.remoteAddress +
      "`。",
    core.findSocketByLevel(4),
    {
      from: socket.nick,
      channel: socket.channel,
      target: targetSocket.nick,
      mins: muteMins,
      address: targetSocket.remoteAddress,
    },
  );
}

export async function run(hazel, core, hold) {
  if (!core.commandService) return;
  core.commandService.registerSlashCommand?.(name, action, {
    requiredLevel,
    requiredData,
    description,
  });
}

export const name = "mute";
export const requiredLevel = 4;
export const requiredData = {
  nick: { description: "用户昵称" },
  mins: { description: "禁言时长" },
};
export const description = "禁言聊天室中某人";
export const dependencies = ["command-service", "ws-reply", "data"];
