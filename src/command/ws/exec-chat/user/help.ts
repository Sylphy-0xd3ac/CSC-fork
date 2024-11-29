export async function run(hazel, core, hold, socket, data) {
  let noList = ['elevate', 'help'];

  if(data.command) {
    let recommand = null;
    hazel.loadedFunctions.forEach(command => {
      if(command.name === data.command && command.requiredLevel <= socket.level && !noList.includes(command.name) && command.moduleType === 'ws-command') {
        recommand = command;
      }
    });
    if(recommand !== null) {
      let returnText = `指令: ${recommand.name} - ${recommand.description}.
      ${Object.keys(recommand.requiredData).length > 0 ? `可用的选项有:\n${Object.keys(recommand.requiredData).map(key => `${key}: ${recommand.requiredData[key].description} ${recommand.requiredData[key].value ? `, 可用的值有: ${recommand.requiredData[key].value !== 'any' ? recommand.requiredData[key].value.map(value => value.name === 'any' ? '任意值' : value.name + ' - ' + value.description).join(', ') : '任意值'}` : ''}`).join('\n')}` : ''}
      `;
      core.replyInfo('HELP_COMMAND', returnText, socket);
      return;
    } else {
      core.replyInfo('HELP_COMMAND', '指令不存在.', socket);
      return;
    }
  }
  let commandList = []; // 存放所有可用的指令

  // 遍历所有指令
  hazel.loadedFunctions.forEach((command) => {
    // 如果指令需要的权限小于等于当前用户的权限
    if (command.requiredLevel <= socket.level) {
      if (command.moduleType === 'ws-command') {
        commandList.push(command.name + ' - ' + command.description);
      }
    }
  });

  // 过滤掉不需要显示的指令
  commandList = commandList.filter(command => noList.indexOf(command.split(' ')[0]) === -1);

  // 排序
  commandList.sort((a, b) => b.localeCompare(a));

  // 回复用户
  core.replyInfo('HELP_COMMAND', '当前可用的指令有:\n' + commandList.join('\n') + '\n输入 help [指令名] 查看详细信息', socket);
}

export async function execByChat(hazel, core, hold, socket, line) {
  let command = line.split(' ')[1];
  await run(hazel, core, hold, socket, {command: command});
}

export const name = 'help';
export const requiredLevel = 1;
export const requiredData = {};
export const moduleType = 'ws-command';
export const description = '查看当前可用的指令';
