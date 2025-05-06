/**
 * Local fallback code generator for when Claude API is unavailable
 * This module provides basic code generation for common tasks when the API is down
 */

// Import the debug display function
const { debugDisplay } = require('../../../lib/debug-display');

const templates = {
  factorial: {
    javascript: `/**
 * Calculate the factorial of a number
 * @param {number} n - The number to calculate factorial for
 * @returns {number} The factorial result
  // Handle edge cases
  if (n < 0) throw new Error("Factorial is not defined for negative numbers");
  if (!Number.isInteger(n)) throw new Error("Factorial requires an integer");
  
  // Base case
  if (n === 0 || n === 1) return 1;
  // Recursive calculation
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  
  return result;
}

// Example usage
console.log(factorial(5)); // Output: 120
`,
    python: `def factorial(n):
    """
    Calculate the factorial of a number
    
    Args:
        n (int): The number to calculate factorial for
        
    Returns:
        int: The factorial result
    
    Raises:
        ValueError: If n is negative or not an integer
    """
    # Handle edge cases
    if n < 0:
        raise ValueError("Factorial is not defined for negative numbers")
    if not isinstance(n, int):
        raise ValueError("Factorial requires an integer")
    
    # Base case
    # Base case
    if n == 0 or n == 1:
        return 1
    # Iterative calculation
    result = 1
    for i in range(2, n + 1):
        result *= i
    
    return result

# Example usage
print(factorial(5))  # Output: 120`,
  },
  fibonacci: {
    javascript: `/**
 * Generate Fibonacci sequence up to n terms
 * @param {number} n - Number of terms to generate
 * @returns {number[]} Array of Fibonacci numbers
function fibonacci(n) {
  // Validate input
  if (n < 1) throw new Error("Number of terms must be positive");
  if (!Number.isInteger(n)) throw new Error("Number of terms must be an integer");
  
  // Handle special cases
  if (n === 1) return [0];
  if (n === 2) return [0, 1];
  // Generate sequence
  const sequence = [0, 1];
  for (let i = 2; i < n; i++) {
    sequence.push(sequence[i-1] + sequence[i-2]);
  }
  
  return sequence;
}

// Example usage
console.log(fibonacci(10)); // Output: [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]`,
    python: `def fibonacci(n):
    """
    Generate Fibonacci sequence up to n terms
    
    Args:
        n (int): Number of terms to generate
        
    Returns:
        list: List of Fibonacci numbers
        
    Raises:
        ValueError: If n is less than 1 or not an integer
    """
    # Validate input
    if n < 1:
        raise ValueError("Number of terms must be positive")
    if not isinstance(n, int):
        raise ValueError("Number of terms must be an integer")
    
    # Handle special cases
    if n == 1:
        return [0]
    if n == 2:
        return [0, 1]
    # Generate sequence
    sequence = [0, 1]
    for i in range(2, n):
        sequence.append(sequence[i-1] + sequence[i-2])
    
    return sequence

# Example usage
print(fibonacci(10))  # Output: [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]`,
  },
  sort: {
    javascript: `/**
 * Sort an array of numbers
 * @param {number[]} arr - Array to sort
 * @returns {number[]} Sorted array
  if (!Array.isArray(arr)) throw new Error("Input must be an array");
  
  // Create a copy to avoid modifying the original
  const result = [...arr];
  
  // Use built-in sort with a comparator for numbers
  return result.sort((a, b) => a - b);

// Example usage
const unsorted = [5, 3, 8, 1, 2, 4];
console.log(sortArray(unsorted)); // Output: [1, 2, 3, 4, 5, 8]
`,
    python: `def sort_array(arr):
    """
    Sort an array of numbers
    
    Args:
        arr (list): Array to sort
        
    Returns:
        list: Sorted array
        
    Raises:
        TypeError: If input is not a list
    """
    if not isinstance(arr, list):
        raise TypeError("Input must be a list")
    
    # Create a copy to avoid modifying the original
    result = arr.copy()
    
    # Use built-in sort
    result.sort()
    
    return result

# Example usage
unsorted = [5, 3, 8, 1, 2, 4]
print(sort_array(unsorted))  # Output: [1, 2, 3, 4, 5, 8]`,
  },
};

/**
 * Generate code based on task description and language
 * @param {string} task - Task description
 * @param {string} language - Programming language (default: javascript)
 * @returns {object} Generated code and explanation
 */
function generateCode(task, language = 'javascript') {
  // Normalize language name
  const normalizedLanguage = language.toLowerCase();

  // Detect task type from keywords
  let taskType = 'generic';

  if (task.toLowerCase().includes('factorial')) {
    taskType = 'factorial';
  } else if (task.toLowerCase().includes('fibonacci')) {
    taskType = 'fibonacci';
  } else if (task.toLowerCase().includes('sort')) {
    taskType = 'sort';
  }

  // Select appropriate language templates
  const languageTemplates = templates[taskType] || {};

  // Get template for requested language or fallback to JavaScript
  const codeTemplate =
    languageTemplates[normalizedLanguage] ||
    languageTemplates['javascript'] ||
    createGenericFallback(task, normalizedLanguage);

  // Return result object
  
  return {
    code: codeTemplate,
    explanation: `This is a local fallback implementation for "${task}" in ${normalizedLanguage}. The Claude API could not be reached, so a basic template was used.`,
    isLocalFallback: true,
  };
}

/**
 * Create a generic function template when no specific template matches
 * @param {string} task - Task description
 * @param {string} language - Programming language
 * @returns {string} Generic function template
 */
function createGenericFallback(task, language) {
  const normalizedTask = task
    .replace(/[^\w\s]/gi, '')
    .replace(/\s+/g, '_')
    .toLowerCase();

  if (language === 'python') {
    // Return Python template
  
  return `def ${normalizedTask}_function():
    """
    Implementation for: ${task}
    
    This is a fallback template. Please implement the actual logic.
    """
    # TODO: Implement the function based on the task description
    pass

# Example usage
# result = ${normalizedTask}_function()
# print(result)`;
  }

  // Default to JavaScript
  
  return `/**
 * ${task}
 * @returns {any} Result of the function
 */
function ${normalizedTask}Function() {
  // TODO: Implement the function based on the task description
  // TODO: Implement the function based on the task description
  return "Not yet implemented";

// Example usage
// const result = ${normalizedTask}Function();
// console.log(result);`;
}

module.exports = {
  generateCode,
};
