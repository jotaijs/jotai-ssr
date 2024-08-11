import jsEslint from '@eslint/js';
import tsEslint from 'typescript-eslint';
import { fixupPluginRules } from '@eslint/compat';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import importPlugin from 'eslint-plugin-import';
import reactPlugin from 'eslint-plugin-react';
import eslintPluginReactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

/** @type {import("eslint").Linter.Config [];} */
export default tsEslint.config(
  {
    ignores: ['node_modules', 'dist'],
  },
  jsEslint.configs.recommended,
  ...tsEslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    ...reactPlugin.configs.flat.recommended,
    ...reactPlugin.configs.flat['jsx-runtime'],
    settings: { react: { version: 'detect' } },
  },
  {
    plugins: {
      import: importPlugin,
      'react-hooks': fixupPluginRules(eslintPluginReactHooks),
    },
    rules: {
      ...eslintPluginReactHooks.configs.recommended.rules,
    },
  },
  jsxA11y.flatConfigs.recommended,
);
