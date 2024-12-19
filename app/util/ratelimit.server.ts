import Redis from 'ioredis';
import { env } from '~/env';

const redis = new Redis(env.REDIS_URL);

// Rate-limiting configuration for token bucket
const CAPACITY = 10;  // Max requests allowed in a given period (e.g., 10 requests)
const REFILL_RATE = 1; // Tokens added per second
const TIME_WINDOW = 30; // Time window in seconds (1 minute)
const IP_CAPACITY = 2;  // Max requests allowed for IP (more restrictive than fingerprint)

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

    public async getTokenCount(userFingerprint: string, clientIP: string): Promise<boolean> {
        // Check fingerprint token bucket
        const fingerprintKey = `token_bucket:FP:${userFingerprint}`;
        let tokensFP = await redis.get(fingerprintKey);
        let lastRefillFP = await redis.get(`${fingerprintKey}:last_refill`);
      
        if (!tokensFP) {
          // Initialize fingerprint bucket with max capacity if it's not set
          await redis.setex(fingerprintKey, TIME_WINDOW, CAPACITY);
          await redis.set(`${fingerprintKey}:last_refill`, Date.now());
          tokensFP = `${CAPACITY}`;
        }
      
        // Safely parse tokensFP as a number
        let parsedTokensFP = parseInt(tokensFP);
        if (isNaN(parsedTokensFP)) {
          console.error(`Invalid token value for fingerprint ${userFingerprint}, resetting to capacity.`);
          parsedTokensFP = CAPACITY; // Reset to default capacity if parsing fails
          await redis.set(fingerprintKey, parsedTokensFP);
        }
      
        // Calculate the time passed since the last refill and refill tokens based on REFILL_RATE
        const timeSinceLastRefillFP = this.getTimeSinceLastRefill(parseInt(lastRefillFP!));
        const newTokensFP = Math.min(CAPACITY, parsedTokensFP + Math.floor(timeSinceLastRefillFP * REFILL_RATE));
        await redis.set(fingerprintKey, newTokensFP);
        await redis.set(`${fingerprintKey}:last_refill`, Date.now());
      
        if (newTokensFP > 0) {
          // Decrease one token for the fingerprint
          await redis.decr(fingerprintKey);
          return true; // Allow request based on fingerprint
        }
      
        // Check IP token bucket (more restrictive than fingerprint)
        const ipKey = `token_bucket:IP:${clientIP}`;
        let tokensIP = await redis.get(ipKey);
        let lastRefillIP = await redis.get(`${ipKey}:last_refill`);
      
        if (!tokensIP) {
          // Initialize IP bucket with smaller capacity if it's not set
          await redis.setex(ipKey, TIME_WINDOW, IP_CAPACITY);
          await redis.set(`${ipKey}:last_refill`, Date.now());
          tokensIP = `${IP_CAPACITY}`;
        }
      
        // Safely parse tokensIP as a number
        let parsedTokensIP = parseInt(tokensIP);
        if (isNaN(parsedTokensIP)) {
          console.error(`Invalid token value for IP ${clientIP}, resetting to capacity.`);
          parsedTokensIP = IP_CAPACITY; // Reset to default capacity if parsing fails
          await redis.set(ipKey, parsedTokensIP);
        }
      
        // Calculate the time passed since the last refill and refill tokens for IP
        const timeSinceLastRefillIP = this.getTimeSinceLastRefill(parseInt(lastRefillIP!));
        const newTokensIP = Math.min(IP_CAPACITY, parsedTokensIP + Math.floor(timeSinceLastRefillIP * REFILL_RATE));
        await redis.set(ipKey, newTokensIP);
        await redis.set(`${ipKey}:last_refill`, Date.now());
      
        if (newTokensIP > 0) {
          // Decrease one token for the IP
          await redis.decr(ipKey);
          return true; // Allow request based on IP
        }
      
        return false; // Reject request if both fingerprint and IP exceed limits
      }
    // Leaky Bucket Limiter for Client IP
    public async leakyBucketLimiter(clientIP: string): Promise<boolean> {
        const leakyBucketKey = `leaky_bucket:IP:${clientIP}`;
        let currentWaterLevel = await this.redis.get(leakyBucketKey);
        let lastLeak = await this.redis.get(`${leakyBucketKey}:last_leak`);

        if (!currentWaterLevel) {
            // Initialize leaky bucket with max capacity if it's not set
            await this.redis.setex(leakyBucketKey, TIME_WINDOW, LEAKY_BUCKET_CAPACITY);
            await this.redis.set(`${leakyBucketKey}:last_leak`, Date.now());
            currentWaterLevel = `${LEAKY_BUCKET_CAPACITY}`;
        }

        // Calculate time since the last leak and leak tokens based on LEAKY_BUCKET_RATE
        const timeSinceLastLeak = this.getTimeSinceLastRefill(parseInt(lastLeak!));
        const newWaterLevel = Math.max(0, parseInt(currentWaterLevel) - Math.floor(timeSinceLastLeak * LEAKY_BUCKET_RATE));
        await this.redis.set(leakyBucketKey, newWaterLevel);
        await this.redis.set(`${leakyBucketKey}:last_leak`, Date.now());

        if (newWaterLevel < LEAKY_BUCKET_CAPACITY) {
            // Allow request and increase water level
            await this.redis.incr(leakyBucketKey);
            return true;
        }

        return false; // Reject request if leaky bucket overflows
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
    public async handleTokenBucketRequest(userFingerprint: string, clientIP: string): Promise<boolean> {
        return await this.tokenBucketLimiter.getTokenCount(userFingerprint, clientIP);
    }

    // Use Leaky Bucket Limiter for client IP
    public async handleLeakyBucketRequest(clientIP: string): Promise<boolean> {
        return await this.leakyBucketLimiter.leakyBucketLimiter(clientIP);
    }
}

// Example usage
export const rateLimiterService = new RateLimiterService(redis);
