import Koa from 'koa';
import Router from 'koa-router';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

export default async function (hazel, core, hold) {
  // 创建一个 Koa 应用
  const app = new Koa() ;
  const router = new Router();

  // 定义 GET 路由
  router.get('/console', async (ctx) => {
    // 检查 token 参数
    const token = ctx.query.token;

    if(!token) // token是必须的
    {
      ctx.status = 403;
      ctx.body = 'Forbidden: token is required';
      return;
    }

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

      // 设置内容类型并返回 HTML 内容
      ctx.set('Content-Type', 'text/html; charset=utf-8');
      ctx.body = htmlContent;

    } catch (err) {
      // 处理文件读取错误
      ctx.status = 500;
      ctx.body = 'Internal Server Error';
    }
  });

  // 美化的日志,给用户看的
  router.get('/logs/user',async (ctx) => {
    const token = ctx.query.token; // 获取token

    if(!token) // token是必须的
    {
      ctx.status = 403;
      ctx.body = 'Forbidden: token is required';
      return;
    }

    if (token !== core.config.rootPasscode)
    {
      ctx.status = 403;
      ctx.body = 'Forbidden: Invalid token';
      return;
    }

    ctx.status = 200;
    let htmlContent = await fs.promises.readFile(
      path.join(hazel.mainConfig.baseDir, hazel.mainConfig.htmluserlogsDir),
      'utf-8'
    );
    htmlContent = htmlContent.replace('${logs}', hold.logs);

    if(hold.warningCount > 0 || hold.errorCount > 0) {
      htmlContent = htmlContent.replace('${errorAndWarningCount}', `<p style="color: orange;">${hold.warningCount} Warnings.</p><p style="color: red;">${hold.errorCount} Errors.</p>`);
    }
    else {
      htmlContent = htmlContent.replace('${errorAndWarningCount}', '<p style="color: green;">No errors or warnings.</p>');
    }

    ctx.set('Content-Type', 'text/html; charset=utf-8');
    ctx.body = htmlContent;
  });

  // 标准化的日志,给API用的
  router.get('/logs/api',async (ctx) => {
    const token = ctx.query.token;

    if(!token) // token是必须的
    {
      ctx.status = 403;
      ctx.body = 'Forbidden: token is required';
      return;
    }

    if(token !== core.config.rootPasscode)
    {
      ctx.status = 403;
      ctx.body = 'Forbidden: Invalid token';
      return;
    }

    ctx.status = 200;
    ctx.set('Content-Type', 'text/plain; charset=utf-8');
    ctx.body = hold.logs;
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
