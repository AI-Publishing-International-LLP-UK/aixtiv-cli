package telemetry

import (
	"context"
	
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/trace"
)

// Telemetry provides instrumentation for application monitoring
type Telemetry struct {
	serviceName string
	tracer      trace.Tracer
	meter       metric.Meter

	// Metrics
	requestCounter   metric.Int64Counter
	requestDuration  metric.Float64Histogram
	errorCounter     metric.Int64Counter
	knowledgeCounter metric.Int64Counter
}

// NewTelemetry creates a new telemetry instance
func NewTelemetry(serviceName string) *Telemetry {
	tracer := otel.Tracer(serviceName)
	meter := otel.Meter(serviceName)

	requestCounter, _ := meter.Int64Counter(
		"agent.requests",
		metric.WithDescription("Number of requests processed"),
	)

	requestDuration, _ := meter.Float64Histogram(
		"agent.request.duration",
		metric.WithDescription("Duration of request processing"),
		metric.WithUnit("ms"),
	)

	errorCounter, _ := meter.Int64Counter(
		"agent.errors",
		metric.WithDescription("Number of errors"),
	)

	knowledgeCounter, _ := meter.Int64Counter(
		"agent.knowledge.access",
		metric.WithDescription("Number of knowledge store accesses"),
	)
	
	return &Telemetry{
		serviceName:      serviceName,
		tracer:           tracer,
		meter:            meter,
		requestCounter:   requestCounter,
		requestDuration:  requestDuration,
		errorCounter:     errorCounter,
		knowledgeCounter: knowledgeCounter,
	}
}

// RecordRequest increments the request counter
func (t *Telemetry) RecordRequest(ctx context.Context) {
	t.requestCounter.Add(ctx, 1)
}

// RecordError increments the error counter
func (t *Telemetry) RecordError(ctx context.Context) {
	t.errorCounter.Add(ctx, 1)
}

// RecordKnowledgeAccess increments the knowledge access counter
func (t *Telemetry) RecordKnowledgeAccess(ctx context.Context) {
	t.knowledgeCounter.Add(ctx, 1)
}

// RecordDuration records the duration of a request
func (t *Telemetry) RecordDuration(ctx context.Context, durationMs float64) {
	t.requestDuration.Record(ctx, durationMs)
}
