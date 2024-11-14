import fs from 'node:fs';
import path from 'node:path';

export default async function (hazel, core, hold) {
  // 冻结对象和函数的原型链
  Object.freeze(Object.prototype);
  Object.freeze(Function.prototype);

  // 频率限制器用
  hold.rateRecords = {};
  hold.perviousRate = 1000;

  // 保存一些服务器的运行数据
  hold.stats = {};

  // CIDR 列表
  hold.allowCIDRlist = [];
  hold.denyCIDRlist = [];
  core.loadAllowCIDR();

  // 添加本机回环地址到允许列表
  core.allowCIDR('127.0.0.1/24');

  // 封禁的 IP 列表
  hold.bannedIPlist = [];

  // CIDR 检查规则
  hold.checkCIDRglobal = false;
  hold.checkCIDRchannelList = new Map();

  // 聊天室列表
  hold.channel = new Map();
  hold.lockAllChannels = false;

  // 禁言时间列表
  hold.muteUntil = new Map();

  // 错误和警告个数
  hold.errorCount = 0;
  hold.warningCount = 0;

  // 读取服务器sign
  hold.serverSign = fs.readFileSync(path.join(hazel.mainConfig.baseDir, hazel.mainConfig.signPath), 'utf8').trim();

  // 日志
  hold.logs = '';

  // 写日志，保存服务器启动时间，上次重读时间
  hold.startTime = Date.now();
  hold.lastReloadTime = Date.now();
  core.log(core.LOG_LEVEL.LOG, 'Server initialized', 'BOOT');
};
