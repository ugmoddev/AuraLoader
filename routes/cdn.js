const express = require('express');
const router = express.Router();
const db = require('../database/database');
const logger = require('../middlewares/logger');
const rateLimit = require('../middlewares/rateLimit');
const cache = require('../middlewares/cache');

// CDN endpoint for loader
router.get('/init/:loaderId.lua', rateLimit.cdn(), async (req, res) => {
  const startTime = Date.now();
  const loaderId = req.params.loaderId;
  const clientIP = req.ip || req.connection.remoteAddress;
  const hwid = req.headers['x-hwid'] || req.query.hwid || 'unknown';

  try {
    // Check cache
    const cacheKey = `cdn_${loaderId}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Cache-Control', 'public, max-age=300');
      
      await logger.logExecution(loaderId, clientIP, hwid, 'SUCCESS', 'Cached response', cached.version || 'unknown', Date.now() - startTime);
      
      return res.send(cached.source);
    }

    // Find loader
    const loader = await db.get(`
      SELECT l.*, s.source as scriptSource, s.name as scriptName, s.version as scriptVersion
      FROM loaders l
      JOIN scripts s ON l.scriptId = s.id
      WHERE l.loaderId = ? AND l.status = 'active'
    `, [loaderId]);

    if (!loader) {
      await logger.logExecution(loaderId, clientIP, hwid, 'ERROR', 'Loader not found or inactive', 'unknown', Date.now() - startTime);
      return res.status(404).send('-- Loader not found');
    }

    // Check if script is enabled
    const script = await db.get('SELECT * FROM scripts WHERE id = ?', [loader.scriptId]);
    if (!script || !script.enabled) {
      await logger.logExecution(loaderId, clientIP, hwid, 'ERROR', 'Script disabled', loader.version, Date.now() - startTime);
      return res.status(403).send('-- Script is disabled');
    }

    let source = script.source || '-- No source available';

    // Add loader info header
    const header = `
      -- AuraHub Loader
      -- LoaderID: ${loader.loaderId}
      -- Script: ${loader.scriptName}
      -- Version: ${loader.scriptVersion}
      -- Generated: ${new Date().toISOString()}
      
      local LoaderID = "${loader.loaderId}"
      local Version = "${loader.scriptVersion}"
      
    `;

    const response = header + source;

    // Cache the response
    cache.set(cacheKey, {
      source: response,
      version: loader.scriptVersion
    });

    await logger.logExecution(
      loaderId,
      clientIP,
      hwid,
      'SUCCESS',
      `Served script: ${loader.scriptName} v${loader.scriptVersion}`,
      loader.scriptVersion,
      Date.now() - startTime
    );

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(response);

  } catch (error) {
    console.error('CDN Error:', error);
    await logger.logExecution(loaderId, clientIP, hwid, 'ERROR', error.message, 'unknown', Date.now() - startTime);
    res.status(500).send('-- Internal server error');
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

module.exports = router;
