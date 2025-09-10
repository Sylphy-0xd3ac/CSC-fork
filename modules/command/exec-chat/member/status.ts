// 查看服务器的一些运行状态

export async function action(hazel, core, hold, socket, _data) {
  // 频率限制器计数
  core.checkAddress(socket.remoteAddress, 3);

  // 准备数据
  let statsText = `### 十字街 ${hazel.mainConfig.version}\nPowered by Hazel Core ${hazel.version}`;
  statsText += "\n#### --- 运行状态 ---";
  statsText += `\n在线连接：${hold.wsServer.clients.size}`;
  statsText += `\n聊天室数：${hold.channel.size}`;
  statsText += `\n请求频率：${core.getFrequency().toFixed(3)} RPM`;
  statsText += `\n运行时间总计：${core.formatTime(Date.now() - hold.startTime)}`;
  statsText += `\n上次重载代码：${core.formatTime(Date.now() - hold.lastReloadTime)}`;
  statsText += "\n#### --- 运行统计 ---";
  statsText += `\n加入用户总数：${hold.stats["users-joined"] || 0}`;
  statsText += `\n消息发送总数：${hold.stats["messages-sent"] || 0}`;
  statsText += `\n首页访问总数：${hold.stats["homepage-visit"] || 0}`;
  statsText += "\n#### --- 系统信息 ---";
  statsText += `\nNode.js 版本：${process.versions.node}`;
  statsText += `\nV8 引擎版本：${process.versions.v8}`;
  statsText += "\n#### --- 运行环境 ---";
  statsText += `\n内存使用：${await core.getMemoryUsage()} MB`;
  statsText += `\nCPU 使用：${await core.getCpuUsage()}%`;

  // 发送数据
  core.replyInfo("STATS", statsText, socket, {
    uptime: Date.now() - hold.startTime,
    lastReload: Date.now() - hold.lastReloadTime,
    frequency: core.getFrequency(),
    online: hold.wsServer.clients.size,
    channels: hold.channel.size,
    usersJoined: hold.stats["users-joined"] || 0,
    messagesSent: hold.stats["messages-sent"] || 0,
    homepageVisit: hold.stats["homepage-visit"] || 0,
  });

  // 写入存档
  core.archive("SAS", socket, "");
}

export async function run(_hazel, core, _hold) {
  if (!core.commandService) return;
  core.commandService.registerSlashCommand?.(name, action, {
    requiredLevel,
    requiredData,
    description,
  });
}

export const name = "status";
export const requiredLevel = 2;
export const requiredData = {};
export const description = "查看服务器状态";
export const dependencies = ["command-service", "stats", "archive", "address-checker"];
