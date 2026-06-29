const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

console.log('📄 Loading views routes...');

// Function to render HTML views
function renderView(res, viewName, data = {}) {
  const viewPath = path.join(__dirname, '..', 'views', `${viewName}.html`);
  
  console.log(`📄 Rendering view: ${viewName}`);
  console.log(`📁 Path: ${viewPath}`);
  
  if (!fs.existsSync(viewPath)) {
    console.error(`❌ View not found: ${viewPath}`);
    return res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head><title>View Not Found</title></head>
      <body style="font-family: Arial; padding: 40px; background: #0a0a1a; color: #e0e0e0;">
        <h1>❌ View Not Found</h1>
        <p>View: ${viewName}</p>
        <p>Path: ${viewPath}</p>
        <p>Directory: ${path.dirname(viewPath)}</p>
        <p>Views directory exists: ${fs.existsSync(path.dirname(viewPath))}</p>
      </body>
      </html>
    `);
  }

  try {
    let html = fs.readFileSync(viewPath, 'utf8');
    console.log(`✅ View loaded (${html.length} bytes)`);
    
    // Replace template variables
    Object.entries(data).forEach(([key, value]) => {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error(`❌ Error rendering view ${viewName}:`, error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Error</title></head>
      <body style="font-family: Arial; padding: 40px; background: #0a0a1a; color: #e0e0e0;">
        <h1>❌ Error Rendering View</h1>
        <pre>${error.stack}</pre>
      </body>
      </html>
    `);
  }
}

// Test route
router.get('/test', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Test Page</title></head>
    <body style="font-family: Arial; padding: 40px; background: #0a0a1a; color: #e0e0e0;">
      <h1>✅ View System Test Page</h1>
      <p>If you can see this, the view system is working!</p>
      <p>Current time: ${new Date().toISOString()}</p>
      <p>Views directory: ${path.join(__dirname, '..', 'views')}</p>
    </body>
    </html>
  `);
});

// Main routes
router.get('/', (req, res) => renderView(res, 'dashboard'));
router.get('/dashboard', (req, res) => renderView(res, 'dashboard'));
router.get('/scripts', (req, res) => renderView(res, 'scripts'));
router.get('/loaders', (req, res) => renderView(res, 'loaders'));
router.get('/users', (req, res) => renderView(res, 'users'));
router.get('/logs', (req, res) => renderView(res, 'logs'));
router.get('/settings', (req, res) => renderView(res, 'settings'));
router.get('/admin', (req, res) => renderView(res, 'admin'));

console.log('✅ Views routes registered:');
console.log('  - /');
console.log('  - /dashboard');
console.log('  - /scripts');
console.log('  - /loaders');
console.log('  - /users');
console.log('  - /logs');
console.log('  - /settings');
console.log('  - /admin');
console.log('  - /test');

module.exports = router;
