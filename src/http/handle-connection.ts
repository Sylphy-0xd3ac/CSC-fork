// 用于处理 HTTP 请求
export async function run(hazel, core, hold, app) {
  // 绑定 HTTP 事件
  app.get('*', (c) => {
    // 去掉路径前缀,即为请求路径
    let path = c.req.url.substring(c.req.url.indexOf(hold.httphost) + hold.httphost.length + 1);
    // 去掉路径末尾的/
    if (path.endsWith('/')) {
      path = path.substring(0, path.length - 1);
    }
    // 去除参数
    if (path.includes('?')) {
      path = path.split('?')[0];
    }
    if (path === '') {
      return hazel.runFunction('homepage', c);
    }
    return core.handleHttp(hazel, core, hold, c, path);
  });
}

export const name = 'handle-http-connection';
export const moduleType = 'system';
