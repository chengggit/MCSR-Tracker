import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["src/mcsr/static/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.browser,
        Chart: "readonly",
      },
    },
    rules: {
      eqeqeq: "error",
      "no-var": "error",
    },
  },
  prettier,
];
