import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    ignores: ["node_modules/", "coverage/", "dist/", "*.bak", "**/*.bak", "unit-test-run.txt", "event-schedule-debug.txt"]
  },
  {
    files: ["src/**/*.js", "test/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        structuredClone: "readonly",
        crypto: "readonly",
        AbortController: "readonly"
      }
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      "no-console": "off",
      "no-undef": "warn",
      "no-case-declarations": "warn",
      "no-useless-catch": "warn",
      "no-redeclare": "warn"
    }
  },
  {
    files: ["test/**/*.js", "jest.config.cjs", "jest.unit.config.cjs"],
    languageOptions: {
      globals: {
        ...globals.jest
      }
    }
  }
];
