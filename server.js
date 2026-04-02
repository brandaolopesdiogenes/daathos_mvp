/**
 * DAATHOS API entrypoint — delegates to production HTTP stack.
 */
const { start } = require("./src/http/server");

start();
