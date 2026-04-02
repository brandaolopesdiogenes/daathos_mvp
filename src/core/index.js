const { handle: handleOrchestration } = require("./router");
const { conversationMemoryService, closeConversationInfrastructure } = require("./memory");
const { orchestrationLogService } = require("./logs");
const agents = require("./agents");
const connectors = require("./connectors");
const events = require("./events");
const automations = require("./automations");
const eventRouter = require("./event-router");
const live = require("./live");

module.exports = {
  handleOrchestration,
  conversationMemoryService,
  closeConversationInfrastructure,
  orchestrationLogService,
  agents,
  connectors,
  events,
  automations,
  eventRouter,
  live
};
