module.exports = {
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },

  env: {
    browser: true,
    es2020: true,
  },

  extends: [
    "eslint:recommended",
    "@typhonjs-fvtt/eslint-config-foundry.js/0.8.0",
    "plugin:prettier/recommended",
  ],

  rules: {
    "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "prefer-const": ["error"],
  },

  overrides: [
    {
      files: ["./*.js"],
      env: {
        node: true,
      },
    },
  ],

  globals: {
    mocha: "readonly",
    Mocha: "readonly",
    chai: "readonly",
    $: "readonly",
    quench: "readonly",
  },
};
