import Redis from "ioredis";
import { env } from "~/env";

const redis = new Redis(env.REDIS_URL);

// Rate-limiting configuration for token bucket
const CAPACITY = 10; // Max requests allowed in a given period (e.g., 10 requests)
const REFILL_RATE = 1; // Tokens added per second
const TIME_WINDOW = 30; // Time window in seconds (1 minute)
const IP_CAPACITY = 2; // Max requests allowed for IP (more restrictive than fingerprint)

// Rate-limiting configuration for leaky bucket (for IP-based limiting)
const LEAKY_BUCKET_CAPACITY = 5; // Max allowed leaks
const LEAKY_BUCKET_RATE = 1; // Tokens leak per second (e.g., leak 1 token every second)

class RateLimiter {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  // Helper function to get time difference since last refill
  private getTimeSinceLastRefill(lastRefill: number): number {
    return (Date.now() - lastRefill) / 1000; // In seconds
  }

  public async getTokenCount(
    userFingerprint: string,
    clientIP: string,
  ): Promise<boolean> {
    // Check fingerprint token bucket
    const fingerprintKey = `token_bucket:FP:${userFingerprint}`;
    let tokensFP = await redis.get(fingerprintKey);
    let lastRefillFP = await redis.get(`${fingerprintKey}:last_refill`);

    // For first-time visitors, initialize with max capacity and return true immediately
    if (!tokensFP) {
      await redis.setex(fingerprintKey, TIME_WINDOW, CAPACITY);
      await redis.set(`${fingerprintKey}:last_refill`, Date.now());
      return true; // Allow first request without decrementing
    }

    // Safely parse tokensFP as a number
    let parsedTokensFP = parseInt(tokensFP);
    if (isNaN(parsedTokensFP)) {
      console.error(
        `Invalid token value for fingerprint ${userFingerprint}, resetting to capacity.`,
      );
      parsedTokensFP = CAPACITY;
      await redis.set(fingerprintKey, parsedTokensFP);
    }

    // Handle the case where lastRefillFP is null
    const lastRefillTime = lastRefillFP ? parseInt(lastRefillFP) : Date.now();
    const timeSinceLastRefillFP = this.getTimeSinceLastRefill(lastRefillTime);

    const newTokensFP = Math.min(
      CAPACITY,
      parsedTokensFP + Math.floor(timeSinceLastRefillFP * REFILL_RATE),
    );
    await redis.set(fingerprintKey, newTokensFP);
    await redis.set(`${fingerprintKey}:last_refill`, Date.now());

    if (newTokensFP > 0) {
      await redis.decr(fingerprintKey);
      return true;
    }

    // Check IP token bucket
    const ipKey = `token_bucket:IP:${clientIP}`;
    let tokensIP = await redis.get(ipKey);
    let lastRefillIP = await redis.get(`${ipKey}:last_refill`);

    // For first-time IP, initialize with max capacity and return true immediately
    if (!tokensIP) {
      await redis.setex(ipKey, TIME_WINDOW, IP_CAPACITY);
      await redis.set(`${ipKey}:last_refill`, Date.now());
      return true; // Allow first request without decrementing
    }

    // Safely parse tokensIP as a number
    let parsedTokensIP = parseInt(tokensIP);
    if (isNaN(parsedTokensIP)) {
      console.error(
        `Invalid token value for IP ${clientIP}, resetting to capacity.`,
      );
      parsedTokensIP = IP_CAPACITY;
      await redis.set(ipKey, parsedTokensIP);
    }

    // Handle the case where lastRefillIP is null
    const lastRefillTimeIP = lastRefillIP ? parseInt(lastRefillIP) : Date.now();
    const timeSinceLastRefillIP = this.getTimeSinceLastRefill(lastRefillTimeIP);

    const newTokensIP = Math.min(
      IP_CAPACITY,
      parsedTokensIP + Math.floor(timeSinceLastRefillIP * REFILL_RATE),
    );
    await redis.set(ipKey, newTokensIP);
    await redis.set(`${ipKey}:last_refill`, Date.now());

    if (newTokensIP > 0) {
      await redis.decr(ipKey);
      return true;
    }

    return false;
  }

  // Also fixing the leaky bucket limiter
  public async leakyBucketLimiter(clientIP: string): Promise<boolean> {
    const leakyBucketKey = `leaky_bucket:IP:${clientIP}`;
    let currentWaterLevel = await this.redis.get(leakyBucketKey);
    let lastLeak = await this.redis.get(`${leakyBucketKey}:last_leak`);

    if (!currentWaterLevel) {
      // Initialize leaky bucket with 0 for first-time visitors
      await this.redis.setex(leakyBucketKey, TIME_WINDOW, 0);
      await this.redis.set(`${leakyBucketKey}:last_leak`, Date.now());
      return true; // Allow first request
    }

    // Handle the case where lastLeak is null
    const lastLeakTime = lastLeak ? parseInt(lastLeak) : Date.now();
    const timeSinceLastLeak = this.getTimeSinceLastRefill(lastLeakTime);

    const newWaterLevel = Math.max(
      0,
      parseInt(currentWaterLevel) -
        Math.floor(timeSinceLastLeak * LEAKY_BUCKET_RATE),
    );
    await this.redis.set(leakyBucketKey, newWaterLevel);
    await this.redis.set(`${leakyBucketKey}:last_leak`, Date.now());

    if (newWaterLevel < LEAKY_BUCKET_CAPACITY) {
      await this.redis.incr(leakyBucketKey);
      return true;
    }

    return false;
  }
}

export default class RateLimiterService {
  private tokenBucketLimiter: RateLimiter;
  private leakyBucketLimiter: RateLimiter;

  constructor(redis: Redis) {
    this.tokenBucketLimiter = new RateLimiter(redis);
    this.leakyBucketLimiter = new RateLimiter(redis);
  }

  // Use Token Bucket Limiter for user fingerprint and IP
  public async handleTokenBucketRequest(
    userFingerprint: string,
    clientIP: string,
  ): Promise<boolean> {
    return await this.tokenBucketLimiter.getTokenCount(
      userFingerprint,
      clientIP,
    );
  }

  // Use Leaky Bucket Limiter for client IP
  public async handleLeakyBucketRequest(clientIP: string): Promise<boolean> {
    return await this.leakyBucketLimiter.leakyBucketLimiter(clientIP);
  }
}

// Example usage
export const rateLimiterService = new RateLimiterService(redis);
