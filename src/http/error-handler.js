/**
 * @param {import('fastify').FastifyInstance} app
 * @param {ReturnType<import('../config/app-config').getAppConfig>} config
 */
function registerErrorHandler(app, config) {
  app.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode && error.statusCode < 600 ? error.statusCode : 500;

    if (error.validation) {
      request.log.warn(
        { validation: error.validation, reqId: request.id },
        "Request validation failed"
      );
      return reply.code(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body or parameters",
          details: {
            requestId: request.id,
            validation: error.validation
          }
        }
      });
    }

    request.log.error(
      {
        err: {
          message: error.message,
          code: error.code,
          statusCode: error.statusCode
        },
        stack: config.exposeErrorDetails ? error.stack : undefined,
        reqId: request.id,
        path: request.url,
        method: request.method
      },
      error.message || "Unhandled error"
    );

    const clientMessage =
      statusCode >= 500 && !config.exposeErrorDetails
        ? "Internal server error"
        : error.message || "Request failed";

    const details = {
      requestId: request.id
    };
    if (config.exposeErrorDetails && error.stack) {
      details.stack = error.stack;
    }

    return reply.code(statusCode).send({
      success: false,
      error: {
        code: statusCode >= 500 ? "INTERNAL_SERVER_ERROR" : "REQUEST_ERROR",
        message: clientMessage,
        details
      }
    });
  });

  app.setNotFoundHandler((request, reply) => {
    request.log.warn({ reqId: request.id, path: request.url }, "Route not found");
    return reply.code(404).send({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Route not found",
        details: { path: request.url, requestId: request.id }
      }
    });
  });
}

module.exports = { registerErrorHandler };
