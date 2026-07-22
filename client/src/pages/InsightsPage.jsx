import { useEffect, useState } from 'react';
import { AlertTriangle, Bell, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../api/client';
import InsightCard from '../components/dashboard/InsightCard';

const PRIORITY_META = {
  high: { label: 'High', icon: AlertTriangle, tone: 'high' },
  medium: { label: 'Medium', icon: Bell, tone: 'medium' },
  low: { label: 'Low', icon: CheckCircle2, tone: 'low' },
};

export default function InsightsPage() {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadInsights();
  }, []);

  async function loadInsights() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/insights');
      setInsights(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  }

  async function refreshInsights() {
    setBusy(true);
    try {
      const { data } = await api.post('/insights/refresh');
      setInsights(data);
      toast.success('Insights refreshed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to refresh insights');
    } finally {
      setBusy(false);
    }
  }

  async function markRead(id) {
    try {
      await api.patch(`/insights/${id}/read`, { read: true });
      setInsights((prev) => prev.map((i) => (i._id === id ? { ...i, read: true } : i)));
    } catch {
      /* noop */
    }
  }

  const counters = insights.reduce(
    (acc, i) => {
      acc[i.priority] = (acc[i.priority] || 0) + 1;
      return acc;
    },
    { high: 0, medium: 0, low: 0 }
  );

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Insights & recommendations</h1>
          <p className="page-subtitle muted">Prioritized guidance generated from your latest financial data.</p>
        </div>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={refreshInsights}>
          {busy ? 'Refreshing…' : 'Refresh insights'}
        </button>
      </div>

      <div className="priority-grid">
        {Object.entries(PRIORITY_META).map(([key, meta]) => {
          const Icon = meta.icon;
          return (
            <div key={key} className={`card priority-chip ${meta.tone}`}>
              <div className="priority-chip-head">
                <Icon size={16} />
                <span>{meta.label}</span>
              </div>
              <strong>{counters[key] || 0}</strong>
            </div>
          );
        })}
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {loading ? (
        <div className="skeleton-list">
          <div className="skeleton-line" />
          <div className="skeleton-line" />
          <div className="skeleton-line" />
        </div>
      ) : !insights.length ? (
        <p className="muted">No insights available yet.</p>
      ) : (
        <div className="insight-stack">
          {insights.map((i) => (
            <InsightCard key={i._id} insight={i} onMarkRead={markRead} />
          ))}
        </div>
      )}
    </div>
  );
}
