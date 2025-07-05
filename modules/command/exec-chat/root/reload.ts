// 用于重载十字街几乎所有模块
import path from "node:path";

export async function action(hazel, core, hold, socket, line) {
  // 进行严格的频率限制
  if (await core.checkAddress(socket.remoteAddress, 3)) {
    core.replyWarn("RATE_LIMITED", "您的操作过于频繁，请稍后再试。", socket);
    return;
  }
  await runInner(hazel, core, hold, socket, line);
}

async function reloadAll(hazel, core, hold, socket, line) {
  let reloadTime = Date.now();
  core.replyInfo("ROOT", "全部命令重载请求已接收。", socket);
  await hazel.reloadModules(false);
  hold.lastReloadTime = Date.now();
  let reloadTimeUsed = Date.now() - reloadTime;
  core.replyInfo(
    "ROOT",
    "全部命令重载完成，耗时" + reloadTimeUsed + "ms。",
    socket,
  );
  core.archive("RLD", socket, reloadTimeUsed + "ms");
}

async function reloadModule(hazel, core, hold, socket, line) {
  let args = core.splitArgs(line);
  let moduleName = args[1].trim();
  let module = await hazel.getModule(moduleName);
  if (module == undefined) {
    core.replyInfo("ROOT", "模块 " + moduleName + " 不存在。", socket);
    return;
  }
  let reloadTime = Date.now();
  if (hazel.loadedModules.has(module.name)) {
    await hazel.reloadModule(module.name);
  } else {
    core.replyWarn("ROOT", moduleName + " 不是模块，无法重载。", socket);
    return;
  }
  core.replyInfo("ROOT", `模块 ${moduleName} 重载请求已接收。`, socket);
  let reloadTimeUsed = Date.now() - reloadTime;
  core.replyInfo(
    "ROOT",
    `模块 ${moduleName} 重载完成，当前版本为 ${module.loadHistory[module.loadHistory.length - 1]}，耗时 ${reloadTimeUsed} ms。`,
    socket,
  );
  core.archive("RLD", socket, moduleName, reloadTimeUsed + "ms");
}

async function reloadModuleByID(hazel, core, hold, socket, line) {
  let args = core.splitArgs(line);
  let moduleName = args[1].trim();
  let version = args[2].trim();
  let module = await hazel.getModule(moduleName);
  if (module == undefined) {
    core.replyInfo("ROOT", "模块 " + moduleName + " 不存在。", socket);
    return;
  }
  let reloadTime = Date.now();
  if (!module.loadHistory.includes(version)) {
    core.replyInfo(
      "ROOT",
      "模块 " + moduleName + " 的版本 " + version + " 不存在。",
      socket,
    );
    return;
  }
  if (version === module.loadHistory[module.loadHistory.length - 1]) {
    core.replyInfo("ROOT", "模块 " + moduleName + " 已是最新版本。", socket);
    return;
  }

  if (hazel.loadedModules.has(module.name)) {
    await hazel.reloadModuleByID(module.name, version);
  } else {
    core.replyWarn("ROOT", moduleName + " 不是模块，无法重载。", socket);
    return;
  }
  core.replyInfo(
    "ROOT",
    `模块 ${moduleName} 重载请求已接收，目标版本为 ${version}。`,
    socket,
  );
  let reloadTimeUsed = Date.now() - reloadTime;
  core.replyInfo(
    "ROOT",
    `模块 ${moduleName} 重载完成，已恢复至版本 ${version}，耗时 ${reloadTimeUsed} ms。`,
    socket,
  );
  core.archive(
    "RLD",
    socket,
    moduleName + " " + version,
    reloadTimeUsed + "ms",
  );
}

async function listModulesVersion(hazel, core, hold, socket, line) {
  let args = core.splitArgs(line);
  let moduleName = args[2].trim();
  let module = await hazel.getModule(moduleName);
  if (module == undefined) {
    core.replyInfo("ROOT", "模块 " + moduleName + " 不存在。", socket);
    return;
  }
  let modulePath = module.filePath;
  if (!hazel.loadedModules.has(module.name)) {
    core.replyWarn("ROOT", moduleName + " 不是模块，无法查看版本。", socket);
    return;
  }
  moduleName = path.basename(modulePath, path.extname(modulePath));
  let versions = (await hazel.getModule(module.name)).loadHistory;
  versions = versions.filter(
    (version, index, self) => self.indexOf(version) === index,
  );
  let versionList = "";
  core.replyInfo("ROOT", "模块 " + moduleName + " 的版本列表：", socket);
  versions.forEach((version) => {
    versionList += `[${versions.indexOf(version) + 1}] ${version}${versions[versions.length - 1] === version ? " (当前)" : ""}\n`;
  });
  core.replyInfo("ROOT", versionList, socket);
  core.archive("RLS", socket, moduleName);
}

async function runInner(hazel, core, hold, socket, line) {
  let args = core.splitArgs(line);
  if (args[0] === "/reload" && args[1] === "list" && args[2] !== undefined) {
    await listModulesVersion(hazel, core, hold, socket, line);
    return;
  }
  if (args[0] === "/reload" && args[1] === undefined) {
    await reloadAll(hazel, core, hold, socket, line);
  } else if (
    args[0] === "/reload" &&
    args[1] !== undefined &&
    args[2] === undefined
  ) {
    await reloadModule(hazel, core, hold, socket, line);
  } else if (
    args[0] === "/reload" &&
    args[1] !== undefined &&
    args[2] !== undefined
  ) {
    await reloadModuleByID(hazel, core, hold, socket, line);
  } else {
    core.replyMalformedCommand(socket);
  }
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

export const name = "reload";
export const requiredLevel = 10;
export const requiredData = [];
export const description = "重载十字街";
export const dependencies = ["command-service", "ws-reply", "archive"];
