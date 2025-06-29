#!/usr/bin/env node

/**
 * Test Code Generator
 * 
 * This script tests the code generator functionality with various examples.
 * Run with: node scripts/test-code-generator.js
 */

const chalk = require('chalk');
const codeGenerator = require('../lib/code-generator');

// Set environment for logging to console
process.env.NODE_ENV = 'development';

console.log(chalk.cyan('===== Testing Code Generator =====\n'));

// Test cases organized by language and task type
const TEST_CASES = [
  // JavaScript tests
  {
    language: 'javascript',
    task: 'Create a function to calculate the sum of two numbers',
    description: 'Simple JS function'
  },
  {
    language: 'javascript',
    task: 'Create a class called UserProfile that handles user data',
    description: 'JS class'
  },
  {
    language: 'javascript',
    task: 'Create an API endpoint for user authentication',
    description: 'JS API endpoint'
  },
  
  // Python tests
  {
    language: 'python',
    task: 'Create a function to convert celsius to fahrenheit',
    description: 'Python function'
  },
  {
    language: 'python',
    task: 'Create a class called DataProcessor',
    description: 'Python class'
  },
  
  // TypeScript tests
  {
    language: 'typescript',
    task: 'Create a function to filter an array of objects by property',
    description: 'TS function'
  },
  {
    language: 'typescript',
    task: 'Create an interface called UserData for managing user information',
    description: 'TS interface'
  }
];

// Run the test cases
async function runTests() {
  let passCount = 0;
  let failCount = 0;
  
  for (const test of TEST_CASES) {
    console.log(chalk.yellow(`\nTest: ${test.description} (${test.language})`));
    console.log(`Task: ${test.task}`);
    
    try {
      // Generate code for the test case
      const generatedCode = codeGenerator.generateCode(test.language, test.task);
      
      // Check if it generated something reasonable
      if (generatedCode && generatedCode.length > 0) {
        console.log(chalk.green('✓ Generated code successfully'));
        
        // Print a snippet of the generated code (first few lines)
        const codePreview = generatedCode.split('\n').slice(0, 5).join('\n');
        console.log(chalk.dim('\nCode snippet:'));
        console.log(chalk.dim(codePreview + (generatedCode.split('\n').length > 5 ? '\n...' : '')));
        
        passCount++;
      } else {
        console.log(chalk.red('✗ Generated empty code'));
        failCount++;
      }
    } catch (error) {
      console.log(chalk.red(`✗ Test failed: ${error.message}`));
      failCount++;
    }
  }
  
  // Print summary
  console.log(chalk.cyan('\n===== Test Summary ====='));
  console.log(`Total tests: ${TEST_CASES.length}`);
  console.log(`Passed: ${chalk.green(passCount)}`);
  console.log(`Failed: ${chalk.red(failCount)}`);
  
  if (failCount === 0) {
    console.log(chalk.green('\n✓ All tests passed!'));
  } else {
    console.log(chalk.yellow(`\n⚠ ${failCount} test(s) failed.`));
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  console.error(chalk.red(`Error running tests: ${error.message}`));
  process.exit(1);
});