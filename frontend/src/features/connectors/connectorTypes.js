/**
 * @typedef {'postgres' | 'external_api' | 'crm'} ConnectorCatalogId
 */

/**
 * @typedef {'connected' | 'disconnected'} ConnectorLinkStatus
 */

/**
 * @typedef {Object} ConnectorConnection
 * @property {string} id
 * @property {ConnectorCatalogId} catalogType
 * @property {string} backendProvider
 * @property {string} name
 * @property {string} host
 * @property {string} secret
 * @property {ConnectorLinkStatus} status
 * @property {string} createdAt
 * @property {string} updatedAt
 */

export {};
