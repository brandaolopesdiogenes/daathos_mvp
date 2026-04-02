const axios = require("axios");
const { BaseConnector } = require("../core/base-connector");
const { okResult, errResult } = require("../core/types");

/**
 * Generic CRM connector — maps to HTTP with provider-specific path conventions.
 * Replace baseURL + routes when wiring HubSpot, Salesforce, Pipedrive, etc.
 */
class CrmConnector extends BaseConnector {
  /**
   * @param {{ baseURL?: string, apiKey?: string, provider?: string, timeoutMs?: number }} options
   */
  constructor(options = {}) {
    super();
    this.provider = options.provider || process.env.CRM_PROVIDER || "generic";
    this.baseURL = options.baseURL || process.env.CRM_API_BASE_URL || "";
    this.apiKey = options.apiKey || process.env.CRM_API_KEY || "";
    this.timeoutMs = options.timeoutMs ?? Number(process.env.CRM_API_TIMEOUT_MS || 30000);
    this.client = axios.create({
      baseURL: this.baseURL || undefined,
      timeout: this.timeoutMs,
      headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}
    });
  }

  get kind() {
    return "crm";
  }

  /**
   * @param {import('../core/types').ConnectorPayload} payload
   */
  async execute(payload) {
    const { operation, resource = "", params = {} } = payload;
    const started = Date.now();

    if (!this.baseURL) {
      return errResult({
        connector: this.kind,
        operation,
        code: "CRM_NOT_CONFIGURED",
        message: "CRM_API_BASE_URL is not set",
        meta: { durationMs: Date.now() - started, provider: this.provider }
      });
    }

    try {
      if (operation === "getRecord") {
        const entity = String(resource || params.entity || "").trim();
        if (!entity) {
          return errResult({
            connector: this.kind,
            operation,
            code: "INVALID_PARAMS",
            message: "resource or params.entity is required",
            meta: { durationMs: Date.now() - started, provider: this.provider }
          });
        }
        const id = String(params.id || "");
        const path = `/crm/${this.provider}/records/${entity}/${id}`.replace(/\/+/g, "/");
        const response = await this.client.get(path, { params: params.query || {} });
        return okResult({
          connector: this.kind,
          operation,
          data: response.data,
          normalized: { entity, record: response.data },
          meta: { durationMs: Date.now() - started, provider: this.provider }
        });
      }

      if (operation === "listRecords") {
        const entity = String(resource || params.entity || "").trim();
        if (!entity) {
          return errResult({
            connector: this.kind,
            operation,
            code: "INVALID_PARAMS",
            message: "resource or params.entity is required",
            meta: { durationMs: Date.now() - started, provider: this.provider }
          });
        }
        const path = `/crm/${this.provider}/records/${entity}`.replace(/\/+/g, "/");
        const response = await this.client.get(path, { params: params.query || {} });
        return okResult({
          connector: this.kind,
          operation,
          data: response.data,
          normalized: { entity, records: response.data?.items || response.data },
          meta: { durationMs: Date.now() - started, provider: this.provider }
        });
      }

      if (operation === "invoke") {
        const method = String(params.method || "POST").toUpperCase();
        const path = String(params.path || "");
        const response = await this.client.request({
          method,
          url: path,
          data: params.body,
          params: params.query
        });
        return okResult({
          connector: this.kind,
          operation,
          data: response.data,
          normalized: { statusCode: response.status, body: response.data },
          meta: { durationMs: Date.now() - started, provider: this.provider }
        });
      }

      return this.unsupported(operation);
    } catch (error) {
      const status = error.response?.status;
      return errResult({
        connector: this.kind,
        operation,
        code: status ? `HTTP_${status}` : "CRM_REQUEST_FAILED",
        message: error.message || "CRM request failed",
        details: error.response?.data,
        meta: { durationMs: Date.now() - started, provider: this.provider }
      });
    }
  }
}

module.exports = { CrmConnector };
