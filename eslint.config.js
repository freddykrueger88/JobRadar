'use strict';

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        // Node.js Core
        require:        'readonly',
        module:         'writable',
        exports:        'writable',
        __dirname:      'readonly',
        __filename:     'readonly',
        process:        'readonly',
        console:        'readonly',
        Buffer:         'readonly',
        global:         'readonly',
        // Timers
        setTimeout:     'readonly',
        clearTimeout:   'readonly',
        setInterval:    'readonly',
        clearInterval:  'readonly',
        setImmediate:   'readonly',
        clearImmediate: 'readonly',
        // Node 18+ / Web-compatible Globals
        fetch:          'readonly',
        AbortController:'readonly',
        AbortSignal:    'readonly',
        Promise:        'readonly',
        URL:            'readonly',
        URLSearchParams:'readonly',
        TextEncoder:    'readonly',
        TextDecoder:    'readonly',
        crypto:         'readonly',
        FormData:       'readonly',
        Headers:        'readonly',
        Request:        'readonly',
        Response:       'readonly',
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef':       'error',
      'no-var':         'error',
      'prefer-const':   'warn',
      'eqeqeq':         ['error', 'always'],
      'no-console':     'off',
      'semi':           ['warn', 'always'],
    }
  }
];
