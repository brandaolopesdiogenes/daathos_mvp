/**
 * Tipos de evento de referência no DAATHOS (domínio + extensível).
 * @readonly
 */
const EventType = {
  NEW_LEAD: "new_lead",
  NEW_DATA: "new_data",
  ANOMALY_DETECTED: "anomaly_detected",
  /** Fila humana: proposta pronta para aprovação na UI */
  APPROVAL_REQUIRED: "approval_required",
  /** Operador aprovou e a execução com o router foi disparada */
  DECISION_EXECUTED: "decision_executed",
  /** Pulso periódico do núcleo (monitoramento / sistema vivo) */
  SYSTEM_PULSE: "system_pulse",
  /** Orquestração concluída via POST /daathos */
  ORCHESTRATION_COMPLETED: "orchestration_completed"
};

module.exports = { EventType };
