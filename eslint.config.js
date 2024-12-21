import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

/** @type {import('eslint').FlatConfig[]} */
export default [
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    ignores: ["node_modules/**", "eslint.config.js", "init/core/filereggol.ts", "init/core/reggol.ts"], // 忽略特定文件夹
    languageOptions: {
      parser: tsParser, // 使用 @typescript-eslint/parser 作为解析器
      parserOptions: {
        ecmaVersion: "latest", // 使用最新的 ECMAScript 版本
        sourceType: "module", // 解析为模块类型
      },
      globals: {
        ...globals.node, // 添加全局变量支持，比如 Node.js 环境中的全局变量
      },
    },
    plugins: {
      "@typescript-eslint": tseslint, // 使用 @typescript-eslint/eslint-plugin 插件
    },
    rules: {
      ...pluginJs.configs.recommended.rules, // 基于 @eslint/js 提供的推荐规则
      ...tseslint.configs.recommended.rules, // 基于 typescript-eslint 的推荐规则

      // 其他规则设置
      "@typescript-eslint/no-unused-vars": [
        "warn", // 设置为 "warn" 或 "error"
        {
          vars: "all", // 检查所有未使用的变量
          args: "none", // 忽略未使用的函数参数
          ignoreRestSiblings: true, // 忽略解构中的剩余属性
          caughtErrors: "none", // 忽略 catch 语句中未使用的错误参数
          varsIgnorePattern: "^_", // 忽略变量名以 "_" 开头的未使用变量
        },
      ],
      "@typescript-eslint/no-explicit-any": "off", // 允许使用 `any` 类型
    },
  },
];
