import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

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
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      ...prettier.rules,

      // Disable no-undef for TSX files — TypeScript resolves JSX types, ESLint globals can't
      'no-undef': 'off',

      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
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
