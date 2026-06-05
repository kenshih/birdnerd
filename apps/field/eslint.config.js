import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

// Flat config (ESLint 9). Replaces the never-present .eslintrc that the old
// `eslint src --ext ts,tsx` script assumed. Untyped lint (no parserOptions.project)
// to keep it fast; tsc -b is the type-level gate.
export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // Codebase convention: `_`-prefixed args/vars are intentionally unused.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // Standard React Hooks baseline. The stricter react-compiler rules in
      // reactHooks.configs['recommended-latest'] flag many pre-existing working
      // patterns; adopt those deliberately later if we move toward the compiler.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
)
