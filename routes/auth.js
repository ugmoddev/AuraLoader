const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database/database');

// ============================================================
// REGISTER - /auth/register
// ============================================================

router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    console.log('📝 Register attempt:', username);

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    const existing = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (existing) {
      return res.status(400).json({ success: false, error: 'Username already taken' });
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
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

// ============================================================
// LOGIN - /auth/login
// ============================================================

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log('🔐 Login attempt:', username);

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password required' });
    }

    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      console.log('❌ User not found:', username);
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      console.log('❌ Invalid password for:', username);
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, error: 'Account is disabled' });
    }

    await db.run('UPDATE users SET lastLogin = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('✅ Login successful for:', username);

    // Lưu vào session
    req.session.token = token;
    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role
    };

    res.json({
      success: true,
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
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// ============================================================
// GET CURRENT USER - /auth/me
// ============================================================

router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.session?.token;
    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await db.get('SELECT id, username, email, role, createdAt, lastLogin FROM users WHERE id = ?', [decoded.id]);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('❌ Auth error:', error);
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
});

// ============================================================
// LOGOUT - /auth/logout
// ============================================================

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;
