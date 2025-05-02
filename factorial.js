/**
 * Calculates the factorial of a number.
 * 
 * @param {number} n - The number to calculate factorial for
 * @returns {number} The factorial of n, or null for invalid inputs
 * 
 * Factorial is defined as the product of all positive integers
 * less than or equal to n.
 * For example: 5! = 5 × 4 × 3 × 2 × 1 = 120
 * 
 * Special cases:
 * - Returns 1 for n = 0 (0! = 1 by definition)
 * - Returns null for negative numbers
 * - Returns null for non-integer inputs
 */
function factorial(n) {
  // Check if input is a non-negative integer
  if (n < 0 || !Number.isInteger(n)) {
    console.error("Input must be a non-negative integer");
    return null;
  }
  
  // Special case: 0! = 1
  if (n === 0) {
    return 1;
  }
  
  // Calculate factorial using iterative approach
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  
  return result;
}

// Examples of using the factorial function
console.log("factorial(0):", factorial(0));      // Output: 1
console.log("factorial(1):", factorial(1));      // Output: 1
console.log("factorial(5):", factorial(5));      // Output: 120
console.log("factorial(10):", factorial(10));    // Output: 3628800
console.log("factorial(-1):", factorial(-1));    // Output: null
console.log("factorial(3.5):", factorial(3.5));  // Output: null

