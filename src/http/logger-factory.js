/**
 * Pino options for structured logs — redacts sensitive headers.
 */
function buildLoggerOptions(config) {
  return {
    level: config.logLevel,
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        'req.headers["x-api-key"]',
        'req.headers["X-Api-Key"]'
      ],
      remove: true
    },
    serializers: {
      req(request) {
        return {
          method: request.method,
          url: request.url,
          path: request.routerPath,
          id: request.id,
          remoteAddress: request.ip
        };
      },
      res(reply) {
        return {
          statusCode: reply.statusCode
        };
      }
    }
  };
}

module.exports = { buildLoggerOptions };
