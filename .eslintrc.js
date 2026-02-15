/**
 * ESLint Configuration
 * 
 * Key rules to prevent common mistakes:
 * 1. no-undef: Catches missing imports (e.g., using View without importing it from react-native)
 * 2. @typescript-eslint/no-use-before-define: Prevents using styled components before they're defined
 *    (e.g., AddCategoryButton = styled(CategoryButton) before CategoryButton is defined)
 */
module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'expo',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    es6: true,
    node: true,
  },
  rules: {
    // Prevent using undefined variables (catches missing imports like View)
    // Example error: "Property 'View' doesn't exist" when View is not imported
    'no-undef': 'error',

    // Disable base rule as it conflicts with TypeScript version
    'no-use-before-define': 'off',

    // Disable ban-types rule that doesn't exist in current version
    '@typescript-eslint/ban-types': 'off',

    // TypeScript-specific: prevent using variables before they're defined
    // This catches forward references in styled components (e.g., AddCategoryButton using CategoryButton before it's defined)
    '@typescript-eslint/no-use-before-define': ['error', {
      functions: false, // Allow function declarations to be hoisted
      classes: true,
      variables: true, // This will catch const/let used before definition (catches styled component forward references)
      typedefs: false, // TypeScript type definitions can be forward referenced
      enums: true,
      ignoreTypeReferences: false,
    }],

    // Ensure all imports are used
    '@typescript-eslint/no-unused-vars': ['warn', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    }],

    // Prevent accidental use of undefined
    '@typescript-eslint/no-explicit-any': 'error',

    // Prevent implicit any types (catches untyped parameters in styled components)
    // Note: TypeScript's noImplicitAny (enabled via strict: true) will catch these at compile time
    // For styled-components template literals, always use StyledProps or StyledPropsWith<T>
    // Example: ${({ theme }: StyledProps) => ...} or ${({ theme, isSelected }: StyledPropsWith<{ isSelected: boolean }>) => ...}
    '@typescript-eslint/no-unsafe-assignment': 'off', // Too strict for styled-components, TypeScript compiler catches implicit any
    '@typescript-eslint/no-unsafe-member-access': 'off', // Too strict for styled-components
    '@typescript-eslint/no-unsafe-call': 'off', // Too strict for styled-components
    '@typescript-eslint/no-unsafe-argument': 'off', // Too strict for styled-components
    '@typescript-eslint/no-unsafe-return': 'off', // Too strict for styled-components

    // Ensure React is in scope when using JSX
    'react/react-in-jsx-scope': 'off', // Not needed in React 17+
    'react/jsx-uses-react': 'off', // Not needed in React 17+

    // Disable prop-types validation (TypeScript handles this better)
    'react/prop-types': 'off', // TypeScript provides type checking, prop-types is redundant

    // Prevent duplicate imports from the same module
    'no-duplicate-imports': 'error',

    // Prevent implicit any in styled-components template literals
    // This catches patterns like ${({ theme, isSelected }) => ...} without type annotations
    // Only matches ObjectPattern parameters that don't have a type annotation
    'no-restricted-syntax': [
      'error',
      {
        selector: 'TemplateLiteral[expressions.length>0] > ArrowFunctionExpression > ObjectPattern:not([typeAnnotation])',
        message: 'Destructured parameters in template literals must have explicit types. Use StyledProps or StyledPropsWith<T>. Example: ({ theme }: StyledProps) => or ({ theme, isSelected }: StyledPropsWith<{ isSelected: boolean }>) =>',
      },
    ],
  },
  overrides: [
    {
      files: ['*.json'],
      rules: {
        '@typescript-eslint/no-unused-expressions': 'off',
        'no-undef': 'off',
      },
    },
    {
      files: ['*.spec.ts', '*.test.ts', '**/__tests__/**/*.ts', '*.spec.tsx', '*.test.tsx', 'jest.setup.js'],
      env: {
        jest: true,
      },
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
      },
      rules: {
        'no-undef': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
};

