import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { api } from "../api/client";
import { formatDate, formatMoney } from "../utils/format";

const defaultQuickForm = {
  type: "expense",
  transactionKind: "one_time",
  amount: "",
  category: "",
  date: new Date().toISOString().slice(0, 10),
  description: "",
};

const QUICK_CATEGORY_OPTIONS = [
  "Food",
  "Rent",
  "Transport",
  "Shopping",
  "Utilities",
  "Health",
  "Education",
  "Entertainment",
  "Salary",
  "Freelance",
  "Bonus",
  "Other",
];

export default function TransactionsPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quickForm, setQuickForm] = useState(defaultQuickForm);
  const [quickError, setQuickError] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  async function loadTransactions() {
    setLoading(true);
    try {
      const { data } = await api.get("/transactions");
      setTransactions(data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions();
  }, []);

  const categories = useMemo(() => {
    return Array.from(new Set(transactions.map((t) => t.category))).sort();
  }, [transactions]);

  const categorySuggestions = useMemo(() => {
    return Array.from(new Set([...QUICK_CATEGORY_OPTIONS, ...categories]));
  }, [categories]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (categoryFilter !== "all" && t.category !== categoryFilter)
        return false;
      if (fromDate && new Date(t.date) < new Date(fromDate)) return false;
      if (toDate && new Date(t.date) > new Date(`${toDate}T23:59:59`))
        return false;
      return true;
    });
  }, [transactions, categoryFilter, fromDate, toDate]);

  function updateQuickField(key, value) {
    setQuickForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleQuickAdd(e) {
    e.preventDefault();
    setQuickError("");
    setQuickSaving(true);

    const payload = {
      ...quickForm,
      amount: Number(quickForm.amount),
      category: quickForm.category.trim(),
      date: quickForm.date,
      description: quickForm.description.trim(),
    };

    if (!payload.category) {
      setQuickError("Category is required");
      setQuickSaving(false);
      return;
    }
    if (Number.isNaN(payload.amount) || payload.amount < 0) {
      setQuickError("Enter a valid amount");
      setQuickSaving(false);
      return;
    }

    try {
      await api.post("/transactions", payload);
      toast.success("Transaction added");
      setQuickForm({
        ...defaultQuickForm,
        date: new Date().toISOString().slice(0, 10),
      });
      await loadTransactions();
    } catch (err) {
      setQuickError(err.response?.data?.message || "Failed to add transaction");
    } finally {
      setQuickSaving(false);
    }
  }

  async function handleImport(e) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("file", selectedFile);
    setImporting(true);

    try {
      const { data } = await api.post("/transactions/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(data.message || "Transactions imported");
      await loadTransactions();
    } catch (err) {
      toast.error(err.response?.data?.message || "Import failed");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this transaction?")) return;
    try {
      await api.delete(`/transactions/${id}`);
      toast.success("Transaction deleted");
      await loadTransactions();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-subtitle muted">
            Track and filter your spending activity.
          </p>
        </div>
        <div className="row-actions">
          <Link
            to="/transactions/new"
            className="btn btn-ghost"
            style={{ textDecoration: "none" }}
          >
            Full form
          </Link>
        </div>
      </div>

      <div className="card quick-actions-card">
        <div className="card-head">
          <div>
            <h3 className="card-title">Quick add</h3>
            <p className="page-subtitle muted">
              Capture a transaction in seconds and import records from Excel
              when needed.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            {importing ? "Importing…" : "Import Excel"}
          </button>
        </div>

        <form className="quick-add-grid" onSubmit={handleQuickAdd}>
          <div className="form-group quick-add-field">
            <label htmlFor="quickType">Type</label>
            <select
              id="quickType"
              value={quickForm.type}
              onChange={(e) => updateQuickField("type", e.target.value)}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
          <div className="form-group quick-add-field">
            <label htmlFor="quickKind">Frequency</label>
            <select
              id="quickKind"
              value={quickForm.transactionKind}
              onChange={(e) =>
                updateQuickField("transactionKind", e.target.value)
              }
            >
              <option value="one_time">One-time</option>
              <option value="recurring">Recurring</option>
            </select>
          </div>
          <div className="form-group quick-add-field">
            <label htmlFor="quickAmount">Amount</label>
            <input
              id="quickAmount"
              type="number"
              step="0.01"
              min="0"
              value={quickForm.amount}
              onChange={(e) => updateQuickField("amount", e.target.value)}
              required
            />
          </div>
          <div className="form-group quick-add-field">
            <label htmlFor="quickCategory">Category</label>
            <input
              id="quickCategory"
              list="quickCategoryOptions"
              value={quickForm.category}
              onChange={(e) => updateQuickField("category", e.target.value)}
              placeholder="e.g. Food"
              required
            />
            <datalist id="quickCategoryOptions">
              {categorySuggestions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>
          <div className="form-group quick-add-field">
            <label htmlFor="quickDate">Date</label>
            <input
              id="quickDate"
              type="date"
              value={quickForm.date}
              onChange={(e) => updateQuickField("date", e.target.value)}
              required
            />
          </div>
          <div className="form-group quick-add-field full-width">
            <label htmlFor="quickDescription">Description</label>
            <input
              id="quickDescription"
              type="text"
              value={quickForm.description}
              onChange={(e) => updateQuickField("description", e.target.value)}
              placeholder="Optional note"
            />
          </div>
          <div className="quick-add-actions full-width">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={quickSaving}
            >
              {quickSaving ? "Saving…" : "Save transaction"}
            </button>
            <span className="upload-hint muted">
              Supported files: .csv, .xlsx, .xls
            </span>
          </div>
          {quickError ? (
            <p className="form-error full-width">{quickError}</p>
          ) : null}
        </form>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          hidden
          onChange={handleImport}
        />
      </div>

      <div className="card filters-row">
        <div className="form-group" style={{ margin: 0 }}>
          <label htmlFor="txCategory">Category</label>
          <select
            id="txCategory"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label htmlFor="txFrom">From</label>
          <input
            id="txFrom"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label htmlFor="txTo">To</label>
          <input
            id="txTo"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      {loading ? (
        <div className="skeleton-table">
          <div className="skeleton-line" />
          <div className="skeleton-line" />
          <div className="skeleton-line" />
        </div>
      ) : (
        <div className="card table-card">
          <div className="table-wrap">
            {!filtered.length ? (
              <p className="muted">No transactions match your filters.</p>
            ) : (
              <table className="data">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Frequency</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t._id}>
                      <td>{formatDate(t.date)}</td>
                      <td>
                        <span className={`badge ${t.type}`}>{t.type}</span>
                      </td>
                      <td>
                        <span className="muted">
                          {t.transactionKind === "recurring"
                            ? "Recurring"
                            : "One-time"}
                        </span>
                      </td>
                      <td>{t.category}</td>
                      <td>{t.description || "—"}</td>
                      <td
                        style={{
                          fontWeight: 700,
                          color:
                            t.type === "income"
                              ? "var(--income)"
                              : "var(--danger)",
                        }}
                      >
                        {t.type === "expense" ? "-" : "+"}
                        {formatMoney(t.amount)}
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() =>
                              navigate(`/transactions/${t._id}/edit`)
                            }
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(t._id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
