import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

/** @type {import('eslint').FlatConfig[]} */
export default [
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    ignores: ["node_modules/**", "dist/**"], // 忽略特定文件夹
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
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...pluginJs.configs.recommended.rules, // 基于 @eslint/js 提供的推荐规则
      ...tseslint.configs.recommended.rules, // 基于 typescript-eslint 的推荐规则
      "@typescript-eslint/no-unused-vars": "warn", // TypeScript 特定的规则
    },
  },
];
