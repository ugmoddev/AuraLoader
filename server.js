require('dotenv').config();
const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

// Bắt lỗi toàn cục để log chi tiết
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log('Starting server...');

// Import database với try-catch để bắt lỗi
let db;
try {
  console.log('Initializing database...');
  db = require('./database/database');
  console.log('Database initialized successfully');
} catch (error) {
  console.error('Database initialization failed:', error);
  process.exit(1);
}

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
  secret: process.env.SESSION_SECRET || 'default_secret_change_me',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Static files
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/storage', express.static(path.join(__dirname, 'storage')));

// Routes
try {
  console.log('Loading routes...');
  const authRoutes = require('./routes/auth');
  const apiRoutes = require('./routes/api');
  const loaderRoutes = require('./routes/loader');
  const cdnRoutes = require('./routes/cdn');
  const adminRoutes = require('./routes/admin');
  const scriptRoutes = require('./routes/scripts');
  const userRoutes = require('./routes/users');
  const viewRoutes = require('./routes/views');

  app.use('/auth', authRoutes);
  app.use('/api', apiRoutes);
  app.use('/loader', loaderRoutes);
  app.use('/cdn', cdnRoutes);
  app.use('/admin', adminRoutes);
  app.use('/scripts', scriptRoutes);
  app.use('/users', userRoutes);
  app.use('/', viewRoutes);
  console.log('Routes loaded successfully');
} catch (error) {
  console.error('Routes loading failed:', error);
  process.exit(1);
}

// Error handling
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('========================================');
  console.log('🚀 AuraHub Loader Platform');
  console.log(`📍 Running on http://0.0.0.0:${PORT}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('========================================');
});
