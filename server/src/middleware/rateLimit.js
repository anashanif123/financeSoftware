import rateLimit from 'express-rate-limit';

// General API limiter.
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many requests, please slow down.' } },
});

// Stricter limiter for auth endpoints (brute-force protection).
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many attempts, try again later.' } },
});
