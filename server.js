require('dotenv').config();
const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const session = require('express-session');
const path = require('path');

console.log('🚀 Starting AuraHub Server (No Auth Mode)...');

const app = express();
const PORT = process.env.PORT || 10000;

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(compression());
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'default_secret_change_me',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/storage', express.static(path.join(__dirname, 'storage')));

// ============================================================
// REQUEST LOGGER
// ============================================================

app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.url}`);
  next();
});

// ============================================================
// DATABASE
// ============================================================

console.log('📦 Initializing database...');
const db = require('./database/database');
console.log('✅ Database initialized');

// ============================================================
// AUTHENTICATION MIDDLEWARE - ĐÃ BỎ QUA
// ============================================================

// MIDDLEWARE ĐƠN GIẢN: Cho phép tất cả truy cập
const allowAll = (req, res, next) => {
  // Tạo user mặc định cho session
  if (!req.session.user) {
    req.session.user = {
      id: 1,
      username: 'guest',
      role: 'user'
    };
  }
  req.user = req.session.user;
  next();
};

// Áp dụng cho tất cả routes
app.use(allowAll);

// ============================================================
// TEST ROUTES
// ============================================================

app.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is running! (No Auth Mode)',
    timestamp: new Date().toISOString()
  });
});

// ============================================================
// ROUTES
// ============================================================

console.log('📄 Loading routes...');

// 1. AUTH ROUTES (vẫn giữ để tương thích)
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

// 2. API ROUTES (không cần auth)
const apiRoutes = require('./routes/api');
const loaderRoutes = require('./routes/loader');
const cdnRoutes = require('./routes/cdn');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/users');

app.use('/api', apiRoutes);
app.use('/loader', loaderRoutes);
app.use('/cdn', cdnRoutes);
app.use('/admin', adminRoutes);
app.use('/users', userRoutes);

// 3. VIEW ROUTES
const viewRoutes = require('./routes/views');

// Login page - redirect to dashboard
app.get('/login', (req, res) => {
  res.redirect('/');
});

// Register page - redirect to dashboard
app.get('/register', (req, res) => {
  res.redirect('/');
});

// Logout - just clear session
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// All other routes
app.use('/', viewRoutes);

// ============================================================
// ERROR HANDLING
// ============================================================

app.use((req, res) => {
  console.log(`⚠️ 404: ${req.method} ${req.url}`);
  if (req.path.startsWith('/api/') || req.path.startsWith('/auth/')) {
    return res.status(404).json({ success: false, error: 'API endpoint not found' });
  }
  res.status(404).send(`
    <!DOCTYPE html>
    <html>
    <head><title>404 - Not Found</title></head>
    <body style="font-family: Arial; padding: 40px; background: #0a0a1a; color: #e0e0e0;">
      <h1>404 - Page Not Found</h1>
      <p>The page you are looking for does not exist.</p>
      <a href="/" style="color: #6c5ce7;">Go to Dashboard</a>
    </body>
    </html>
  `);
});

app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  if (req.path.startsWith('/api/') || req.path.startsWith('/auth/')) {
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
  res.status(500).send(`
    <!DOCTYPE html>
    <html>
    <head><title>500 - Server Error</title></head>
    <body style="font-family: Arial; padding: 40px; background: #0a0a1a; color: #e0e0e0;">
      <h1>500 - Server Error</h1>
      <p>Something went wrong. Please try again later.</p>
      <a href="/" style="color: #6c5ce7;">Go to Dashboard</a>
    </body>
    </html>
  `);
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, '0.0.0.0', () => {
  console.log('========================================');
  console.log('🚀 AuraHub Loader Platform (No Auth Mode)');
  console.log(`📍 Running on http://0.0.0.0:${PORT}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('========================================');
  console.log('📋 All routes are public:');
  console.log('  - /               Dashboard');
  console.log('  - /dashboard      Dashboard');
  console.log('  - /scripts        Scripts Manager');
  console.log('  - /loaders        Loaders Manager');
  console.log('  - /users          Users Manager');
  console.log('  - /logs           Logs Viewer');
  console.log('  - /settings       Settings');
  console.log('  - /admin          Admin Panel');
  console.log('  - /api/*          API Endpoints');
  console.log('========================================');
  console.log('⚠️  AUTHENTICATION DISABLED - All routes are public!');
  console.log('========================================');
});
