import { build } from "esbuild";
import pkg from "fs-extra";

const { copy, mkdirSync, readFileSync, writeFileSync } = pkg;

import zip from "adm-zip";
import { sync } from "glob";
import { dump, load } from "js-yaml";

// 使用glob获取当前目录及子目录下的所有ts文件
const tsFiles = sync("**/*.ts", {
  ignore: ["node_modules/**", "dist/**"], // 忽略node_modules和dist目录
});

// 构建配置
const buildOptions = {
  entryPoints: tsFiles,
  target: "esnext",
  format: "esm",
  platform: "node",
  outdir: "dist",
  minify: true,
  bundle: false,
};

const buildStartTime = Date.now();

// 执行构建
build(buildOptions)
  .then(async () => {
    console.log("开始后处理...");

    // 创建dist/config目录
    mkdirSync("dist/config", { recursive: true });

    // 拷贝config
    await copy("config/config.yml", "dist/config/config.yml");
    await copy("config/allow.txt", "dist/config/allow.txt");
    await copy("config/deny.txt", "dist/config/deny.txt");

    // 拷贝mainConfig
    await copy("config.yml", "dist/config.yml");

    const config = load(readFileSync("./config.yml", { encoding: "utf-8", flag: "r" }));
    config.DevMode = false;
    writeFileSync("./dist/config.yml", dump(config, "dist/config.yml"), {
      encoding: "utf-8",
    });

    // 解压客户端文件
    const client = new zip("client.zip");
    client.extractAllTo("dist/client", true, true);
    console.log("客户端文件解压完成");

    // 拷贝运行时文件
    await copy("package.json", "dist/package.json");
    await copy(".yarnrc.yml", "dist/.yarnrc.yml")
    await copy("yarn.lock", "dist/yarn.lock");
    const totalTime = Date.now() - buildStartTime;
    console.log(`✔ Finished in ${totalTime.toFixed(2)} ms`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
