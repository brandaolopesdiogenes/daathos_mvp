const { errResult } = require("./types");

class BaseConnector {
  /** @returns {import('./types').ConnectorKind} */
  get kind() {
    throw new Error("Subclass must implement kind getter");
  }

  /**
   * Lifecycle: open physical connection / pool (optional).
   * @returns {Promise<void>}
   */
  async connect() {
    return undefined;
  }

  /**
   * @param {import('./types').ConnectorPayload} _payload
   * @returns {Promise<import('./types').ConnectorResult>}
   */
  async execute(_payload) {
    throw new Error("Subclass must implement execute()");
  }

  /**
   * @returns {Promise<void>}
   */
  async disconnect() {
    return undefined;
  }

  /** @protected */
  unsupported(operation) {
    return errResult({
      connector: this.kind,
      operation,
      code: "UNSUPPORTED_OPERATION",
      message: `Operation "${operation}" is not supported by ${this.kind}`
    });
  }
}

module.exports = { BaseConnector };
