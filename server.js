require('dotenv').config();
const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const jwt = require('jsonwebtoken');

console.log('🚀 Starting AuraHub Server...');

const app = express();
const PORT = process.env.PORT || 10000;

// ============================================================
// MIDDLEWARE
// ============================================================

// Security & Compression
app.use(compression());
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS - QUAN TRỌNG: Cho phép tất cả origins
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Logging
app.use(morgan('combined'));

// Body Parser - QUAN TRỌNG: Phải có để xử lý cả JSON và form data
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Session - QUAN TRỌNG: Phải cấu hình đúng
app.use(session({
  secret: process.env.SESSION_SECRET || 'default_secret_change_me',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// Static files
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/storage', express.static(path.join(__dirname, 'storage')));

// ============================================================
// REQUEST LOGGER (Debug)
// ============================================================

app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.url}`);
  console.log(`  Session ID: ${req.sessionID}`);
  console.log(`  Session token: ${req.session?.token ? 'Present' : 'None'}`);
  if (req.method === 'POST') {
    console.log(`  Body:`, req.body);
  }
  next();
});

// ============================================================
// DATABASE
// ============================================================

console.log('📦 Initializing database...');
const db = require('./database/database');
console.log('✅ Database initialized');

// ============================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================

const isAuthenticated = (req, res, next) => {
  // Public routes - KHÔNG CẦN AUTH
  const publicRoutes = [
    '/login', 
    '/register', 
    '/auth/login', 
    '/auth/register', 
    '/auth/logout', 
    '/test',
    '/test-html'
  ];
  
  if (publicRoutes.includes(req.path) || req.path.startsWith('/auth/')) {
    console.log(`🔓 Public route: ${req.path}`);
    return next();
  }

  // Lấy token từ header hoặc session
  const token = req.headers.authorization?.split(' ')[1] || req.session?.token;
  
  console.log(`🔐 Protected route: ${req.path}`);
  console.log(`  Token: ${token ? 'Present' : 'None'}`);

  if (!token) {
    console.log(`❌ No token, redirecting to /login`);
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    return res.redirect('/login');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    req.session.token = token;
    req.session.user = decoded;
    console.log(`✅ Authenticated: ${decoded.username}`);
    next();
  } catch (error) {
    console.log(`❌ Invalid token: ${error.message}`);
    req.session.token = null;
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }
    return res.redirect('/login');
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }
    next();
  };
};

// ============================================================
// TEST ROUTES (Để kiểm tra kết nối)
// ============================================================

app.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is running!',
    timestamp: new Date().toISOString()
  });
});

app.get('/test-html', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Test</title></head>
    <body style="font-family: Arial; padding: 40px; background: #0a0a1a; color: #e0e0e0;">
      <h1>✅ Server is running!</h1>
      <p>Time: ${new Date().toISOString()}</p>
    </body>
    </html>
  `);
});

// ============================================================
// ROUTES - QUAN TRỌNG: API TRƯỚC, VIEWS SAU
// ============================================================

console.log('📄 Loading routes...');

// 1. AUTH ROUTES (public - KHÔNG CẦN AUTH)
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

// 2. API ROUTES (cần auth)
const apiRoutes = require('./routes/api');
const loaderRoutes = require('./routes/loader');
const cdnRoutes = require('./routes/cdn');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/users');

// Apply authentication middleware to API routes
app.use('/api', isAuthenticated);
app.use('/loader', isAuthenticated);
app.use('/admin', isAuthenticated);
app.use('/users', isAuthenticated);

// Register API routes
app.use('/api', apiRoutes);
app.use('/loader', loaderRoutes);
app.use('/cdn', cdnRoutes);
app.use('/admin', adminRoutes);
app.use('/users', userRoutes);

// 3. VIEW ROUTES (SAU CÙNG)
const viewRoutes = require('./routes/views');

// Login page - KHÔNG CẦN AUTH
app.get('/login', (req, res) => {
  console.log('🔓 Rendering login page...');
  
  // Nếu đã có session token hợp lệ, redirect về dashboard
  if (req.session?.token) {
    try {
      jwt.verify(req.session.token, process.env.JWT_SECRET);
      console.log('✅ Session token valid, redirecting to dashboard');
      return res.redirect('/');
    } catch (error) {
      req.session.token = null;
      console.log('❌ Session token invalid, clearing session');
    }
  }
  
  const viewPath = path.join(__dirname, 'views', 'login.html');
  const fs = require('fs');
  if (fs.existsSync(viewPath)) {
    console.log(`📄 Sending login page from: ${viewPath}`);
    res.sendFile(viewPath);
  } else {
    console.error(`❌ Login page not found at: ${viewPath}`);
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Login</title></head>
      <body style="font-family: Arial; padding: 40px; background: #0a0a1a; color: #e0e0e0;">
        <h1>Login Page</h1>
        <p>Please create views/login.html</p>
      </body>
      </html>
    `);
  }
});

// Register page - KHÔNG CẦN AUTH
app.get('/register', (req, res) => {
  console.log('🔓 Rendering register page...');
  const viewPath = path.join(__dirname, 'views', 'register.html');
  const fs = require('fs');
  if (fs.existsSync(viewPath)) {
    res.sendFile(viewPath);
  } else {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Register</title></head>
      <body>
        <h1>Register Page</h1>
        <p>Please create views/register.html</p>
      </body>
      </html>
    `);
  }
});

// Protected view routes (cần auth)
const protectedViewRoutes = [
  '/', 
  '/dashboard', 
  '/scripts', 
  '/loaders', 
  '/users', 
  '/logs', 
  '/settings', 
  '/admin'
];
app.use(protectedViewRoutes, isAuthenticated);

// Register view routes
app.use('/', viewRoutes);

// Logout
app.get('/logout', (req, res) => {
  console.log('🔓 Logging out...');
  req.session.destroy();
  res.redirect('/login');
});

// ============================================================
// ERROR HANDLING
// ============================================================

// 404 Handler
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

// Global Error Handler
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
  console.log('🚀 AuraHub Loader Platform');
  console.log(`📍 Running on http://0.0.0.0:${PORT}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('========================================');
  console.log('📋 Available routes:');
  console.log('  TEST ROUTES:');
  console.log('  - /test          JSON response');
  console.log('  - /test-html     HTML response');
  console.log('  PUBLIC (No Auth):');
  console.log('  - /login          Login page');
  console.log('  - /register       Register page');
  console.log('  - /auth/login     Login API (POST)');
  console.log('  - /auth/register  Register API (POST)');
  console.log('  - /auth/logout    Logout API (POST)');
  console.log('  PROTECTED (Requires Auth):');
  console.log('  - /               Dashboard');
  console.log('  - /dashboard      Dashboard');
  console.log('  - /scripts        Scripts Manager');
  console.log('  - /loaders        Loaders Manager');
  console.log('  - /users          Users Manager');
  console.log('  - /logs           Logs Viewer');
  console.log('  - /settings       Settings');
  console.log('  - /admin          Admin Panel');
  console.log('  API (Requires Auth):');
  console.log('  - /api/scripts    Get all scripts');
  console.log('  - /api/scripts    Create script (POST)');
  console.log('  - /api/statistics Get statistics');
  console.log('========================================');
});
