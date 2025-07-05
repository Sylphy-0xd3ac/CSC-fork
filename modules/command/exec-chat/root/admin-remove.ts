// 站长删除管理员
export async function action(hazel, core, hold, socket, line) {
  let data;
  if (typeof line === "string") {
    let trip = line.slice(9).trim();
    if (!core.verifyTrip(trip)) {
      core.replyMalformedCommand(socket);
      return;
    }
    data = { trip };
  } else {
    data = line;
  }

  // 验证输入的 trip
  if (!core.verifyTrip(data.trip)) {
    core.replyWarn("INVALID_TRIP", "请检查您输入的识别码。", socket);
    return;
  }

  // 检查识别码是否是管理员
  if (!core.config.adminList.includes(data.trip)) {
    core.replyWarn("INVALID_TRIP", "请检查您输入的识别码。", socket);
    return;
  }

  // 删除管理员
  core.removeFromArray(core.config.adminList, data.trip);

  // 保存配置
  core.saveConfig();

  // 查找管理员的 socket，如果存在则更新权限
  let matchSockets = core.findSocketTiny("trip", data.trip);
  if (matchSockets.length > 0) {
    matchSockets.forEach((matchSocket) => {
      matchSocket.permission = "USER";
      matchSocket.level = core.config.level.user;

      // 向该管理员发送消息
      core.replyInfo("PERMISSION_UPDATE", "您的权限已更新。", matchSocket);
    });
  }

  // 向全部成员广播消息
  core.broadcast(
    {
      cmd: "info",
      code: "ADMIN_REMOVE",
      text: "已删除管理员：" + data.trip,
      data: { trip: data.trip },
    },
    core.findSocketByLevel(core.config.level.member),
  );

  // 写入存档
  core.archive("RMA", socket, data.trip);
}

// 自动注册到 commandService
export async function run(hazel, core, hold) {
  if (!core.commandService) return;
  core.commandService.registerSlashCommand?.(name, action, {
    requiredLevel,
    requiredData,
    description,
  });
}

export const name = "del-admin";
export const requiredLevel = 10;
export const requiredData = [{ trip: { description: "识别码" } }];
export const description = "删除管理员";
export const dependencies = ["command-service", "ws-reply"];
