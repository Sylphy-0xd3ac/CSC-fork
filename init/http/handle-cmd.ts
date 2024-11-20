// 用于处理 HTTP 请求
export async function run(hazel, core, hold) {
  core.handleHttp = async function (hazel, core, hold, ctx, path) {
    // 获取用户password
    const pwd = ctx.req.query('pwd');
    if (typeof pwd === 'undefined') {
      return;
    }
    // 生成trip
    const trip = core.generateTrips(pwd);
    // 初始化权限等级
    let level = core.config.level.user;
    // 通过trip检测权限
    if (core.config.adminList.includes(trip)) {
      level = core.config.level.admin;
    }
    else if (core.config.botList.includes(trip)) {
      level = core.config.level.bot;
    }
    else if (core.config.memberList.includes(trip)) {
      level = core.config.level.member;
    }
    // 如果路径为空，则返回
    if (!path) { return; }
    // 直接从 hazel 中拿命令
    let command: any;
    hazel.loadedFunctions.forEach((commandTemp: any) => {
      if (typeof commandTemp.url !== 'undefined') {
        if (commandTemp.url === path) {
          command = commandTemp;
        }
      }
    });
    // 如果命令不存在，则返回
    if (typeof command === 'undefined') { return; }
    // 检查命令是否为公开命令
    if (typeof command.moduleType !== 'undefined') {
      if (command.moduleType !== 'http-command-client') {
        return;
      }
    }
    else {
      return;
    }
    // 检测是否有权限运行命令
    if (command.requiredLevel > level) {
      return;
    }
    // 检测命令是否需要数据
    if (typeof command.requiredData !== 'undefined') {
      if (command.requiredData.length > 0) {
        for (let attr of command.requiredData) {
          if (typeof ctx.req.query(attr) === 'undefined') {
            return;
          }
        }
      }
    }
    else
    {
      return;
    }
  // 运行命令
    try {
      return command.run(hazel, core, hold, ctx);
    } catch (error) {
      hazel.emit('error', error);
    }
  }
}

export const priority = 1;