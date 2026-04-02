/**
 * Contrato do repositório de conversas (Repository pattern).
 * Qualquer backend (RAM, PostgreSQL, Supabase/Postgres pooler, etc.) deve estender esta classe
 * e implementar os métodos abstratos. O restante do sistema só fala com {@link ConversationMemoryService}.
 *
 * @typedef {Object} ConversationRecord
 * @property {string} id
 * @property {string} userId
 * @property {string} prompt
 * @property {{ result?: string, time_ms?: number }|Record<string, unknown>} response
 * @property {string} mode
 * @property {string} provider
 * @property {Record<string, unknown>|null} [routing]
 * @property {string} createdAt ISO-8601
 */

class ConversationRepository {
  /**
   * Persiste um turno de conversa.
   * @param {ConversationRecord} _entry
   * @returns {Promise<void>}
   */
  async save(_entry) {
    throw new Error("ConversationRepository#save() must be implemented");
  }

  /**
   * Histórico do usuário, mais antigo → mais recente (últimos `limit` itens).
   * @param {string} _userId
   * @param {{ limit?: number }} [_options]
   * @returns {Promise<ConversationRecord[]>}
   */
  async listByUser(_userId, _options) {
    throw new Error("ConversationRepository#listByUser() must be implemented");
  }

  /**
   * Libera recursos (ex.: pool PG). Opcional — implementações em RAM podem omitir.
   * @returns {Promise<void>}
   */
  async close() {
    return undefined;
  }
}

module.exports = { ConversationRepository };
