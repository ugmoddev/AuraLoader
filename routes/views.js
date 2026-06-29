const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Serve HTML views
const renderView = (res, viewName, data = {}) => {
  const viewPath = path.join(__dirname, '..', 'views', `${viewName}.html`);
  
  if (!fs.existsSync(viewPath)) {
    return res.status(404).send('View not found');
  }

  let html = fs.readFileSync(viewPath, 'utf8');
  
  // Replace template variables
  Object.entries(data).forEach(([key, value]) => {
    html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });

  res.send(html);
};

// Public routes
router.get('/', (req, res) => {
  renderView(res, 'dashboard', {
    title: 'AuraHub Loader Platform',
    page: 'dashboard'
  });
});

router.get('/dashboard', (req, res) => {
  renderView(res, 'dashboard', {
    title: 'Dashboard - AuraHub',
    page: 'dashboard'
  });
});

router.get('/scripts', (req, res) => {
  renderView(res, 'scripts', {
    title: 'Scripts - AuraHub',
    page: 'scripts'
  });
});

router.get('/users', (req, res) => {
  renderView(res, 'users', {
    title: 'Users - AuraHub',
    page: 'users'
  });
});

router.get('/loaders', (req, res) => {
  renderView(res, 'loaders', {
    title: 'Loaders - AuraHub',
    page: 'loaders'
  });
});

router.get('/logs', (req, res) => {
  renderView(res, 'logs', {
    title: 'Logs - AuraHub',
    page: 'logs'
  });
});

router.get('/settings', (req, res) => {
  renderView(res, 'settings', {
    title: 'Settings - AuraHub',
    page: 'settings'
  });
});

// Protected routes
router.get('/admin', (req, res) => {
  renderView(res, 'admin', {
    title: 'Admin Panel - AuraHub',
    page: 'admin'
  });
});

module.exports = router;