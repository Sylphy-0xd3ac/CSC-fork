// rate-limiter.ts

// —— Type —— //
export type IntervalType =
  | number
  | "sec"
  | "second"
  | "min"
  | "minute"
  | "hr"
  | "hour"
  | "day";

// Define the expected structure for rate limiter configuration
export interface RateLimiterConfig {
  perIp: {
    limit: number;           // Exponential decay threshold
    halfScoreTime: number;   // Exponential decay half-life time (ms)
    rlTokens: number;        // Token bucket capacity / tokens per interval
    rlInterval: IntervalType; // Token bucket interval
  };
  global: {
    globalTimeRange: number; // Sliding window time range (ms) for global rate
  };
}

// —— 工具函数 —— //
function nowMs(): number {
  // Date.now() is available in browsers and node
  return Date.now();
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseInterval(i: IntervalType): number {
  if (typeof i === 'number') return i;
  switch (i) {
    case 'sec':
    case 'second':
      return 1_000;
    case 'min':
    case 'minute':
      return 60_000;
    case 'hr':
    case 'hour':
      return 3_600_000;
    case 'day':
      return 86_400_000;
    default:
      // Throw an error for invalid interval strings during parsing
      throw new Error(`Invalid interval string: ${i}`);
  }
}


// —— 配置 & 状态 —— //

// Module-level configuration variable, initialized by run()
let moduleConfig: RateLimiterConfig | null = null;

/** IP 对应的指数衰减计分记录 */
type ScoreRecord = { lastRateTime: number; score: number };
const ipScoreRecords: Record<string, ScoreRecord> = Object.create(null);

/** IP 对应的 RateLimiter 实例 */
const ipRateLimiters = new Map<string, RateLimiter>();

// 全局滑动窗口统计状态
let lastGlobalTime: number = Date.now(); // Use Date.now for global time range consistency
let globalScore: number = 0;


// —— TokenBucket —— //
export class TokenBucket {
  private bucketSize: number;
  private tokensPerInterval: number;
  private interval: number; // Interval in milliseconds
  private parentBucket?: TokenBucket;
  private content: number;
  private lastDrip: number;

  constructor(opts: {
    bucketSize: number;
    tokensPerInterval: number;
    interval: IntervalType;
    parentBucket?: TokenBucket;
  }) {
    this.bucketSize = opts.bucketSize;
    this.tokensPerInterval = opts.tokensPerInterval;
    // Ensure interval is parsed correctly at construction
    this.interval = parseInterval(opts.interval);
    if (this.interval <= 0 && this.tokensPerInterval > 0) {
        throw new Error("Interval must be positive if tokensPerInterval is positive");
    }
    if (this.tokensPerInterval < 0 || this.bucketSize < 0) {
        throw new Error("tokensPerInterval and bucketSize cannot be negative");
    }

    this.parentBucket = opts.parentBucket;
    // Start with a full bucket
    this.content = this.bucketSize;
    this.lastDrip = nowMs();
  }

  /** Adds new tokens to the bucket based on elapsed time (private) */
  private drip(): void {
    if (this.tokensPerInterval <= 0) {
      // Refill rate is 0 or negative, content doesn't increase automatically.
      // Or, if bucketSize is 0 (infinite capacity/rate), content remains conceptually infinite.
       if (this.bucketSize === 0) this.content = Infinity;
       // If tokensPerInterval is 0, content only decreases.
      return;
    }
     if (this.interval <= 0) {
         // Should have been caught by constructor, but defensively handle
         this.content = this.bucketSize; // Effectively infinite rate if interval is zero/negative
         return;
     }

    const now = nowMs();
    const delta = Math.max(0, now - this.lastDrip);
    this.lastDrip = now;
    // Calculate tokens to add: (elapsed time / interval duration) * tokens per interval
    const add = (delta / this.interval) * this.tokensPerInterval;
    this.content = Math.min(this.bucketSize, this.content + add);
  }

  /**
   * Asynchronously removes 'count' tokens. Waits if necessary.
   * @returns The remaining tokens after removal.
   * @throws Error if count exceeds bucketSize.
   */
  async removeTokens(count: number): Promise<number> {
    if (this.bucketSize === 0) return Infinity; // Infinite bucket

    if (count <= 0) return this.content; // Removing 0 or negative tokens does nothing

    if (count > this.bucketSize) {
      throw new Error(
        `Requested ${count} tokens exceeds bucketSize ${this.bucketSize}`
      );
    }

    // Ensure calculations use positive interval and tokensPerInterval
    if (this.interval <= 0 || this.tokensPerInterval <= 0) {
        // Cannot replenish, only check current content
         this.drip(); // Update content (might not change if tokensPerInterval <= 0)
         if(count <= this.content){
             if (this.parentBucket) {
                await this.parentBucket.removeTokens(count); // Wait for parent if needed
             }
             this.content -= count;
             return this.content;
         } else {
             // Cannot fulfill request and cannot wait for replenishment
             throw new Error(`Not enough tokens (${this.content}) to remove ${count}, and bucket does not replenish.`);
         }
    }


    // If there's a parent bucket, attempt to reserve tokens there first.
    // This is complex. A simpler model is often to check the parent *only if* the current bucket needs to wait.
    // Let's adjust the logic slightly: check parent *before* waiting locally.
    if (this.parentBucket) {
        // Try to reserve in parent first. If parent needs to wait, this call will handle it.
       await this.parentBucket.removeTokens(count);
        // If the above didn't throw, parent has or will have the tokens. Now handle this bucket.
    }


    this.drip(); // Refresh content before checking

    if (count <= this.content) {
      // Enough tokens available now
      this.content -= count;
      // If parent was handled, return this bucket's content. Parent's remaining content isn't directly relevant here.
      return this.content;
    }

    // Not enough tokens, calculate wait time
     const needed = count - this.content;
     const waitMs = Math.ceil((needed * this.interval) / this.tokensPerInterval);

     await wait(waitMs);

     // After waiting, drip again and recursively call removeTokens to ensure atomicity
     // and handle potential race conditions or changes during the wait.
     return this.removeTokens(count);

     /*
     // Alternative non-recursive approach after wait:
     await wait(waitMs);
     this.drip(); // Drip again after wait
     if (count <= this.content) {
         this.content -= count;
         return this.content;
     } else {
         // Should not happen if waitMs was calculated correctly and no other consumers interfered significantly
         // Or could happen if parent couldn't fulfill after all.
         // Consider how to handle this - maybe throw?
         console.warn(`TokenBucket: Still not enough tokens after waiting. Needed ${count}, have ${this.content}`);
         // For robustness, could retry or throw
         throw new Error(`Failed to acquire ${count} tokens after waiting.`);
     }
     */
  }


  /**
   * Synchronously attempts to remove 'count' tokens.
   * @returns boolean indicating success.
   */
  tryRemoveTokens(count: number): boolean {
    if (this.bucketSize === 0) return true; // Infinite bucket always succeeds

    if (count <= 0) return true; // Removing 0 or negative is always possible

    if (count > this.bucketSize) return false; // Request exceeds capacity


    this.drip(); // Refresh content


    // Check parent first *without consuming* if this bucket doesn't have enough.
    // A simpler, common pattern: Check parent *only if* this bucket *has* enough.
     if (count > this.content) {
        return false; // Not enough tokens locally, fail fast
     }


    // Check if parent has enough (if parent exists)
    if (this.parentBucket) {
        if (!this.parentBucket.tryRemoveTokens(count)) {
             return false; // Parent doesn't have enough, so fail.
        }
        // If parent succeeded, it has already reduced its content.
    }


    // If we reached here, either no parent or parent succeeded. Deduct from local.
     this.content -= count;
     return true;
  }

    /**
    * Gets the current number of tokens available.
    */
    getTokensRemaining(): number {
        this.drip();
        return this.content;
    }

    /**
     * Gets the configured interval in milliseconds.
     */
    getInterval(): number {
        return this.interval;
    }

    /**
     * Gets the configured tokens per interval.
     */
    getTokensPerInterval(): number {
        return this.tokensPerInterval;
    }
}


// —— RateLimiter (Sliding Window variant) —— //
export class RateLimiter {
  private tokenBucket: TokenBucket; // Underlying bucket for burst capacity
  private curIntervalStart: number;
  private tokensThisInterval: number; // Tokens consumed in the current *sliding* window
  private fireImmediately: boolean; // If true, fails immediately on rate limit instead of waiting

  constructor(opts: {
    tokensPerInterval: number;
    interval: IntervalType;
    fireImmediately?: boolean;
  }) {
    // The bucket size matches tokensPerInterval, allowing bursts up to one interval's worth.
    this.tokenBucket = new TokenBucket({
      bucketSize: opts.tokensPerInterval,
      tokensPerInterval: opts.tokensPerInterval,
      interval: opts.interval,
    });

    // No need to manually fill, TokenBucket constructor starts full.
    // this.tokenBucket['content'] = opts.tokensPerInterval; // Avoid direct access

    this.curIntervalStart = nowMs();
    this.tokensThisInterval = 0;
    this.fireImmediately = !!opts.fireImmediately;
  }

  /**
   * Asynchronously removes 'count' tokens, respecting the sliding window limit.
   * Waits if the limit for the current interval is exceeded, unless fireImmediately is true.
   * @returns Remaining tokens in the underlying bucket, or -1 if rate limited immediately.
   * @throws Error if count exceeds bucket capacity.
   */
  async removeTokens(count: number): Promise<number> {
     // Delegate basic checks (count > bucketSize) to tokenBucket
     // This RateLimiter adds the sliding window logic on top.
    const tokensPerInterval = this.tokenBucket.getTokensPerInterval();

    let remaining: number;
    try {
      remaining = await this.tokenBucket.removeTokens(count);
    } catch (error: any) {
      // Handle the error from the token bucket
      if (error.message.includes('exceeds bucketSize')) {
        // Log the error or handle it as needed
        console.warn(`RateLimiter: Requested tokens exceed bucket size.`);
        return -1;
      }
      throw error;
    }
    if (remaining !== Infinity && count <= tokensPerInterval) {
      // Avoid incrementing if bucket is infinite or request too large
      this.tokensThisInterval += count;
    }
    return remaining;
  }

  /**
   * Synchronously attempts to remove 'count' tokens using the underlying bucket.
   * @returns boolean indicating success.
   */
  public tryRemoveTokens(count: number): boolean {
    // Delegate to the internal token bucket's synchronous check
    return this.tokenBucket.tryRemoveTokens(count);
  }
} // <-- Add missing closing brace for RateLimiter class


// —— 对外接口 —— //

/** Throws an error if the rate limiter hasn't been configured via run() */
function ensureConfigured(): void {
    if (!moduleConfig) {
        throw new Error('Rate limiter module not initialized. Call run() with configuration first.');
    }
}


/**
 * Checks if a request from a given IP address should be allowed based on configured limits.
 * Uses both exponential decay scoring and a token bucket/rate limiter.
 *
 * @param remoteAddress - The IP address of the client.
 * @param score - The score increment for this request (default: 1).
 * @returns true if the request is rate-limited (denied), false otherwise (allowed).
 */
export function checkAddress(remoteAddress: string, score: number = 1): boolean {
  ensureConfigured();
  // Cast is safe here due to ensureConfigured() check
  const config = moduleConfig!;
  const now = Date.now(); // Use Date.now consistent with global rate limit

  // --- Exponential Decay Score Check ---
  let record = ipScoreRecords[remoteAddress];
  if (!record) {
    record = { lastRateTime: now, score: 0 };
    ipScoreRecords[remoteAddress] = record;
  }

  const timeDelta = now - record.lastRateTime;
  // Avoid issues with division by zero or very small halfScoreTime
  const decayFactor = config.perIp.halfScoreTime > 0
                      ? Math.pow(2, -timeDelta / config.perIp.halfScoreTime)
                      : 0; // Instant decay if halfScoreTime is 0 or less

  record.score *= decayFactor;
  record.score += score;
  record.lastRateTime = now;

  const exceededByScore = record.score >= config.perIp.limit;

  // --- Token Bucket / Rate Limiter Check ---
  let limiter = ipRateLimiters.get(remoteAddress);
  if (!limiter) {
    limiter = new RateLimiter({
      tokensPerInterval: config.perIp.rlTokens,
      interval: config.perIp.rlInterval,
      fireImmediately: true, // checkAddress is synchronous, so must fire immediately
    });
    ipRateLimiters.set(remoteAddress, limiter);
  }

  // tryRemoveTokens returns true if allowed, false if denied/limited.
  // We want checkAddress to return true if *denied*.
  const deniedByRateLimit = !limiter.tryRemoveTokens(1); // Check for 1 token (representing 1 request)

  // Return true (limited) if *either* method triggers.
  return exceededByScore || deniedByRateLimit;
}

/**
 * Increases the global request counter using a sliding window with decay.
 * Call this for every request being tracked globally.
 */
export function increaseGlobalRate(): void {
  ensureConfigured();
  const config = moduleConfig!;
  const now = Date.now();
  const T = config.global.globalTimeRange; // Window duration in ms

  if (T <= 0) return; // Avoid division by zero or nonsensical calculations

  const delta = now - lastGlobalTime;

  if (delta < 0) {
      // Clock moved backwards, reset score? Or ignore? Resetting seems safer.
      globalScore = 1;
  } else if (delta < T) {
    // Apply decay based on elapsed fraction of the window
    globalScore = globalScore * (1 - delta / T) + 1;
  } else {
    // Previous score completely decayed, start new score
    globalScore = 1;
  }
  lastGlobalTime = now;
}

/**
 * Gets the estimated current global frequency (e.g., requests per minute).
 * @returns Global frequency in requests per minute.
 */
export function getFrequency(): number {
  ensureConfigured();
  const config = moduleConfig!;
  const T = config.global.globalTimeRange;

  if (T <= 0) {
    return Infinity; // Or 0, depending on interpretation. Infinite seems appropriate for 0 time range.
  }

   // Apply decay one last time before calculating frequency based on current time
   const now = Date.now();
   const delta = now - lastGlobalTime;
   let currentTheoreticalScore = globalScore;
   if (delta >= 0 && delta < T){
        currentTheoreticalScore = globalScore * (1-delta/T);
   } else if (delta >= T) {
       currentTheoreticalScore = 0; // Score has fully decayed
   }
   // else (delta < 0) -> clock skew, use last known score? Or currentTheoreticalScore = globalScore;

  // Convert score (representing requests within T ms) to requests per minute
  const requestsPerMinute = currentTheoreticalScore * (60_000 / T);
  return requestsPerMinute;
}


/**
 * Initializes the rate limiter module with configuration and attaches functions to core.
 */
export async function run(hazel: any, core: any, hold: any) {
  // Basic validation (can be expanded)
  const config = core.config.rateLimiter;

  moduleConfig = config as RateLimiterConfig;

  // Initialize global time if starting fresh
  lastGlobalTime = Date.now();
  globalScore = 0;

  // Attach functions to the core object
  core.checkAddress = checkAddress;
  core.getFrequency = getFrequency;
  core.increaseGlobalRate = increaseGlobalRate;
}

export const name = "rate-limiter";
export const dependencies :string[] = ["app-config"];
