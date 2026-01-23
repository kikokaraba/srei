import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize Redis client with proper error handling
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

// Fallback rate limiter if Redis is not available
const createFallbackLimiter = () => {
  return {
    limit: async () => ({ success: true, limit: 100, remaining: 100, reset: Date.now() + 3600000 }),
  };
};

// Rate limiter for API routes
export const apiRateLimiter = (() => {
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
