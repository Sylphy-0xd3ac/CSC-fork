// 设置全站的 CIDR 检查规则
export async function run(hazel, core, hold, socket, data) {
  // data.rule 应该是 'on' 或 'off'
  if (data.rule !== "on" && data.rule !== "off") {
    core.replyMalformedCommand(socket);
    return;
  }

  // data.type 应该是 'global' 或 'channel'
  if (data.type !== "global" && data.type !== "channel") {
    core.replyMalformedCommand(socket);
    return;
  }

  // 设置全站的 CIDR 检查规则
  if (data.type === "global") {
    if (data.rule === "on") {
      hold.checkCIDRglobal = true;
      core.broadcastInfo(
        "GLOBAL_CIDR_CHECK_ON",
        "全站已开启 CIDR 检查。",
        core.findSocketByLevel(core.config.level.member),
      );
    } else {
      hold.checkCIDRglobal = false;
      core.broadcastInfo(
        "GLOBAL_CIDR_CHECK_OFF",
        "全站已关闭 CIDR 检查。",
        core.findSocketByLevel(core.config.level.member),
      );
    }
  }

  // 设置频道的 CIDR 检查规则
  if (data.type === "channel") {
    if (data.rule === "on") {
      hold.checkCIDRchannelList.set(socket.channel, true);
      core.broadcastInfo(
        "CHANNEL_CIDR_CHECK_ON",
        socket.channel + " 已开启 CIDR 检查。",
        core.findSocketByLevel(core.config.level.member),
        { channel: socket.channel },
      );
    } else {
      hold.checkCIDRchannelList.set(socket.channel, false);
      core.broadcastInfo(
        "CHANNEL_CIDR_CHECK_OFF",
        socket.channel + " 已关闭 CIDR 检查。",
        core.findSocketByLevel(core.config.level.member),
        { channel: socket.channel },
      );
    }
  }

  // 写入存档
  core.archive("IPC", socket, data.rule + " " + data.type);
}

// 用户使用 /ipcheck <on|off> <global|channel> 命令时触发
export async function execByChat(hazel, core, hold, socket, line) {
  let args = core.splitArgs(line);
  if (args[2]) {
    await run(hazel, core, hold, socket, { rule: args[1], type: args[2] });
  } else {
    await run(hazel, core, hold, socket, { rule: args[1], type: "global" });
  }
}

export const name = "ipcheck";
export const requiredLevel = 4;
export const requiredData = [
  {
    rule: {
      description: "规则",
      value: [{ on: "开启CIDR检查" }, { off: "关闭CIDR检查" }],
    },
  },
  {
    type: {
      description: "类型",
      value: [{ global: "全站CIDR检查" }, { channel: "频道CIDR检查" }],
    },
  },
];
export const moduleType = "ws-command";
export const description = "设置全站或频道的 CIDR 检查规则";
