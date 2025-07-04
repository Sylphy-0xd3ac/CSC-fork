import { defineConfig } from 'rolldown';
import { sync } from 'glob';
import pkg from 'fs-extra';
const { copy, mkdirSync, readFileSync, writeFileSync } = pkg;
import { load, dump } from 'js-yaml';
import zip from 'adm-zip';

// 使用glob获取当前目录及子目录下的所有ts文件
const tsFiles = sync('**/*.ts', {
  ignore: ['node_modules/**', 'dist/**', 'rolldown.config.ts'], // 忽略node_modules、dist目录和配置文件本身
});

export default defineConfig({
  input: tsFiles,
  output: {
    dir: 'dist',
    format: 'esm',
    entryFileNames: '[name].js',
    chunkFileNames: '[name]-[hash].js',
    assetFileNames: '[name]-[hash][extname]',
  },
  platform: 'node',
  plugins: [
    {
      name: 'post-build-copy',
      closeBundle: async () => {
        console.log('开始后处理...');
        
        // 创建dist/config目录
        mkdirSync('dist/config', { recursive: true });

        // 拷贝config文件
        await copy('config/config.yml', 'dist/config/config.yml');
        await copy('config/allow.txt', 'dist/config/allow.txt');
        await copy('config/deny.txt', 'dist/config/deny.txt');

        // 拷贝mainConfig
        await copy('config.yml', 'dist/config.yml');

        // 修改配置文件
        let config = load(
          readFileSync('./config.yml', { encoding: 'utf-8', flag: 'r' }),
        ) as any;
        config.hazel.moduleDirs.staticDir = '/boot/boot.js,/boot/boot_ws.js';
        config.runOnTS = false;
        writeFileSync('./dist/config.yml', dump(config), {
          encoding: 'utf-8',
        });

        // 解压客户端文件
        const client = new zip('client.zip');
        client.extractAllTo('dist/client', true, true);
        console.log('客户端文件解压完成');

        // 拷贝运行时文件
        await copy('package.json', 'dist/package.json');
        await copy('yarn.lock', 'dist/yarn.lock');
        console.log('构建完成！');
      },
    },
  ],
}); 