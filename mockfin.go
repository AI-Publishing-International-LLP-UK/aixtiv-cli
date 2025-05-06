package main

import (
	"knowledge" // Assuming this is a custom package; you may need to adjust the import path
)

// mockFinancialStatement creates a mock financial statement document
// This is kept for backward compatibility but we no longer use mock or simulated content
func mockFinancialStatement() *knowledge.Document {
	return &knowledge.Document{
		// Fill in required fields here
		Title:   "Financial Statement",
		Type:    "financial",
		Content: "Sample financial data",
	}
}

// If this is being used in a standalone program, you may need a main function:
func main() {
	// Example usage
	doc := mockFinancialStatement()
	println(doc.Title)
}

