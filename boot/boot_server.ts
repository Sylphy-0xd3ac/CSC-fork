import { Hono } from 'hono';
import { createServer, IncomingMessage } from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { WebSocketServer } from 'ws';

export default async function (hazel, core, hold) {
  // 创建 Hono 应用
  const app = new Hono();

  // 定义 GET 路由: /console
  app.get('/console', async (c) => {
    const token = c.req.query('token');

    if (!token) {
      return c.text('Forbidden: token is required', 403);
    }

    if (token !== core.config.rootPasscode) {
      return c.text('Forbidden: Invalid token', 403);
    }

    try {
      const filePath = path.join(hazel.mainConfig.baseDir, hazel.mainConfig.signPath);
      const data = await fs.readFile(filePath, 'utf-8');

      let htmlContent = await fs.readFile(
        path.join(hazel.mainConfig.baseDir, hazel.mainConfig.htmlsignDir),
        'utf-8'
      );

      htmlContent = htmlContent.replace('${data}', '\n' + data);

      return c.html(htmlContent);
    } catch (err) {
      console.error(err);
      return c.text('Internal Server Error', 500);
    }
  });

  // 定义 GET 路由: /logs/user
  app.get('/logs/user', async (c) => {
    const token = c.req.query('token');

    if (!token) {
      return c.text('Forbidden: token is required', 403);
    }

    if (token !== core.config.rootPasscode) {
      return c.text('Forbidden: Invalid token', 403);
    }

    try {
      let htmlContent = await fs.readFile(
        path.join(hazel.mainConfig.baseDir, hazel.mainConfig.htmluserlogsDir),
        'utf-8'
      );

      htmlContent = htmlContent.replace('${logs}', hold.logs);

      if (hold.warningCount > 0 || hold.errorCount > 0) {
        htmlContent = htmlContent.replace(
          '${errorAndWarningCount}',
          `<p style="color: orange;">${hold.warningCount} Warnings.</p>
           <p style="color: red;">${hold.errorCount} Errors.</p>`
        );
      } else {
        htmlContent = htmlContent.replace(
          '${errorAndWarningCount}',
          '<p style="color: green;">No errors or warnings.</p>'
        );
      }

      return c.html(htmlContent);
    } catch (err) {
      console.error(err);
      return c.text('Internal Server Error', 500);
    }
  });

  // 定义 GET 路由: /logs/api
  app.get('/logs/api', (c) => {
    const token = c.req.query('token');

    if (!token) {
      return c.text('Forbidden: token is required', 403);
    }

    if (token !== core.config.rootPasscode) {
      return c.text('Forbidden: Invalid token', 403);
    }

    return c.text(hold.logs);
  });

  // 使用 Node.js 原生 HTTP 服务器
  const server = createServer(async (req, res) => {
    try {
      const protocol = hold.enableHttps ? 'https' : 'http';
      const fetchRequest = new Request(
        `${protocol}://${req.headers.host}${req.url}`,
        {
          method: req.method,
          headers: req.headers as HeadersInit,
          body: req.method === 'POST' || req.method === 'PUT' ? req : null as BodyInit,
        } as RequestInit
      );

      const fetchResponse = await app.fetch(fetchRequest);
  
      // 设置状态码和响应头
      res.writeHead(fetchResponse.status, Object.fromEntries(fetchResponse.headers));
  
      // 写入响应体
      if (fetchResponse.body) {
        for await (const chunk of fetchResponse.body) {
          res.write(chunk);
        }
      }
      res.end();
    } catch (err) {
      console.error('Error processing request:', err);
      res.writeHead(500);
      res.end('Internal Server Error');
    }
  });
  
  server.listen(hazel.mainConfig.port);

  server.on('upgrade', (request, socket, head) => {
    hold.wsServer.handleUpgrade(request, socket, head, (ws) => {
      hold.wsServer.emit('connection', ws, request);
    });
  });

  // 尽可能简单地创建一个无头 WebSocket 服务器
  hold.wsServer = new WebSocketServer({ noServer: true });

  // 绑定 WebSocket 服务器的事件
  hold.wsServer.on('error', (error) => { hazel.emit('error', error); });
  hold.wsServer.on('connection', (ws, request) => { hazel.runFunction('handle-connection', ws, request); });
  // hold.wsServer.on('close', () => { hazel.runFunction('handle-close'); });
  // hold.wsServer.on('headers', ( headers, request ) => { hazel.runFunction('handle-headers', headers, request); });

  // 启动 WebSocket Heartbeat
  setInterval(() => { hazel.runFunction('heartbeat'); }, hazel.mainConfig.wsHeartbeatInterval);
  
  hazel.emit('ws_initialized')

  // 将服务器实例保存到 hold
  hold.httpServer = server;
}
