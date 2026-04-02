class ConversationMemoryService {
  constructor({ repository }) {
    this.repository = repository;
  }

  async addConversation({
    userId,
    prompt,
    response,
    mode,
    provider,
    routing = null
  }) {
    const item = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      userId,
      prompt,
      response,
      mode,
      provider,
      routing,
      createdAt: new Date().toISOString()
    };

    await this.repository.save(item);
    return item;
  }

  async getHistory(userId, limit = 50) {
    return this.repository.listByUser(userId, { limit });
  }
}

module.exports = { ConversationMemoryService };
