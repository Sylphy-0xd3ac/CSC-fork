// 初始化命令服务
export function run(hazel, core, hold) {
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
            socket.on(name, (data) => this.validateAndHandle(name, socket, data));
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
      this.slashCommands.set(name, { handler, meta });
    },

    // 为一个 socket 绑定所有 action 事件处理器
    bindSocket(socket: Socket) {
      for (const [name] of actions.entries()) {
        if (!socket._boundActions) socket._boundActions = new Set<string>();
        if (!socket._boundActions.has(name)) {
          socket.on(name, (data) => this.validateAndHandle(name, socket, data));
          socket._boundActions.add(name);
        }
      }
    },

    validateAndHandle(name: string, socket: Socket, data: Record<string, string> | [string]) {
      // 检查该地址是否请求频率过高
      if (core.checkAddress?.(socket.remoteAddress, 1)) {
        core.replyWarn("RATE_LIMITED", "您的操作过于频繁，请稍后再试。", socket);
        return;
      }

      // 找到 action
      if (!actions.has(name) && !slashCommands.has(name)) {
        core.replyMalformedCommand(socket);
        return;
      }
      const { handler, meta } = actions.has(name) ? actions.get(name) : slashCommands.get(name);

      // 权限验证
      if (typeof meta.requiredLevel === "number" && socket.level < meta.requiredLevel) {
        core.replyMalformedCommand(socket);
        return;
      }

      // 转化 [string] 格式为 { string: string } 格式
      if (Array.isArray(data)) {
        data = this.convertArray(socket, name, data);
        if (!data) return;
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
    },

    /**
     * 转化 [string] 格式为 { string: string } 格式
     */
    convertArray(socket: Socket, name: string, args: [string]): Record<string, string> | null {
      if (!Array.isArray(args)) return null;

      // 新的 slash 命令
      if (slashCommands.has(name)) {
        const { meta } = slashCommands.get(name);
        if (typeof meta.requiredLevel === "number" && socket.level < meta.requiredLevel) {
          return null;
        }

        // --option value 格式和按顺序解析
        const data = {};

        // 按参数定义顺序匹配位置参数
        if (meta.requiredData && typeof meta.requiredData === "object") {
          const entries = Object.entries(meta.requiredData as RequireData);
          let pos = 0;

          for (let i = 0; i < entries.length; i++) {
            const [paramName, paramInfo] = entries[i];

            if (paramName in data) {
              continue;
            }

            if (pos < args.length) {
              const currentArg = args[pos];
              if (currentArg === "-" && paramInfo.optional) {
                pos++;
                continue;
              }
              data[paramName] = currentArg;
              pos++;
            }
          }
        }
        return data;
      }
      return null;
    },
  };
}

export const name = "command-service";
export const dependencies: string[] = ["ws-reply", "stats", "data"];
