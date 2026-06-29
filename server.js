require('dotenv').config();
const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

// Global error handlers
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log('🚀 Starting AuraHub Loader Platform...');

// Import database
try {
  console.log('📦 Initializing database...');
  require('./database/database');
  console.log('✅ Database initialized successfully');
} catch (error) {
  console.error('❌ Database initialization failed:', error);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 10000;

// ============================================================
// MIDDLEWARE
// ============================================================

console.log('🔧 Setting up middleware...');

app.use(compression());
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'default_secret_change_me',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Static files
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/storage', express.static(path.join(__dirname, 'storage')));

// Request logger
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.url}`);
  next();
});

// ============================================================
// ROUTES - IMPORTANT ORDER: API FIRST, VIEWS LAST
// ============================================================

console.log('🔧 Registering routes...');

// 1. API ROUTES (always first)
try {
  const authRoutes = require('./routes/auth');
  const apiRoutes = require('./routes/api');
  const loaderRoutes = require('./routes/loader');
  const cdnRoutes = require('./routes/cdn');
  const adminRoutes = require('./routes/admin');
  const scriptRoutes = require('./routes/scripts');
  const userRoutes = require('./routes/users');

  console.log('✅ Registering API routes...');
  app.use('/auth', authRoutes);
  app.use('/api', apiRoutes);
  app.use('/loader', loaderRoutes);
  app.use('/cdn', cdnRoutes);
  app.use('/admin', adminRoutes);
  app.use('/scripts', scriptRoutes);   // API routes for scripts
  app.use('/users', userRoutes);
} catch (error) {
  console.error('❌ Error loading API routes:', error);
  process.exit(1);
}

// 2. VIEW ROUTES (always last)
try {
  console.log('✅ Registering View routes...');
  const viewRoutes = require('./routes/views');
  app.use('/', viewRoutes);  // This handles /dashboard, /scripts, /loaders, etc.
} catch (error) {
  console.error('❌ Error loading View routes:', error);
  process.exit(1);
}

// ============================================================
// ERROR HANDLING
// ============================================================

// 404 handler
app.use((req, res) => {
  console.log(`⚠️ 404: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, '0.0.0.0', () => {
  console.log('========================================');
  console.log('🚀 AuraHub Loader Platform');
  console.log(`📍 Running on http://0.0.0.0:${PORT}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('========================================');
  console.log('📋 Available routes:');
  console.log('  - /              Dashboard');
  console.log('  - /dashboard     Dashboard');
  console.log('  - /scripts       Scripts Manager');
  console.log('  - /loaders       Loaders Manager');
  console.log('  - /users         Users Manager');
  console.log('  - /logs          Logs Viewer');
  console.log('  - /settings      Settings');
  console.log('  - /admin         Admin Panel');
  console.log('  - /api/*         API Endpoints');
  console.log('========================================');
});
