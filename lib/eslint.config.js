import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import stylistic from '@stylistic/eslint-plugin'

export default [
  { files: ["**/*.{js,mjs,cjs,ts}"] },
  {
    languageOptions: {
      globals: globals.node,
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      '@stylistic/js': stylistic
    },
    rules: {
      "no-unused-private-class-members": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
    ignores: ["dist/", "node_modules/"]
  },
];
