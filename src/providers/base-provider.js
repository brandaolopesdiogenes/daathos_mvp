class BaseProvider {
  constructor({ name, apiKey }) {
    this.name = name;
    this.apiKey = apiKey;
  }

  isConfigured() {
    return Boolean(this.apiKey);
  }

  async run() {
    throw new Error(`Provider ${this.name} must implement run()`);
  }
}

module.exports = BaseProvider;
