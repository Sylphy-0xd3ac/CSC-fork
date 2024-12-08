import fs from "node:fs";

export async function reloadAll(hazel, core, hold, socket, line) {
  core.replyInfo("ROOT", "全部命令重载请求已接收。", socket);

  // 重载十字街
  await hazel.reloadModules(false);

  // 记录重载时间
  hold.lastReloadTime = Date.now();

  // 发送重载完成消息
  core.replyInfo(
    "ROOT",
    "全部命令重载完成, 当前公用版本为 " + hazel.functionLoadID + "。",
    socket,
  );
}

export async function reloadModule(hazel, core, hold, socket, line) {
  // 解析参数
  let args = core.splitArgs(line);
  let moduleName = args[1];
  let modulePath = await hazel.getModulePath(moduleName);

  if (!modulePath || !fs.existsSync(modulePath)) {
    core.replyInfo("ROOT", "模块 " + moduleName + " 不存在。", socket);
    return;
  }

  // 重载指定模块
  core.replyInfo("ROOT", `模块 ${moduleName} 重载请求已接收。`, socket);
  await hazel.reloadModule(modulePath);

  // 发送重载完成消息
  core.replyInfo(
    "ROOT",
    `模块 ${moduleName} 重载完成，当前版本为 ${hazel.loadHistory.get(modulePath)}。`,
    socket,
  );
}

export async function reloadModuleByID(hazel, core, hold, socket, line) {
  // 解析参数
  let args = core.splitArgs(line);
  let moduleName = args[1];
  let versionID = parseInt(args[2]);
  let modulePath = await hazel.getModulePath(moduleName);

  if (!modulePath || !fs.existsSync(modulePath)) {
    core.replyInfo("ROOT", "模块 " + moduleName + " 不存在。", socket);
    return;
  }

  if (versionID > hazel.loadIDMax.get(modulePath)) {
    core.replyInfo(
      "ROOT",
      "模块 " + moduleName + " 的版本 " + versionID + " 不存在。",
      socket,
    );
    return;
  }

  if (versionID === hazel.loadHistory.get(modulePath)) {
    core.replyInfo("ROOT", "模块 " + moduleName + " 已是最新版本。", socket);
    return;
  }

  if (isNaN(versionID) || versionID <= 0) {
    core.replyInfo("ROOT", "版本号无效。", socket);
    return;
  }

  // 重载指定模块到指定版本
  core.replyInfo(
    "ROOT",
    `模块 ${moduleName} 重载请求已接收，目标版本为 ${versionID}。`,
    socket,
  );
  await hazel.reloadModuleByID(modulePath, versionID);

  // 发送重载完成消息
  core.replyInfo(
    "ROOT",
    `模块 ${moduleName} 重载完成，已恢复至版本 ${versionID}。`,
    socket,
  );
}

export async function run(hazel, core, hold, socket, line) {
  // 解析参数
  let args = core.splitArgs(line);

  // /reload - 重载所有命令
  if (args[0] === "/reload" && args[1] === undefined) {
    await reloadAll(hazel, core, hold, socket, line);
  } else if (args[0] === "/reload" && args[1] !== undefined && args[2] === undefined) {
    // /reload <moduleName> - 重载指定模块
    await reloadModule(hazel, core, hold, socket, line);
  } else if (args[0] === "/reload" && args[1] !== undefined && args[2] !== undefined) {
    // /reload <moduleName> <version> - 重载指定模块到指定版本
    await reloadModuleByID(hazel, core, hold, socket, line);
  } else {
    core.replyMalformedCommand(socket);
  }
}

// 使用 /reload 命令
export async function execByChat(hazel, core, hold, socket, line) {
  await run(hazel, core, hold, socket, line);
}

export const name = "reload";
export const requiredLevel = 10;
export const requiredData = [];
export const moduleType = "ws-command";
export const description = "重载十字街";
