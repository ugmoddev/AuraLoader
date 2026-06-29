class CacheMiddleware {
  constructor() {
    this.cache = new Map();
    this.ttl = 5 * 60 * 1000; // 5 minutes
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  middleware(ttl = 5 * 60 * 1000) {
    this.ttl = ttl;
    return (req, res, next) => {
      const key = req.originalUrl || req.url;
      const cached = this.get(key);
      
      if (cached) {
        return res.json(cached);
      }
      
      const originalJson = res.json;
      res.json = (data) => {
        this.set(key, data);
        originalJson.call(res, data);
      };
      
      next();
    };
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

module.exports = new CacheMiddleware();