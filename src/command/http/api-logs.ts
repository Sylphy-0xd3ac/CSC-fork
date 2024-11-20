// API 日志
export async function run(hazel, core, hold, c) {
  return c.text(hold.logs);
}

export const name = 'apilogs';
export const moduleType = 'http-command-client';
export const requiredLevel = 4;
export const requiredData = [];
export const url = 'api/logs';
