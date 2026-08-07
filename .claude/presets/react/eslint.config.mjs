// React additions. Merge with the base config in ../node-typescript/eslint.config.mjs.
//
// Install:
//   npm i -D eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-jsx-a11y \
//     eslint-plugin-testing-library eslint-plugin-vitest

import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import testingLibrary from "eslint-plugin-testing-library";
import baseConfig from "../node-typescript/eslint.config.mjs";

export default [
  ...baseConfig,

  {
    files: ["**/*.{tsx,jsx}"],
    plugins: { react, "react-hooks": reactHooks, "jsx-a11y": jsxA11y },
    settings: { react: { version: "detect" } },
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat["jsx-runtime"].rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.strict.rules,

      // --- Component discipline -------------------------------------------------------
      "react/jsx-no-bind": ["error", { allowArrowFunctions: true }],
      "react/no-array-index-key": "error",
      "react/jsx-key": ["error", { checkFragmentShorthand: true }],
      "react/no-unstable-nested-components": "error",
      "react/jsx-no-useless-fragment": "error",
      "react/self-closing-comp": "error",
      "react/function-component-definition": [
        "error",
        { namedComponents: "function-declaration", unnamedComponents: "arrow-function" },
      ],
      // A component taking more than seven props is doing two jobs.
      "react/jsx-max-props-per-line": "off",
      "react-hooks/exhaustive-deps": "error",

      // --- Accessibility, strict -------------------------------------------------------
      "jsx-a11y/no-static-element-interactions": "error",
      "jsx-a11y/click-events-have-key-events": "error",
      "jsx-a11y/anchor-is-valid": "error",
      "jsx-a11y/label-has-associated-control": [
        "error",
        { assert: "either", depth: 3 },
      ],
      "jsx-a11y/no-autofocus": "error",
      "jsx-a11y/media-has-caption": "error",
      "jsx-a11y/control-has-associated-label": "error",
      "jsx-a11y/no-noninteractive-element-interactions": "error",

      // --- Security --------------------------------------------------------------------
      "react/no-danger": "error",
      "react/jsx-no-target-blank": ["error", { allowReferrer: false }],
      "react/jsx-no-script-url": "error",

      // JSX pushes past the base limit legitimately; the logic limit still applies through
      // complexity and max-depth.
      "max-lines-per-function": ["error", { max: 120, skipBlankLines: true, skipComments: true }],
    },
  },

  {
    files: ["**/*.test.{tsx,ts}"],
    plugins: { "testing-library": testingLibrary },
    rules: {
      ...testingLibrary.configs["flat/react"].rules,
      // Query the way a user does. A test id is the last resort.
      "testing-library/prefer-explicit-assert": "error",
      "testing-library/prefer-user-event": "error",
      "testing-library/no-node-access": "error",
      "testing-library/no-container": "error",
      "testing-library/prefer-screen-queries": "error",
      "testing-library/await-async-queries": "error",
    },
  },
];
