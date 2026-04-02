const env = require("../config/env");

class CircuitBreakerService {
  constructor() {
    this.states = new Map();
  }

  getState(providerName) {
    if (!this.states.has(providerName)) {
      this.states.set(providerName, {
        failures: 0,
        openedAt: null
      });
    }
    return this.states.get(providerName);
  }

  canExecute(providerName) {
    const state = this.getState(providerName);
    if (!state.openedAt) return true;

    const openDuration = Date.now() - state.openedAt;
    if (openDuration >= env.circuitBreakerCooldownMs) {
      state.openedAt = null;
      state.failures = 0;
      return true;
    }

    return false;
  }

  onSuccess(providerName) {
    const state = this.getState(providerName);
    state.failures = 0;
    state.openedAt = null;
  }

  onFailure(providerName) {
    const state = this.getState(providerName);
    state.failures += 1;

    if (state.failures >= env.circuitBreakerFailureThreshold) {
      state.openedAt = Date.now();
    }
  }

  getSnapshot(providerNames) {
    const snapshot = {};

    for (const providerName of providerNames) {
      const state = this.getState(providerName);
      const isOpen = Boolean(state.openedAt) && Date.now() - state.openedAt < env.circuitBreakerCooldownMs;

      snapshot[providerName] = {
        failures: state.failures,
        isOpen
      };
    }

    return snapshot;
  }
}

module.exports = { CircuitBreakerService };
