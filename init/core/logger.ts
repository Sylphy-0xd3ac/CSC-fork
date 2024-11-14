// 日志记录器
import { writeFileSync } from 'node:fs';
import chalk from 'chalk';
import { isContinueStatement } from 'typescript';

export async function run(hazel, core, hold) {
  // 日志级别
  core.LOG_LEVEL = {
    DEBUG: 0,
    LOG: 1,
    WARN: 2,
    ERROR: 3
  };
  core.getrandomColor = function () {
    core.colors = [
      chalk.red,
      chalk.green,
      chalk.blue,
      chalk.yellow,
      chalk.magenta,
      chalk.cyan,
      chalk.gray
    ];
    return core.colors[Math.floor(Math.random() * core.colors.length)];
  }

  // 记录技术性日志 
  core.log = function (level, content, func = 'Unknown') {
    // 去颜色日志
    let contentClean = '';

    if (level >= core.config.logLevel) {
      // 如果要求写入的日志级别高于设定的日志级别，写入日志
      // 如果 content 是数组，转为字符串
      if (Array.isArray(content)) {
        content = content.join(' ');
      } else if (typeof content == 'object') {
        content = JSON.stringify(content);
      }

      const randomColor = core.getrandomColor();

      // 记录日志
      if (level == core.LOG_LEVEL.DEBUG) {
        contentClean = `${core.getTimeString()}[DEBUG] ${func} ` + content + '\n'; 
        hold.logs += contentClean + '\n';
        content = `${core.getTimeString()}[DEBUG] ${randomColor(func)} ` + content + '\n';
        console.log(content);
      } else if (level == core.LOG_LEVEL.LOG) {
        contentClean = `${core.getTimeString()}[LOG] ${func} ` + content + '\n'; 
        hold.logs += contentClean + '\n';
        content = `${core.getTimeString()}[LOG] ${randomColor(func)} ` + content + '\n';
        console.log(content);
      } else if (level == core.LOG_LEVEL.WARNING) {
        contentClean = `${core.getTimeString()}[WARN] ${func} ` + content + '\n'; 
        hold.logs += contentClean + '\n';
        content = `${core.getTimeString()}[WARN] ${randomColor(func)} ` + content + '\n'; 
        console.log(content);
        hold.warningCount++;
      } else if (level == core.LOG_LEVEL.ERROR) {
        contentClean = `${core.getTimeString()}[ERROR] ${func} ` + content + '\n'; 
        hold.logs += contentClean + '\n';
        content = `${core.getTimeString()}[ERROR] ${randomColor(func)} ` + content + '\n'; 
        console.log(content);
        hold.errorCount++;
      }

      // 写入日志
      try {
        writeFileSync(hazel.mainConfig.logDir + '/' + core.getDateString() + '.log.txt',
          core.getTimeString() + contentClean + '\n',
          { encoding: 'utf-8', flag: 'a' }
        );
      } catch (error) {
        hazel.emit('error', error);
      }
    }
  };

  // 记录聊天和操作记录存档
  core.archive = function (logType, socket, logText) {
    // 生成日志内容
    let content = core.getTimeString() + logType + ' ';
    if (socket) {
      if (typeof socket.trip == 'string') {
        content += socket.channel + ' [' + socket.trip + ']' + socket.nick + ': ' + logText;
      } else { 
        content += socket.channel + ' []' + socket.nick + ': ' + logText;
      }
    } else {
      content += logText;
    }

    // 替换 content 中的换行
    content = content.replace(/\n/g, '\\n');
    content = content.replace(/\r/g, '\\r');
    content += '\n';

    // 写入日志
    try {
      writeFileSync(hazel.mainConfig.logDir + '/' + core.getDateString() + '.archive.txt',
        content,
        { encoding: 'utf-8', flag: 'a' }
      );
    } catch (error) {
      hazel.emit('error', error);
    }
  };
}

export const priority = 2;
