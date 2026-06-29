const express = require('express');
const router = express.Router();
const db = require('../database/database');
const auth = require('../middlewares/auth');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

// Get all users
router.get('/', auth.authenticate, auth.requireRole(['admin', 'moderator']), async (req, res) => {
  try {
    const users = await db.query(
      'SELECT id, username, email, role, status, createdAt, lastLogin FROM users ORDER BY createdAt DESC'
    );
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get single user
router.get('/:id', auth.authenticate, async (req, res) => {
  try {
    const user = await db.get(
      'SELECT id, username, email, role, status, createdAt, lastLogin FROM users WHERE id = ?',
      [req.params.id]
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (req.user.id !== user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user
router.put('/:id', auth.authenticate, async (req, res) => {
  try {
    const userId = req.params.id;
    const { username, email, role, status } = req.body;

    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (req.user.id !== parseInt(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    if ((role || status) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can change role and status' });
    }

    const updates = [];
    const params = [];

    if (username && username !== user.username) {
      const existing = await db.get('SELECT * FROM users WHERE username = ? AND id != ?', [username, userId]);
      if (existing) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      updates.push('username = ?');
      params.push(username);
    }

    if (email !== undefined && email !== user.email) {
      updates.push('email = ?');
      params.push(email);
    }

    if (role && req.user.role === 'admin') {
      updates.push('role = ?');
      params.push(role);
    }

    if (status && req.user.role === 'admin') {
      updates.push('status = ?');
      params.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(userId);
    await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    const updated = await db.get(
      'SELECT id, username, email, role, status, createdAt, lastLogin FROM users WHERE id = ?',
      [userId]
    );

    res.json({ success: true, data: updated, message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
router.delete('/:id', auth.authenticate, auth.requireRole(['admin']), async (req, res) => {
  try {
    const userId = req.params.id;

    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await db.run('DELETE FROM users WHERE id = ?', [userId]);

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
