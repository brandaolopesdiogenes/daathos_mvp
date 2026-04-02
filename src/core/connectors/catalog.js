/**
 * Catálogo de tipos de conector exposto em GET /connectors.
 */
const CATALOG = [
  {
    type: "postgres",
    label: "PostgreSQL",
    description: "Banco relacional via lib pg (connection string ou host/database/user).",
    requiredConfig: ["connectionString OU (host, database, user)"],
    module: "database.js"
  },
  {
    type: "api",
    label: "API externa",
    description: "HTTP/HTTPS com axios — qualquer método e headers.",
    requiredConfig: ["baseUrl"],
    optionalConfig: ["path", "method", "token", "headers", "body", "timeoutMs"],
    module: "api.js"
  },
  {
    type: "crm",
    label: "CRM genérico",
    description: "HTTP sobre base configurável (sanity check de endpoint CRM).",
    requiredConfig: ["baseUrl"],
    optionalConfig: ["path", "token", "method", "headers"],
    module: "crm.js"
  }
];

module.exports = { CATALOG };
