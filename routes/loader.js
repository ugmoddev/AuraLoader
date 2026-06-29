const express = require('express');
const router = express.Router();
const db = require('../database/database');
const auth = require('../middlewares/auth');
const logger = require('../middlewares/logger');
const crypto = require('crypto');

// Generate loader code
router.post('/generate', auth.authenticate, async (req, res) => {
  try {
    const { scriptId, version, customSecret } = req.body;

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

    await db.run(`
      INSERT INTO loaders (loaderId, scriptId, secret, version)
      VALUES (?, ?, ?, ?)
    `, [loaderId, script.id, secret, loaderVersion]);

    // Generate loader code
    const cdnUrl = process.env.CDN_URL || 'http://localhost:3000/cdn';
    const loaderCode = `
      -- AuraHub Loader
      -- LoaderID: ${loaderId}
      -- Secret: ${secret}
      -- Version: ${loaderVersion}
      
      local LoaderID = "${loaderId}"
      local Version = "${loaderVersion}"
      local Secret = "${secret}"
      
      local function checkLoader()
        -- Check if loader is valid
        local success, result = pcall(function()
          return game:HttpGet("${cdnUrl}/init/" .. LoaderID .. ".lua?hwid=" .. tostring(game.Players.LocalPlayer) .. "&secret=" .. Secret)
        end)
        return success, result
      end
      
      local success, source = checkLoader()
      if success and source then
        loadstring(source)()
      else
        warn("Loader failed to initialize")
        print("Please check your internet connection and loader status.")
      end
    `;

    res.json({
      success: true,
      data: {
        loaderId,
        secret,
        version: loaderVersion,
        loaderCode,
        cdnUrl: `${cdnUrl}/init/${loaderId}.lua`
      },
      message: 'Loader generated successfully'
    });
  } catch (error) {
    console.error('Error generating loader:', error);
    res.status(500).json({ error: 'Failed to generate loader' });
  }
});

// Get loader info
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

// Validate loader
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

    // Get script
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

// Get loader statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const loaderId = req.params.id;
    
    const loader = await db.get('SELECT * FROM loaders WHERE loaderId = ?', [loaderId]);
    if (!loader) {
      return res.status(404).json({ error: 'Loader not found' });
    }

    const [executions, lastExecution, executionStats] = await Promise.all([
      db.get('SELECT COUNT(*) as count FROM logs WHERE loaderId = ?', [loaderId]),
      db.get('SELECT * FROM logs WHERE loaderId = ? ORDER BY createdAt DESC LIMIT 1', [loaderId]),
      db.get(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as success,
          SUM(CASE WHEN status = 'ERROR' THEN 1 ELSE 0 END) as errors,
          AVG(latency) as avgLatency
        FROM logs 
        WHERE loaderId = ?
      `, [loaderId])
    ]);

    res.json({
      success: true,
      data: {
        loader: {
          id: loader.loaderId,
          version: loader.version,
          status: loader.status,
          createdAt: loader.createdAt
        },
        statistics: {
          executions: executions.count,
          successRate: executionStats.total > 0 
            ? ((executionStats.success / executionStats.total) * 100).toFixed(2) + '%'
            : '0%',
          avgLatency: executionStats.avgLatency || 0,
          lastExecution: lastExecution
        }
      }
    });
  } catch (error) {
    console.error('Error fetching loader stats:', error);
    res.status(500).json({ error: 'Failed to fetch loader statistics' });
  }
});

module.exports = router;