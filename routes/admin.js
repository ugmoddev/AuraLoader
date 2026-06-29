const express = require('express');
const router = express.Router();
const db = require('../database/database');
const auth = require('../middlewares/auth');
const cache = require('../middlewares/cache');
const fs = require('fs');
const path = require('path');

// Admin middleware
router.use(auth.authenticate);
router.use(auth.requireRole(['admin']));

// System stats
router.get('/stats', async (req, res) => {
  try {
    const [users, scripts, loaders, logs, apiKeys] = await Promise.all([
      db.get('SELECT COUNT(*) as count FROM users'),
      db.get('SELECT COUNT(*) as count FROM scripts'),
      db.get('SELECT COUNT(*) as count FROM loaders'),
      db.get('SELECT COUNT(*) as count FROM logs'),
      db.get('SELECT COUNT(*) as count FROM apikeys')
    ]);

    const memory = process.memoryUsage();
    const uptime = process.uptime();

    res.json({
      success: true,
      data: {
        users: users.count,
        scripts: scripts.count,
        loaders: loaders.count,
        logs: logs.count,
        apiKeys: apiKeys.count,
        memory: {
          rss: Math.round(memory.rss / 1024 / 1024),
          heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
          heapUsed: Math.round(memory.heapUsed / 1024 / 1024)
        },
        uptime: Math.floor(uptime),
        cache: cache.getStats()
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

// Clear cache
router.post('/cache/clear', async (req, res) => {
  try {
    cache.clear();
    res.json({ success: true, message: 'Cache cleared successfully' });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// API Keys
router.post('/apikeys', async (req, res) => {
  try {
    const { owner, permissions } = req.body;
    const crypto = require('crypto');
    const apiKey = crypto.randomBytes(32).toString('hex');

    await db.run(`
      INSERT INTO apikeys (key, owner, permissions)
      VALUES (?, ?, ?)
    `, [apiKey, owner || req.user.username, permissions || 'read']);

    res.status(201).json({
      success: true,
      data: { key: apiKey, owner, permissions },
      message: 'API Key created successfully'
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

router.get('/apikeys', async (req, res) => {
  try {
    const keys = await db.query('SELECT * FROM apikeys ORDER BY createdAt DESC');
    res.json({ success: true, data: keys });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

router.delete('/apikeys/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM apikeys WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'API Key deleted successfully' });
  } catch (error) {
    console.error('Error deleting API key:', error);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

module.exports = router;
