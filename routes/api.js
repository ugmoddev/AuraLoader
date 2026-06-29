const express = require('express');
const router = express.Router();
const db = require('../database/database');
const auth = require('../middlewares/auth');
const crypto = require('crypto');

// ============================================================
// CREATE SCRIPT - BỎ REQUIRE ROLE
// ============================================================

router.post('/scripts', auth.authenticate, async (req, res) => {
  try {
    const { name, author, description, version, source, category, tags } = req.body;

    if (!name || !source) {
      return res.status(400).json({ error: 'Name and source are required' });
    }

    const uuid = crypto.randomBytes(4).toString('hex');
    const result = await db.run(`
      INSERT INTO scripts (uuid, name, author, description, version, source, category, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [uuid, name, author || req.user.username || 'Unknown', description || '', version || '1.0.0', source, category || 'general', tags || '']);

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
// UPDATE SCRIPT - BỎ REQUIRE ROLE
// ============================================================

router.put('/scripts/:id', auth.authenticate, async (req, res) => {
  try {
    const { name, author, description, version, source, enabled, category, tags } = req.body;
    const scriptId = req.params.id;

    const existing = await db.get('SELECT * FROM scripts WHERE id = ? OR uuid = ?', [scriptId, scriptId]);
    if (!existing) {
      return res.status(404).json({ error: 'Script not found' });
    }

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

// ============================================================
// DELETE SCRIPT - BỎ REQUIRE ROLE
// ============================================================

router.delete('/scripts/:id', auth.authenticate, async (req, res) => {
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
      message: 'Script and related data deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting script:', error);
    res.status(500).json({ error: 'Failed to delete script' });
  }
});

module.exports = router;
