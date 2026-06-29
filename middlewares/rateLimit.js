const rateLimit = require('express-rate-limit');

class RateLimiter {
  global() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100,
      message: { error: 'Too many requests, please try again later.' }
    });
  }

  api() {
    return rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 60,
      message: { error: 'API rate limit exceeded.' }
    });
  }

  cdn() {
    return rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 30,
      message: { error: 'CDN rate limit exceeded.' }
    });
  }

  auth() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5,
      message: { error: 'Too many authentication attempts.' }
    });
  }
}

module.exports = new RateLimiter();