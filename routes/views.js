const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Hàm render view
function renderView(res, viewName, data = {}) {
  const viewPath = path.join(__dirname, '..', 'views', `${viewName}.html`);
  
  if (!fs.existsSync(viewPath)) {
    return res.status(404).send(`View ${viewName} not found`);
  }

  let html = fs.readFileSync(viewPath, 'utf8');
  
  // Thay thế biến template nếu có
  Object.entries(data).forEach(([key, value]) => {
    html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });

  res.send(html);
}

// Route cho từng trang
router.get('/', (req, res) => renderView(res, 'dashboard'));
router.get('/dashboard', (req, res) => renderView(res, 'dashboard'));
router.get('/scripts', (req, res) => renderView(res, 'scripts'));
router.get('/loaders', (req, res) => renderView(res, 'loaders'));
router.get('/users', (req, res) => renderView(res, 'users'));
router.get('/logs', (req, res) => renderView(res, 'logs'));
router.get('/settings', (req, res) => renderView(res, 'settings'));
router.get('/admin', (req, res) => renderView(res, 'admin'));

module.exports = router;
