// 用于统计服务器状态

export async function run(_hazel, core, hold) {
  core.increaseState = (key) => {
    if (!hold.stats[key]) {
      hold.stats[key] = 0;
    }
    hold.stats[key]++;
  };

  core.decreaseState = (key) => {
    if (!hold.stats[key]) {
      hold.stats[key] = 0;
    }
    hold.stats[key]--;
  };
}

export const name = "stats";
export const dependencies: string[] = ["data"];
