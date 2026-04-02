const { subscribe, publishEvent } = require("../events");
const { EventType } = require("../events/eventTypes");
const router = require("../router");
const openai = require("../providers/openai");
const { conversationMemoryService } = require("../memory");

/**
 * Passos suportados no pipeline (ordem importa).
 * - classify: IA estrutura o evento (OpenAI JSON)
 * - respond: orquestrador gera resposta (router.handle)
 * - persist: grava em memória de conversa com meta de automação
 *
 * @typedef {'classify' | 'respond' | 'persist'} AutomationStep
 */

/**
 * @typedef {Object} AutomationRule
 * @property {string} id
 * @property {string} eventType — ex.: EventType.NEW_LEAD
 * @property {AutomationStep[]} steps
 * @property {string} [userId] — namespace em conversation memory (default: automation)
 * @property {string} [respondMode] — modo do router em respond (default: auto)
 */

/** @type {AutomationRule[]} */
const DEFAULT_RULES = [
  {
    id: "new_lead_pipeline",
    eventType: EventType.NEW_LEAD,
    userId: "automation",
    respondMode: "auto",
    steps: ["classify", "respond", "persist"]
  }
];

class AutomationEngine {
  /**
   * @param {{ logger?: object, rules?: AutomationRule[] }} [options]
   */
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.rules = Array.isArray(options.rules) && options.rules.length ? options.rules : DEFAULT_RULES;
    /** @type {(() => void)[]} */
    this._unsubs = [];
    this._started = false;
  }

  start() {
    if (this._started) return;

    const skipRaw = process.env.DAATHOS_AUTOMATION_SKIP_EVENTS || "";
    const skipTypes = new Set(
      skipRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    );

    /** @type {Map<string, AutomationRule[]>} */
    const byType = new Map();
    for (const rule of this.rules) {
      const t = String(rule.eventType || "").trim();
      if (!t || skipTypes.has(t)) continue;
      if (!byType.has(t)) byType.set(t, []);
      byType.get(t).push(rule);
    }

    for (const [eventType, rules] of byType) {
      const off = subscribe(eventType, (event) => this._dispatch(event, rules));
      this._unsubs.push(off);
    }

    this._started = true;
    if (typeof this.logger.info === "function") {
      this.logger.info(
        { event: "automation_engine_started", rules: this.rules.map((r) => r.id) },
        "Automation engine started"
      );
    }
  }

  stop() {
    for (const off of this._unsubs) {
      try {
        off();
      } catch {
        /* ignore */
      }
    }
    this._unsubs = [];
    this._started = false;
    if (typeof this.logger.info === "function") {
      this.logger.info({ event: "automation_engine_stopped" }, "Automation engine stopped");
    }
  }

  /**
   * @param {{ type: string, source: string, data: unknown, timestamp: string }} event
   * @param {AutomationRule[]} rules
   */
  async _dispatch(event, rules) {
    for (const rule of rules) {
      try {
        await this._runRule(event, rule);
      } catch (err) {
        const message = err && err.message ? String(err.message) : "AUTOMATION_FAILED";
        if (typeof this.logger.error === "function") {
          this.logger.error({ err: message, ruleId: rule.id, event: event.type }, "Automation rule failed");
        }
        try {
          await publishEvent({
            type: EventType.ANOMALY_DETECTED,
            source: "automationEngine",
            data: { ruleId: rule.id, triggerEvent: event.type, error: message }
          });
        } catch {
          /* evitar loop */
        }
      }
    }
  }

  /**
   * @param {{ type: string, source: string, data: unknown, timestamp: string }} event
   * @param {AutomationRule} rule
   */
  async _runRule(event, rule) {
    /** @type {{ classification: unknown, response: object | null }} */
    const ctx = {
      event,
      classification: null,
      response: null
    };

    const steps = Array.isArray(rule.steps) ? rule.steps : [];

    for (const step of steps) {
      switch (step) {
        case "classify":
          ctx.classification = await this._classify(ctx, rule);
          break;
        case "respond":
          ctx.response = await this._respond(ctx, rule);
          break;
        case "persist":
          if (ctx.response) await this._persist(ctx, rule);
          break;
        default:
          if (typeof this.logger.warn === "function") {
            this.logger.warn({ step, ruleId: rule.id }, "Unknown automation step skipped");
          }
      }
    }
  }

  /**
   * @param {{ event: { type: string, source: string, data: unknown }, classification: unknown }} ctx
   */
  async _classify(ctx, rule) {
    if (!process.env.OPENAI_API_KEY) {
      return {
        segment: "unclassified",
        priority: "medium",
        summary: "OpenAI não configurado — classificação heurística.",
        heuristic: true,
        ruleId: rule.id
      };
    }

    const prompt = [
      "You are a lead triage assistant for DAATHOS.",
      "Given the following system event, return STRICT JSON only (no markdown):",
      '{"segment":"<string>","priority":"low|medium|high","summary":"<one line>","next_action_hint":"<string>"}',
      `Event type: ${ctx.event.type}`,
      `Event source: ${ctx.event.source}`,
      `Event data: ${JSON.stringify(ctx.event.data)}`
    ].join("\n");

    const { result: raw } = await openai(prompt, { model: "gpt-4o-mini" });
    try {
      return JSON.parse(raw);
    } catch {
      return { raw, parseError: true, ruleId: rule.id };
    }
  }

  /**
   * @param {{ event: { type: string, source: string, data: unknown }, classification: unknown }} ctx
   * @param {AutomationRule} rule
   */
  async _respond(ctx, rule) {
    const classification = ctx.classification;
    const prompt = [
      "Contexto: automação DAATHOS disparada por evento de negócio.",
      `Tipo de evento: ${ctx.event.type} (origem: ${ctx.event.source}).`,
      `Dados: ${JSON.stringify(ctx.event.data)}.`,
      `Classificação: ${JSON.stringify(classification)}.`,
      "Tarefa: redija uma resposta objetiva em português (tom profissional) como se fosse o próximo passo para o time ou uma mensagem ao lead — sem inventar dados que não estejam no contexto."
    ].join("\n");

    const mode = rule.respondMode && String(rule.respondMode).trim() ? String(rule.respondMode).trim() : "auto";
    return router.handle(prompt, mode, { logger: this.logger });
  }

  /**
   * @param {{ event: { type: string, source: string, data: unknown }, classification: unknown, response: object | null }} ctx
   * @param {AutomationRule} rule
   */
  async _persist(ctx, rule) {
    const r = ctx.response;
    if (!r || !r.response) return;

    const userId = rule.userId && String(rule.userId).trim() ? String(rule.userId).trim() : "automation";
    const promptLabel = `[${rule.id}] ${ctx.event.type} ← ${ctx.event.source}`;

    const saved = await conversationMemoryService.addConversation({
      userId,
      prompt: promptLabel,
      response: r.response,
      mode: "automation",
      provider: r.provider,
      routing: {
        ...(r.routing && typeof r.routing === "object" ? r.routing : {}),
        automation: {
          ruleId: rule.id,
          eventType: ctx.event.type,
          eventSource: ctx.event.source,
          classification: ctx.classification
        }
      }
    });

    try {
      await publishEvent({
        type: EventType.NEW_DATA,
        source: "automationEngine",
        data: {
          ruleId: rule.id,
          triggerType: ctx.event.type,
          memoryItemId: saved.id,
          provider: r.provider
        }
      });
    } catch {
      /* ignore */
    }
  }
}

function createAutomationEngine(options) {
  return new AutomationEngine(options);
}

/** @type {AutomationEngine | null} */
let _singleton = null;

function startAutomationEngine(logger) {
  if (_singleton) return _singleton;
  _singleton = createAutomationEngine({ logger });
  _singleton.start();
  return _singleton;
}

function stopAutomationEngine() {
  if (_singleton) {
    _singleton.stop();
    _singleton = null;
  }
}

module.exports = {
  AutomationEngine,
  createAutomationEngine,
  DEFAULT_RULES,
  startAutomationEngine,
  stopAutomationEngine
};
