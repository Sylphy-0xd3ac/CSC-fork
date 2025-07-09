// 用于查看当前可用的指令

export async function action(hazel, core, hold, socket, data) {
  let noList = ["elevate", "help"];

  if (data.command) {
    // 查找指令
    let recommand = null;

    // 检查 slashCommands
    if (core.commandService?.slashCommands?.has(data.command)) {
      const { handler, meta } = core.commandService.slashCommands.get(
        data.command,
      );

      if (
        meta.requiredLevel <= socket.level &&
        !noList.includes(data.command)
      ) {
        recommand = { ...meta, name: data.command };
        recommand.handler = handler;
        recommand.meta = meta;
      }
    }

    // 如果找到了指令
    if (recommand !== null) {
      let description = recommand.description;
      let options = [];
      if (
        recommand.requiredData &&
        typeof recommand.requiredData === "object"
      ) {
        options = Object.entries(recommand.requiredData).map(
          ([option_name, paramInfo]) => {
            const param = paramInfo as any;
            // 获取选项描述
            let option_description = param.description;
            // 检查是否为可选参数
            let is_optional = param.optional === true;
            // 如果是可选参数，在描述中添加标注
            if (is_optional) {
              option_description += " (可选)";
            }
            // 获取选项值
            let option_value = param.value // 如果选项有值
              ? param.value.map(
                  (
                    value, // 遍历选项值
                  ) => [
                    Object.keys(value)[0], // 返回选项值的键
                    Object.values(value)[0], // 返回选项值的值
                  ],
                )
              : ""; // 如果选项没有值,则返回空字符串
            return [option_name, option_description, option_value]; // 返回选项名, 选项描述, 选项值
          },
        );
      }

      let return_text = `指令: ${recommand.name} - ${description}`;
      if (options.length > 0) {
        return_text += `\n      可用的选项有:\n      ${options.map((option) => `  ${option[0]}: ${option[1]} ${option[2] ? ` - 可用的值有: ${option[2].map((value) => `  ${value[0]}: ${value[1]}`).join(",")}` : ""}`).join("\n")}`;
      }

      // 回复用户
      core.replyInfo("HELP_COMMAND", return_text, socket);
      return;
    } else {
      // 如果没找到指令
      core.replyInfo("HELP_COMMAND", "指令不存在.", socket);
      return;
    }
  }

  let commandList = []; // 存放所有可用的指令

  // 遍历 slashCommands
  if (core.commandService?.slashCommands) {
    core.commandService.slashCommands.forEach((value, name) => {
      const { meta } = value;
      // 如果指令需要的权限小于等于当前用户的权限
      if (meta && meta.requiredLevel <= socket.level) {
        commandList.push(name + " - " + (meta.description || "无描述"));
      }
    });
  }

  // 过滤掉不需要显示的指令
  commandList = commandList.filter(
    (command) => !noList.includes(command.split(" ")[0]),
  );

  // 去重并排序
  commandList = Array.from(new Set(commandList)).sort((a, b) =>
    a.localeCompare(b),
  );

  // 回复用户
  core.replyInfo(
    "HELP_COMMAND",
    "当前可用的指令有:\n" +
      commandList.join("\n") +
      "\n输入 help [指令名] 查看详细信息",
    socket,
  );
}

export async function run(hazel, core, hold) {
  if (!core.commandService) return;

  core.commandService.registerSlashCommand?.(name, action, {
    requiredLevel,
    requiredData,
    description,
  });
}

export const name = "help";
export const requiredLevel = 1;
export const requiredData = {
  command: { description: "指令名", optional: true },
};
export const description = "查看当前可用的指令";
export const dependencies = ["command-service", "ws-reply"];
