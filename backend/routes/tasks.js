const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/auth');

// Helper: check if user has access to a project
const hasProjectAccess = async (projectId, userId) => {
  const result = await pool.query(
    `SELECT 1 FROM projects p WHERE p.id=$1 AND (
      p.owner_id=$2 OR EXISTS (
        SELECT 1 FROM project_members WHERE project_id=$1 AND user_id=$2
      )
    )`, [projectId, userId]
  );
  return result.rows.length > 0;
};

// GET /api/tasks/dashboard - dashboard summary for logged-in user
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const myTasks = await pool.query(`
      SELECT t.*, p.name AS project_name, u.name AS assigned_name
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.assigned_to = $1
      ORDER BY t.due_date ASC NULLS LAST
    `, [req.user.id]);

    const overdue = myTasks.rows.filter(
      t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
    );

    const stats = {
      total: myTasks.rows.length,
      todo: myTasks.rows.filter(t => t.status === 'todo').length,
      in_progress: myTasks.rows.filter(t => t.status === 'in_progress').length,
      done: myTasks.rows.filter(t => t.status === 'done').length,
      overdue: overdue.length,
    };

    res.json({ tasks: myTasks.rows, stats, overdue });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/tasks/project/:projectId - tasks for a project
router.get('/project/:projectId', authenticate, async (req, res) => {
  try {
    const access = await hasProjectAccess(req.params.projectId, req.user.id);
    if (!access) return res.status(403).json({ error: 'Access denied' });

    const result = await pool.query(`
      SELECT t.*, u.name AS assigned_name, uc.name AS creator_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN users uc ON t.created_by = uc.id
      WHERE t.project_id = $1
      ORDER BY t.created_at DESC
    `, [req.params.projectId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tasks - create task
router.post('/', authenticate, async (req, res) => {
  const { title, description, project_id, assigned_to, due_date } = req.body;
  if (!title || !project_id)
    return res.status(400).json({ error: 'Title and project_id are required' });

  try {
    const access = await hasProjectAccess(project_id, req.user.id);
    if (!access) return res.status(403).json({ error: 'Access denied' });

    // Only admin or owner can assign tasks to others
    const proj = await pool.query('SELECT owner_id FROM projects WHERE id=$1', [project_id]);
    const isOwnerOrAdmin = proj.rows[0]?.owner_id === req.user.id || req.user.role === 'admin';
    const finalAssignee = isOwnerOrAdmin ? (assigned_to || req.user.id) : req.user.id;

    const result = await pool.query(`
      INSERT INTO tasks (title, description, project_id, assigned_to, created_by, due_date)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [title, description, project_id, finalAssignee, req.user.id, due_date || null]);

    const task = result.rows[0];
    const withUser = await pool.query(`
      SELECT t.*, u.name AS assigned_name FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id WHERE t.id = $1
    `, [task.id]);
    res.status(201).json(withUser.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/tasks/:id - update task
router.put('/:id', authenticate, async (req, res) => {
  const { title, description, status, assigned_to, due_date } = req.body;
  const validStatuses = ['todo', 'in_progress', 'done'];

  try {
    const task = await pool.query('SELECT * FROM tasks WHERE id=$1', [req.params.id]);
    if (!task.rows.length) return res.status(404).json({ error: 'Task not found' });

    const access = await hasProjectAccess(task.rows[0].project_id, req.user.id);
    if (!access) return res.status(403).json({ error: 'Access denied' });

    if (status && !validStatuses.includes(status))
      return res.status(400).json({ error: 'Invalid status' });

    const t = task.rows[0];
    const result = await pool.query(`
      UPDATE tasks SET
        title = $1, description = $2, status = $3,
        assigned_to = $4, due_date = $5
      WHERE id = $6 RETURNING *
    `, [
      title || t.title,
      description ?? t.description,
      status || t.status,
      assigned_to || t.assigned_to,
      due_date !== undefined ? due_date : t.due_date,
      req.params.id
    ]);

    const updated = await pool.query(`
      SELECT t.*, u.name AS assigned_name FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id WHERE t.id = $1
    `, [req.params.id]);
    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/tasks/:id - delete task
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const task = await pool.query('SELECT * FROM tasks WHERE id=$1', [req.params.id]);
    if (!task.rows.length) return res.status(404).json({ error: 'Task not found' });

    const proj = await pool.query('SELECT owner_id FROM projects WHERE id=$1', [task.rows[0].project_id]);
    const isOwnerOrAdmin = proj.rows[0]?.owner_id === req.user.id || req.user.role === 'admin';
    const isCreator = task.rows[0].created_by === req.user.id;

    if (!isOwnerOrAdmin && !isCreator)
      return res.status(403).json({ error: 'Only owner or creator can delete' });

    await pool.query('DELETE FROM tasks WHERE id=$1', [req.params.id]);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
