package telemetry

import (
	"context"
	"io"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/stdout/stdoutmetric"
	"go.opentelemetry.io/otel/exporters/stdout/stdouttrace"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
)

// Provider manages the lifecycle of telemetry resources
type Provider struct {
	tracerProvider *sdktrace.TracerProvider
	meterProvider  *sdkmetric.MeterProvider
	traceExporter  *stdouttrace.Exporter
	metricExporter sdkmetric.Exporter
}

// NewProvider creates a new telemetry provider with stdout exporters
func NewProvider() (*Provider, error) {
	// Initialize trace exporter
	traceExporter, err := stdouttrace.New(stdouttrace.WithPrettyPrint())
	if err != nil {
		return nil, err
	}

	// Initialize trace provider
	tracerProvider := sdktrace.NewTracerProvider(
		sdktrace.WithSampler(sdktrace.AlwaysSample()),
		sdktrace.WithBatcher(traceExporter),
	)
	otel.SetTracerProvider(tracerProvider)

	// Initialize metric exporter
	metricExporter, err := stdoutmetric.New()
	if err != nil {
		return nil, err
	}

	// Initialize meter provider
	meterProvider := sdkmetric.NewMeterProvider(
		sdkmetric.WithReader(sdkmetric.NewPeriodicReader(metricExporter)),
	)
	otel.SetMeterProvider(meterProvider)

	return &Provider{
		tracerProvider: tracerProvider,
		meterProvider:  meterProvider,
		traceExporter:  traceExporter,
		metricExporter: metricExporter,
	}, nil
}

// Shutdown gracefully shuts down the telemetry providers
func (p *Provider) Shutdown(ctx context.Context) error {
	err1 := p.tracerProvider.Shutdown(ctx)
	err2 := p.meterProvider.Shutdown(ctx)

	if err1 != nil {
		return err1
	}
	return err2
}

// NewProviderWithWriters creates a new telemetry provider with custom writers
func NewProviderWithWriters(traceWriter, metricWriter io.Writer) (*Provider, error) {
	// Initialize trace exporter
	traceExporter, err := stdouttrace.New(
		stdouttrace.WithPrettyPrint(),
		stdouttrace.WithWriter(traceWriter),
	)
	if err != nil {
		return nil, err
	}

	// Initialize trace provider
	tracerProvider := sdktrace.NewTracerProvider(
		sdktrace.WithSampler(sdktrace.AlwaysSample()),
		sdktrace.WithBatcher(traceExporter),
	)
	otel.SetTracerProvider(tracerProvider)

	// Initialize metric exporter
	metricExporter, err := stdoutmetric.New(
		stdoutmetric.WithWriter(metricWriter),
	)
	if err != nil {
		return nil, err
	}

	// Initialize meter provider
	meterProvider := sdkmetric.NewMeterProvider(
		sdkmetric.WithReader(sdkmetric.NewPeriodicReader(metricExporter)),
	)
	otel.SetMeterProvider(meterProvider)

	return &Provider{
		tracerProvider: tracerProvider,
		meterProvider:  meterProvider,
		traceExporter:  traceExporter,
		metricExporter: metricExporter,
	}, nil
}
