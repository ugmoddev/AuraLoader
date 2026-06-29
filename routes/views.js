const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

console.log('📄 Loading views routes...');

function renderView(res, viewName) {
  const viewPath = path.join(__dirname, '..', 'views', `${viewName}.html`);
  console.log(`📄 Rendering: ${viewName} at ${viewPath}`);
  
  if (!fs.existsSync(viewPath)) {
    console.error(`❌ File not found: ${viewPath}`);
    return res.status(404).send(`<h1>View not found</h1><p>${viewName}</p>`);
  }

  const html = fs.readFileSync(viewPath, 'utf8');
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
}

// Test route
router.get('/test', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Test</title></head>
    <body style="font-family: Arial; padding: 40px; background: #1a1a2e; color: #fff;">
      <h1 style="color: #6c5ce7;">✅ View System Working!</h1>
      <p>If you see this, the server is working correctly.</p>
      <p>Time: ${new Date().toISOString()}</p>
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

// ============================================================
// THÊM ROUTE LOGIN VÀ REGISTER
// ============================================================

router.get('/login', (req, res) => {
  // Kiểm tra nếu đã đăng nhập thì chuyển về dashboard
  const token = req.session?.token || req.headers.authorization?.split(' ')[1];
  if (token) {
    return res.redirect('/');
  }
  renderView(res, 'login');
});

router.get('/register', (req, res) => {
  renderView(res, 'register');
});

// ============================================================
// LOGOUT
// ============================================================

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

console.log('✅ Views routes registered:');
console.log('  - /');
console.log('  - /dashboard');
console.log('  - /scripts');
console.log('  - /loaders');
console.log('  - /users');
console.log('  - /logs');
console.log('  - /settings');
console.log('  - /admin');
console.log('  - /login');      // THÊM
console.log('  - /register');   // THÊM
console.log('  - /test');

module.exports = router;
