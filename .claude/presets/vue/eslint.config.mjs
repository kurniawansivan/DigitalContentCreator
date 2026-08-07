// Vue 3 / Nuxt additions. Merge on top of ../node-typescript/eslint.config.mjs.
//
// Install:
//   npm i -D eslint-plugin-vue vue-eslint-parser eslint-plugin-vuejs-accessibility \
//     @vue/eslint-config-typescript

import vue from "eslint-plugin-vue";
import vueAccessibility from "eslint-plugin-vuejs-accessibility";
import vueParser from "vue-eslint-parser";
import typescriptEslint from "typescript-eslint";
import baseConfig from "../node-typescript/eslint.config.mjs";

export default [
  ...baseConfig,
  ...vue.configs["flat/recommended"],
  ...vueAccessibility.configs["flat/recommended"],

  {
    files: ["**/*.vue"],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: typescriptEslint.parser,
        extraFileExtensions: [".vue"],
        sourceType: "module",
      },
    },
    rules: {
      // --- Component discipline -------------------------------------------------------
      "vue/multi-word-component-names": "error",
      "vue/component-api-style": ["error", ["script-setup"]],
      "vue/define-props-declaration": ["error", "type-based"],
      "vue/define-emits-declaration": ["error", "type-based"],
      "vue/require-typed-ref": "error",
      "vue/no-required-prop-with-default": "error",
      "vue/require-explicit-emits": "error",
      "vue/no-unused-properties": ["error", { groups: ["props", "data", "computed"] }],
      "vue/no-undef-components": "error",
      "vue/prefer-define-options": "error",

      // A component with more than seven props is doing two jobs.
      "vue/max-props": ["error", { maxProps: 7 }],
      "vue/max-attributes-per-line": "off", // the formatter owns layout

      // --- Correctness ------------------------------------------------------------------
      "vue/no-v-html": "error", // XSS
      "vue/require-v-for-key": "error",
      "vue/no-use-v-if-with-v-for": "error",
      "vue/no-mutating-props": "error",
      "vue/no-side-effects-in-computed-properties": "error",
      "vue/no-watch-after-await": "error",
      "vue/valid-define-options": "error",

      // --- Naming ----------------------------------------------------------------------
      "vue/component-name-in-template-casing": ["error", "PascalCase"],
      "vue/custom-event-name-casing": ["error", "camelCase"],
      "vue/prop-name-casing": ["error", "camelCase"],
      "vue/attribute-hyphenation": ["error", "always"],

      // --- Accessibility ------------------------------------------------------------------
      "vuejs-accessibility/label-has-for": [
        "error",
        { required: { some: ["nesting", "id"] } },
      ],
      "vuejs-accessibility/click-events-have-key-events": "error",
      "vuejs-accessibility/no-static-element-interactions": "error",
      "vuejs-accessibility/form-control-has-label": "error",
      "vuejs-accessibility/media-has-caption": "error",
      "vuejs-accessibility/no-autofocus": "error",
    },
  },
];
