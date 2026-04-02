/**
 * Minimal step runner for future workflows (n8n-style, Bull queues, etc.).
 * Each step: { connector: string, payload: ConnectorPayload }
 */

class AutomationRunner {
  /**
   * @param {import('../registry').ConnectorRegistry} registry
   */
  constructor(registry) {
    this.registry = registry;
  }

  /**
   * @param {Array<{ connector: string, payload: import('../core/types').ConnectorPayload }>} steps
   * @param {import('../core/types').ConnectorContext} [context]
   */
  async runSteps(steps, context = {}) {
    /** @type {import('../core/types').ConnectorResult[]} */
    const results = [];

    for (const step of steps) {
      const payload = {
        ...step.payload,
        context: { ...context, ...(step.payload.context || {}) }
      };
      const result = await this.registry.run(step.connector, payload);
      results.push(result);
      if (!result.ok) break;
    }

    return {
      ok: results.every((r) => r.ok),
      steps: results
    };
  }
}

module.exports = { AutomationRunner };
