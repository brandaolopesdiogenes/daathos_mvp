const axios = require("axios");
const { BaseConnector } = require("../core/base-connector");
const { okResult, errResult } = require("../core/types");

/**
 * Generic REST / HTTP connector for external APIs.
 */
class ExternalApiConnector extends BaseConnector {
  /**
   * @param {{ baseURL?: string, timeoutMs?: number, defaultHeaders?: Record<string,string> }} options
   */
  constructor(options = {}) {
    super();
    this.baseURL = options.baseURL || process.env.EXTERNAL_API_BASE_URL || "";
    this.timeoutMs = options.timeoutMs ?? Number(process.env.EXTERNAL_API_TIMEOUT_MS || 30000);
    this.defaultHeaders = options.defaultHeaders || {};
    this.client = axios.create({
      baseURL: this.baseURL || undefined,
      timeout: this.timeoutMs,
      headers: this.defaultHeaders
    });
  }

  get kind() {
    return "http";
  }

  /**
   * @param {import('../core/types').ConnectorPayload} payload
   */
  async execute(payload) {
    const { operation, params = {} } = payload;
    const started = Date.now();

    try {
      if (operation === "request") {
        const method = String(params.method || "GET").toUpperCase();
        const url = String(params.url || "");
        if (!url) {
          return errResult({
            connector: this.kind,
            operation,
            code: "INVALID_PARAMS",
            message: "params.url is required",
            meta: { durationMs: Date.now() - started }
          });
        }

        const response = await this.client.request({
          method,
          url,
          data: params.body,
          params: params.query,
          headers: params.headers || {}
        });

        return okResult({
          connector: this.kind,
          operation,
          data: {
            status: response.status,
            headers: response.headers,
            body: response.data
          },
          normalized: {
            statusCode: response.status,
            body: response.data
          },
          meta: { durationMs: Date.now() - started }
        });
      }

      return this.unsupported(operation);
    } catch (error) {
      const status = error.response?.status;
      return errResult({
        connector: this.kind,
        operation,
        code: status ? `HTTP_${status}` : "HTTP_REQUEST_FAILED",
        message: error.message || "HTTP request failed",
        details: error.response?.data,
        meta: { durationMs: Date.now() - started }
      });
    }
  }
}

module.exports = { ExternalApiConnector };
