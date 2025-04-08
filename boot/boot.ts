// 初始化服务器

export async function run(hazel, core, hold) {
  // 冻结对象和函数的原型链
  Object.freeze(Object.prototype);
  Object.freeze(Function.prototype);

  // 频率限制器用
  hold.rateRecords = {};
  hold.perviousRate = 1000;

  // 保存一些服务器的运行数据
  hold.stats = {};

  // 初始化允许和拒绝的前缀树
  const AddressTree = hazel.moduleMap.get("address-checker").AddressTree;
  hold.allowTree = new AddressTree();
  hold.denyTree = new AddressTree();

  // CIDR 列表
  core.loadAllowCIDR();
  core.loadDenyCIDR();

  // 添加本机回环地址到允许列表
  core.allowCIDR("127.0.0.1/24");

  // 封禁的 IP 列表
  hold.bannedIPlist = [];

  // 公告列表
  hold.noticeList = [];

  // 聊天室列表
  hold.channel = new Map();
  hold.lockAllChannels = false;

  // 禁言时间列表
  hold.muteUntil = new Map();

  // 写日志，保存服务器启动时间，上次重读时间
  hold.startTime = Date.now();
  hold.lastReloadTime = Date.now();
}
