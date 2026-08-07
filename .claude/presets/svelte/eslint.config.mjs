// Svelte 5 / SvelteKit additions. Merge on top of ../node-typescript/eslint.config.mjs.
//
// Install:
//   npm i -D eslint-plugin-svelte svelte-eslint-parser prettier-plugin-svelte
//
// Add "plugins": ["prettier-plugin-svelte"] to .prettierrc.json.

import svelte from "eslint-plugin-svelte";
import svelteParser from "svelte-eslint-parser";
import typescriptEslint from "typescript-eslint";
import baseConfig from "../node-typescript/eslint.config.mjs";

export default [
  ...baseConfig,
  ...svelte.configs["flat/recommended"],
  ...svelte.configs["flat/prettier"],

  {
    files: ["**/*.svelte", "**/*.svelte.ts"],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: typescriptEslint.parser,
        extraFileExtensions: [".svelte"],
      },
    },
    rules: {
      // --- Accessibility: Svelte ships these, keep every one at error ------------------
      "svelte/a11y-click-events-have-key-events": "error",
      "svelte/a11y-no-static-element-interactions": "error",
      "svelte/a11y-label-has-associated-control": "error",
      "svelte/a11y-missing-attribute": "error",
      "svelte/a11y-missing-content": "error",
      "svelte/a11y-media-has-caption": "error",
      "svelte/a11y-no-noninteractive-element-interactions": "error",
      "svelte/a11y-autofocus": "error",
      "svelte/a11y-interactive-supports-focus": "error",
      "svelte/a11y-role-has-required-aria-props": "error",

      // --- Correctness -------------------------------------------------------------------
      "svelte/no-at-html-tags": "error", // XSS
      "svelte/require-each-key": "error",
      "svelte/valid-each-key": "error",
      "svelte/no-dom-manipulating": "error",
      "svelte/no-reactive-reassign": "error",
      "svelte/no-store-async": "error",
      "svelte/require-stores-init": "error",
      "svelte/no-immutable-reactive-statements": "error",
      "svelte/no-unused-svelte-ignore": "error",
      // svelte-ignore is a suppression comment like any other, and it is banned.
      "svelte/no-svelte-internal": "error",

      // --- Style, enforced by the compiler rather than by review -------------------------
      "svelte/block-lang": ["error", { script: ["ts"], style: ["css", "postcss"] }],
      "svelte/button-has-type": "error",
      "svelte/no-useless-mustaches": "error",
      "svelte/prefer-const": "error",
      "svelte/require-event-dispatcher-types": "error",

      // Markup inflates the line count; the logic limits still apply.
      "max-lines-per-function": "off",
    },
  },

  {
    files: ["**/+page.ts", "**/+page.server.ts", "**/+layout.ts", "**/+layout.server.ts", "**/+server.ts"],
    rules: {
      // Load functions and endpoints are entry points, not application logic.
      "max-lines-per-function": ["error", { max: 60 }],
    },
  },
];
