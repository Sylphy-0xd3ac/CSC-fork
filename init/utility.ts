// 各种不知道在哪能用到的工具函数
import os from 'node:os';
import { pbkdf2Sync, createHmac } from 'node:crypto';

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
    return (100 * os.freemem() / os.totalmem()).toFixed(2);
  }

  // CPU占用率
  core.getCpuUsage = function () {
    const cpus = os.cpus();

    let totalIdle = 0, totalTick = 0;

    cpus.forEach((cpu) => {
      for (let type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;

    const usage = 100 - 100 * idle / total;

    return usage.toFixed(2);
  }

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
    return days.toString().padStart(2, '0') + ':' + hours.toString().padStart(2, '0') + ':' + minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0') + '.' + time.toString().padStart(3, '0');
  }

  // 生成key
  core.generateKeys = function (clientName) {
    const salt = core.config.salts.client;
    const iterations = 1000; // 增加迭代次数以提高安全性
    const key = pbkdf2Sync(clientName, salt, iterations, 32, 'sha256');
    const hmac = createHmac('sha256', key);
    hmac.update(clientName + salt);
    return hmac.digest('base64').slice(0, 32);
  }
  // 生成trip
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
    let args: any[] = [];
    line.split(' ').forEach((arg) => {
      if (arg != '') args.push(arg);
    });
    return args;
  }

  // 获取就像 [20:42:13] 一样的时间字符串
  core.getTimeString = function () {
    let timeNow = new Date();
    let hour = timeNow.getHours().toString();
    let min = timeNow.getMinutes().toString();
    let sec = timeNow.getSeconds().toString();
    let hourNum = parseInt(hour);
    let minNum = parseInt(min);
    let secNum = parseInt(sec);
    if (hourNum < 10) { hour = '0' + hour; }
    if (minNum < 10) { min = '0' + min; }
    if (secNum < 10) { sec = '0' + sec; }
    return '[' + hour + ':' + min + ':' + sec + ']';
  }

  // 获取就像 21-06-18 一样的日期字符串
  core.getDateString = function () {
    let timeNow = new Date();
    return (timeNow.getFullYear() - 2000) + '-' + (timeNow.getMonth() + 1) + '-' + timeNow.getDate();
  }
}

export const priority = 0
