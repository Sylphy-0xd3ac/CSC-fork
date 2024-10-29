export async function run(hazel, core, hold, socket, data) {
  let commandList = [];
  hazel.loadedFunctions.forEach((command) => {
    if (command.requiredLevel <= socket.level) {
      if (command.moduleType === 'ws-command') {
        commandList.push(command.name + (command.requiredData.length > 0 ? ' [' + command.requiredData.join(', ') + ']' : '') + ' - ' + command.description);
      }
    }
  });
  commandList = commandList.filter(command => !command.startsWith('elevate') && !command.startsWith('help'));
  commandList.sort((a, b) => b.localeCompare(a));
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
