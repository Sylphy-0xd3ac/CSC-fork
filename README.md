# 十字街聊天室 - TypeScript

十字街TS版本是[十字街官方版本](https://github.com/CrosSt-Chat/CSC-main/)的一个Fork,主要将源项目JavaScript改为TypeScript,添加网页服务器等.

## 本地测试

### 编译版本准备

[Node.js](https://nodejs.org/) 14.0 或更高版本（十字街后端一般在 Node.js 最新 LTS 版本上测试，推荐您使用 Node.js 最新 LTS 版本运行）。

### 安装

1. 克隆本仓库compiled-output分支源代码。

2. 进入十字街后端源代码目录（CSC-main），并运行 `npm install` 安装依赖。

3. 运行 `node main.js` 启动十字街后端。

4. 测试十字街后端是否正常运行：访问127.0.0.1:52764/console?pwd=xxxxxx(pwd具体取决于您的聊天室password,具体端口取决于./config.json中配置的端口),

## 部署和配置
从client中获取客户端.
随后配置网页,并在同服务器上运行.

## 贡献
感谢十字街官方开放原代码.
[十字街官方版本](https://github.com/CrosSt-Chat/CSC-main/)

## 开源协议

十字街聊天室遵循 [GNU Public License v3.0](./LICENSE) 开放源代码。
