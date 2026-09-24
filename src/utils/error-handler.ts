export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitter?: boolean;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 500;
  const maxDelayMs = options.maxDelayMs ?? 10_000;
  const jitter = options.jitter ?? true;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (
        attempt >= maxRetries ||
        (options.shouldRetry && !options.shouldRetry(error, attempt))
      ) {
        throw error;
      }

      const exponentialDelay = Math.min(
        baseDelayMs * 2 ** attempt,
        maxDelayMs
      );

      const jitterDelay = jitter
        ? Math.floor(Math.random() * Math.max(1, exponentialDelay * 0.25))
        : 0;

      await new Promise((resolve) =>
        setTimeout(resolve, exponentialDelay + jitterDelay)
      );
    }
  }

  throw lastError;
}

export async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  message = `Operation timed out after ${timeoutMs}ms`
): Promise<T> {
  if (timeoutMs <= 0) {
    throw new Error('Timeout must be greater than zero.');
  }

  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}
