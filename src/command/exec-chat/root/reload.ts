// 重载十字街几乎全部的代码
import path from "node:path";
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
  let modulePath = hazel.moduleDir.get(args[1]);
  if (!fs.existsSync(modulePath)) {
    core.replyInfo("ROOT", "模块 " + args[1] + " 不存在。", socket);
    return;
  }

  // 发送重载请求
  core.replyInfo(
    "ROOT",
    "模块 " +
      path.basename(modulePath, path.extname(modulePath)) +
      " 重载请求已接收。",
    socket,
  );

  // 重载模块
  await hazel.reloadModule(args[1]);

  // 发送重载完成消息
  core.replyInfo(
    "ROOT",
    "模块 " +
      path.basename(modulePath, path.extname(modulePath)) +
      " 重载完成, 当前版本为 " +
      hazel.moduleLoadID.get(args[1]) +
      "。",
    socket,
  );
}

export async function reloadModuleByID(hazel, core, hold, socket, line) {
  // 解析参数
  let args = core.splitArgs(line);
  let modulePath = hazel.moduleDir.get(args[1]);
  if (!fs.existsSync(modulePath)) {
    core.replyInfo("ROOT", "模块 " + args[1] + " 不存在。", socket);
    return;
  }

  if (parseInt(args[2]) > hazel.moduleLoadID.get(args[1])) {
    core.replyInfo(
      "ROOT",
      "模块 " +
        path.basename(modulePath, path.extname(modulePath)) +
        " 不存在ID为 " +
        args[2] +
        " 的加载记录。",
      socket,
    );
    return;
  } else if (parseInt(args[2]) == hazel.moduleLoadID.get(args[1])) {
    core.replyInfo(
      "ROOT",
      "模块 " +
        path.basename(modulePath, path.extname(modulePath)) +
        " 已处于 " +
        args[2] +
        " 版本。",
      socket,
    );
    return;
  }

  // 发送重载请求
  core.replyInfo(
    "ROOT",
    "模块 " +
      path.basename(modulePath, path.extname(modulePath)) +
      " 重载请求已接收。",
    socket,
  );

  // 重载模块
  await hazel.reloadModuleByID(args[1], parseInt(args[2]));

  // 发送重载完成消息
  core.replyInfo(
    "ROOT",
    "模块 " +
      path.basename(modulePath, path.extname(modulePath)) +
      " 已恢复至 " +
      args[2] +
      " 版本。",
    socket,
  );
}

export async function run(hazel, core, hold, socket, line) {
  // 解析参数
  let args = core.splitArgs(line);

  // 重载全部命令
  if (args[0] == "/reload" && args[1] == undefined) {
    await reloadAll(hazel, core, hold, socket, line);
  } else if (args[1] != undefined && args[2] == undefined) {
    // 重载指定模块
    await reloadModule(hazel, core, hold, socket, line);
  } else if (args[1] != undefined && args[2] != undefined) {
    // 重载指定模块的指定版本
    await reloadModuleByID(hazel, core, hold, socket, line);
  } else {
    core.replyMalformedCommand(socket);
  }
}

// 使用 /reload 重载十字街
export async function execByChat(hazel, core, hold, socket, line) {
  run(hazel, core, hold, socket, line);
}

export const name = "reload";
export const requiredLevel = 10;
export const requiredData = [];
export const moduleType = "ws-command";
export const description = "重载十字街";
