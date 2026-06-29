const express = require('express');
const router = express.Router();
const db = require('../database/database');
const auth = require('../middlewares/auth');
const logger = require('../middlewares/logger');
const rateLimit = require('../middlewares/rateLimit');
const cache = require('../middlewares/cache');
const crypto = require('crypto');

// Get all scripts
router.get('/scripts', rateLimit.api(), cache.middleware(), async (req, res) => {
  try {
    const { search, category, enabled, sort, page = 1, limit = 20 } = req.query;
    let sql = 'SELECT * FROM scripts WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND (name LIKE ? OR author LIKE ? OR description LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (enabled !== undefined) {
      sql += ' AND enabled = ?';
      params.push(parseInt(enabled));
    }

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countResult = await db.get(countSql, params);
    const total = countResult?.total || 0;

    const offset = (page - 1) * limit;
    sql += ' ORDER BY ' + (sort || 'createdAt DESC');
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const scripts = await db.query(sql, params);

    res.json({
      success: true,
      data: scripts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching scripts:', error);
    res.status(500).json({ error: 'Failed to fetch scripts' });
  }
});

// Get single script
router.get('/scripts/:id', async (req, res) => {
  try {
    const script = await db.get('SELECT * FROM scripts WHERE id = ? OR uuid = ?', [
      req.params.id,
      req.params.id
    ]);

    if (!script) {
      return res.status(404).json({ error: 'Script not found' });
    }

    res.json({ success: true, data: script });
  } catch (error) {
    console.error('Error fetching script:', error);
    res.status(500).json({ error: 'Failed to fetch script' });
  }
});

// Create script
router.post('/scripts', auth.authenticate, auth.requireRole(['admin', 'moderator']), async (req, res) => {
  try {
    const { name, author, description, version, source, category, tags } = req.body;

    if (!name || !source) {
      return res.status(400).json({ error: 'Name and source are required' });
    }

    const uuid = crypto.randomBytes(4).toString('hex');
    const result = await db.run(`
      INSERT INTO scripts (uuid, name, author, description, version, source, category, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [uuid, name, author || 'Unknown', description || '', version || '1.0.0', source, category || 'general', tags || '']);

    const script = await db.get('SELECT * FROM scripts WHERE id = ?', [result.lastID]);

    res.status(201).json({
      success: true,
      data: script,
      message: 'Script created successfully'
    });
  } catch (error) {
    console.error('Error creating script:', error);
    res.status(500).json({ error: 'Failed to create script' });
  }
});

// Update script
router.put('/scripts/:id', auth.authenticate, auth.requireRole(['admin', 'moderator']), async (req, res) => {
  try {
    const { name, author, description, version, source, enabled, category, tags } = req.body;
    const scriptId = req.params.id;

    const existing = await db.get('SELECT * FROM scripts WHERE id = ? OR uuid = ?', [scriptId, scriptId]);
    if (!existing) {
      return res.status(404).json({ error: 'Script not found' });
    }

    // Save version history
    if (source && source !== existing.source) {
      await db.run(`
        INSERT INTO script_versions (scriptId, version, source, changes)
        VALUES (?, ?, ?, ?)
      `, [existing.id, version || existing.version, existing.source, 'Version update']);
    }

    await db.run(`
      UPDATE scripts 
      SET name = ?, author = ?, description = ?, version = ?, 
          source = ?, enabled = ?, category = ?, tags = ?,
          updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      name || existing.name,
      author || existing.author,
      description || existing.description,
      version || existing.version,
      source || existing.source,
      enabled !== undefined ? parseInt(enabled) : existing.enabled,
      category || existing.category,
      tags || existing.tags,
      existing.id
    ]);

    const updated = await db.get('SELECT * FROM scripts WHERE id = ?', [existing.id]);

    res.json({
      success: true,
      data: updated,
      message: 'Script updated successfully'
    });
  } catch (error) {
    console.error('Error updating script:', error);
    res.status(500).json({ error: 'Failed to update script' });
  }
});

// Delete script
router.delete('/scripts/:id', auth.authenticate, auth.requireRole(['admin']), async (req, res) => {
  try {
    const scriptId = req.params.id;
    const script = await db.get('SELECT * FROM scripts WHERE id = ? OR uuid = ?', [scriptId, scriptId]);

    if (!script) {
      return res.status(404).json({ error: 'Script not found' });
    }

    // Delete related loaders
    await db.run('DELETE FROM loaders WHERE scriptId = ?', [script.id]);
    await db.run('DELETE FROM script_versions WHERE scriptId = ?', [script.id]);
    await db.run('DELETE FROM scripts WHERE id = ?', [script.id]);

    res.json({
      success: true,
      message: 'Script and related data deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting script:', error);
    res.status(500).json({ error: 'Failed to delete script' });
  }
});

// Get all loaders
router.get('/loaders', async (req, res) => {
  try {
    const loaders = await db.query(`
      SELECT l.*, s.name as scriptName, s.uuid as scriptUuid
      FROM loaders l
      LEFT JOIN scripts s ON l.scriptId = s.id
      ORDER BY l.createdAt DESC
    `);
    res.json({ success: true, data: loaders });
  } catch (error) {
    console.error('Error fetching loaders:', error);
    res.status(500).json({ error: 'Failed to fetch loaders' });
  }
});

// Get single loader
router.get('/loaders/:id', async (req, res) => {
  try {
    const loader = await db.get(`
      SELECT l.*, s.name as scriptName, s.uuid as scriptUuid
      FROM loaders l
      LEFT JOIN scripts s ON l.scriptId = s.id
      WHERE l.loaderId = ? OR l.id = ?
    `, [req.params.id, req.params.id]);

    if (!loader) {
      return res.status(404).json({ error: 'Loader not found' });
    }

    res.json({ success: true, data: loader });
  } catch (error) {
    console.error('Error fetching loader:', error);
    res.status(500).json({ error: 'Failed to fetch loader' });
  }
});

// Create loader
router.post('/loaders', auth.authenticate, auth.requireRole(['admin', 'moderator']), async (req, res) => {
  try {
    const { scriptId, version } = req.body;

    if (!scriptId) {
      return res.status(400).json({ error: 'Script ID is required' });
    }

    // Find script by id or uuid
    let script = await db.get('SELECT * FROM scripts WHERE id = ? OR uuid = ?', [scriptId, scriptId]);
    if (!script) {
      return res.status(404).json({ error: 'Script not found' });
    }

    const loaderId = crypto.randomBytes(4).toString('hex');
    const secret = crypto.randomBytes(16).toString('hex');

    const result = await db.run(`
      INSERT INTO loaders (loaderId, scriptId, secret, version)
      VALUES (?, ?, ?, ?)
    `, [loaderId, script.id, secret, version || script.version || '1.0.0']);

    const loader = await db.get(`
      SELECT l.*, s.name as scriptName, s.uuid as scriptUuid
      FROM loaders l
      LEFT JOIN scripts s ON l.scriptId = s.id
      WHERE l.id = ?
    `, [result.lastID]);

    res.status(201).json({
      success: true,
      data: loader,
      message: 'Loader created successfully'
    });
  } catch (error) {
    console.error('Error creating loader:', error);
    res.status(500).json({ error: 'Failed to create loader' });
  }
});

// Get statistics
router.get('/statistics', async (req, res) => {
  try {
    const [scripts, loaders, users, executionsToday, executionsMonth, apiCalls] = await Promise.all([
      db.get('SELECT COUNT(*) as count FROM scripts'),
      db.get('SELECT COUNT(*) as count FROM loaders'),
      db.get('SELECT COUNT(*) as count FROM users WHERE status = "active"'),
      db.get('SELECT COUNT(*) as count FROM logs WHERE DATE(createdAt) = DATE("now")'),
      db.get('SELECT COUNT(*) as count FROM logs WHERE strftime("%m", createdAt) = strftime("%m", "now") AND strftime("%Y", createdAt) = strftime("%Y", "now")'),
      db.get('SELECT COUNT(*) as count FROM logs')
    ]);

    res.json({
      success: true,
      data: {
        scripts: scripts.count,
        loaders: loaders.count,
        users: users.count,
        executionsToday: executionsToday.count,
        executionsMonth: executionsMonth.count,
        apiCalls: apiCalls.count
      }
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get logs
router.get('/logs', async (req, res) => {
  try {
    const { loaderId, status, fromDate, toDate, limit = 100 } = req.query;
    let sql = 'SELECT * FROM logs WHERE 1=1';
    const params = [];

    if (loaderId) {
      sql += ' AND loaderId = ?';
      params.push(loaderId);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (fromDate) {
      sql += ' AND createdAt >= ?';
      params.push(fromDate);
    }

    if (toDate) {
      sql += ' AND createdAt <= ?';
      params.push(toDate);
    }

    sql += ' ORDER BY createdAt DESC LIMIT ?';
    params.push(parseInt(limit));

    const logs = await db.query(sql, params);

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

module.exports = router;
