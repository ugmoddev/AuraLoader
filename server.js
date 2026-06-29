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

// CORS & Logging
app.use(cors());
app.use(morgan('combined'));

// Body Parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'default_secret_change_me',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Static files
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/storage', express.static(path.join(__dirname, 'storage')));

// ============================================================
// DATABASE
// ============================================================

console.log('📦 Initializing database...');
const db = require('./database/database');
console.log('✅ Database initialized');

// ============================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  // Check token from header or session
  const token = req.headers.authorization?.split(' ')[1] || req.session?.token;
  
  if (!token) {
    // If it's an API request, return 401
    if (req.path.startsWith('/api/') || req.path.startsWith('/auth/')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    // Otherwise redirect to login
    return res.redirect('/login');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    req.session.token = token; // Store in session for convenience
    next();
  } catch (error) {
    // Invalid token
    if (req.path.startsWith('/api/') || req.path.startsWith('/auth/')) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.redirect('/login');
  }
};

// Middleware for role-based access
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// ============================================================
// ROUTES
// ============================================================

console.log('📄 Loading routes...');

// 1. AUTH ROUTES (public - no authentication required)
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

// 2. API ROUTES (require authentication)
const apiRoutes = require('./routes/api');
const loaderRoutes = require('./routes/loader');
const cdnRoutes = require('./routes/cdn');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/users');

// Protect API routes
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

// 3. VIEW ROUTES (protected except login/register)
const viewRoutes = require('./routes/views');

// Public view routes (no authentication required)
app.get('/login', (req, res) => {
  // If already logged in, redirect to dashboard
  const token = req.headers.authorization?.split(' ')[1] || req.session?.token;
  if (token) {
    try {
      jwt.verify(token, process.env.JWT_SECRET);
      return res.redirect('/');
    } catch (error) {
      // Token invalid, proceed to login
    }
  }
  // Render login page
  const viewPath = path.join(__dirname, 'views', 'login.html');
  const fs = require('fs');
  if (fs.existsSync(viewPath)) {
    res.sendFile(viewPath);
  } else {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Login</title></head>
      <body>
        <h1>Login Page</h1>
        <p>Please create views/login.html</p>
      </body>
      </html>
    `);
  }
});

app.get('/register', (req, res) => {
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

// Protected view routes (require authentication)
const protectedViewRoutes = ['/', '/dashboard', '/scripts', '/loaders', '/users', '/logs', '/settings', '/admin'];
app.use(protectedViewRoutes, isAuthenticated);

// Register view routes
app.use('/', viewRoutes);

// 4. LOGOUT
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// ============================================================
// ERROR HANDLING
// ============================================================

// 404 handler
app.use((req, res) => {
  console.log(`⚠️ 404: ${req.method} ${req.url}`);
  
  // If it's an API request, return JSON
  if (req.path.startsWith('/api/') || req.path.startsWith('/auth/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  // Otherwise return HTML
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

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  
  // If it's an API request, return JSON
  if (req.path.startsWith('/api/') || req.path.startsWith('/auth/')) {
    return res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
  
  // Otherwise return HTML
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
  console.log('  PUBLIC ROUTES:');
  console.log('  - /login          Login page');
  console.log('  - /register       Register page');
  console.log('  - /logout         Logout');
  console.log('  PROTECTED ROUTES:');
  console.log('  - /               Dashboard');
  console.log('  - /dashboard      Dashboard');
  console.log('  - /scripts        Scripts Manager');
  console.log('  - /loaders        Loaders Manager');
  console.log('  - /users          Users Manager');
  console.log('  - /logs           Logs Viewer');
  console.log('  - /settings       Settings');
  console.log('  - /admin          Admin Panel');
  console.log('  API ROUTES:');
  console.log('  - /api/scripts    Get all scripts');
  console.log('  - /api/scripts    Create script (POST)');
  console.log('  - /api/scripts/:id Delete script');
  console.log('  - /api/statistics Get statistics');
  console.log('  - /auth/login     Login API');
  console.log('  - /auth/register  Register API');
  console.log('========================================');
});
