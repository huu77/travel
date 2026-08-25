import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: ['dist', 'node_modules', 'coverage'],
  },

  eslint.configs.recommended,

  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // Bắt lỗi biến / tham số / import dư thừa không dùng tới
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      // Cấm code chết không bao giờ chạy tới (unreachable code)
      'no-unreachable': 'error',
      // Cấm khai báo trùng lặp import
      'no-duplicate-imports': 'error',
      // Bắt buộc dùng const nếu biến không gán lại giá trị
      'prefer-const': 'error',
      // Cấm biểu thức vô nghĩa (unused expressions)
      'no-unused-expressions': 'error',
      // Cảnh báo khi còn debugger hoặc alert
      'no-debugger': 'error',
      'no-alert': 'error',
      // Khuyến khích tránh dùng any tùy tiện
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  prettier,
);
