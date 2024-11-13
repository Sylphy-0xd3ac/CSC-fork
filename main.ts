import HazelCore from './hazel/hazel-core';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import process from 'node:process';

/*
 ░▒▓██████▓▒░░▒▓███████▓▒░ ░▒▓██████▓▒░ ░▒▓███████▓▒░▒▓███████▓▒░▒▓████████▓▒░      ░▒▓████████▓▒░▒▓███████▓▒░ 
░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░     ░▒▓█▓▒░         ░▒▓█▓▒░             ░▒▓█▓▒░  ░▒▓█▓▒░        
░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░     ░▒▓█▓▒░         ░▒▓█▓▒░             ░▒▓█▓▒░  ░▒▓█▓▒░        
░▒▓█▓▒░      ░▒▓███████▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓██████▓▒░░▒▓██████▓▒░   ░▒▓█▓▒░   ░▒▓██▓▒░  ░▒▓█▓▒░   ░▒▓██████▓▒░  
░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░      ░▒▓█▓▒░     ░▒▓█▓▒░  ░▒▓█▓▒░             ░▒▓█▓▒░         ░▒▓█▓▒░ 
░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░      ░▒▓█▓▒░     ░▒▓█▓▒░  ░▒▓█▓▒░             ░▒▓█▓▒░         ░▒▓█▓▒░ 
 ░▒▓██████▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓██████▓▒░░▒▓███████▓▒░▒▓███████▓▒░   ░▒▓█▓▒░             ░▒▓█▓▒░  ░▒▓███████▓▒░                                                                                                                                                                                                                                                                                                       
*/                                                                                               

let mainConfig: any;
async function main() {
  try {
    mainConfig = JSON.parse(readFileSync(
      './config.json',
      { encoding: 'utf-8', flag: 'r' }
    ));
  } catch (error) {
    console.error('Failed to parse config.json.');
    console.error(error);
    process.exit(1);
  }

  mainConfig.baseDir = dirname(fileURLToPath(import.meta.url));

  const hazel = new HazelCore( mainConfig );
  await hazel.initialize(process.argv.includes('--force'));
}

main();