// 控制台命令
import fs from 'node:fs/promises';
import path from 'node:path';

export async function run(hazel, core, hold, c) {
  try {
    const filePath = path.join(hazel.mainConfig.baseDir, hazel.mainConfig.signPath);
    const data = await fs.readFile(filePath, 'utf-8');

    let htmlContent = await fs.readFile(
      path.join(hazel.mainConfig.baseDir, hazel.mainConfig.htmlsignDir),
      'utf-8'
    );

    htmlContent = htmlContent.replace('${data}', '\n' + data);

    return c.html(htmlContent);
  } catch (err) {
    core.log(core.LOG_LEVEL.ERROR, ['Internal Server Error', err]);
    return c.text('Internal Server Error', 500);
  }
}

export const name = 'homepage';
export const moduleType = 'http-command-client';
export const requiredLevel = 0;
export const requiredData = [];
export const url = '';