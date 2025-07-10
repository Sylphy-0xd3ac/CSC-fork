# 使用 Node.js 官方镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 yarn.lock
COPY package.json yarn.lock ./

# 安装依赖
RUN yarn install --frozen-lockfile

# 运行 lint
RUN yarn lint

# 构建项目
RUN yarn build

# 复制预构建的dist目录
COPY ./dist .

# 暴露端口
EXPOSE 52764

# 启动CSC
CMD ["node", "main.js"]
