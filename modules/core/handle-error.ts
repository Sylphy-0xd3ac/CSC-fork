// 处理服务器遇到的所有错误
export function run(hazel, _core, _hold) {
  // 移除 error 事件的默认监听器
  hazel.removeAllListeners("error");

  // 添加自定义的 error 事件监听器
  hazel.on("error", (error, arg1) => {
    try {
      // 生成 8 位随机十六进制字符串作为错误 ID
      const id = Math.random().toString(16).slice(2, 10);

      if (arg1 && typeof arg1.emit === "function") {
        // 如果 arg1 看起来像一个 Socket.IO socket，对客户端发送错误提示
        arg1.emit("warn", {
          cmd: "warn",
          code: "SERVER_ERROR",
          text: `# dx_xb\n服务器遇到了一个错误，无法执行其应有的功能。\n您可以将错误 ID \`#${id}\` 提交给管理员帮助我们查明情况。`,
          data: { id },
        });
        const logger = new hazel.logger("catcher");
        logger.error(`SERVER ERROR #${id}\n${error.stack}\n`);
      } else {
        // 仅记录日志
        const logger = new hazel.logger("catcher");
        logger.error(`SERVER ERROR #${id}\n${error.stack}`);
      }
    } catch (err) {
      // 错误处理程序自身发生错误，打印错误内容
      const logger = new hazel.logger("catcher");
      logger.error(`ERROR HANDLER ERROR\n${err.stack}`);
    }
  });
}

export const name = "handle-error";
export const dependencies: string[] = ["logger"];
export const priority = -1;
