const { BaseConnector } = require("./core/base-connector");
const { okResult, errResult } = require("./core/types");
const { PostgreSQLConnector } = require("./postgresql/postgresql.connector");
const { ExternalApiConnector } = require("./http/external-api.connector");
const { CrmConnector } = require("./crm/crm.connector");
const { ConnectorRegistry, createDefaultRegistry } = require("./registry");
const { AutomationRunner } = require("./automation/automation-runner");

const defaultRegistry = createDefaultRegistry();

module.exports = {
  BaseConnector,
  okResult,
  errResult,
  PostgreSQLConnector,
  ExternalApiConnector,
  CrmConnector,
  ConnectorRegistry,
  createDefaultRegistry,
  AutomationRunner,
  defaultRegistry
};
