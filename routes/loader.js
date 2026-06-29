const express = require('express');
const router = express.Router();
const db = require('../database/database');
const auth = require('../middlewares/auth');
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
    const cdnUrl = process.env.CDN_URL || 'https://auraloader.onrender.com/cdn';
    const loaderCode = `
      -- AuraHub Loader
      -- LoaderID: ${loaderId}
      -- Secret: ${secret}
      -- Version: ${loaderVersion}
      
      local LoaderID = "${loaderId}"
      local Version = "${loaderVersion}"
      local Secret = "${secret}"
      
      local function checkLoader()
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

    res.json
