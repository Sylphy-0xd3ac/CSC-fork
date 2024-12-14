// 各种不知道在哪能用到的工具函数
import os from "node:os";
import chalk from "chalk";

export async function run(hazel, core, hold) {
  // 净化对象以防止原型链污染
  core.purifyObject = function (input) {
    let output = Object.create(null);
    for (let objectKey in input) {
      if (
        objectKey != "__proto__" &&
        objectKey != "constructor" &&
        objectKey != "prototype"
      ) {
        output[objectKey] = input[objectKey];
      }
    }
    return output;
  };

  // 获取内存使用情况
  core.getMemoryUsage = function () {
    return ((100 * os.freemem()) / os.totalmem()).toFixed(2);
  };

  // CPU占用率
  core.getCpuUsage = function () {
    const cpus = os.cpus();

    let totalIdle = 0,
      totalTick = 0;

    cpus.forEach((cpu) => {
      for (let type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;

    const usage = 100 - (100 * idle) / total;

    return usage.toFixed(2);
  };

  // 格式化时间
  core.formatTime = function (time) {
    let days = Math.floor(time / 86400000);
    time -= days * 86400000;
    let hours = Math.floor(time / 3600000);
    time -= hours * 3600000;
    let minutes = Math.floor(time / 60000);
    time -= minutes * 60000;
    let seconds = Math.floor(time / 1000);
    time -= seconds * 1000;
    return (
      days.toString().padStart(2, "0") +
      ":" +
      hours.toString().padStart(2, "0") +
      ":" +
      minutes.toString().padStart(2, "0") +
      ":" +
      seconds.toString().padStart(2, "0") +
      "." +
      time.toString().padStart(3, "0")
    );
  };

  // 从数组中删除指定元素
  core.removeFromArray = function (array, element) {
    let index = array.indexOf(element);
    if (index > -1) {
      array.splice(index, 1);
      return true;
    } else {
      return false;
    }
  };

  // 拆分字符串中以空格分段的参数
  core.splitArgs = function (line) {
    let args: any[] = [];
    line.split(" ").forEach((arg) => {
      if (arg != "") args.push(arg);
    });
    return args;
  };

  // 获取就像 [20:42:13] 一样的时间字符串
  core.getTimeString = function () {
    let timeNow = new Date();
    let hour = timeNow.getHours().toString();
    let min = timeNow.getMinutes().toString();
    let sec = timeNow.getSeconds().toString();
    let hourNum = parseInt(hour);
    let minNum = parseInt(min);
    let secNum = parseInt(sec);
    if (hourNum < 10) {
      hour = "0" + hour;
    }
    if (minNum < 10) {
      min = "0" + min;
    }
    if (secNum < 10) {
      sec = "0" + sec;
    }
    return "[" + hour + ":" + min + ":" + sec + "]";
  };

  // 获取就像 2024-12-14 20:42:13 一样的时间字符串 Logger 专用
  core.getTimeStringLogger = function () {
    let timeNow = new Date();
    let hour = timeNow.getHours().toString();
    let min = timeNow.getMinutes().toString();
    let sec = timeNow.getSeconds().toString();
    let year = timeNow.getFullYear().toString();
    let month = timeNow.getMonth().toString();
    let day = timeNow.getDate().toString();
    let hourNum = parseInt(hour);
    let minNum = parseInt(min);
    let secNum = parseInt(sec);
    let monthNum = parseInt(month);
    let dayNum = parseInt(day);
    if (hourNum < 10) {
      hour = "0" + hour;
    }
    if (minNum < 10) {
      min = "0" + min;
    }
    if (secNum < 10) {
      sec = "0" + sec;
    }
    if (monthNum < 10) {
      month = "0" + month;
    }
    if (dayNum < 10) {
      day = "0" + day;
    }
    return year + "-" + month + "-" + day + " " + hour + ":" + min + ":" + sec;
  };

  // 获取就像 21-06-18 一样的日期字符串
  core.getDateString = function () {
    let timeNow = new Date();
    return (
      timeNow.getFullYear() -
      2000 +
      "-" +
      (timeNow.getMonth() + 1) +
      "-" +
      timeNow.getDate()
    );
  };

  // 随机颜色
  core.randomColor = function () {
    core.colors = [
      chalk.red,
      chalk.green,
      chalk.blue,
      chalk.yellow,
      chalk.magenta,
      chalk.cyan,
      chalk.gray,
    ];
    return core.colors[Math.floor(Math.random() * core.colors.length)];
  };
}

export const priority = 0;
