export interface RateLimiterConfig {
  requestsPerMinute?: number;
  tokensPerMinute?: number;
  maxConcurrent?: number;
  windowMs?: number;
}

interface RequestRecord {
  timestamp: number;
  tokens: number;
}

export class RateLimiter {
  private readonly requestsPerMinute: number;
  private readonly tokensPerMinute: number;
  private readonly maxConcurrent: number;
  private readonly windowMs: number;

  private requestHistory: RequestRecord[] = [];
  private activeRequests = 0;

  constructor(config: RateLimiterConfig = {}) {
    this.requestsPerMinute = config.requestsPerMinute ?? 60;
    this.tokensPerMinute = config.tokensPerMinute ?? 100_000;
    this.maxConcurrent = config.maxConcurrent ?? 5;
    this.windowMs = config.windowMs ?? 60_000;
  }

  async acquire(estimatedTokens = 0): Promise<void> {
    await this.waitForSlot(estimatedTokens);
    this.activeRequests++;

    this.requestHistory.push({
      timestamp: Date.now(),
      tokens: Math.max(0, estimatedTokens),
    });
  }

  release(): void {
    if (this.activeRequests > 0) {
      this.activeRequests--;
    }

    const lastRequest =
      this.requestHistory[this.requestHistory.length - 1];

    if (lastRequest && this.requestHistory.length > 1000) {
      this.requestHistory.shift();
    }
  }

  canProceed(estimatedTokens = 0): boolean {
    this.pruneOldRecords();

    const requestCount = this.requestHistory.length;
    const tokenCount = this.requestHistory.reduce(
      (total, record) => total + record.tokens,
      0
    );

    return (
      requestCount < this.requestsPerMinute &&
      tokenCount + Math.max(0, estimatedTokens) <= this.tokensPerMinute &&
      this.activeRequests < this.maxConcurrent
    );
  }

  private async waitForSlot(estimatedTokens = 0): Promise<void> {
    while (!this.canProceed(estimatedTokens)) {
      await this.waitForRateLimit(estimatedTokens);
    }
  }

  private async waitForRateLimit(
    estimatedTokens = 0
  ): Promise<void> {
    this.pruneOldRecords();

    const now = Date.now();

    if (this.activeRequests >= this.maxConcurrent) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return;
    }

    const requestCount = this.requestHistory.length;
    const tokenCount = this.requestHistory.reduce(
      (total, record) => total + record.tokens,
      0
    );

    let waitMs = 100;

    if (requestCount >= this.requestsPerMinute) {
      const oldest = this.requestHistory[0];

      if (oldest) {
        waitMs = Math.max(
          50,
          oldest.timestamp + this.windowMs - now + 10
        );
      }
    } else if (
      tokenCount + Math.max(0, estimatedTokens) >
      this.tokensPerMinute
    ) {
      const oldest = this.requestHistory[0];

      if (oldest) {
        waitMs = Math.max(
          50,
          oldest.timestamp + this.windowMs - now + 10
        );
      }
    }

    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  private pruneOldRecords(): void {
    const cutoff = Date.now() - this.windowMs;

    this.requestHistory = this.requestHistory.filter(
      (record) => record.timestamp > cutoff
    );
  }
}

export async function withRateLimit<T>(
  limiter: RateLimiter,
  operation: () => Promise<T>,
  estimatedTokens = 0
): Promise<T> {
  await limiter.acquire(estimatedTokens);

  try {
    return await operation();
  } finally {
    limiter.release();
  }
}
