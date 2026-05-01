import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const statusLabel = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/tasks/dashboard').then(res => {
      setData(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', paddingTop: 60 }}>Loading...</div>;

  const stats = data?.stats || {};
  const tasks = data?.tasks || [];
  const overdue = data?.overdue || [];

  return (
    <div>
      <div className="top-bar">
        <div>
          <div className="page-title">👋 Welcome back, {user?.name}!</div>
          <div className="page-subtitle">Here's what's on your plate today.</div>
        </div>
        <span className={`badge badge-${user?.role}`}>{user?.role}</span>
      </div>

      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-number">{stats.total || 0}</div>
          <div className="stat-label">Total Tasks</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.todo || 0}</div>
          <div className="stat-label">To Do</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-number">{stats.in_progress || 0}</div>
          <div className="stat-label">In Progress</div>
        </div>
        <div className="stat-card success">
          <div className="stat-number">{stats.done || 0}</div>
          <div className="stat-label">Done</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-number">{stats.overdue || 0}</div>
          <div className="stat-label">Overdue</div>
        </div>
      </div>

      {overdue.length > 0 && (
        <div className="card" style={{ marginBottom: 24, borderColor: '#fecaca' }}>
          <div className="section-header">
            <div className="section-title" style={{ color: '#ef4444' }}>🚨 Overdue Tasks</div>
          </div>
          {overdue.map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #fee2e2' }}>
              <span className="badge badge-overdue">overdue</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{t.title}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{t.project_name} · Due {new Date(t.due_date).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="section-header">
          <div className="section-title">📝 My Tasks</div>
          <Link to="/projects" className="btn btn-outline btn-sm">View Projects →</Link>
        </div>
        {tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✅</div>
            <p>No tasks assigned to you yet.</p>
          </div>
        ) : (
          <table className="tasks-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Project</th>
                <th>Status</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(t => {
                const isOverdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done';
                return (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 500 }}>{t.title}</td>
                    <td>
                      <Link to={`/projects/${t.project_id}`} style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: 13 }}>
                        {t.project_name}
                      </Link>
                    </td>
                    <td><span className={`badge badge-${t.status}`}>{statusLabel[t.status]}</span></td>
                    <td>
                      {t.due_date ? (
                        <span className={`task-due ${isOverdue ? 'overdue' : ''}`}>
                          {new Date(t.due_date).toLocaleDateString()}
                          {isOverdue && ' ⚠️'}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
