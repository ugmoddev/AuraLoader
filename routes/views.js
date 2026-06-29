const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Function to render HTML views
function renderView(res, viewName, data = {}) {
  const viewPath = path.join(__dirname, '..', 'views', `${viewName}.html`);
  
  console.log(`Attempting to render view: ${viewName} at ${viewPath}`);
  
  if (!fs.existsSync(viewPath)) {
    console.error(`View not found: ${viewPath}`);
    return res.status(404).send(`View ${viewName} not found`);
  }

  try {
    let html = fs.readFileSync(viewPath, 'utf8');
    
    // Replace template variables
    Object.entries(data).forEach(([key, value]) => {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error(`Error rendering view ${viewName}:`, error);
    res.status(500).send('Error rendering view');
  }
}

// Route for each page
router.get('/', (req, res) => renderView(res, 'dashboard'));
router.get('/dashboard', (req, res) => renderView(res, 'dashboard'));
router.get('/scripts', (req, res) => renderView(res, 'scripts'));
router.get('/loaders', (req, res) => renderView(res, 'loaders'));
router.get('/users', (req, res) => renderView(res, 'users'));
router.get('/logs', (req, res) => renderView(res, 'logs'));
router.get('/settings', (req, res) => renderView(res, 'settings'));
router.get('/admin', (req, res) => renderView(res, 'admin'));

module.exports = router;
