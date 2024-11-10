const esbuild = require('esbuild');
const glob = require('glob');

// 查找所有的 .ts 文件，排除 node_modules 目录
const entryPoints = glob.sync('./**/**/**/**/*.ts', {
  ignore: ['./node_modules/**']  // 忽略 node_modules 目录
});

// 使用 esbuild 进行构建
esbuild.build({
  entryPoints: entryPoints,
  outdir: '.',
  bundle: true,          // 是否进行打包
  platform: 'node',      // 目标平台为 Node.js
  target: 'esnext',      // 设定目标语法版本
}).catch(() => process.exit(1));
