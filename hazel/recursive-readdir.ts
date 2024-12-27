import { readdirSync } from "node:fs";
import { join } from "node:path";

function readDir(baseDir, resultArray) {
  // 获取当前执行目录
  const isNexe = (global.__nexe || false);
  const basePath = isNexe ? process.cwd() : baseDir;
  let dirResult = readdirSync(basePath, {
    encoding: "utf-8",
    withFileTypes: true,
  });

  dirResult.forEach((value) => {
    if (!value.isDirectory()) {
      resultArray.push(join(basePath, value.name));
    } else {
      resultArray = readDir(join(basePath, value.name), resultArray);
    }
  });

  return resultArray;
}

export default function recursiveReadDir(baseDir) {
  return readDir(baseDir, []);
}
