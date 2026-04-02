/**
 * Conectores suportados pelo DAATHOS OS (alinhado ao roadmap do backend).
 * @type {{ id: string, label: string, description: string, backendProvider: string, hostPlaceholder: string, secretLabel: string }[]}
 */
export const CONNECTOR_CATALOG = [
  {
    id: "postgres",
    label: "PostgreSQL",
    description: "Banco relacional — memória, logs e dados estruturados.",
    backendProvider: "postgresql",
    hostPlaceholder: "postgresql://user@host:5432/dbname ou host:5432",
    secretLabel: "Senha / token"
  },
  {
    id: "external_api",
    label: "API externa",
    description: "HTTP/REST — integrações genéricas e webhooks.",
    backendProvider: "http",
    hostPlaceholder: "https://api.exemplo.com",
    secretLabel: "API key / Bearer token"
  },
  {
    id: "crm",
    label: "CRM genérico",
    description: "Camada CRM configurável (HTTP genérico no core).",
    backendProvider: "crm_generic",
    hostPlaceholder: "https://crm.exemplo.com/v1",
    secretLabel: "API key CRM"
  }
];

/** @param {string} catalogId */
export function getCatalogEntry(catalogId) {
  return CONNECTOR_CATALOG.find((c) => c.id === catalogId) || null;
}
