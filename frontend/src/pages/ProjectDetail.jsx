import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const statusLabel = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };
const statusOrder = ['todo', 'in_progress', 'done'];

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('tasks');

  // Task modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', assigned_to: '', due_date: '', status: 'todo' });
  const [taskError, setTaskError] = useState('');

  // Member modal
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberError, setMemberError] = useState('');
  const [memberSuccess, setMemberSuccess] = useState('');

  const load = async () => {
    try {
      const res = await api.get(`/projects/${id}`);
      setProject(res.data.project);
      setMembers(res.data.members);
      setTasks(res.data.tasks);
    } catch {
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const isOwner = project?.owner_id === user?.id || user?.role === 'admin';

  const openCreateTask = () => {
    setEditTask(null);
    setTaskForm({ title: '', description: '', assigned_to: '', due_date: '', status: 'todo' });
    setTaskError('');
    setShowTaskModal(true);
  };

  const openEditTask = (task) => {
    setEditTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      assigned_to: task.assigned_to || '',
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
      status: task.status,
    });
    setTaskError('');
    setShowTaskModal(true);
  };

  const submitTask = async (e) => {
    e.preventDefault();
    setTaskError('');
    try {
      const payload = {
        ...taskForm,
        project_id: id,
        assigned_to: taskForm.assigned_to || null,
        due_date: taskForm.due_date || null,
      };
      if (editTask) {
        await api.put(`/tasks/${editTask.id}`, payload);
      } else {
        await api.post('/tasks', payload);
      }
      setShowTaskModal(false);
      load();
    } catch (err) {
      setTaskError(err.response?.data?.error || 'Failed to save task');
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };

  const deleteProject = async () => {
    if (!window.confirm('Delete this entire project?')) return;
    try {
      await api.delete(`/projects/${id}`);
      navigate('/projects');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete project');
    }
  };

  const addMember = async (e) => {
    e.preventDefault();
    setMemberError(''); setMemberSuccess('');
    try {
      const res = await api.post(`/projects/${id}/members`, { email: memberEmail });
      setMemberSuccess(`${res.data.user.name} added!`);
      setMemberEmail('');
      load();
    } catch (err) {
      setMemberError(err.response?.data?.error || 'Failed to add member');
    }
  };

  const removeMember = async (userId) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      await api.delete(`/projects/${id}/members/${userId}`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove member');
    }
  };

  if (loading) return <div style={{ textAlign: 'center', paddingTop: 60 }}>Loading...</div>;
  if (!project) return null;

  const tasksByStatus = statusOrder.reduce((acc, s) => {
    acc[s] = tasks.filter(t => t.status === s);
    return acc;
  }, {});

  const colClass = { todo: 'col-todo', in_progress: 'col-in_progress', done: 'col-done' };

  return (
    <div>
      <div className="breadcrumb">
        <Link to="/projects">Projects</Link>
        <span>›</span>
        {project.name}
      </div>

      <div className="top-bar">
        <div>
          <div className="page-title">{project.name}</div>
          <div className="page-subtitle">{project.description || 'No description'}</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {isOwner && (
            <>
              <button className="btn btn-outline btn-sm" onClick={() => { setShowMemberModal(true); setMemberError(''); setMemberSuccess(''); }}>
                👥 Members
              </button>
              <button className="btn btn-danger btn-sm" onClick={deleteProject}>🗑 Delete Project</button>
            </>
          )}
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${tab === 'tasks' ? 'active' : ''}`} onClick={() => setTab('tasks')}>
          ✅ Tasks ({tasks.length})
        </button>
        <button className={`tab-btn ${tab === 'kanban' ? 'active' : ''}`} onClick={() => setTab('kanban')}>
          📊 Board
        </button>
        <button className={`tab-btn ${tab === 'members' ? 'active' : ''}`} onClick={() => setTab('members')}>
          👥 Members ({members.length})
        </button>
      </div>

      {/* TASKS TAB */}
      {tab === 'tasks' && (
        <div className="card">
          <div className="section-header">
            <div className="section-title">All Tasks</div>
            <button className="btn btn-primary btn-sm" onClick={openCreateTask}>+ Add Task</button>
          </div>
          {tasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📝</div>
              <p>No tasks yet. Add the first task!</p>
            </div>
          ) : (
            <table className="tasks-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Assigned To</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(t => {
                  const isOverdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done';
                  return (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 500 }}>{t.title}</td>
                      <td style={{ fontSize: 13, color: '#64748b' }}>{t.assigned_name || '—'}</td>
                      <td><span className={`badge badge-${t.status}`}>{statusLabel[t.status]}</span></td>
                      <td>
                        {t.due_date ? (
                          <span className={`task-due ${isOverdue ? 'overdue' : ''}`}>
                            {new Date(t.due_date).toLocaleDateString()}{isOverdue && ' ⚠️'}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-outline btn-sm" onClick={() => openEditTask(t)}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => deleteTask(t.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* KANBAN TAB */}
      {tab === 'kanban' && (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary btn-sm" onClick={openCreateTask}>+ Add Task</button>
          </div>
          <div className="kanban">
            {statusOrder.map(status => (
              <div key={status} className={`task-col ${colClass[status]}`} style={{ flex: '1', minWidth: 220 }}>
                <div className="task-col-header">
                  <span>{statusLabel[status]}</span>
                  <span style={{ background: 'rgba(0,0,0,0.1)', borderRadius: 99, padding: '1px 8px', fontSize: 12 }}>
                    {tasksByStatus[status].length}
                  </span>
                </div>
                {tasksByStatus[status].map(t => {
                  const isOverdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done';
                  return (
                    <div key={t.id} className="task-item" onClick={() => openEditTask(t)}>
                      <div className="task-title">{t.title}</div>
                      {t.due_date && (
                        <div className={`task-due ${isOverdue ? 'overdue' : ''}`}>
                          📅 {new Date(t.due_date).toLocaleDateString()}{isOverdue && ' ⚠️'}
                        </div>
                      )}
                      {t.assigned_name && (
                        <div className="task-assignee">👤 {t.assigned_name}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MEMBERS TAB */}
      {tab === 'members' && (
        <div className="card">
          <div className="section-header">
            <div className="section-title">Team Members</div>
            {isOwner && (
              <button className="btn btn-primary btn-sm" onClick={() => { setShowMemberModal(true); setMemberError(''); setMemberSuccess(''); }}>
                + Add Member
              </button>
            )}
          </div>
          {members.length === 0 ? (
            <div className="empty-state"><p>No members yet.</p></div>
          ) : (
            <table className="tasks-table">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Role</th>{isOwner && <th>Action</th>}</tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 500 }}>{m.name} {m.id === project.owner_id && '👑'}</td>
                    <td style={{ fontSize: 13, color: '#64748b' }}>{m.email}</td>
                    <td><span className={`badge badge-${m.role}`}>{m.role}</span></td>
                    {isOwner && (
                      <td>
                        {m.id !== project.owner_id && (
                          <button className="btn btn-danger btn-sm" onClick={() => removeMember(m.id)}>Remove</button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TASK MODAL */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{editTask ? 'Edit Task' : 'Create Task'}</div>
            {taskError && <div className="alert alert-error">{taskError}</div>}
            <form onSubmit={submitTask}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input
                  className="form-input"
                  value={taskForm.title}
                  onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                  required placeholder="Task title"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  value={taskForm.description}
                  onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="Optional details"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Assign To</label>
                <select
                  className="form-select"
                  value={taskForm.assigned_to}
                  onChange={e => setTaskForm({ ...taskForm, assigned_to: e.target.value })}
                >
                  <option value="">— Select member —</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={taskForm.status}
                  onChange={e => setTaskForm({ ...taskForm, status: e.target.value })}
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input
                  className="form-input"
                  type="date"
                  value={taskForm.due_date}
                  onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowTaskModal(false)}>Cancel</button>
                {editTask && (
                  <button type="button" className="btn btn-danger" onClick={() => { deleteTask(editTask.id); setShowTaskModal(false); }}>
                    Delete
                  </button>
                )}
                <button type="submit" className="btn btn-primary">{editTask ? 'Save' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MEMBER MODAL */}
      {showMemberModal && (
        <div className="modal-overlay" onClick={() => setShowMemberModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Add Member by Email</div>
            {memberError && <div className="alert alert-error">{memberError}</div>}
            {memberSuccess && <div className="alert alert-success">{memberSuccess}</div>}
            <form onSubmit={addMember}>
              <div className="form-group">
                <label className="form-label">Email address</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="teammate@example.com"
                  value={memberEmail}
                  onChange={e => setMemberEmail(e.target.value)}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowMemberModal(false)}>Close</button>
                <button type="submit" className="btn btn-primary">Add Member</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
