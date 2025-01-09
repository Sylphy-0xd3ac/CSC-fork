import pkg from 'fs-extra';
const { existsSync } = pkg;
import path from "node:path";

export async function reloadAll(hazel, core, hold, socket, line) {
  let reloadTime = Date.now();

  core.replyInfo("ROOT", "全部命令重载请求已接收。", socket);

  // 重载十字街
  await hazel.reloadModules(false);

  // 记录重载时间
  hold.lastReloadTime = Date.now();

  let reloadTimeUsed = Date.now() - reloadTime;

  // 发送重载完成消息
  core.replyInfo(
    "ROOT",
    "全部命令重载完成，耗时" + reloadTimeUsed + "ms。",
    socket,
  );

  // 记录操作
  core.archive("RLD", socket, reloadTimeUsed + "ms");
}

export async function reloadModule(hazel, core, hold, socket, line) {
  // 解析参数
  let args = core.splitArgs(line);
  let moduleName = args[1].trim();
  let modulePath = await hazel.getModulePath(moduleName);
  let reloadTime = Date.now();

  if (!existsSync(modulePath)) {
    core.replyInfo("ROOT", "模块 " + moduleName + " 不存在。", socket);
    return;
  }

  moduleName = path.basename(modulePath, path.extname(modulePath));

  // 重载指定模块
  core.replyInfo("ROOT", `模块 ${moduleName} 重载请求已接收。`, socket);

  if (hazel.loadedFunctions.has(moduleName)) {
    await hazel.reloadModule(modulePath);
  } else {
    await hazel.reloadInit(modulePath);
  }

  let reloadTimeUsed = Date.now() - reloadTime;

  // 发送重载完成消息
  core.replyInfo(
    "ROOT",
    `模块 ${moduleName} 重载完成，当前版本为 ${hazel.loadHistory.get(modulePath)[hazel.loadHistory.get(modulePath)?.length - 1]}，耗时 ${reloadTimeUsed} ms。`,
    socket,
  );

  // 记录操作
  core.archive("RLD", socket, moduleName, reloadTimeUsed + "ms");
}

export async function reloadModuleByID(hazel, core, hold, socket, line) {
  // 解析参数
  let args = core.splitArgs(line);
  let moduleName = args[1].trim();
  let version = args[2].trim();
  let modulePath = await hazel.getModulePath(moduleName);
  let reloadTime = Date.now();

  if (!existsSync(modulePath)) {
    core.replyInfo("ROOT", "模块 " + moduleName + " 不存在。", socket);
    return;
  }

  moduleName = path.basename(modulePath, path.extname(modulePath));

  if (!hazel.loadHistory.get(modulePath).includes(version)) {
    core.replyInfo(
      "ROOT",
      "模块 " + moduleName + " 的版本 " + version + " 不存在。",
      socket,
    );
    return;
  }

  if (
    version ===
    hazel.loadHistory.get(modulePath)[
      hazel.loadHistory.get(modulePath)?.length - 1
    ]
  ) {
    core.replyInfo("ROOT", "模块 " + moduleName + " 已是最新版本。", socket);
    return;
  }

  // 重载指定模块到指定版本
  core.replyInfo(
    "ROOT",
    `模块 ${moduleName} 重载请求已接收，目标版本为 ${version}。`,
    socket,
  );

  if (hazel.loadedFunctions.has(moduleName)) {
    await hazel.reloadModuleByID(modulePath, version);
  } else {
    await hazel.reloadInitByID(modulePath, version);
  }

  let reloadTimeUsed = Date.now() - reloadTime;

  // 发送重载完成消息
  core.replyInfo(
    "ROOT",
    `模块 ${moduleName} 重载完成，已恢复至版本 ${version}，耗时 ${reloadTimeUsed} ms。`,
    socket,
  );

  // 记录操作
  core.archive(
    "RLD",
    socket,
    moduleName + " " + version,
    reloadTimeUsed + "ms",
  );
}

export async function listModulesVersion(hazel, core, hold, socket, line) {
  // 解析参数
  let args = core.splitArgs(line);
  let moduleName = args[2].trim();
  let modulePath = await hazel.getModulePath(moduleName);

  // 检查模块是否存在
  if (!existsSync(modulePath)) {
    core.replyInfo("ROOT", "模块 " + moduleName + " 不存在。", socket);
    return;
  }

  // 获取模块名称
  moduleName = path.basename(modulePath, path.extname(modulePath));
  // 获取模块版本列表
  let versions = hazel.loadHistory.get(modulePath);
  // 去重
  versions = versions.filter(
    (version, index, self) => self.indexOf(version) === index,
  );
  let versionList = "";

  // 发送版本列表
  core.replyInfo("ROOT", "模块 " + moduleName + " 的版本列表：", socket);

  // 遍历版本列表
  versions.forEach((version) => {
    versionList +=
      "[" +
      (versions.indexOf(version) + 1) +
      "] " +
      version +
      (hazel.loadHistory.get(modulePath)[
        hazel.loadHistory.get(modulePath).length - 1
      ] === version
        ? " (当前)"
        : "") +
      "\n";
  });

  // 发送版本列表
  core.replyInfo("ROOT", versionList, socket);

  // 记录操作
  core.archive("RLS", socket, moduleName);
}

export async function run(hazel, core, hold, socket, line) {
  // 解析参数
  let args = core.splitArgs(line);

  if (args[0] === "/reload" && args[1] === "list" && args[2] !== undefined) {
    await listModulesVersion(hazel, core, hold, socket, line);
    return;
  }
  // /reload - 重载所有命令
  if (args[0] === "/reload" && args[1] === undefined) {
    await reloadAll(hazel, core, hold, socket, line);
  } else if (
    args[0] === "/reload" &&
    args[1] !== undefined &&
    args[2] === undefined
  ) {
    // /reload <moduleName> - 重载指定模块
    await reloadModule(hazel, core, hold, socket, line);
  } else if (
    args[0] === "/reload" &&
    args[1] !== undefined &&
    args[2] !== undefined
  ) {
    // /reload <moduleName> <version> - 重载指定模块到指定版本
    await reloadModuleByID(hazel, core, hold, socket, line);
  } else {
    core.replyMalformedCommand(socket);
  }
}

// 使用 /reload 命令
export async function execByChat(hazel, core, hold, socket, line) {
  // 进行严格的频率限制
  if (await core.checkAddress(socket.remoteAddress, 3)) {
    core.replyWarn("RATE_LIMITED", "您的操作过于频繁，请稍后再试。", socket);
    return;
  }

  await run(hazel, core, hold, socket, line);
}

export const name = "reload";
export const requiredLevel = 10;
export const requiredData = [];
export const moduleType = "ws-command";
export const description = "重载十字街";
