// 管理员删除成员
export async function action(_hazel, core, _hold, socket, data) {
  // 验证输入的 trip
  if (!core.verifyTrip(data.trip)) {
    core.replyWarn("INVALID_TRIP", "请检查您输入的识别码。", socket);
    return;
  }

  // 检查识别码是否是成员
  if (!core.config.memberList.includes(data.trip)) {
    core.replyWarn("INVALID_TRIP", "请检查您输入的识别码。", socket);
    return;
  }

  // 检查识别码是否是管理员
  if (core.config.adminList.includes(data.trip)) {
    core.replyWarn("PERMISSION_DENIED", "越权操作。", socket);
    return;
  }

  // 删除成员
  core.removeFromArray(core.config.memberList, data.trip);

  // 保存配置
  core.saveConfig();

  // 查找成员的 socket，如果存在则更新权限
  const matchSockets = core.findSocketTiny("trip", data.trip);
  if (matchSockets.length > 0) {
    matchSockets.forEach((matchSocket) => {
      matchSocket.permission = "USER";
      matchSocket.level = core.config.level.user;

      // 向成员发送消息
      core.replyInfo("PERMISSION_UPDATE", "您的权限已更新。", matchSocket);
    });
  }

  // 向全部成员广播消息
  core.broadcast(
    "info",
    {
      code: "MEMBER_REMOVE",
      text: `已删除成员：${data.trip}`,
      data: { trip: data.trip },
    },
    core.findSocketByLevel(core.config.level.member),
  );

  // 写入存档
  core.archive("RMM", socket, data.trip);
}

export async function run(_hazel, core, _hold) {
  if (!core.commandService) return;
  core.commandService.registerSlashCommand?.(name, action, {
    requiredLevel,
    requiredData,
    description,
  });
}

export const name = "del-member";
export const requiredLevel = 4;
export const requiredData = {
  trip: { description: "识别码" },
};
export const description = "删除成员";
export const dependencies = [
  "command-service",
  "ws-reply",
  "data",
  "app-config",
  "utility",
  "archive",
  "verify",
];
