const express = require('express');
const router = express.Router();
const db = require('../database/database');
const auth = require('../middlewares/auth');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// Get all scripts (public)
router.get('/', async (req, res) => {
  try {
    const scripts = await db.query(
      'SELECT * FROM scripts WHERE enabled = 1 ORDER BY downloads DESC, createdAt DESC'
    );
    res.json({ success: true, data: scripts });
  } catch (error) {
    console.error('Error fetching scripts:', error);
    res.status(500).json({ error: 'Failed to fetch scripts' });
  }
});

// Get single script
router.get('/:id', async (req, res) => {
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
router.post('/', auth.authenticate, auth.requireRole(['admin', 'moderator']), async (req, res) => {
  try {
    const { name, description, version, source, category, tags, author } = req.body;

    if (!name || !source) {
      return res.status(400).json({ error: 'Name and source are required' });
    }

    const uuid = uuidv4().substring(0, 8);
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

// Update script
router.put('/:id', auth.authenticate, auth.requireRole(['admin', 'moderator']), async (req, res) => {
  try {
    const scriptId = req.params.id;
    const { name, description, version, source, enabled, category, tags, author } = req.body;

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

// Delete script
router.delete('/:id', auth.authenticate, auth.requireRole(['admin']), async (req, res) => {
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

// Clone script
router.post('/:id/clone', auth.authenticate, auth.requireRole(['admin', 'moderator']), async (req, res) => {
  try {
    const scriptId = req.params.id;
    const script = await db.get('SELECT * FROM scripts WHERE id = ? OR uuid = ?', [scriptId, scriptId]);

    if (!script) {
      return res.status(404).json({ error: 'Script not found' });
    }

    const newUuid = uuidv4().substring(0, 8);
    const result = await db.run(`
      INSERT INTO scripts (uuid, name, author, description, version, source, category, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newUuid,
      `${script.name} (Clone)`,
      script.author,
      script.description,
      script.version,
      script.source,
      script.category,
      script.tags
    ]);

    const cloned = await db.get('SELECT * FROM scripts WHERE id = ?', [result.lastID]);

    res.status(201).json({
      success: true,
      data: cloned,
      message: 'Script cloned successfully'
    });
  } catch (error) {
    console.error('Error cloning script:', error);
    res.status(500).json({ error: 'Failed to clone script' });
  }
});

module.exports = router;
