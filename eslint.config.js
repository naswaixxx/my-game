import js from "@eslint/js";

export default [
  {
    ignores: [".vs/**", "node_modules/**", "dist/**"],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        requestAnimationFrame: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "error",
    },
  },
];
