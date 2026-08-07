// Plain JavaScript, no TypeScript. Same standard, enforced without type information.
//
// Install:
//   npm i -D eslint @eslint/js eslint-plugin-unicorn eslint-plugin-sonarjs \
//     eslint-plugin-import eslint-plugin-security eslint-plugin-unused-imports \
//     @eslint-community/eslint-plugin-eslint-comments eslint-config-prettier
//
// Add "// @ts-check" and a jsconfig.json with checkJs so the editor still catches type
// errors. Without static types, the review burden moves to tests - hold the line there.

import eslint from "@eslint/js";
import unicorn from "eslint-plugin-unicorn";
import sonarjs from "eslint-plugin-sonarjs";
import importPlugin from "eslint-plugin-import";
import security from "eslint-plugin-security";
import unusedImports from "eslint-plugin-unused-imports";
import eslintComments from "@eslint-community/eslint-plugin-eslint-comments/configs";
import prettierConfig from "eslint-config-prettier";

export default [
  { ignores: ["dist/**", "build/**", "coverage/**", "node_modules/**"] },

  eslint.configs.recommended,
  unicorn.configs["flat/recommended"],
  sonarjs.configs.recommended,
  security.configs.recommended,
  eslintComments.recommended,

  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
    },
    plugins: { import: importPlugin, "unused-imports": unusedImports },
    rules: {
      "@eslint-community/eslint-comments/no-use": ["error", { allow: [] }],

      complexity: ["error", { max: 8 }],
      "max-depth": ["error", 2],
      "max-lines-per-function": [
        "error",
        { max: 40, skipBlankLines: true, skipComments: true },
      ],
      "max-params": ["error", 3],
      "max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
      "no-else-return": ["error", { allowElseIf: false }],
      "no-lonely-if": "error",
      "no-nested-ternary": "error",

      "sonarjs/no-identical-functions": "error",
      "sonarjs/no-duplicate-string": ["error", { threshold: 3 }],
      "no-magic-numbers": ["error", { ignore: [0, 1, -1], ignoreArrayIndexes: true }],

      "unicorn/prevent-abbreviations": [
        "error",
        {
          checkFilenames: true,
          allowList: {
            id: true, url: true, uri: true, api: true, http: true, db: true,
            io: true, sql: true, ui: true, env: true, props: true, params: true, args: true,
          },
        },
      ],
      "unicorn/filename-case": ["error", { cases: { kebabCase: true, camelCase: true } }],
      camelcase: ["error", { properties: "never" }],

      eqeqeq: ["error", "always"],
      "no-console": "error",
      "no-debugger": "error",
      "no-var": "error",
      "prefer-const": "error",
      "no-param-reassign": ["error", { props: true }],
      "require-await": "error",
      "no-return-await": "error",
      "no-await-in-loop": "error",
      "unused-imports/no-unused-imports": "error",
      "import/no-cycle": ["error", { maxDepth: Infinity }],

      // Without types, runtime shape checks matter more. Enforce explicit undefined handling.
      "no-undef-init": "error",
      "no-implicit-coercion": "error",
      "unicorn/no-null": "off",
    },
  },

  {
    files: ["**/*.test.js", "**/*.spec.js", "**/tests/**"],
    rules: {
      "max-lines-per-function": "off",
      "max-lines": "off",
      "no-magic-numbers": "off",
      "sonarjs/no-duplicate-string": "off",
    },
  },

  prettierConfig,
];
