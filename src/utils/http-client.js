const axios = require("axios");
const env = require("../config/env");

const httpClient = axios.create({
  timeout: env.requestTimeoutMs
});

module.exports = httpClient;
