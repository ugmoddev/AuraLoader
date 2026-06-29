const express = require('express');
const router = express.Router();
const db = require('../database/database');
const crypto = require('crypto');

// ============================================================
// GENERATE LOADER - BỎ AUTH
// ============================================================

router.post('/generate', async (req, res) => {
  try {
    const { scriptId, version, customSecret } = req.body;

    console.log('🔧 Generating loader for script:', scriptId);

    if (!scriptId) {
      return res.status(400).json({ error: 'Script ID is required' });
    }

    // Get script
    const script = await db.get('SELECT * FROM scripts WHERE id = ? OR uuid = ?', [scriptId, scriptId]);
    if (!script) {
      return res.status(404).json({ error: 'Script not found' });
    }

    // Create loader
    const loaderId = crypto.randomBytes(4).toString('hex');
    const secret = customSecret || crypto.randomBytes(16).toString('hex');
    const loaderVersion = version || script.version || '1.0.0';

    const result = await db.run(`
      INSERT INTO loaders (loaderId, scriptId, secret, version)
      VALUES (?, ?, ?, ?)
    `, [loaderId, script.id, secret, loaderVersion]);

    console.log('✅ Loader created:', loaderId);

    // Get loader info
    const loader = await db.get(`
      SELECT l.*, s.name as scriptName, s.uuid as scriptUuid
      FROM loaders l
      LEFT JOIN scripts s ON l.scriptId = s.id
      WHERE l.id = ?
    `, [result.lastID]);

    // Generate loader code
    const cdnUrl = process.env.CDN_URL || 'https://auraloader.onrender.com/cdn';
    const loaderCode = `
-- AuraHub Loader
-- LoaderID: ${loaderId}
-- Secret: ${secret}
-- Version: ${loaderVersion}

local LoaderID = "${loaderId}"
local Version = "${loaderVersion}"
local Secret = "${secret}"

local function loadScript()
    local url = "${cdnUrl}/init/" .. LoaderID .. ".lua?secret=" .. Secret
    local success, result = pcall(function()
        return game:HttpGet(url)
    end)
    if success and result then
        loadstring(result)()
    else
        warn("Failed to load script: " .. tostring(result))
    end
end

loadScript()
`;

    res.json({
      success: true,
      data: {
        loaderId,
        secret,
        version: loaderVersion,
        loaderCode,
        scriptName: loader.scriptName,
        cdnUrl: `${cdnUrl}/init/${loaderId}.lua`
      },
      message: 'Loader generated successfully'
    });
  } catch (error) {
    console.error('Error generating loader:', error);
    res.status(500).json({ error: 'Failed to generate loader: ' + error.message });
  }
});

// ============================================================
// GET LOADER INFO - BỎ AUTH
// ============================================================

router.get('/:id/info', async (req, res) => {
  try {
    const loaderId = req.params.id;
    const loader = await db.get(`
      SELECT l.*, s.name as scriptName, s.uuid as scriptUuid
      FROM loaders l
      LEFT JOIN scripts s ON l.scriptId = s.id
      WHERE l.loaderId = ? OR l.id = ?
    `, [loaderId, loaderId]);

    if (!loader) {
      return res.status(404).json({ error: 'Loader not found' });
    }

    res.json({ success: true, data: loader });
  } catch (error) {
    console.error('Error fetching loader info:', error);
    res.status(500).json({ error: 'Failed to fetch loader info' });
  }
});

// ============================================================
// VALIDATE LOADER - BỎ AUTH
// ============================================================

router.post('/:id/validate', async (req, res) => {
  try {
    const loaderId = req.params.id;
    const { secret } = req.body;

    const loader = await db.get('SELECT * FROM loaders WHERE loaderId = ?', [loaderId]);
    if (!loader) {
      return res.status(404).json({ error: 'Loader not found' });
    }

    if (loader.secret !== secret) {
      return res.status(401).json({ error: 'Invalid secret' });
    }

    if (loader.status !== 'active') {
      return res.status(403).json({ error: 'Loader is not active' });
    }

    const script = await db.get('SELECT * FROM scripts WHERE id = ?', [loader.scriptId]);
    if (!script || !script.enabled) {
      return res.status(403).json({ error: 'Script is disabled' });
    }

    res.json({
      success: true,
      data: {
        loaderId: loader.loaderId,
        scriptName: script.name,
        version: loader.version,
        status: loader.status
      },
      message: 'Loader validated successfully'
    });
  } catch (error) {
    console.error('Error validating loader:', error);
    res.status(500).json({ error: 'Failed to validate loader' });
  }
});

module.exports = router;
