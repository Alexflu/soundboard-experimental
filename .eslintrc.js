module.exports = {
  extends: 'erb',
  plugins: ['@typescript-eslint'],
  rules: {
    // Permit dependencies resolved through the nested app package.
    'import/no-extraneous-dependencies': 'off',
    '@typescript-eslint/ban-ts-comment': 'warn',
    '@typescript-eslint/no-unused-vars': 'warn',
    'no-unused-vars': 'off',
    'no-use-before-define': 'off',
    'no-shadow': 'off',
    'default-param-last': 'off',
    'no-undef': 'off',
    'no-useless-constructor': 'off',
    'no-empty-function': 'off',
    'max-classes-per-file': 'warn',
    'class-methods-use-this': 'warn',
    'max-len': ['error', { code: 130 }],
    'array-element-newline': ['error', 'consistent'],
    'array-bracket-newline': ['error', 'consistent'],
    'import/extensions': [
      'error',
      'ignorePackages',
      { js: 'never', jsx: 'never', ts: 'never', tsx: 'never' },
    ],
    'react/jsx-filename-extension': ['error', { extensions: ['.jsx', '.tsx'] }],
    'react/function-component-definition': 'off',
    'lines-between-class-members': [
      'error',
      'always',
      { exceptAfterSingleLine: true },
    ],
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  settings: {
    'import/resolver': {
      // Follow webpack aliases when resolving imports.
      node: {},
      webpack: {
        config: require.resolve('./.erb/configs/webpack.config.eslint.js'),
      },
    },
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
  },
  overrides: [
    {
      files: ['src/main.dev.ts'],
      rules: {
        'import/extensions': 'off',
        '@typescript-eslint/naming-convention': 'off',
        'no-underscore-dangle': 'off',
      },
    },
  ],
};
