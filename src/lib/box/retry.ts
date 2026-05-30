import { BoxApiError } from "box-node-sdk/sdk-gen/box/errors";

const DEFAULT_MAX_RETRIES = 3;

export function isRetryableBoxError(error: unknown): boolean {
  if (!(error instanceof BoxApiError)) {
    return false;
  }

  const statusCode = error.responseInfo.statusCode;
  return statusCode === 429 || statusCode >= 500;
}

export function getRetryDelayMs(error: unknown, attempt: number): number {
  if (error instanceof BoxApiError) {
    const headers = error.responseInfo.headers;
    const retryAfter = headers["retry-after"] ?? headers["Retry-After"];

    if (retryAfter) {
      const seconds = Number(retryAfter);
      if (Number.isFinite(seconds) && seconds >= 0) {
        return seconds * 1000;
      }
    }
  }

  return Math.min(1000 * 2 ** attempt, 30_000);
}

export async function withBoxRetries<T>(
  operation: () => Promise<T>,
  maxRetries = DEFAULT_MAX_RETRIES,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!isRetryableBoxError(error) || attempt === maxRetries) {
        throw error;
      }

      const delayMs = getRetryDelayMs(error, attempt);
      await sleep(delayMs);
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
