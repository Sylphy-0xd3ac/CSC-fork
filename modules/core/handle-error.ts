// 处理服务器遇到的所有错误
export async function run(hazel, core, hold) {
  // 移除 error 事件的默认监听器
  hazel.removeAllListeners("error");

  // 添加自定义的 error 事件监听器
  hazel.on("error", (error, arg1) => {
    try {
      // 生成 8 位随机十六进制字符串作为错误 ID
      const id = Math.random().toString(16).slice(2, 10);

      // 打印错误内容
      // console.error('----------\nSERVER ERROR #' + id + ' CATCHED AT ' + new Date().toTimeString());
      // console.error(error.stack.split('\n').slice(0, 4).join('\n'));

      if (typeof arg1 != "undefined") {
        // 如果 arg1 是一个 socket 对象，将错误信息发送给客户端
        if (arg1.constructor.name == "CSCWebSocket") {
          if (arg1.readyState == 1) {
            arg1.send(
              '{"cmd":"warn","code":"SERVER_ERROR","text":"# dx_xb\\n服务器遇到了一个错误，无法执行其应有的功能。\\n您可以将错误 ID `#' +
                id +
                '` 提交给管理员帮助我们查明情况。","data":{"id": "' +
                id +
                '"}}',
            );
            let logger = new core.logger("HandleError");
            logger.error(
              "SERVER ERROR #" +
                id +
                "\n" +
                error.stack +
                "\n" +
                JSON.stringify(arg1, null, 2),
            );
          }
        }
      } else {
        // 记日志
        let logger = new core.logger("HandleError");
        logger.error("SERVER ERROR #" + id + "\n" + error.stack);
      }
    } catch (error) {
      // 错误处理程序自身发生错误，打印错误内容
      let logger = new core.logger("HandleError");
      logger.error("ERROR HANDLER ERROR" + "\n" + error.stack);
    }
  });
}

export const name = "handle-error";
export const dependencies: string[] = ["logger"];
export const priority = -1;
