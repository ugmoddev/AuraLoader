require('dotenv').config();
const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const session = require('express-session');
const path = require('path');

console.log('🚀 Starting AuraHub Server...');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
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
  secret: process.env.SESSION_SECRET || 'default_secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Static files
app.use('/public', express.static(path.join(__dirname, 'public')));

// Database
console.log('📦 Initializing database...');
const db = require('./database/database');
console.log('✅ Database initialized');

// ============================================================
// ROUTES - QUAN TRỌNG: API TRƯỚC, VIEWS SAU
// ============================================================

console.log('📄 Loading routes...');

// 1. API ROUTES (always first)
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const loaderRoutes = require('./routes/loader');
const cdnRoutes = require('./routes/cdn');
const adminRoutes = require('./routes/admin');
const scriptRoutes = require('./routes/scripts');
const userRoutes = require('./routes/users');

app.use('/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/loader', loaderRoutes);
app.use('/cdn', cdnRoutes);
app.use('/admin', adminRoutes);
app.use('/scripts', scriptRoutes);
app.use('/users', userRoutes);

// 2. VIEW ROUTES (always last)
const viewRoutes = require('./routes/views');
app.use('/', viewRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('========================================');
  console.log('🚀 AuraHub Loader Platform');
  console.log(`📍 http://localhost:${PORT}`);
  console.log('========================================');
});
