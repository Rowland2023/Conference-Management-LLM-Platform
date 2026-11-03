// src/shared/utils/retry.js

export async function withRetry(
  operation,
  {
    retries = 3,
    initialDelay = 100,
    factor = 2,
    maxDelay = 1000,
    onRetry = () => false,
  } = {}
) {
  let delay = initialDelay;

  for (let attempt = 1; ; attempt++) {
    try {
      return await operation();
    } catch (err) {
      const shouldRetry =
        attempt <= retries &&
        (await onRetry(err, attempt));

      if (!shouldRetry) {
        throw err;
      }

      await new Promise(resolve => setTimeout(resolve, delay));

      delay = Math.min(delay * factor, maxDelay);
    }
  }
}