const express = require('express');
const router = express.Router();
const db = require('../database/database');
const auth = require('../middlewares/auth');
const cache = require('../middlewares/cache');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

// Database backup
router.post('/backup', async (req, res) => {
  try {
    const dbPath = path.join(__dirname, '..', 'database', 'database.db');
    const backupDir = path.join(__dirname, '..', 'storage', 'backups');
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupName = `backup_${Date.now()}.db`;
    const backupPath = path.join(backupDir, backupName);
    
    fs.copyFileSync(dbPath, backupPath);

    res.json({
      success: true,
      data: { backupName, backupPath },
      message: 'Backup created successfully'
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

// Get backup list
router.get('/backups', async (req, res) => {
  try {
    const backupDir = path.join(__dirname, '..', 'storage', 'backups');
    
    if (!fs.existsSync(backupDir)) {
      return res.json({ success: true, data: [] });
    }

    const files = fs.readdirSync(backupDir);
    const backups = files
      .filter(f => f.endsWith('.db'))
      .map(f => {
        const stats = fs.statSync(path.join(backupDir, f));
        return {
          name: f,
          size: stats.size,
          created: stats.birthtime
        };
      })
      .sort((a, b) => b.created - a.created);

    res.json({ success: true, data: backups });
  } catch (error) {
    console.error('Error fetching backups:', error);
    res.status(500).json({ error: 'Failed to fetch backups' });
  }
});

// Restore backup
router.post('/restore/:backupName', async (req, res) => {
  try {
    const backupName = req.params.backupName;
    const backupPath = path.join(__dirname, '..', 'storage', 'backups', backupName);
    const dbPath = path.join(__dirname, '..', 'database', 'database.db');

    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    fs.copyFileSync(backupPath, dbPath);

    res.json({
      success: true,
      message: 'Database restored successfully'
    });
  } catch (error) {
    console.error('Error restoring backup:', error);
    res.status(500).json({ error: 'Failed to restore backup' });
  }
});

// Get system logs
router.get('/logs', async (req, res) => {
  try {
    const logsDir = path.join(__dirname, '..', 'storage', 'logs');
    
    if (!fs.existsSync(logsDir)) {
      return res.json({ success: true, data: [] });
    }

    const files = fs.readdirSync(logsDir);
    const logs = files
      .filter(f => f.endsWith('.log'))
      .map(f => {
        const stats = fs.statSync(path.join(logsDir, f));
        return {
          name: f,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      })
      .sort((a, b) => b.created - a.created);

    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error fetching system logs:', error);
    res.status(500).json({ error: 'Failed to fetch system logs' });
  }
});

// Get specific log
router.get('/logs/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const logPath = path.join(__dirname, '..', 'storage', 'logs', filename);

    if (!fs.existsSync(logPath)) {
      return res.status(404).json({ error: 'Log file not found' });
    }

    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    const lastLines = lines.slice(-1000); // Last 1000 lines

    res.json({
      success: true,
      data: {
        filename,
        size: fs.statSync(logPath).size,
        content: lastLines.join('\n'),
        totalLines: lines.length
      }
    });
  } catch (error) {
    console.error('Error fetching log:', error);
    res.status(500).json({ error: 'Failed to fetch log' });
  }
});

// Maintenance mode
router.post('/maintenance', async (req, res) => {
  try {
    const { enabled } = req.body;
    const value = enabled ? 'true' : 'false';

    await db.run(`
      INSERT OR REPLACE INTO settings (key, value)
      VALUES ('maintenance', ?)
    `, [value]);

    res.json({
      success: true,
      message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`
    });
  } catch (error) {
    console.error('Error toggling maintenance:', error);
    res.status(500).json({ error: 'Failed to toggle maintenance mode' });
  }
});

module.exports = router;