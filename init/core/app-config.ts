// 用于加载和保存应用程序配置

import pkg from "fs-extra";
const { readFileSync, watch, writeFileSync } = pkg;
import { join } from "node:path";
import yaml from "js-yaml";

export async function run(hazel, core, hold) {
  // 配置文件的路径
  const configPath = join(
    hazel.mainConfig.baseDir,
    hazel.mainConfig.appConfigDir,
  );

  // 从指定的路径加载配置文件
  try {
    const fileContents = readFileSync(configPath, { encoding: "utf-8" });
    core.config = yaml.load(fileContents);
  } catch (error) {
    hazel.emit("error", error);
    core.config = {};
  }

  // 监听配置文件的变化
  watch(configPath, { encoding: "utf-8" }, async (eventType) => {
    if (eventType == "change") {
      try {
        await new Promise((resolve, reject) => {
          setTimeout(resolve, 300);
        });
        const fileContents = readFileSync(configPath, { encoding: "utf-8" });
        core.config = yaml.load(fileContents);
      } catch (error) {
        hazel.emit("error", error);
        return;
      }
    }
  });

  // 保存配置文件
  core.saveConfig = function () {
    try {
      const yamlStr = yaml.dump(core.config);
      writeFileSync(configPath, yamlStr, { encoding: "utf-8" });
    } catch (error) {
      hazel.emit("error", error);
    }
  };
}

export const priority = 1;
