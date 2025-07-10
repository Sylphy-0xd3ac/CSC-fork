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
      if (typeof meta.requiredLevel !== "number") {
        throw new Error(`Command ${name} must set requiredLevel`);
      }
      if (typeof meta.requiredData !== "object" || meta.requiredData === null) {
        throw new Error(`Command ${name} must set requiredData`);
      }
      this.actions.set(name, { handler, meta });
    },

    registerSlashCommand(
      name: string,
      handler: (...args: any[]) => any,
      meta: any = {},
    ) {
      if (typeof meta.requiredLevel !== "number") {
        throw new Error(`Command ${name} must set requiredLevel`);
      }
      if (typeof meta.requiredData !== "object" || meta.requiredData === null) {
        throw new Error(`Command ${name} must set requiredData`);
      }
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

        // 权限验证
        if (
          typeof meta.requiredLevel === "number" &&
          socket.level < meta.requiredLevel
        ) {
          core.replyMalformedCommand(socket);
          return;
        }

        // requiredData 参数校验
        if (meta.requiredData && typeof meta.requiredData === "object") {
          const entries = Object.entries(meta.requiredData);

          // 计算必需参数的数量
          const requiredParamCount = entries.filter(
            ([paramName, paramInfo]) => {
              return (paramInfo as any).optional !== true;
            },
          ).length;

          // 数量校验
          const providedParams = Object.keys(data).filter(
            (key) => key !== "cmd",
          );
          if (providedParams.length < requiredParamCount) {
            core.replyMalformedCommand(socket);
            return;
          }

          // 值校验
          for (const [paramName, paramInfo] of entries) {
            const param = paramInfo as any;
            // 如果参数有 optional 属性且为 true，则跳过
            if (param.optional === true) {
              continue;
            }

            // 检查必需参数是否存在
            if (!(paramName in data)) {
              core.replyMalformedCommand(socket);
              return;
            }

            const allowed = Array.isArray(param.value)
              ? param.value.map((v) => Object.keys(v)[0])
              : null;

            if (allowed && allowed.length > 0) {
              if (!allowed.includes(data[paramName])) {
                core.replyMalformedCommand(socket);
                return;
              }
            }
          }
        }

        try {
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

        // --option value 格式和按顺序解析
        const args = line.trim().split(" ").slice(1);
        const data = {};
        const positionalArgs = [];
        const paramNames = Object.keys(meta.requiredData || {});

        // 分离位置参数和命名参数
        for (let i = 0; i < args.length; i++) {
          if (args[i].startsWith("--")) {
            // 命名参数 --option value
            const optionName = args[i].slice(2); // 去掉前缀
            const optionValue = args[i + 1];
            
            if (paramNames.includes(optionName) && optionValue !== undefined) {
              data[optionName] = optionValue;
              i++; // 跳过下一个参数（值）
            } else {
              // 无效的命名参数
              core.replyMalformedCommand?.(socket);
              return;
            }
          } else {
            // 位置参数
            positionalArgs.push(args[i]);
          }
        }

        // 按参数定义顺序匹配位置参数，支持 - 跳过可选参数
        if (meta.requiredData && typeof meta.requiredData === "object") {
          const entries = Object.entries(meta.requiredData);
          let pos = 0;
          
          // 按参数定义顺序依次匹配位置参数
          for (let i = 0; i < entries.length; i++) {
            const [paramName, paramInfo] = entries[i];
            const param = paramInfo as any;
            
            // 如果参数已经被命名参数指定，跳过
            if (paramName in data) {
              continue;
            }
            
            // 如果还有位置参数可用
            if (pos < positionalArgs.length) {
              const currentArg = positionalArgs[pos];
              // 如果当前位置参数是 "-"，且当前参数是可选的，跳过这个可选参数
              if (currentArg === "-" && param.optional) {
                pos++; // 消耗掉 "-" 参数
                continue; // 跳过当前可选参数
              }
              // 正常分配参数
              data[paramName] = currentArg;
              pos++;
            }
          }
        }

        // requiredData 参数校验
        if (meta.requiredData && typeof meta.requiredData === "object") {
          const entries = Object.entries(meta.requiredData);

          // 计算必需参数的数量
          const requiredParamCount = entries.filter(
            ([paramName, paramInfo]) => {
              return (paramInfo as any).optional !== true;
            },
          ).length;

          // 检查必需参数是否都存在
          const providedRequiredParams = entries.filter(
            ([paramName, paramInfo]) => {
              const param = paramInfo as any;
              return param.optional !== true && paramName in data;
            },
          ).length;

          if (providedRequiredParams < requiredParamCount) {
            core.replyMalformedCommand?.(socket);
            return;
          }

          // 值校验
          for (const [paramName, paramInfo] of entries) {
            const param = paramInfo as any;
            // 如果参数有 optional 属性且为 true，则跳过
            if (param.optional === true) {
              continue;
            }

            // 检查必需参数是否存在
            if (!(paramName in data)) {
              core.replyMalformedCommand?.(socket);
              return;
            }

            const allowed = Array.isArray(param.value)
              ? param.value.map((v) => Object.keys(v)[0])
              : null;

            if (allowed && allowed.length > 0) {
              if (!allowed.includes(data[paramName])) {
                core.replyMalformedCommand?.(socket);
                return;
              }
            }
          }
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
