import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    files: ['src/**/*.ts', 'tests/**/*.ts', '*.ts'],
    extends: [eslint.configs.recommended, ...tseslint.configs.recommended],
  },
);
