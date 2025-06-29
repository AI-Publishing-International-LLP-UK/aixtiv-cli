// Import CTTT telemetry
const { sendTelemetryEvent } = require('./cttt-integration');

/**
 * Attach CTTT middleware to Express app
 * @param {Object} app Express application
 */
function attachCTTTMiddleware(app) {
  // Log all requests
  app.use((req, res, next) => {
    const startTime = Date.now();

    // Monkey patch res.end to measure response time
    const originalEnd = res.end;
    res.end = function (chunk, encoding) {
      const responseTime = Date.now() - startTime;
      const statusCode = res.statusCode;

      // Send telemetry for API requests
      if (req.url.startsWith('/api/')) {
        sendTelemetryEvent('api_request', {
          method: req.method,
          path: req.url,
          statusCode,
          responseTime,
          userAgent: req.headers['user-agent'],
          contentType: req.headers['content-type'],
        });
      }

      return originalEnd.call(this, chunk, encoding);
    };

    next();
  });

  // Error handling middleware
  app.use((err, req, res, next) => {
    // Send telemetry for errors
    sendTelemetryEvent('server_error', {
      method: req.method,
      path: req.url,
      errorMessage: err.message,
      errorStack: err.stack,
      userAgent: req.headers['user-agent'],
    });

    next(err);
  });
}

// Export middleware
module.exports = {
  attachCTTTMiddleware,
};
