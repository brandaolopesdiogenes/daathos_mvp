const { InMemoryConversationRepository } = require("./repositories/in-memory-conversation.repository");
const { PostgresConversationRepository } = require("./repositories/postgres-conversation.repository");

/**
 * Cria a implementação de {@link import("./repositories/conversation-repository").ConversationRepository}
 * conforme `CONVERSATION_STORE` (ou `MEMORY_STORE`).
 *
 * Valores suportados:
 * - `memory` (default) — RAM, ring buffer
 * - `postgres` | `postgresql` — `pg` + `DATABASE_URL`
 * - `supabase` — mesmo que PostgreSQL: use a connection string do projeto (Settings → Database).
 *   O driver `pg` é adequado; não é obrigatório usar o cliente JS do Supabase só para esta tabela.
 *
 * @param {Record<string, string | undefined>} [env=process.env]
 * @returns {import("./repositories/conversation-repository").ConversationRepository & { close?: () => Promise<void> }}
 */
function createConversationRepository(env = process.env) {
  const driverRaw = env.CONVERSATION_STORE || env.MEMORY_STORE || "memory";
  const driver = String(driverRaw).toLowerCase().trim();

  switch (driver) {
    case "memory":
    case "in-memory":
    case "ram": {
      const max = Number(env.CONVERSATION_MEMORY_MAX || env.EXECUTION_LOG_MAX || 5000);
      return new InMemoryConversationRepository({
        maxEntries: Number.isFinite(max) && max > 0 ? max : 5000
      });
    }

    case "postgres":
    case "postgresql":
    case "supabase": {
      const connectionString = env.DATABASE_URL || env.SUPABASE_DB_URL || env.SUPABASE_DATABASE_URL;
      if (!connectionString || !String(connectionString).trim()) {
        // Em PaaS (Railway) é comum copiar .env.example com CONVERSATION_STORE=postgres sem URL —
        // isso derruba o processo antes do listen e o healthcheck fica "service unavailable".
        console.warn(
          "[DAATHOS] CONVERSATION_STORE=postgres|supabase sem DATABASE_URL/SUPABASE_DB_URL — usando memória in-process. " +
            "Configure DATABASE_URL ou use CONVERSATION_STORE=memory."
        );
        const max = Number(env.CONVERSATION_MEMORY_MAX || env.EXECUTION_LOG_MAX || 5000);
        return new InMemoryConversationRepository({
          maxEntries: Number.isFinite(max) && max > 0 ? max : 5000
        });
      }
      const tableName = env.CONVERSATION_TABLE_NAME || "daathos_conversations";
      const autoMigrate = env.CONVERSATION_AUTO_MIGRATE !== "false" && env.CONVERSATION_AUTO_MIGRATE !== "0";
      return new PostgresConversationRepository({
        connectionString: String(connectionString),
        tableName,
        autoMigrate
      });
    }

    default:
      throw new Error(
        `Unknown CONVERSATION_STORE="${driver}". Use: memory | postgres | supabase`
      );
  }
}

module.exports = { createConversationRepository };
