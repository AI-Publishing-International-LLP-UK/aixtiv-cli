package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"strconv"
	"syscall"

	"github.com/aixtiv/telemetry"
)

func main() {
	// Main command parser
	if len(os.Args) < 2 {
		fmt.Println("Usage: telemetry-agent <command> [options]")
		fmt.Println("Commands: start, record-request, record-error, record-knowledge, record-duration, shutdown")
		os.Exit(1)
	}

	command := os.Args[1]
	
	switch command {
	case "start":
		startTelemetry()
	case "record-request":
		recordRequest()
	case "record-error":
		recordError()
	case "record-knowledge":
		recordKnowledgeAccess() 
	case "record-duration":
		recordDuration()
	case "shutdown":
		shutdownTelemetry()
	default:
		fmt.Printf("Unknown command: %s\n", command)
		os.Exit(1)
	}
}

func startTelemetry() {
	// Parse flags
	startCmd := flag.NewFlagSet("start", flag.ExitOnError)
	serviceName := startCmd.String("service", "aixtiv-cli", "Service name for telemetry")
	logFile := startCmd.String("log", "", "Log file path for telemetry output")
	
	startCmd.Parse(os.Args[2:])

	// Create telemetry provider
	provider, err := telemetry.NewProvider()
	if err != nil {
		fmt.Printf("Failed to create telemetry provider: %v\n", err)
		os.Exit(1)
	}

	// Set up a context that can be cancelled
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Handle signals for graceful shutdown
	sigs := make(chan os.Signal, 1)
	signal.Notify(sigs, syscall.SIGINT, syscall.SIGTERM)
	
	go func() {
		<-sigs
		fmt.Println("Shutting down telemetry provider...")
		cancel()
		provider.Shutdown(context.Background())
		os.Exit(0)
	}()

	// Create telemetry instance (just log it, don't need to use it)
	_ = telemetry.NewTelemetry(*serviceName)
	fmt.Printf("Telemetry started for service: %s\n", *serviceName)
	
	if *logFile != "" {
		fmt.Printf("Logging to: %s\n", *logFile)
	}

	// Keep running until context is cancelled
	<-ctx.Done()
}

func recordRequest() {
	// Parse flags
	recordCmd := flag.NewFlagSet("record-request", flag.ExitOnError)
	contextID := recordCmd.String("context-id", "", "Context ID for correlation")
	commandName := recordCmd.String("command", "unknown", "Command name")
	
	recordCmd.Parse(os.Args[2:])

	// Create telemetry instance
	t := telemetry.NewTelemetry("aixtiv-cli")
	
	// Record request
	t.RecordRequest(context.Background())
	fmt.Printf("Recorded request for context: %s, command: %s\n", *contextID, *commandName)
}

func recordError() {
	// Parse flags
	recordCmd := flag.NewFlagSet("record-error", flag.ExitOnError)
	contextID := recordCmd.String("context-id", "", "Context ID for correlation")
	commandName := recordCmd.String("command", "unknown", "Command name")
	errorMsg := recordCmd.String("error", "", "Error message")
	
	recordCmd.Parse(os.Args[2:])

	// Create telemetry instance
	t := telemetry.NewTelemetry("aixtiv-cli")
	
	// Record error
	t.RecordError(context.Background())
	fmt.Printf("Recorded error for context: %s, command: %s, error: %s\n", *contextID, *commandName, *errorMsg)
}

func recordKnowledgeAccess() {
	// Parse flags
	recordCmd := flag.NewFlagSet("record-knowledge", flag.ExitOnError)
	contextID := recordCmd.String("context-id", "", "Context ID for correlation")
	knowledgeType := recordCmd.String("type", "general", "Knowledge type")
	
	recordCmd.Parse(os.Args[2:])

	// Create telemetry instance
	t := telemetry.NewTelemetry("aixtiv-cli")
	
	// Record knowledge access
	t.RecordKnowledgeAccess(context.Background())
	fmt.Printf("Recorded knowledge access for context: %s, type: %s\n", *contextID, *knowledgeType)
}

func recordDuration() {
	// Parse flags
	recordCmd := flag.NewFlagSet("record-duration", flag.ExitOnError)
	contextID := recordCmd.String("context-id", "", "Context ID for correlation")
	commandName := recordCmd.String("command", "unknown", "Command name")
	duration := recordCmd.String("duration", "0", "Duration in milliseconds")
	
	recordCmd.Parse(os.Args[2:])

	// Parse duration to float
	durationMs, err := strconv.ParseFloat(*duration, 64)
	if err != nil {
		fmt.Printf("Invalid duration: %s\n", *duration)
		os.Exit(1)
	}

	// Create telemetry instance
	t := telemetry.NewTelemetry("aixtiv-cli")
	
	// Record duration
	t.RecordDuration(context.Background(), durationMs)
	fmt.Printf("Recorded duration for context: %s, command: %s, duration: %.2fms\n", 
		*contextID, *commandName, durationMs)
}

func shutdownTelemetry() {
	// Parse flags
	shutdownCmd := flag.NewFlagSet("shutdown", flag.ExitOnError)
	contextID := shutdownCmd.String("context-id", "", "Context ID for correlation")
	
	shutdownCmd.Parse(os.Args[2:])

	// Just print a message - actual shutdown is handled by the Node.js process
	fmt.Printf("Telemetry shutdown requested for context: %s\n", *contextID)
}
