const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticate, isAdmin } = require('../middleware/auth');

// GET /api/users/me - current user profile
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id=$1',
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users - list all users (admin only)
router.get('/', authenticate, isAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/search?q=email - search user by email (for adding members)
router.get('/search', authenticate, async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Search query required' });
  try {
    const result = await pool.query(
      "SELECT id, name, email FROM users WHERE email ILIKE $1 LIMIT 5",
      [`%${q}%`]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
