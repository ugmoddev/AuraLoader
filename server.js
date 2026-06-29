require('dotenv').config();
const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

// Import database first to ensure tables are created
const db = require('./database/database');

const app = express();
const PORT = process.env.PORT || 3000;

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

// Import routes
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const loaderRoutes = require('./routes/loader');
const cdnRoutes = require('./routes/cdn');
const adminRoutes = require('./routes/admin');
const scriptRoutes = require('./routes/scripts');
const userRoutes = require('./routes/users');
const viewRoutes = require('./routes/views');

// Routes
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/loader', loaderRoutes);
app.use('/cdn', cdnRoutes);
app.use('/admin', adminRoutes);
app.use('/scripts', scriptRoutes);
app.use('/users', userRoutes);
app.use('/', viewRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`AuraHub Loader Platform running on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
});
