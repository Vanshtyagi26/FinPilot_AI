import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { api } from '../api/client';
import '../App.css';
import '../components/Layout.css';

const defaultForm = {
  type: 'expense',
  transactionKind: 'one_time',
  amount: '',
  category: '',
  date: new Date().toISOString().slice(0, 10),
  description: '',
};

const CATEGORY_OPTIONS = {
  income: ['Salary', 'Freelance', 'Investments', 'Bonus', 'Other income'],
  expense: ['Food', 'Rent', 'Transport', 'Shopping', 'Utilities', 'Health', 'Education', 'Entertainment', 'Other expense'],
};

export default function TransactionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/transactions/${id}`);
        if (cancelled) return;
        setForm({
          type: data.type,
          transactionKind: data.transactionKind || 'one_time',
          amount: String(data.amount),
          category: data.category,
          date: new Date(data.date).toISOString().slice(0, 10),
          description: data.description || '',
        });
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load transaction');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const payload = {
      type: form.type,
      transactionKind: form.transactionKind,
      amount: Number(form.amount),
      category: form.category,
      date: form.date,
      description: form.description,
    };
    if (Number.isNaN(payload.amount) || payload.amount < 0) {
      setError('Enter a valid amount');
      return;
    }
    try {
      if (isEdit) {
        await api.put(`/transactions/${id}`, payload);
        toast.success('Transaction updated');
      } else {
        await api.post('/transactions', payload);
        toast.success('Transaction added');
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    }
  }

  if (loading) {
    return <p className="muted">Loading…</p>;
  }

  return (
    <div>
      <h1 className="page-title">{isEdit ? 'Edit transaction' : 'Add transaction'}</h1>
      <div className="card" style={{ maxWidth: 480 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="type">Type</label>
            <select id="type" value={form.type} onChange={(e) => updateField('type', e.target.value)}>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="transactionKind">Transaction frequency</label>
            <select id="transactionKind" value={form.transactionKind} onChange={(e) => updateField('transactionKind', e.target.value)}>
              <option value="one_time">One-time</option>
              <option value="recurring">Recurring (monthly fixed)</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="amount">Amount</label>
            <input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={(e) => updateField('amount', e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select id="category" value={form.category} onChange={(e) => updateField('category', e.target.value)} required>
              <option value="" disabled>
                Select category
              </option>
              {(CATEGORY_OPTIONS[form.type] || []).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="date">Date</label>
            <input id="date" type="date" value={form.date} onChange={(e) => updateField('date', e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea id="description" value={form.description} onChange={(e) => updateField('description', e.target.value)} />
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            <button type="submit" className="btn btn-primary">
              {isEdit ? 'Save changes' : 'Add transaction'}
            </button>
            <Link to="/" className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center' }}>
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
