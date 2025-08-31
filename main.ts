import pkg from "fs-extra";
import HazelCore from "./hazel/hazel-core.js";

const { readFileSync } = pkg;

import path, { dirname } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import yml from "js-yaml";

let mainConfig: any;
async function main() {
  try {
    mainConfig = yml.load(readFileSync("./config.yml", { encoding: "utf-8", flag: "r" }));
  } catch (error) {
    console.error("Failed to parse config.yml.");
    console.error(error);
    process.exit(1);
  }

  mainConfig.baseDir = path.join(dirname(fileURLToPath(import.meta.url)), mainConfig.baseDir);

  const hazel = new HazelCore(mainConfig);
  await hazel.initialize(process.argv.includes("--force"));
}

main();
