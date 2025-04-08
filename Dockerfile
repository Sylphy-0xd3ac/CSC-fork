# 使用 Bun 官方镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 复制项目文件到容器
COPY . .

# 安装依赖
RUN npm install

# 运行 lint
RUN npm run lint

# 暴露应用的端口（根据你的应用配置端口号）
EXPOSE 52764

# 启动应用程序
CMD ["npm", "run", "dev"]
