module.exports = {
  parser: "@typescript-eslint/parser",

  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },

  env: {
    browser: true,
    es2020: true,
  },

  extends: ["plugin:@typescript-eslint/recommended", "plugin:prettier/recommended"],

  plugins: ["@typescript-eslint"],

  rules: {
    "@typescript-eslint/no-explicit-any": ["error", { ignoreRestArgs: true }],
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/ban-ts-comment": [
      "error",
      {
        "ts-expect-error": "allow-with-description",
      },
    ],
  },

  overrides: [
    {
      files: ["./*.js"],
      rules: {
        "@typescript-eslint/no-var-requires": "off",
      },

      env: {
        node: true,
      },
    },
  ],
};
