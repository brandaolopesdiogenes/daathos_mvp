function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildRetryDelay(baseDelayMs, attempt) {
  const jitter = Math.floor(Math.random() * 100);
  return baseDelayMs * 2 ** attempt + jitter;
}

async function withRetry({ operation, maxRetries, baseDelayMs, shouldRetry, onRetry }) {
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const retryAllowed = attempt < maxRetries && shouldRetry(error);
      if (!retryAllowed) break;

      if (onRetry) {
        onRetry({ attempt: attempt + 1, error });
      }

      await wait(buildRetryDelay(baseDelayMs, attempt));
    }
  }

  throw lastError;
}

module.exports = { withRetry };
