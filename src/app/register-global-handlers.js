const { errorResponse } = require("../utils/response");

function registerGlobalHandlers(app) {
  app.setErrorHandler((error, request, reply) => {
    request.log.error(
      {
        error: error.message,
        stack: error.stack,
        requestId: request.id
      },
      "Unhandled application error"
    );

    return reply.code(error.statusCode || 500).send(
      errorResponse({
        code: "INTERNAL_SERVER_ERROR",
        message: "Unexpected server error",
        details: { requestId: request.id }
      })
    );
  });

  app.setNotFoundHandler((request, reply) => {
    return reply.code(404).send(
      errorResponse({
        code: "NOT_FOUND",
        message: "Route not found",
        details: { path: request.url, requestId: request.id }
      })
    );
  });
}

module.exports = { registerGlobalHandlers };
