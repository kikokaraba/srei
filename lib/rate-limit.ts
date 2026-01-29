import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const hasRedis =
  Boolean(process.env.UPSTASH_REDIS_REST_URL) && Boolean(process.env.UPSTASH_REDIS_REST_TOKEN);

// Initialize Redis only when both URL and token are set (avoids Upstash warning)
const redis = hasRedis
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

// Fallback rate limiter when Redis is not configured
const createFallbackLimiter = () => ({
  limit: async () => ({ success: true, limit: 100, remaining: 100, reset: Date.now() + 3600000 }),
});

// Rate limiter for API routes
export const apiRateLimiter = (() => {
  if (!redis) return createFallbackLimiter();
  try {
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, "1 h"), // 100 requests per hour
      analytics: true,
      prefix: "@upstash/ratelimit/api",
    });
  } catch {
    return createFallbackLimiter();
  }
})();

// Stricter limiter for analytics endpoints
export const analyticsRateLimiter = (() => {
  if (!redis) return createFallbackLimiter();
  try {
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(50, "1 h"), // 50 requests per hour
      analytics: true,
      prefix: "@upstash/ratelimit/analytics",
    });
  } catch {
    return createFallbackLimiter();
  }
})();
