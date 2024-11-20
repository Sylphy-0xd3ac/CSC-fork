import { Hono } from 'hono';
import { createServer } from 'node:http';

export default async function (hazel, core, hold) {
  // 创建 Hono 应用
  const app = new Hono();

  await hazel.runFunction('handle-http-connection', app);

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

      hold.httphost = req.headers.host;

      const fetchResponse = await app.fetch(fetchRequest);
  
      //设置状态码和响应头
      res.writeHead(fetchResponse.status, Object.fromEntries(fetchResponse.headers));
  
      //写入响应体
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

  // 将服务器实例保存到 hold
  hold.httpServer = server;
}
