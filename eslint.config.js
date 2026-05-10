'use strict';

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        require:      'readonly',
        module:       'writable',
        exports:      'writable',
        __dirname:    'readonly',
        __filename:   'readonly',
        process:      'readonly',
        console:      'readonly',
        Buffer:       'readonly',
        setTimeout:   'readonly',
        clearTimeout: 'readonly',
        setInterval:  'readonly',
        clearInterval:'readonly',
      }
    },
    rules: {
      'no-unused-vars':  ['warn', { argsIgnorePattern: '^_' }],
      'no-undef':        'error',
      'no-var':          'error',
      'prefer-const':    'warn',
      'eqeqeq':          ['error', 'always'],
      'no-console':      'off',
      'semi':            ['warn', 'always'],
    }
  }
];
