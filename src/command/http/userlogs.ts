import fs from 'node:fs/promises';
import path from 'node:path';

// 用户日志
export async function run(hazel, core, hold, c) {
    try {
        let htmlContent = await fs.readFile(
          path.join(hazel.mainConfig.baseDir, hazel.mainConfig.htmluserlogsDir),
          'utf-8'
        );
  
        htmlContent = htmlContent.replace('${logs}', hold.logs);
  
        if (hold.warningCount > 0 || hold.errorCount > 0) {
          htmlContent = htmlContent.replace(
            '${errorAndWarningCount}',
            `<p style="color: orange;">${hold.warningCount} Warnings.</p>
             <p style="color: red;">${hold.errorCount} Errors.</p>`
          );
        } else {
          htmlContent = htmlContent.replace(
            '${errorAndWarningCount}',
            '<p style="color: green;">No errors or warnings.</p>'
          );
        }
  
        return c.html(htmlContent,200);
      } catch (err) {
        console.error(err);
        return c.text('Internal Server Error', 500);
      }
}
  
export const name = 'userlogs';
export const moduleType = 'http-command-client';
export const requiredLevel = 4;
export const requiredData = [];
export const url = 'user/logs';
