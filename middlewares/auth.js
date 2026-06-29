const jwt = require('jsonwebtoken');
const db = require('../database/database');

class AuthMiddleware {
  async authenticate(req, res, next) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await db.get('SELECT * FROM users WHERE id = ?', [decoded.id]);

      if (!user || user.status !== 'active') {
        return res.status(401).json({ error: 'Invalid token' });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }

  requireRole(roles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      
      next();
    };
  }

  async checkApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    const key = await db.get('SELECT * FROM apikeys WHERE key = ? AND status = "active"', [apiKey]);
    if (!key) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    await db.run('UPDATE apikeys SET lastUsed = CURRENT_TIMESTAMP WHERE key = ?', [apiKey]);
    req.apiKey = key;
    next();
  }

  generateToken(user) {
    return jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }
}

module.exports = new AuthMiddleware();