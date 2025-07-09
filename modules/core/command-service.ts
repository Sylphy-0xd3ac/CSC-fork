// 初始化命令服务
export async function run(hazel, core, hold) {
  // 保存现有的 actions 和 slashCommands
  const existingActions = core.commandService?.actions;
  const existingSlashCommands = core.commandService?.slashCommands;

  core.commandService = {
    // 命令服务
    actions:
      existingActions && existingActions.size > 0
        ? existingActions
        : new Map<string, any>(),
    slashCommands:
      existingSlashCommands && existingSlashCommands.size > 0
        ? existingSlashCommands
        : new Map<string, any>(),

    /**
     * 向 commandService 注册新的 action。
     * @param name action 名称
     * @param handler 处理函数
     * @param meta 额外元数据（例如 requiredLevel 等）
     */
    registerAction(
      name: string,
      handler: (...args: any[]) => any,
      meta: any = {},
    ) {
      this.actions.set(name, { handler, meta });
    },

    registerSlashCommand(
      name: string,
      handler: (...args: any[]) => any,
      meta: any = {},
    ) {
      this.slashCommands.set(name, { handler, meta });
    },

    /**
     * 处理来自 WebSocket 的命令
     * @param socket WebSocket 连接
     * @param data   解析后的消息对象
     */
    async handle(socket: any, data: any) {
      // 必须包含 cmd
      if (!data.cmd) {
        return;
      }

      // 如果通过 registerAction 注册，使用 action 处理
      if (this.actions.has(data.cmd)) {
        const { handler, meta } = this.actions.get(data.cmd);
        try {
          // 权限验证
          if (
            typeof meta.requiredLevel === "number" &&
            socket.level < meta.requiredLevel
          ) {
            core.replyMalformedCommand(socket);
            return;
          }
          await handler(hazel, core, hold, socket, data);
        } catch (error) {
          hazel.emit("error", error, socket);
        }
        core.increaseGlobalRate?.();
        return;
      }
    },

    /**
     * 处理聊天框中的 /slash 命令
     * @param socket WebSocket 连接
     * @param line   原始文本（以 / 开头）
     */
    async handleSlash(socket: any, line: string) {
      if (!line.startsWith("/")) return;

      const cmdName = line.slice(1).split(" ")[0];

      // 新的 slash 命令
      if (this.slashCommands.has(cmdName)) {
        const { handler, meta } = this.slashCommands.get(cmdName);
        if (
          typeof meta.requiredLevel === "number" &&
          socket.level < meta.requiredLevel
        ) {
          core.replyMalformedCommand?.(socket);
          return;
        }

        // requiredData 参数校验
        if (meta.requiredData && typeof meta.requiredData === "object") {
          const args = line.trim().split(" ").slice(1);
          const entries = Object.entries(meta.requiredData);

          // 计算必需参数的数量
          const requiredParamCount = entries.filter(
            ([paramName, paramInfo]) => {
              return (paramInfo as any).optional !== true;
            },
          ).length;

          // 数量校验
          if (args.length < requiredParamCount) {
            core.replyMalformedCommand?.(socket);
            return;
          }

          // 值校验
          for (let i = 0; i < entries.length && i < args.length; i++) {
            const [_paramName, paramInfo] = entries[i];
            const param = paramInfo as any;
            // 如果参数有 optional 属性且为 true，则跳过
            if (param.optional === true) {
              continue;
            }

            const allowed = Array.isArray(param.value)
              ? param.value.map((v) => Object.keys(v)[0])
              : null;

            if (allowed && allowed.length > 0) {
              if (!allowed.includes(args[i])) {
                core.replyMalformedCommand?.(socket);
                return;
              }
            }
          }
        }

        // 如果参数校验通过，则构造参数对象
        const args = line.trim().split(" ").slice(1);
        const data = {};
        if (meta.requiredData && typeof meta.requiredData === "object") {
          Object.entries(meta.requiredData).forEach(
            ([paramName, paramInfo], index) => {
              if (index < args.length) {
                data[paramName] = args[index];
              }
            },
          );
        }

        try {
          await handler(hazel, core, hold, socket, data);
        } catch (error) {
          hazel.emit("error", error, socket);
        }

        core.increaseGlobalRate?.();
      }
    },
  };
}

export const name = "command-service";
export const dependencies: string[] = ["ws-reply", "stats", "ws-reply", "data"];
