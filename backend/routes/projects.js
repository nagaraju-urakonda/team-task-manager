const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/auth');

// GET /api/projects - list projects user belongs to
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, u.name AS owner_name,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) AS task_count,
        (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) AS member_count
      FROM projects p
      JOIN users u ON p.owner_id = u.id
      WHERE p.owner_id = $1
         OR p.id IN (SELECT project_id FROM project_members WHERE user_id = $1)
      ORDER BY p.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/projects - create project (any authenticated user)
router.post('/', authenticate, async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name is required' });
  try {
    const result = await pool.query(
      'INSERT INTO projects (name, description, owner_id) VALUES ($1, $2, $3) RETURNING *',
      [name, description, req.user.id]
    );
    // Add owner as member too
    await pool.query(
      'INSERT INTO project_members (project_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [result.rows[0].id, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/projects/:id - project detail with members and tasks
router.get('/:id', authenticate, async (req, res) => {
  try {
    const proj = await pool.query(`
      SELECT p.*, u.name AS owner_name FROM projects p
      JOIN users u ON p.owner_id = u.id WHERE p.id = $1
    `, [req.params.id]);
    if (!proj.rows.length) return res.status(404).json({ error: 'Project not found' });

    // Check access
    const access = await pool.query(
      'SELECT 1 FROM project_members WHERE project_id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    );
    const isOwner = proj.rows[0].owner_id === req.user.id;
    if (!access.rows.length && !isOwner)
      return res.status(403).json({ error: 'Access denied' });

    const members = await pool.query(`
      SELECT u.id, u.name, u.email, u.role FROM users u
      JOIN project_members pm ON pm.user_id = u.id
      WHERE pm.project_id = $1
    `, [req.params.id]);

    const tasks = await pool.query(`
      SELECT t.*, u.name AS assigned_name FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.project_id = $1 ORDER BY t.created_at DESC
    `, [req.params.id]);

    res.json({ project: proj.rows[0], members: members.rows, tasks: tasks.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/projects/:id - update project (owner only)
router.put('/:id', authenticate, async (req, res) => {
  const { name, description } = req.body;
  try {
    const proj = await pool.query('SELECT * FROM projects WHERE id=$1', [req.params.id]);
    if (!proj.rows.length) return res.status(404).json({ error: 'Not found' });
    if (proj.rows[0].owner_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Only owner can update' });

    const result = await pool.query(
      'UPDATE projects SET name=$1, description=$2 WHERE id=$3 RETURNING *',
      [name || proj.rows[0].name, description ?? proj.rows[0].description, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/projects/:id - delete (owner or admin)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const proj = await pool.query('SELECT * FROM projects WHERE id=$1', [req.params.id]);
    if (!proj.rows.length) return res.status(404).json({ error: 'Not found' });
    if (proj.rows[0].owner_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Only owner can delete' });

    await pool.query('DELETE FROM projects WHERE id=$1', [req.params.id]);
    res.json({ message: 'Project deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/projects/:id/members - add member (owner or admin)
router.post('/:id/members', authenticate, async (req, res) => {
  const { email } = req.body;
  try {
    const proj = await pool.query('SELECT * FROM projects WHERE id=$1', [req.params.id]);
    if (!proj.rows.length) return res.status(404).json({ error: 'Project not found' });
    if (proj.rows[0].owner_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Only owner can add members' });

    const user = await pool.query('SELECT id, name, email FROM users WHERE email=$1', [email]);
    if (!user.rows.length) return res.status(404).json({ error: 'User not found' });

    await pool.query(
      'INSERT INTO project_members (project_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.params.id, user.rows[0].id]
    );
    res.json({ message: 'Member added', user: user.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/projects/:id/members/:userId - remove member
router.delete('/:id/members/:userId', authenticate, async (req, res) => {
  try {
    const proj = await pool.query('SELECT * FROM projects WHERE id=$1', [req.params.id]);
    if (!proj.rows.length) return res.status(404).json({ error: 'Project not found' });
    if (proj.rows[0].owner_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Only owner can remove members' });

    await pool.query(
      'DELETE FROM project_members WHERE project_id=$1 AND user_id=$2',
      [req.params.id, req.params.userId]
    );
    res.json({ message: 'Member removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
