module.exports = {
  env: {
    node: true,
    es2022: true,
  },
  extends: ['airbnb-base', 'plugin:prettier/recommended'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['prettier'],
  rules: {
    // Allow console statements in the CLI application
    'no-console': 'off',

    // Enforce consistent use of single quotes
    quotes: ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],

    // Enforce consistent spacing after function name
    'space-before-function-paren': [
      'error',
      {
        anonymous: 'always',
        named: 'never',
        asyncArrow: 'always',
      },
    ],

    // Prefer arrow functions
    'prefer-arrow-callback': 'error',

    // Require consistent return statements in callbacks
    'callback-return': ['error', ['callback', 'cb', 'next', 'done']],

    // Disallow use of eval()
    'no-eval': 'error',

    // Enforce the consistent use of either backticks, double, or single quotes
    quotes: ['error', 'single', { avoidEscape: true }],

    // Disallow use of undefined when initializing variables
    'no-undef-init': 'error',

    // Disallow use of variables before they are defined
    'no-use-before-define': ['error', { functions: false, classes: true }],

    // Allow require statements that don't resolve in imports/exports
    'import/no-unresolved': 'off',

    // Ensure consistent line endings
    'linebreak-style': ['error', 'unix'],

    // Max line length
    'max-len': [
      'error',
      {
        code: 100,
        ignoreComments: true,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
      },
    ],

    // Prettier integration
    'prettier/prettier': [
      'error',
      {
        singleQuote: true,
        printWidth: 100,
        tabWidth: 2,
        semi: true,
        arrowParens: 'always',
        trailingComma: 'es5',
      },
    ],
  },
};
