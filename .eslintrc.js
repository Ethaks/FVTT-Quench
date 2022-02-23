module.exports = {
  parser: "@typescript-eslint/parser",

  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },

  env: {
    browser: true,
    es2020: true,
    es6: true,
  },

  extends: [
    "plugin:@typescript-eslint/recommended",
    "plugin:unicorn/recommended",
    "plugin:prettier/recommended",
  ],

  plugins: ["@typescript-eslint", "unicorn"],

  rules: {
    "@typescript-eslint/no-explicit-any": ["error", { ignoreRestArgs: true }],
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/consistent-type-imports": ["error"],
    "@typescript-eslint/ban-ts-comment": [
      "error",
      {
        "ts-expect-error": "allow-with-description",
      },
    ],
    "unicorn/no-array-reduce": "warn",
    "unicorn/prevent-abbreviations": [
      "warn",
      {
        replacements: {
          fn: false,
          args: false,
          obj: false,
        },
      },
    ],
  },

  overrides: [
    {
      files: ["./*.js"],
      rules: {
        "@typescript-eslint/no-var-requires": "off",
        "unicorn/prefer-module": "off",
      },

      env: {
        node: true,
      },
    },
  ],
};
