// 管理员封禁某个 IP
export function action(_hazel, core, hold, socket, data) {
  const IPV4_REGEXP =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  // 检查 IP 是否已经被封禁
  if (hold.bannedIPlist.includes(data.ip)) {
    core.replyMalformedCommand(socket);
    return;
  }

  // 检查 IP 是否合法
  if (!IPV4_REGEXP.test(data.ip)) {
    core.replyWarn("IP_INVALID", "您输入的 IP 不符合格式。", socket);
    return;
  }

  // 封禁该的 IP
  hold.bannedIPlist.push(data.ip);

  // 强制退出该用户
  core.findSocketTiny("remoteAddress", data.ip).forEach((targetSocket) => {
    targetSocket.disconnect?.(true);
  });

  // 通知全部管理员
  core.broadcastInfo(
    "BAN_IP",
    `${socket.nick} 封禁了 IP 地址 \`${data.ip}\`。`,
    core.findSocketByLevel(4),
    { from: socket.nick, ip: data.ip },
  );

  // 写入存档
  core.archive("BIP", socket, data.ip);
}

export function run(_hazel, core, _hold) {
  if (!core.commandService) return;
  core.commandService.registerSlashCommand?.(name, action, {
    requiredLevel,
    requiredData,
    description,
  });
}

export const name = "ban-ip";
export const requiredLevel = 4;
export const requiredData = { ip: { description: "IP 地址" } };
export const description = "封禁某个 IP";
export const dependencies = ["command-service", "ws-reply", "data", "archive"];
