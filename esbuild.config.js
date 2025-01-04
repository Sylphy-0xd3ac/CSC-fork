import { build } from 'esbuild';
import { sync } from 'glob';
import { copyFileSync,mkdirSync,readFileSync,writeFileSync } from 'fs';
import { load,dump } from "js-yaml";

let globStartTimestamp = Date.now();
// 使用glob获取当前目录及子目录下的所有ts文件
const tsFiles = sync('**/*.ts', {
  ignore: ['node_modules/**', 'dist/**'], // 忽略node_modules和dist目录
});
console.log(`Glob finished in ${Date.now() - globStartTimestamp}ms`);

// 构建配置
const buildOptions = {
  entryPoints: tsFiles,
  bundle: false,
  target: 'esnext',
  format: 'esm',
  platform: 'node',
  outdir: 'dist', // 输出目录
};

let buildStartTimestamp = Date.now();
// 执行构建
build(buildOptions).then(() => {
  // 创建dist/config目录
  mkdirSync('dist/config', { recursive: true });

  // 拷贝config
  copyFileSync('config/config.yml', 'dist/config/config.yml');
  copyFileSync('config/allow.txt', 'dist/config/allow.txt');

  // 拷贝mainConfig
  copyFileSync('config.yml', 'dist/config.yml');

  let config = load(readFileSync("./config.yml", { encoding: "utf-8", flag: "r" }));
  config.hazel.moduleDirs.staticDir = "/boot/boot.js,/boot/boot_ws.js";
  writeFileSync("./dist/config.yml", dump(config, 'dist/config.yml') , { encoding: "utf-8" });
}).catch((err) => {
  console.error(err);
  process.exit(1);
});

console.log(`Build finished in ${Date.now() - buildStartTimestamp}ms`);