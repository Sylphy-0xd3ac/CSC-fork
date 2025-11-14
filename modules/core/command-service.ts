// 初始化命令服务
export async function run(hazel, core, hold) {
  // 保存现有的 actions 和 slashCommands
  const existingActions = core.commandService?.actions;
  const existingSlashCommands = core.commandService?.slashCommands;
  type MetaType = {
    requiredLevel: number;
    requiredData: Record<string, { optional?: boolean; value?: Array<Record<string, string>> }>;
  };
  type Socket = { level: number } & Record<string, unknown> & {
      _boundActions?: Set<string>;
      on: (name: string, handler: (data) => unknown) => unknown;
      handshake: { address: string };
      disconnect: (...args: [true, ...unknown[]]) => void;
    };
  type RequireData = {
    [key: string]: {
      optional: boolean;
      description: string;
      value: Array<{ [key: string]: string }>;
    };
  } | null;

  const actions =
    existingActions && existingActions.size > 0
      ? existingActions
      : new Map<string, { handler: (...args: unknown[]) => unknown; meta: MetaType }>();
  const slashCommands =
    existingSlashCommands && existingSlashCommands.size > 0
      ? existingSlashCommands
      : new Map<string, { handler: (...args: unknown[]) => unknown; meta: MetaType }>();

  function validateAndHandle(name: string, socket: Socket, data: Record<string, string>) {
    // 检查该地址是否请求频率过高
    if (core.checkAddress?.(socket.remoteAddress, 1)) {
      core.replyWarn("RATE_LIMITED", "您的操作过于频繁，请稍后再试。", socket);
      return;
    }

    // 找到 action
    if (!actions.has(name)) {
      core.replyMalformedCommand(socket);
      return;
    }
    const { handler, meta } = actions.get(name);

    // 权限验证
    if (typeof meta.requiredLevel === "number" && socket.level < meta.requiredLevel) {
      core.replyMalformedCommand(socket);
      return;
    }

    // requiredData 参数校验
    if (meta.requiredData && typeof meta.requiredData === "object") {
      const entries = Object.entries(meta.requiredData as RequireData);

      // 计算必需参数的数量
      const requiredParamCount = entries.filter(([_paramName, paramInfo]) => {
        return paramInfo.optional !== true;
      }).length;

      // 检查必需参数是否都存在
      const providedRequiredParams = entries.filter(([paramName, paramInfo]) => {
        return paramInfo.optional !== true && paramName in data;
      }).length;

      if (providedRequiredParams < requiredParamCount) {
        core.replyMalformedCommand(socket);
        return;
      }

      // 值校验
      for (const [paramName, paramInfo] of entries) {
        // 如果参数有 optional 属性且为 true，则跳过
        if (paramInfo.optional === true) {
          continue;
        }

        // 检查必需参数是否存在
        if (!(paramName in data)) {
          core.replyMalformedCommand(socket);
          return;
        }

        const allowed = Array.isArray(paramInfo.value)
          ? paramInfo.value.map((v) => Object.keys(v)[0])
          : null;

        if (allowed && allowed.length > 0) {
          if (!allowed.includes(data[paramName])) {
            core.replyMalformedCommand(socket);
            return;
          }
        }
      }
    }

    // 执行处理
    Promise.resolve()
      .then(() => handler(hazel, core, hold, socket, data))
      .then(() => core.increaseGlobalRate?.())
      .catch((error) => hazel.emit("error", error, socket));
  }

  core.commandService = {
    actions,
    slashCommands,

    registerAction(name: string, handler: (...args: unknown[]) => unknown, meta: MetaType = null) {
      if (!meta) throw new Error(`Command ${name} must provide meta object`);

      if (typeof meta.requiredLevel !== "number") {
        throw new Error(`Command ${name} must set requiredLevel`);
      }
      if (typeof meta.requiredData !== "object" || meta.requiredData === null) {
        throw new Error(`Command ${name} must set requiredData`);
      }
      actions.set(name, { handler, meta });

      // 动态为现有 socket 绑定事件处理器
      if (hold.io?.of) {
        for (const socket of hold.io.of("/").sockets.values()) {
          // 防止重复绑定
          if (!socket._boundActions) socket._boundActions = new Set<string>();
          if (!socket._boundActions.has(name)) {
            socket.on(name, (data) => validateAndHandle(name, socket, data));
            socket._boundActions.add(name);
          }
        }
      }
    },

    registerSlashCommand(
      name: string,
      handler: (...args: unknown[]) => unknown,
      meta: MetaType = null,
    ) {
      if (!meta) throw new Error(`Command ${name} must provide meta object`);

      if (typeof meta.requiredLevel !== "number") {
        throw new Error(`Command ${name} must set requiredLevel`);
      }
      if (typeof meta.requiredData !== "object" || meta.requiredData === null) {
        throw new Error(`Command ${name} must set requiredData`);
      }
      this.actions.set(name, { handler, meta });
      this.slashCommands.set(name, { handler, meta });
    },

    // 为一个 socket 绑定所有 action 事件处理器
    bindSocket(socket: Socket) {
      for (const [name] of actions.entries()) {
        if (!socket._boundActions) socket._boundActions = new Set<string>();
        if (!socket._boundActions.has(name)) {
          socket.on(name, (data) => validateAndHandle(name, socket, data));
          socket._boundActions.add(name);
        }
      }
    },

    /**
     * 处理聊天框中的 /slash 命令
     */
    async handleSlash(socket: Socket, line: string) {
      if (!line.startsWith("/")) return;

      const cmdName = line.slice(1).split(" ")[0];

      // 新的 slash 命令
      if (slashCommands.has(cmdName)) {
        const { handler, meta } = slashCommands.get(cmdName);
        if (typeof meta.requiredLevel === "number" && socket.level < meta.requiredLevel) {
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
            const optionName = args[i].slice(2); // 去掉前缀
            const optionValue = args[i + 1];

            if (paramNames.includes(optionName) && optionValue !== undefined) {
              data[optionName] = optionValue;
              i++; // 跳过下一个参数（值）
            } else {
              core.replyMalformedCommand?.(socket);
              return;
            }
          } else {
            positionalArgs.push(args[i]);
          }
        }

        // 按参数定义顺序匹配位置参数，支持 - 跳过可选参数
        if (meta.requiredData && typeof meta.requiredData === "object") {
          const entries = Object.entries(meta.requiredData as RequireData);
          let pos = 0;

          for (let i = 0; i < entries.length; i++) {
            const [paramName, paramInfo] = entries[i];

            if (paramName in data) {
              continue;
            }

            if (pos < positionalArgs.length) {
              const currentArg = positionalArgs[pos];
              if (currentArg === "-" && paramInfo.optional) {
                pos++;
                continue;
              }
              data[paramName] = currentArg;
              pos++;
            }
          }
        }

        // requiredData 参数校验
        if (meta.requiredData && typeof meta.requiredData === "object") {
          const entries = Object.entries(meta.requiredData as RequireData);

          // 计算必需参数的数量
          const requiredParamCount = entries.filter(([_paramName, paramInfo]) => {
            return paramInfo.optional !== true;
          }).length;

          // 检查必需参数是否都存在
          const providedRequiredParams = entries.filter(([paramName, paramInfo]) => {
            return paramInfo.optional !== true && paramName in data;
          }).length;

          if (providedRequiredParams < requiredParamCount) {
            core.replyMalformedCommand?.(socket);
            return;
          }

          // 值校验
          for (const [paramName, paramInfo] of entries) {
            if (paramInfo.optional === true) {
              continue;
            }
            if (!(paramName in data)) {
              core.replyMalformedCommand?.(socket);
              return;
            }
            const allowed = Array.isArray(paramInfo.value)
              ? paramInfo.value.map((v) => Object.keys(v)[0])
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
      } else {
        core.replyMalformedCommand(socket);
        return;
      }
    },
  };
}

export const name = "command-service";
export const dependencies: string[] = ["ws-reply", "stats", "data"];
