// 各种不知道在哪能用到的工具函数
import os from 'os';
import { pbkdf2Sync, createHmac } from 'crypto';

export async function run(hazel, core, hold) {
  // 净化对象以防止原型链污染
  core.purifyObject = function (input) {
    let output = Object.create(null);
    for (let objectKey in input) {
      if (objectKey != '__proto__' && objectKey != 'constructor' && objectKey != 'prototype') {
        output[objectKey] = input[objectKey];
      }
    }
    return output;
  }

  // 获取内存使用情况
  core.getMemoryUsage = function () {
    return (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
  }

  // CPU占用率
  core.getCpuUsage = function () {
    return 100 - Math.round(100 * os.cpus().map(cpu => cpu.times.idle).reduce((a, b) => a + b) / os.cpus().map(cpu => Object.values(cpu.times).reduce((a, b) => a + b)).reduce((a, b) => a + b));
  }

  // 格式化时间
  core.formatTime = function (time) {
    let days = Math.floor(time / 86400000).toString();
    time -= days * 86400000;
    let hours = Math.floor(time / 3600000).toString();
    time -= hours * 3600000;
    let minutes = Math.floor(time / 60000).toString();
    time -= minutes * 60000;
    let seconds = Math.floor(time / 1000).toString();
    time -= (seconds * 1000).toString();
    return days.padStart(2, '0') + ':' + hours.padStart(2, '0') + ':' + minutes.padStart(2, '0') + ':' + seconds.padStart(2, '0') + '.' + time.toString().padStart(3, '0');
  }

  // 生成key及trip
  core.generateKeys = function (clientName) {
    const salt = core.config.salts.client;
    const iterations = 1000; // 增加迭代次数以提高安全性
    const key = pbkdf2Sync(clientName, salt, iterations, 32, 'sha256');
    const hmac = createHmac('sha256', key);
    hmac.update(clientName + salt);
    return hmac.digest('base64').slice(0, 32);
  }

  core.generateTrips = function (password) {
    const salt = core.config.salts.auth;
    const iterations = 1000; // 增加迭代次数以提高安全性
    const key = pbkdf2Sync(password, salt, iterations, 32, 'sha256');
    const hmac = createHmac('sha256', key);
    hmac.update(password + salt);
    return hmac.digest('base64').slice(0, 6);
  }

  // 从数组中删除指定元素
  core.removeFromArray = function (array, element) {
    let index = array.indexOf(element);
    if (index > -1) {
      array.splice(index, 1);
      return true;
    } else {
      return false;
    }
  }

  // 拆分字符串中以空格分段的参数
  core.splitArgs = function (line) {
    let args = [];
    line.split(' ').forEach((arg) => {
      if (arg != '') args.push(arg);
    });
    return args;
  }

  // 获取就像 [20:42:13] 一样的时间字符串
  core.getTimeString = function () {
    let timeNow = new Date();
    let hour = timeNow.getHours();
    let min = timeNow.getMinutes();
    let sec = timeNow.getSeconds();
    if (hour < 10) { hour = '0' + hour; }
    if (min < 10) { min = '0' + min; }
    if (sec < 10) { sec = '0' + sec; }
    return '[' + hour + ':' + min + ':' + sec + ']';
  }

  // 获取就像 21-06-18 一样的日期字符串
  core.getDateString = function () {
    let timeNow = new Date();
    return (timeNow.getFullYear() - 2000) + '-' + (timeNow.getMonth() + 1) + '-' + timeNow.getDate();
  }
}

export const priority = 0
