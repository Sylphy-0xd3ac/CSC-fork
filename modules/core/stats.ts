// 用于统计服务器状态

export async function run(hazel, core, hold) {
  core.increaseState = function (key) {
    if (!hold.stats[key]) {
      hold.stats[key] = 0;
    }
    hold.stats[key]++;
  };

  core.decreaseState = function (key) {
    if (!hold.stats[key]) {
      hold.stats[key] = 0;
    }
    hold.stats[key]--;
  };
}

export const name = "stats";
export const dependencies: string[] = ["data"];
