import Koa from 'koa';
import Router from 'koa-router';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

export default async function (hazel, core, hold) {
  // 创建一个 Koa 应用
  const app = new Koa();
  const router = new Router();

  // 定义 GET 路由
  router.get('/console', async (ctx) => {
    // 检查 token 参数
    const token = ctx.query.token;

    if (!token) {
      // 如果没有 token，返回 401 未授权
      ctx.status = 401;
      ctx.body = 'Unauthorized: Token is required';
      return;
    }

    // 你可以在这里添加更多的验证逻辑，例如检查 token 是否有效
    if (token !== core.config.rootPasscode) {
      ctx.status = 403; // 禁止访问
      ctx.body = 'Forbidden: Invalid token';
      return;
    }

    try {
      // 如果 token 验证通过，继续处理请求
      const filePath = path.join(hazel.mainConfig.baseDir, hazel.mainConfig.signPath);
      const data = await fs.promises.readFile(filePath, 'utf-8');

      // 读取 HTML sign 文件
      let htmlContent = await fs.promises.readFile(
        path.join(hazel.mainConfig.baseDir, hazel.mainConfig.htmlsignDir),
        'utf-8'
      );

      htmlContent = htmlContent.replace('${data}', '\n' + data);
      if(hold.warningCount > 0 || hold.errorCount > 0) {
        htmlContent = htmlContent.replace('${errorAndWarningCount}', `<p style="color: orange;">${hold.warningCount} Warnings.</p><p style="color: red;">${hold.errorCount} Errors.</p>`);
      }
      else {
        htmlContent = htmlContent.replace('${errorAndWarningCount}', '<p style="color: green;">No errors or warnings.</p>');
      }
      
      htmlContent = htmlContent.replace('${logs}', hold.logs);
      // 设置内容类型并返回 HTML 内容
      ctx.set('Content-Type', 'text/html; charset=utf-8');
      ctx.body = htmlContent;

    } catch (err) {
      // 处理文件读取错误
      ctx.status = 500;
      ctx.body = 'Internal Server Error';
    }
  });

  // 将路由应用于 Koa 应用
  app.use(router.routes()).use(router.allowedMethods());

  // 创建 HTTP 服务器
  const server = http.createServer(app.callback());

  // 为 HTTP 服务器添加一个升级事件监听器
  server.on('upgrade', (request, socket, head) => {
    hold.wsServer.handleUpgrade(request, socket, head, (ws) => {
      hold.wsServer.emit('connection', ws, request);
    });
  });

  // 启动 HTTP 服务器
  server.listen(hazel.mainConfig.port);

  // 将 HTTP 服务器保存到 hold 中
  hold.httpServer = server;
}
