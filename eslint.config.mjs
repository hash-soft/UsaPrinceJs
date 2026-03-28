import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ['**/*.{js,mjs,cjs,ts}'] },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      '*.js',
      'index.html',
      'types/pixi.js.d.ts',
      'webpack.config.js',
      'licenses/extractLicenses.js',
    ],
  },
  {
    rules: {
      //'@typescript-eslint/no-unused-expressions': 'off',
    },
  },
];
