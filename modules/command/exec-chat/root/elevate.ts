// 提权至 root 权限
export function action(_hazel, core, _hold, socket, data) {
  // 验证输入的 root 密码
  if (data.passcode !== core.config.rootPasscode) {
    // 进行严格的频率限制
    core.checkAddress(socket.remoteAddress, 12000000);
    return;
  }

  // 提权
  socket.trip = "/ROOT/";
  socket.permission = "ROOT";
  socket.level = core.config.level.root;

  // 向该用户发送成功消息
  core.replyInfo("PERMISSION_UPDATE", "您的权限已更新。", socket);

  // 写入存档
  core.archive("ERT", socket, "");
}

export function run(_hazel, core, _hold) {
  if (!core.commandService) return;
  core.commandService.registerSlashCommand?.(name, action, {
    requiredLevel,
    requiredData,
    description,
  });
}

export const name = "elevate";
export const requiredLevel = 1;
export const requiredData = {
  passcode: { description: "提权密码" },
};
export const description = "提权至 root 权限";
export const dependencies = ["command-service", "ws-reply", "archive"];
