export async function run(hazel, core, hold, socket, data) {
  let commandList = []; // 存放所有可用的指令

  // 遍历所有指令
  hazel.loadedFunctions.forEach((command) => {
    // 如果指令需要的权限小于等于当前用户的权限
    if (command.requiredLevel <= socket.level) {
      if (command.moduleType === 'ws-command') {
        commandList.push(command.name + (command.requiredData.length > 0 ? ' [' + command.requiredData.join(', ') + ']' : '') + ' - ' + command.description);
      }
    }
  });

  // 过滤掉不需要显示的指令
  commandList = commandList.filter(command => !command.startsWith('elevate') && !command.startsWith('help'));

  // 排序
  commandList.sort((a, b) => b.localeCompare(a));

  // 回复用户
  core.replyInfo('HELP_COMMAND', '当前可用的指令有:\n' + commandList.join('\n'), socket);
}

export async function execByChat(hazel, core, hold, socket, line) {
  await run(hazel, core, hold, socket, {});
}

export const name = 'help';
export const requiredLevel = 1;
export const requiredData = [];
export const moduleType = 'ws-command';
export const description = '查看当前可用的指令';
