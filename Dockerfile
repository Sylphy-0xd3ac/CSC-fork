# 使用 Node.js 官方镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 复制预构建的dist目录
COPY ./dist .

# 安装依赖
RUN ["corepack", "enable"]
RUN ["corepack", "install"]
RUN ["yarn", "install", "--immutable"]

# 暴露端口
EXPOSE 52764

# 启动CSC
CMD ["node", "main.js"]
