# 使用最新的 Node.js 官方镜像
FROM node:latest

# 设置工作目录
WORKDIR /usr/src/app

# 复制 package.json 和 package-lock.json 文件
COPY package*.json ./

# 安装项目依赖
RUN npm install

# 复制应用程序代码到容器中
COPY . .

# 暴露应用程序的端口
EXPOSE 52764

# 编译
RUN npm run build

# 启动应用程序
CMD ["npm", "start"]
