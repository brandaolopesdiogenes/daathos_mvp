const { ok, fail } = require("./response");
const { connectPostgres, toConnectionString } = require("./database");
const { connectExternalApi } = require("./api");
const { connectCrm } = require("./crm");
const { connectorRegistry, ConnectorRegistry } = require("./registry");
const { CATALOG } = require("./catalog");
const {
  executeConnector,
  connectAndMaybeRegister,
  summarizeResult
} = require("./connector.service");

module.exports = {
  ok,
  fail,
  connectPostgres,
  toConnectionString,
  connectExternalApi,
  connectCrm,
  connectorRegistry,
  ConnectorRegistry,
  CATALOG,
  executeConnector,
  connectAndMaybeRegister,
  summarizeResult
};
