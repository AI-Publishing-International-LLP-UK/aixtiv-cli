package telemetry

import (
	"context"
	"testing"
)

func TestNewTelemetry(t *testing.T) {
	telemetry := NewTelemetry("test-service")
	
	if telemetry == nil {
		t.Fatal("NewTelemetry returned nil")
	}
	
	if telemetry.serviceName != "test-service" {
		t.Errorf("Expected service name to be 'test-service', got '%s'", telemetry.serviceName)
	}
	
	if telemetry.tracer == nil {
		t.Error("Tracer is nil")
	}
	
	if telemetry.meter == nil {
		t.Error("Meter is nil")
	}
	
	if telemetry.requestCounter == nil {
		t.Error("RequestCounter is nil")
	}
	
	if telemetry.requestDuration == nil {
		t.Error("RequestDuration is nil")
	}
	
	if telemetry.errorCounter == nil {
		t.Error("ErrorCounter is nil")
	}
	
	if telemetry.knowledgeCounter == nil {
		t.Error("KnowledgeCounter is nil")
	}
}

func TestTelemetryMethods(t *testing.T) {
	// This is a simple test to ensure the methods don't panic
	ctx := context.Background()
	telemetry := NewTelemetry("test-service")
	
	// Test each method (these should not panic)
	telemetry.RecordRequest(ctx)
	telemetry.RecordError(ctx)
	telemetry.RecordKnowledgeAccess(ctx)
	telemetry.RecordDuration(ctx, 123.45)
}
