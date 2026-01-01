// 站长添加管理员
export function action(_hazel, core, _hold, socket, data) {
  // 验证输入的 trip
  if (!core.verifyTrip(data.trip)) {
    core.replyWarn("INVALID_TRIP", "请检查您输入的识别码。", socket);
    return;
  }

  // 检查识别码是否已经是管理员
  if (core.config.adminList.includes(data.trip)) {
    core.replyWarn("INVALID_TRIP", "请检查您输入的识别码。", socket);
    return;
  }

  // 检查识别码是否是成员，如果是则删除
  if (core.config.memberList.includes(data.trip)) {
    core.removeFromArray(core.config.memberList, data.trip);
    return;
  }

  // 添加管理员
  core.config.adminList.push(data.trip);

  // 保存配置
  core.saveConfig();

  // 查找管理员的 socket，如果存在则更新权限
  const matchSockets = core.findSocketTiny("trip", data.trip);
  if (matchSockets.length > 0) {
    matchSockets.forEach((matchSocket) => {
      matchSocket.permission = "ADMIN";
      matchSocket.level = core.config.level.admin;

      // 向该管理员发送消息
      core.replyInfo("PERMISSION_UPDATE", "您的权限已更新。", matchSocket);
    });
  }

  // 向全部成员广播消息
  core.broadcast(
    "info",
    {
      code: "ADMIN_ADD",
      text: `已添加新管理员：${data.trip}`,
      data: { trip: data.trip },
    },
    core.findSocketByLevel(core.config.level.member),
  );

  // 写入存档
  core.archive("ADA", socket, data.trip);
}

export function run(_hazel, core, _hold) {
  if (!core.commandService) return;
  core.commandService.registerSlashCommand?.(name, action, {
    requiredLevel,
    requiredData,
    description,
  });
}

export const name = "add-admin";
export const requiredLevel = 10;
export const requiredData = {
  trip: { description: "识别码" },
};
export const description = "添加管理员";
export const dependencies = ["command-service", "ws-reply", "archive"];
