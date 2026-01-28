# CSC-fork（TypeScript 版本）

> 目的：为上游十字街后端做贡献/维护的 fork，主要方向是 **JavaScript → TypeScript**。
>
> - 上游：CrosSt-Chat/CSC-main
> - 我做的事情：TS 化、类型补全、一些工程化调整（具体差异建议看 commit/PR）
> - 说明：本仓库 README 主要面向“怎么跑起来”，上游逻辑/协议以官方仓库为准

---

元旦快乐, 祝福屏幕前的你在新的一年天天开心, 顺顺利利！

[十字街官方版本](https://github.com/CrosSt-Chat/CSC-main/)

[EN](./README_EN.md)

# 十字街聊天室 - TypeScript

十字街TS版本是[十字街官方版本](https://github.com/CrosSt-Chat/CSC-main/)的一个Fork,主要将源项目JavaScript改为TypeScript.

![Alt](https://repobeats.axiom.co/api/embed/c12ebbe4f71d8b8f2dea4cef1dd4e3c1fcda5a40.svg "Repobeats analytics image")

## 本地测试

### 编译版本准备

[Node.js](https://nodejs.org/) 18.0 或更高版本（十字街TS后端一般在 Node.js 最新 LTS 版本上测试，推荐您使用 Node.js 最新 LTS 版本运行）。

### 安装

1. 下载Action最新版本释放文件包。

2. 进入十字街后端源代码目录（CSC-main）。

3. 运行 `yarn install` 安装依赖。

4. 运行 `node main.js` 启动十字街后端。

5. 测试十字街后端是否正常运行：打开client文件夹中的index.html,如果成功显示homepage则为成功.

## 部署和配置

从client.zip中获取客户端.
随后配置网页,并在同服务器上运行.

## 贡献

感谢十字街官方开放原代码.
[十字街官方版本](https://github.com/CrosSt-Chat/CSC-main/)
Reggol
[Reggol](https://github.com/shigma/reggol/)
v6Match
[v6Match](https://github.com/Henrize/v6match/)

## LICENSE

十字街聊天室遵循 [GNU Public License v3.0](./LICENSE) 开放源代码。
