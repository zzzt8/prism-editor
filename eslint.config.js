import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

const testFiles = [
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/*.spec.ts',
  '**/*.spec.tsx',
];

export default tseslint.config(
  // ── Shared ignores ────────────────────────────────────────────────────────────
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/*.snap',
      '**/*.log',
      'server/**',
      'vendor/**',
      // Config files — not source code to lint
      '**/package.json',
      '**/tsconfig.json',
      '**/tsconfig*.json',
      '**/*.config.ts',
      '**/*.config.js',
    ],
  },

  // ── TypeScript files (apps and packages) ─────────────────────────────────────
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        // IndexedDB API types not in globals.browser
        IDBValidKey: 'readonly',
        IDBTransactionMode: 'readonly',
        EventListenerOrEventListenerObject: 'readonly',
        // Canvas / CSSOM types not in globals.browser
        PredefinedColorSpace: 'readonly',
        GlobalCompositeOperation: 'readonly',
        // Vitest globals for test-setup.ts (not in test file pattern)
        expect: 'readonly',
        test: 'readonly',
        it: 'readonly',
        describe: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
        jest: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'react-hooks': reactHooks,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      ...prettier.rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Disable no-undef for TSX files — TypeScript resolves JSX types, ESLint globals can't
      'no-undef': 'off',

      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreClassWithStaticInitBlock: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreClassWithStaticInitBlock: true }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // ── Specific files with known unused vars patterns ────────────────────────────
  {
    files: [
      'packages/image-ops/src/scheduler/taskQueue.ts',
      'packages/image-ops/src/scheduler/workerRunner.ts',
      'packages/image-ops/src/task-scheduler.ts',
      'packages/image-ops/src/scheduler/workerPool.ts',
      'packages/shared-types/src/execution.ts',
      'packages/shared-types/src/port-data-types.ts',
    ],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
    },
  },

  // ── Test files: relax rules that conflict with vitest/jest globals ─────────
  {
    files: testFiles,
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.vitest,
        ...globals.jest,
      },
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
);
