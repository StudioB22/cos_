import { AppError } from '../http/app-error.js';

interface RateWindow {
  count: number;
  startedAt: number;
}

export class WindowRateLimiter {
  private readonly windows = new Map<string, RateWindow>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly errorCode: string,
    private readonly message: string,
  ) {}

  hit(key: string) {
    const now = Date.now();
    const current = this.windows.get(key);

    if (!current || now - current.startedAt > this.windowMs) {
      this.windows.set(key, { count: 1, startedAt: now });
      return;
    }

    if (current.count >= this.limit) {
      throw new AppError(this.errorCode, this.message, 429);
    }

    current.count += 1;
  }
}
