const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database/database');

// ============================================================
// MIDDLEWARE - Thêm CORS headers cho /auth/*
// ============================================================

router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ============================================================
// LOGIN - Với debug chi tiết
// ============================================================

router.post('/login', async (req, res) => {
  console.log('🔐 ===== LOGIN REQUEST =====');
  console.log('📥 Headers:', req.headers);
  console.log('📥 Body:', req.body);
  
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      console.log('❌ Missing username or password');
      return res.status(400).json({ 
        success: false, 
        error: 'Username and password required' 
      });
    }

    console.log(`🔍 Looking for user: ${username}`);
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    
    if (!user) {
      console.log('❌ User not found:', username);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }

    console.log('✅ User found, verifying password...');
    const valid = await bcrypt.compare(password, user.password);
    
    if (!valid) {
      console.log('❌ Invalid password for:', username);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }

    if (user.status !== 'active') {
      console.log('❌ Account disabled:', username);
      return res.status(403).json({ 
        success: false, 
        error: 'Account is disabled' 
      });
    }

    // Update last login
    await db.run('UPDATE users SET lastLogin = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    // Generate token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Lưu vào session
    req.session.token = token;
    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role
    };

    console.log('✅ Login successful for:', username);
    console.log('📤 Response:', { success: true, redirect: '/' });

    // =============================================
    // Kiểm tra Accept header để quyết định response
    // =============================================
    const accept = req.headers.accept || '';
    console.log(`📋 Accept header: ${accept}`);

    if (accept.includes('text/html')) {
      // Nếu là form submit, redirect trực tiếp
      console.log('🔄 HTML request, redirecting to /');
      return res.redirect('/');
    }

    // Nếu là AJAX/JSON, trả về JSON
    res.json({
      success: true,
      redirect: '/',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email || '',
          role: user.role
        }
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Login failed: ' + error.message 
    });
  }
});

// ============================================================
// REGISTER
// ============================================================

router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    console.log('📝 Register attempt:', username);

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username and password required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password must be at least 6 characters' 
      });
    }

    const existing = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username already taken' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await db.run(`
      INSERT INTO users (username, password, email, role)
      VALUES (?, ?, ?, 'user')
    `, [username, hashedPassword, email || '']);

    const user = await db.get('SELECT id, username, email, role FROM users WHERE id = ?', [result.lastID]);

    console.log('✅ User registered:', username);

    res.status(201).json({
      success: true,
      data: user,
      message: 'User registered successfully'
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Registration failed' 
    });
  }
});

// ============================================================
// GET CURRENT USER
// ============================================================

router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.session?.token;
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'No token provided' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await db.get('SELECT id, username, email, role, createdAt, lastLogin FROM users WHERE id = ?', [decoded.id]);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('❌ Auth error:', error);
    res.status(401).json({ 
      success: false, 
      error: 'Invalid token' 
    });
  }
});

// ============================================================
// LOGOUT
// ============================================================

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ 
    success: true, 
    message: 'Logged out successfully' 
  });
});

module.exports = router;
