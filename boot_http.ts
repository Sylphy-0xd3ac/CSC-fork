import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

export default async function (hazel, core, hold) {
  // 创建一个 HTTP 服务器
  hold.httpServer = createServer((req,res) => {
  res.writeHead(200, {'Content-Type': 'text/html'});
    // 检查 URL，确保只在根路径处理请求
  if (req.url === '/') {
    const filePath = path.join(hazel.mainConfig.baseDir, hazel.mainConfig.signPath);
    // 读取 sign.txt 文件
    fs.readFile(filePath, 'utf-8', (err, data) => {
      if (err) {
        // 处理文件读取错误
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      } else {
        // 成功读取文件，返回内容
        let htmlContent = fs.readFileSync(path.join(hazel.mainConfig.baseDir, hazel.mainConfig.htmlsignDir), 'utf-8');
        htmlContent = htmlContent.replace('${data}', '\n'+data);
        // 返回 HTML 内容
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(htmlContent);
      }
    });
  } else {
    // 处理其他路径 - 返回 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }});

  hold.httpServer.listen(hazel.mainConfig.port);

  // 为 HTTP 服务器添加一个升级事件监听器
  hold.httpServer.on('upgrade', (request, socket, head) => {
    // 移除 IPv6 前缀
    socket.remoteAddress = socket.remoteAddress.replace(/^::ffff:/, '');
    hold.wsServer.handleUpgrade(request, socket, head, (ws) => {
      hold.wsServer.emit('connection', ws, request, socket);
    });
  });
};
