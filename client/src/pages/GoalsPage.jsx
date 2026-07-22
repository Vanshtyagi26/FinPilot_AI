import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { api } from '../api/client';
import ProgressBar from '../components/ui/ProgressBar';
import { formatDate, formatMoney } from '../utils/format';
import '../App.css';
import '../components/Layout.css';

const emptyForm = {
  title: '',
  targetAmount: '',
  deadline: '',
  currentAmount: '0',
  notes: '',
};

export default function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError('');
    try {
      const { data } = await api.get('/goals');
      setGoals(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(g) {
    setEditingId(g._id);
    setForm({
      title: g.title,
      targetAmount: String(g.targetAmount),
      deadline: new Date(g.deadline).toISOString().slice(0, 10),
      currentAmount: String(g.currentAmount ?? 0),
      notes: g.notes || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const payload = {
      title: form.title.trim(),
      targetAmount: Number(form.targetAmount),
      deadline: form.deadline,
      currentAmount: Number(form.currentAmount || 0),
      notes: form.notes.trim(),
    };
    try {
      if (editingId) {
        await api.put(`/goals/${editingId}`, payload);
        toast.success('Goal updated');
      } else {
        await api.post('/goals', payload);
        toast.success('Goal created');
      }
      cancelEdit();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this goal?')) return;
    try {
      await api.delete(`/goals/${id}`);
      if (editingId === id) cancelEdit();
      await load();
      toast.success('Goal deleted');
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    }
  }

  if (loading) {
    return <p className="muted">Loading goals…</p>;
  }

  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">Financial goals</h1>
        <Link to="/" className="btn btn-ghost">
          Back to dashboard
        </Link>
      </div>
      {error ? <p className="form-error">{error}</p> : null}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 className="card-title">{editingId ? 'Edit goal' : 'New goal'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="g-title">Title</label>
              <input id="g-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="form-group">
              <label htmlFor="g-target">Target amount</label>
              <input
                id="g-target"
                type="number"
                min="0.01"
                step="0.01"
                value={form.targetAmount}
                onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="g-deadline">Deadline</label>
              <input id="g-deadline" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} required />
            </div>
            <div className="form-group">
              <label htmlFor="g-current">Saved so far</label>
              <input
                id="g-current"
                type="number"
                min="0"
                step="0.01"
                value={form.currentAmount}
                onChange={(e) => setForm({ ...form, currentAmount: e.target.value })}
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="g-notes">Notes (optional)</label>
            <textarea id="g-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              {editingId ? 'Update goal' : 'Create goal'}
            </button>
            {editingId ? (
              <button type="button" className="btn btn-ghost" onClick={cancelEdit}>
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>
      </div>

      <div className="goals-grid">
        {goals.map((g) => (
          <div key={g._id} className="card goal-card">
            <div className="goal-card-head">
              <h3>{g.title}</h3>
              <span className="muted goal-deadline">Due {formatDate(g.deadline)}</span>
            </div>
            <p className="goal-money">
              <strong>{formatMoney(g.currentAmount)}</strong> <span className="muted">of {formatMoney(g.targetAmount)}</span>
            </p>
            <ProgressBar value={g.currentAmount} max={g.targetAmount} tone="income" />
            <ul className="goal-meta">
              <li>
                <span className="muted">Progress</span> {g.progressPercent}%
              </li>
              {g.estimatedCompletionDate ? (
                <li>
                  <span className="muted">Est. completion</span> {formatDate(g.estimatedCompletionDate)}
                </li>
              ) : null}
              {g.onTrackVsDeadline === false ? (
                <li className="goal-warn">Behind pace for the deadline — consider increasing contributions.</li>
              ) : null}
            </ul>
            <p className="muted goal-pace">{g.paceNote}</p>
            {g.notes ? <p className="goal-notes">{g.notes}</p> : null}
            <div className="row-actions" style={{ marginTop: '0.75rem' }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => startEdit(g)}>
                Edit
              </button>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDelete(g._id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {!goals.length ? <p className="muted">No goals yet. Use the form above to add your first target.</p> : null}
    </div>
  );
}
