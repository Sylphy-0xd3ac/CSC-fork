# 构建
FROM --platform=$BUILDPLATFORM node:22-alpine as builder

# 设置目录
WORKDIR /app

# 复制文件
COPY package.json yarn.lock ./

# 安装依赖
RUN corepack enable && \
    yarn install --immutable

# 复制源代码
COPY . .

# 构建项目
RUN yarn build

# 生产
FROM --platform=$TARGETPLATFORM node:22-alpine

# 设置目录
WORKDIR /app

# 复制产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json /app/yarn.lock ./

# 安装依赖
RUN corepack enable && \
    yarn workspaces focus --production

# 暴露端口
EXPOSE 52764

# 启动CSC
CMD ["node", "dist/main.js"]