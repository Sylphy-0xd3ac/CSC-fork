// 各种不知道在哪能用到的工具函数
import os from "node:os";

export async function run(_hazel, core, _hold) {
  // 净化对象以防止原型链污染
  core.purifyObject = (input) => {
    const output = Object.create(null);
    for (const objectKey in input) {
      if (objectKey !== "__proto__" && objectKey !== "constructor" && objectKey !== "prototype") {
        output[objectKey] = input[objectKey];
      }
    }
    return output;
  };

  // 获取内存使用情况（本进程，百分比）
  core.getMemoryUsage = () => {
    const mem = process.memoryUsage();
    const percent = ((100 * mem.rss) / os.totalmem()).toFixed(2);
    return percent;
  };

  // CPU占用率
  let lastCpuUsage = "0.00";
  async function sampleCpu() {
    while (true) {
      const startUsage = process.cpuUsage();
      const startTime = process.hrtime();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const elapUsage = process.cpuUsage(startUsage);
      const elapTime = process.hrtime(startTime);
      const elapTimeMS = elapTime[0] * 1000 + elapTime[1] / 1e6;
      const elapUserMS = elapUsage.user / 1000;
      const elapSystMS = elapUsage.system / 1000;
      const cpuPercent = ((elapUserMS + elapSystMS) / elapTimeMS) * 100;
      lastCpuUsage = cpuPercent.toFixed(2);
    }
  }
  sampleCpu(); // 启动后台采样
  core.getCpuUsage = () => lastCpuUsage;

  // 格式化时间
  core.formatTime = (time) => {
    const days = Math.floor(time / 86400000);
    time -= days * 86400000;
    const hours = Math.floor(time / 3600000);
    time -= hours * 3600000;
    const minutes = Math.floor(time / 60000);
    time -= minutes * 60000;
    const seconds = Math.floor(time / 1000);
    time -= seconds * 1000;
    return `${days.toString().padStart(2, "0")}:${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${time.toString().padStart(3, "0")}`;
  };

  // 从数组中删除指定元素
  core.removeFromArray = (array, element) => {
    const index = array.indexOf(element);
    if (index > -1) {
      array.splice(index, 1);
      return true;
    }
    return false;
  };

  // 拆分字符串中以空格分段的参数
  core.splitArgs = (line: string) => {
    const args: string[] = [];
    line.split(" ").forEach((arg) => {
      if (arg !== "") args.push(arg);
    });
    return args;
  };

  // 获取就像 [20:42:13] 一样的时间字符串
  core.getTimeString = () => {
    const timeNow = new Date();
    let hour = timeNow.getHours().toString();
    let min = timeNow.getMinutes().toString();
    let sec = timeNow.getSeconds().toString();
    const hourNum = Number.parseInt(hour, 10);
    const minNum = Number.parseInt(min, 10);
    const secNum = Number.parseInt(sec, 10);
    if (hourNum < 10) {
      hour = `0${hour}`;
    }
    if (minNum < 10) {
      min = `0${min}`;
    }
    if (secNum < 10) {
      sec = `0${sec}`;
    }
    return `[${hour}:${min}:${sec}]`;
  };

  // 获取就像 21-06-18 一样的日期字符串
  core.getDateString = () => {
    const timeNow = new Date();
    return `${timeNow.getFullYear() - 2000}-${timeNow.getMonth() + 1}-${timeNow.getDate()}`;
  };
}

export const name = "utility";
export const dependencies: string[] = [];
