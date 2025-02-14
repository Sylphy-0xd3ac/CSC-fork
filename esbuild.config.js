import { build } from "esbuild";
import pkg from "fs-extra";
const { copy, mkdirSync, readFileSync, writeFileSync } = pkg;
import { load, dump } from "js-yaml";
import zip from "adm-zip";
import { sync } from "glob";

let globStartTimestamp = Date.now();
// 使用glob获取当前目录及子目录下的所有ts文件
const tsFiles = sync("**/*.ts", {
  ignore: ["node_modules/**", "dist/**"], // 忽略node_modules和dist目录
});
console.log(`Glob finished in ${Date.now() - globStartTimestamp}ms`);

// 构建配置
const buildOptions = {
  entryPoints: tsFiles,
  bundle: false,
  target: "esnext",
  format: "esm",
  platform: "node",
  outdir: "dist", // 输出目录
};

let buildStartTimestamp = Date.now();
// 执行构建
build(buildOptions)
  .then(async () => {
    // 创建dist/config目录
    mkdirSync("dist/config", { recursive: true });

    // 拷贝config
    await copy("config/config.yml", "dist/config/config.yml");
    await copy("config/allow.txt", "dist/config/allow.txt");
    await copy("config/deny.txt", "dist/config/deny.txt");

    // 拷贝mainConfig
    await copy("config.yml", "dist/config.yml");

    let config = load(
      readFileSync("./config.yml", { encoding: "utf-8", flag: "r" }),
    );
    config.hazel.moduleDirs.staticDir = "/boot/boot.js,/boot/boot_ws.js";
    config.runOnTS = false;
    writeFileSync("./dist/config.yml", dump(config, "dist/config.yml"), {
      encoding: "utf-8",
    });
    let extractTimestamp = Date.now();
    const client = new zip("client.zip");
    client.extractAllTo("dist/client", true, true);
    console.log(`Extract finished in ${Date.now() - extractTimestamp}ms`);
    let copyTimestamp = Date.now();
    await copy("package.json", "dist/package.json");
    await copy("yarn.lock", "dist/yarn.lock");
    await copy("node_modules", "dist/node_modules");
    await copy(".yarn", "dist/.yarn");
    console.log(`Copy finished in ${Date.now() - copyTimestamp}ms`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

console.log(`Build finished in ${Date.now() - buildStartTimestamp}ms`);
