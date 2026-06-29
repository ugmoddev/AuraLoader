const express = require('express');
const router = express.Router();
const db = require('../database/database');
const auth = require('../middlewares/auth');
const crypto = require('crypto');

// TẤT CẢ ROUTES ĐỀU KHÔNG CÓ PREFIX /scripts NỮA
// VÌ ĐÃ CÓ /api/scripts TRONG server.js

// GET /api/scripts
router.get('/scripts', async (req, res) => {
  try {
    const scripts = await db.query('SELECT * FROM scripts ORDER BY createdAt DESC');
    res.json({ success: true, data: scripts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch scripts' });
  }
});

// POST /api/scripts
router.post('/scripts', auth.authenticate, auth.requireRole(['admin', 'moderator']), async (req, res) => {
  try {
    const { name, author, description, version, source, category } = req.body;
    if (!name || !source) {
      return res.status(400).json({ error: 'Name and source required' });
    }
    const uuid = crypto.randomBytes(4).toString('hex');
    await db.run(`
      INSERT INTO scripts (uuid, name, author, description, version, source, category)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [uuid, name, author || 'Unknown', description || '', version || '1.0.0', source, category || 'general']);
    const script = await db.get('SELECT * FROM scripts WHERE uuid = ?', [uuid]);
    res.status(201).json({ success: true, data: script });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create script' });
  }
});

// DELETE /api/scripts/:id
router.delete('/scripts/:id', auth.authenticate, auth.requireRole(['admin']), async (req, res) => {
  try {
    await db.run('DELETE FROM scripts WHERE uuid = ?', [req.params.id]);
    res.json({ success: true, message: 'Script deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete script' });
  }
});

// GET /api/statistics
router.get('/statistics', async (req, res) => {
  try {
    const scripts = await db.get('SELECT COUNT(*) as count FROM scripts');
    const loaders = await db.get('SELECT COUNT(*) as count FROM loaders');
    const users = await db.get('SELECT COUNT(*) as count FROM users');
    res.json({ success: true, data: { scripts: scripts.count, loaders: loaders.count, users: users.count } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
