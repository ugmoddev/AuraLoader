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

// Session - CẤU HÌNH QUAN TRỌNG
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

app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/storage', express.static(path.join(__dirname, 'storage')));

// ============================================================
// REQUEST LOGGER
// ============================================================

app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.url}`);
  console.log(`  Session ID: ${req.sessionID}`);
  console.log(`  Session token: ${req.session?.token ? 'Present' : 'None'}`);
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
  // Public routes
  const publicRoutes = ['/login', '/register', '/auth/login', '/auth/register', '/auth/logout', '/test'];
  if (publicRoutes.includes(req.path) || req.path.startsWith('/auth/')) {
    console.log(`🔓 Public route: ${req.path}`);
    return next();
  }

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
// ROUTES
// ============================================================

console.log('📄 Loading routes...');

// 1. AUTH ROUTES (public)
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

// 2. API ROUTES (cần auth)
const apiRoutes = require('./routes/api');
const loaderRoutes = require('./routes/loader');
const cdnRoutes = require('./routes/cdn');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/users');

app.use('/api', isAuthenticated);
app.use('/loader', isAuthenticated);
app.use('/admin', isAuthenticated);
app.use('/users', isAuthenticated);

app.use('/api', apiRoutes);
app.use('/loader', loaderRoutes);
app.use('/cdn', cdnRoutes);
app.use('/admin', adminRoutes);
app.use('/users', userRoutes);

// 3. VIEW ROUTES (SAU CÙNG)
const viewRoutes = require('./routes/views');

app.get('/login', (req, res) => {
  // Nếu đã có session token, redirect về dashboard
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

// Protected view routes
const protectedViewRoutes = ['/', '/dashboard', '/scripts', '/loaders', '/users', '/logs', '/settings', '/admin'];
app.use(protectedViewRoutes, isAuthenticated);

app.use('/', viewRoutes);

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

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
  console.log('🚀 AuraHub Loader Platform');
  console.log(`📍 Running on http://0.0.0.0:${PORT}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('========================================');
});
