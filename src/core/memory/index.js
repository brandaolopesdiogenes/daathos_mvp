const { createConversationRepository } = require("./conversation-repository.factory");
const { ConversationMemoryService } = require("./conversation-memory.service");
const { ConversationRepository } = require("./repositories/conversation-repository");
const { InMemoryConversationRepository } = require("./repositories/in-memory-conversation.repository");
const { PostgresConversationRepository } = require("./repositories/postgres-conversation.repository");

const repository = createConversationRepository();
const conversationMemoryService = new ConversationMemoryService({ repository });

/**
 * Encerra recursos do repositório (ex.: pool PostgreSQL). Chamar no shutdown do processo.
 */
async function closeConversationInfrastructure() {
  if (repository && typeof repository.close === "function") {
    await repository.close();
  }
}

module.exports = {
  conversationMemoryService,
  createConversationRepository,
  closeConversationInfrastructure,
  ConversationRepository,
  InMemoryConversationRepository,
  PostgresConversationRepository,
  ConversationMemoryService
};
