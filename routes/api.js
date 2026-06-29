const express = require('express');
const router = express.Router();
const db = require('../database/database');
const crypto = require('crypto');

// ============================================================
// GET ALL SCRIPTS - BỎ AUTH
// ============================================================

router.get('/scripts', async (req, res) => {
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

// ============================================================
// CREATE SCRIPT - BỎ AUTH
// ============================================================

router.post('/scripts', async (req, res) => {
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

// ============================================================
// DELETE SCRIPT - BỎ AUTH
// ============================================================

router.delete('/scripts/:id', async (req, res) => {
  try {
    const scriptId = req.params.id;
    const script = await db.get('SELECT * FROM scripts WHERE id = ? OR uuid = ?', [scriptId, scriptId]);

    if (!script) {
      return res.status(404).json({ error: 'Script not found' });
    }

    await db.run('DELETE FROM loaders WHERE scriptId = ?', [script.id]);
    await db.run('DELETE FROM script_versions WHERE scriptId = ?', [script.id]);
    await db.run('DELETE FROM scripts WHERE id = ?', [script.id]);

    res.json({
      success: true,
      message: 'Script deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting script:', error);
    res.status(500).json({ error: 'Failed to delete script' });
  }
});

module.exports = router;
