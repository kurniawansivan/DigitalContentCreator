// Base ESLint flat config. Enforces the repository engineering standard.
//
// Install:
//   npm i -D eslint typescript typescript-eslint eslint-plugin-unicorn eslint-plugin-sonarjs \
//     eslint-plugin-import eslint-plugin-security @eslint/js eslint-config-prettier \
//     eslint-plugin-unused-imports @eslint-community/eslint-plugin-eslint-comments
//
// Frontend presets in ../react, ../vue, ../svelte extend this array.

import eslint from "@eslint/js";
import typescriptEslint from "typescript-eslint";
import unicorn from "eslint-plugin-unicorn";
import sonarjs from "eslint-plugin-sonarjs";
import importPlugin from "eslint-plugin-import";
import security from "eslint-plugin-security";
import unusedImports from "eslint-plugin-unused-imports";
import eslintComments from "@eslint-community/eslint-plugin-eslint-comments/configs";
import prettierConfig from "eslint-config-prettier";

export default typescriptEslint.config(
  { ignores: ["dist/**", "build/**", "coverage/**", ".next/**", "**/*.generated.ts"] },

  eslint.configs.recommended,
  ...typescriptEslint.configs.strictTypeChecked,
  ...typescriptEslint.configs.stylisticTypeChecked,
  unicorn.configs["flat/recommended"],
  sonarjs.configs.recommended,
  security.configs.recommended,
  eslintComments.recommended,

  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { import: importPlugin, "unused-imports": unusedImports },
    rules: {
      // --- No suppression, no escape hatches -------------------------------------------
      "@eslint-community/eslint-comments/no-use": ["error", { allow: [] }],
      "@typescript-eslint/ban-ts-comment": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/no-non-null-assertion": "error",

      // --- One function, one job -------------------------------------------------------
      complexity: ["error", { max: 8 }],
      "max-depth": ["error", 2],
      "max-lines-per-function": [
        "error",
        { max: 40, skipBlankLines: true, skipComments: true, IIFEs: true },
      ],
      "max-params": ["error", 3],
      "max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
      "max-nested-callbacks": ["error", 3],
      "no-else-return": ["error", { allowElseIf: false }],
      "no-lonely-if": "error",
      "no-nested-ternary": "error",
      "@typescript-eslint/no-unnecessary-condition": "error",

      // --- DRY --------------------------------------------------------------------------
      "sonarjs/no-identical-functions": "error",
      "sonarjs/no-duplicate-string": ["error", { threshold: 3 }],
      "sonarjs/no-identical-expressions": "error",
      "sonarjs/no-collapsible-if": "error",
      "sonarjs/prefer-immediate-return": "error",
      "no-magic-numbers": [
        "error",
        { ignore: [0, 1, -1], ignoreArrayIndexes: true, enforceConst: true, detectObjects: false },
      ],

      // --- Naming, no abbreviations ------------------------------------------------------
      "unicorn/prevent-abbreviations": [
        "error",
        {
          checkFilenames: true,
          checkProperties: true,
          allowList: {
            id: true, Id: true, url: true, Url: true, uri: true, Uri: true,
            api: true, Api: true, http: true, Http: true, db: true, Db: true,
            io: true, Io: true, sql: true, Sql: true, ui: true, Ui: true,
            env: true, Env: true, props: true, Props: true, ref: true, Ref: true,
            args: true, Args: true, params: true, Params: true,
          },
        },
      ],
      "unicorn/filename-case": ["error", { cases: { kebabCase: true, camelCase: true } }],
      "@typescript-eslint/naming-convention": [
        "error",
        { selector: "default", format: ["camelCase"], leadingUnderscore: "allow" },
        { selector: "variable", format: ["camelCase", "UPPER_CASE", "PascalCase"] },
        { selector: "typeLike", format: ["PascalCase"] },
        { selector: "enumMember", format: ["UPPER_CASE"] },
        {
          selector: "variable",
          types: ["boolean"],
          format: ["PascalCase"],
          prefix: ["is", "has", "can", "should", "will", "did"],
        },
        // API payload keys and generated types are exempt: they follow the wire contract.
        { selector: "objectLiteralProperty", format: null },
        { selector: "typeProperty", format: null },
      ],

      // --- Correctness ---------------------------------------------------------------------
      eqeqeq: ["error", "always"],
      "no-console": "error",
      "no-debugger": "error",
      "no-alert": "error",
      "no-var": "error",
      "prefer-const": "error",
      "no-param-reassign": ["error", { props: true }],
      "no-return-await": "off",
      "@typescript-eslint/return-await": ["error", "always"],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/explicit-function-return-type": [
        "error",
        { allowExpressions: true, allowTypedFunctionExpressions: true },
      ],
      "unused-imports/no-unused-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "unicorn/no-null": "off",
      "unicorn/prefer-top-level-await": "off",

      // --- Layering: dependencies point downward only -------------------------------------
      "import/no-cycle": ["error", { maxDepth: Infinity }],
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            {
              target: "./src/modules/*/!(*.controller.ts)",
              from: "./src/modules/*/*.controller.ts",
              message: "Nothing may import a controller. Dependencies point downward only.",
            },
            {
              target: "./src/modules/*/*.controller.ts",
              from: "./src/modules/*/*.repository.ts",
              message:
                "A controller must not touch a repository. Go through the service layer.",
            },
            {
              target: "./src/modules/*/*.repository.ts",
              from: "./src/modules/*/*.service.ts",
              message: "A repository must not depend on a service. Invert the dependency.",
            },
            {
              target: "./src/modules/*/*.service.ts",
              from: "./src/shared/http/**",
              message:
                "A service must not know about HTTP. Keep request and response objects in the controller.",
            },
          ],
        },
      ],
    },
  },

  // Tests may be longer and may use magic numbers freely: readable expectations matter more.
  {
    files: ["**/*.test.ts", "**/*.spec.ts", "**/tests/**"],
    rules: {
      "max-lines-per-function": "off",
      "max-lines": "off",
      "no-magic-numbers": "off",
      "sonarjs/no-duplicate-string": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
    },
  },

  // Config files and scripts are entry points, not application code.
  {
    files: ["*.config.{ts,mjs,js}", "scripts/**"],
    rules: { "no-console": "off", "no-magic-numbers": "off" },
  },

  prettierConfig,
);
