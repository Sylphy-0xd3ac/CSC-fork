export async function run(hazel, core, hold, socket, data) {
  let noList = ['elevate', 'help'];

  if(data.command) {
    // 查找指令
    let recommand = null;
    hazel.loadedFunctions.forEach(command => {
      if(command.name === data.command && command.requiredLevel <= socket.level && !noList.includes(command.name) && command.moduleType === 'ws-command') {
        recommand = command;
      }
    });
    // 如果找到了指令
    if(recommand !== null) {
      let description = recommand.description;
      let options = recommand.requiredData.map((data) => {
        // 获取选项名
        let option_name = Object.keys(data)[0];
        // 获取选项描述
        let option_description = data[option_name].description;
        // 获取选项值
        let option_value = data[option_name].value ? // 如果选项有值
          data[option_name].value.map((value) => // 遍历选项值
            [
              Object.keys(value)[0], // 返回选项值的键
              Object.values(value)[0] // 返回选项值的值
            ]
          )
        : ''; // 如果选项没有值,则返回空字符串
        return [
          option_name,
          option_description,
          option_value
        ]; // 返回选项名, 选项描述, 选项值
      });
      let return_text = `指令: ${recommand.name} - ${description}
      可用的选项有:
      ${options.map(option => `  ${option[0]}: ${option[1]} ${option[2] ? ` - 可用的值有: ${option[2].map(value => `  ${value[0]}: ${value[1]}`).join(',')}` : ''}`).join('\n')}`;
      // 回复用户
      core.replyInfo('HELP_COMMAND', return_text, socket);
      return;
    } else {
      // 如果没找到指令
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
export const requiredData = [{'command':{'description':'指令名'}}];
export const moduleType = 'ws-command';
export const description = '查看当前可用的指令';

// 定义接口以确保类型安全
interface OptionValue {
    description: string;
}

interface RequiredData {
    [key: string]: {
        value: OptionValue[];
    };
}
