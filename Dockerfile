# 使用 Deno 官方镜像
FROM denoland/deno:latest

# 设置工作目录
WORKDIR /app

# 复制项目文件到容器
COPY . .

# 暴露应用的端口（请根据您的应用配置更改端口号）
EXPOSE 52764

# 安装依赖
RUN deno install

# 运行应用程序
CMD ["run", "--allow-all", "--unstable-sloppy-imports", "main.ts"]
