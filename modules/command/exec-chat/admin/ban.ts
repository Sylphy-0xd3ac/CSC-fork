// 管理员封禁聊天室中某人的 IP
export async function action(_hazel, core, hold, socket, data) {
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
  const [targetSocket] = core.findSocket({
    channel: socket.channel,
    nick: data.nick,
  });

  // 如果目标用户不存在
  if (!targetSocket) {
    core.replyWarn("USER_NOT_FOUND", "在这个聊天室找不到您指定的用户。", socket);
    return;
  }

  // 检查是否越权
  if (targetSocket.level >= socket.level) {
    core.replyWarn("PERMISSION_DENIED", "越权操作。", socket);
    return;
  }

  // 封禁该用户的 IP
  hold.bannedIPlist.push(targetSocket.remoteAddress);

  // 强制退出该用户
  core.findSocketTiny("remoteAddress", targetSocket.remoteAddress).forEach((targetSocket) => {
    targetSocket.terminate();
  });

  // 通知全部管理员
  core.broadcastInfo(
    "BAN_USER",
    `${socket.nick} 在 ${socket.channel} 封禁了 ${targetSocket.nick}，目标 IP 地址为 \`${targetSocket.remoteAddress}\`。`,
    core.findSocketByLevel(4),
    {
      from: socket.nick,
      channel: socket.channel,
      target: targetSocket.nick,
      ip: targetSocket.remoteAddress,
    },
  );

  // 写入存档
  core.archive("BAN", socket, targetSocket.nick);
}

export async function run(_hazel, core, _hold) {
  if (!core.commandService) return;
  core.commandService.registerSlashCommand?.(name, action, {
    requiredLevel,
    requiredData,
    description,
  });
}

export const name = "ban";
export const requiredLevel = 4;
export const requiredData = { nick: { description: "用户昵称" } };
export const description = "封禁聊天室中某人的 IP";
export const dependencies = ["command-service", "ws-reply", "data", "archive", "verify"];
