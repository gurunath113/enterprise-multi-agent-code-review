import { describe, expect, it } from 'vitest';
import { withRetry, withTimeout } from '../src/utils/error-handler.js';
import { RateLimiter } from '../src/utils/rate-limiter.js';

describe('Error handling utilities', () => {
  it('withTimeout should resolve when operation completes in time', async () => {
    const result = await withTimeout(
      Promise.resolve('success'),
      1000
    );

    expect(result).toBe('success');
  });

  it('withTimeout should reject when operation exceeds timeout', async () => {
    const operation = new Promise<string>((resolve) => {
      setTimeout(() => resolve('too late'), 100);
    });

    await expect(
      withTimeout(operation, 10)
    ).rejects.toThrow('Operation timed out after 10ms');
  });

  it('withRetry should retry a failed operation and eventually succeed', async () => {
    let attempts = 0;

    const result = await withRetry(
      async () => {
        attempts += 1;

        if (attempts < 2) {
          throw new Error('temporary failure');
        }

        return 'success';
      },
      {
        maxRetries: 2,
        baseDelayMs: 1,
        maxDelayMs: 5,
        jitter: false,
      }
    );

    expect(result).toBe('success');
    expect(attempts).toBe(2);
  });
});

describe('RateLimiter', () => {
  it('should allow requests within configured limits', async () => {
    const limiter = new RateLimiter({
      requestsPerMinute: 2,
      tokensPerMinute: 100,
      maxConcurrent: 1,
      windowMs: 60_000,
    });

    await limiter.acquire(10);
    expect(limiter.canProceed(10)).toBe(false);
    limiter.release();
  });

  it('should release an active request', async () => {
    const limiter = new RateLimiter({
      requestsPerMinute: 2,
      tokensPerMinute: 100,
      maxConcurrent: 1,
      windowMs: 60_000,
    });

    await limiter.acquire(10);
    limiter.release();

    expect(limiter.canProceed(10)).toBe(true);
  });
});
