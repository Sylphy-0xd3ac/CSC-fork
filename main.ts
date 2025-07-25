import HazelCore from "./hazel/hazel-core.js";
import pkg from "fs-extra";
const { readFileSync } = pkg;
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import process from "node:process";
import yml from "js-yaml";
import path from "node:path";

let mainConfig: any;
async function main() {
  try {
    mainConfig = yml.load(
      readFileSync("./config.yml", { encoding: "utf-8", flag: "r" }),
    );
  } catch (error) {
    console.error("Failed to parse config.yml.");
    console.error(error);
    process.exit(1);
  }

  mainConfig.baseDir = path.join(
    dirname(fileURLToPath(import.meta.url)),
    mainConfig.baseDir,
  );

  const hazel = new HazelCore(mainConfig);
  await hazel.initialize(process.argv.includes("--force"));
}

main();
