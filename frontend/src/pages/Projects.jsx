import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [error, setError] = useState('');

  const load = () => {
    api.get('/projects').then(res => {
      setProjects(res.data);
      setLoading(false);
    });
  };
  useEffect(load, []);

  const createProject = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/projects', form);
      setShowModal(false);
      setForm({ name: '', description: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create project');
    }
  };

  return (
    <div>
      <div className="top-bar">
        <div>
          <div className="page-title">📁 Projects</div>
          <div className="page-subtitle">Manage your team projects</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Project</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', paddingTop: 40 }}>Loading...</div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📁</div>
          <p>No projects yet. Create your first project!</p>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map(p => (
            <Link key={p.id} to={`/projects/${p.id}`} className="project-card">
              <div className="project-name">{p.name}</div>
              <div className="project-desc">{p.description || 'No description'}</div>
              <div className="project-meta">
                <span>👤 {p.owner_name}</span>
                <span>✅ {p.task_count} tasks</span>
                <span>👥 {p.member_count} members</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Create New Project</div>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={createProject}>
              <div className="form-group">
                <label className="form-label">Project Name *</label>
                <input
                  className="form-input"
                  placeholder="e.g. Marketing Campaign Q3"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  placeholder="What is this project about?"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Project</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
