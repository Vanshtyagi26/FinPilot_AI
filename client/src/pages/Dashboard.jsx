import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import CategoryExpenseChart from "../components/dashboard/CategoryExpenseChart";
import GoalSnapshot from "../components/dashboard/GoalSnapshot";
import InsightCard from "../components/dashboard/InsightCard";
import MonthlyBarChart from "../components/dashboard/MonthlyBarChart";
import SavingsRatioPanel from "../components/dashboard/SavingsRatioPanel";
import TrendCharts from "../components/dashboard/TrendCharts";
import AIForecastPanel from "../components/dashboard/AIForecastPanel";
import { formatDate, formatMoney } from "../utils/format";
import "../App.css";
import "../components/Layout.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [insights, setInsights] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [aiReport, setAiReport] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [insightsBusy, setInsightsBusy] = useState(false);

  const loadAll = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const [dashRes, txRes, goalsRes, reminderRes] = await Promise.all([
        api.get("/analytics/dashboard"),
        api.get("/transactions"),
        api.get("/goals"),
        api.get("/transactions/reminders"),
      ]);
      setAnalytics(dashRes.data);
      setTransactions(txRes.data);
      setGoals(goalsRes.data);
      setReminders(reminderRes.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAiLatest = useCallback(async () => {
    try {
      const { data } = await api.get("/ai/latest");
      setAiReport(data.report);
    } catch {
      /* optional */
    }
  }, []);

  const refreshInsights = useCallback(async () => {
    setInsightsBusy(true);
    try {
      const { data } = await api.get("/insights?refresh=true");
      setInsights(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to refresh insights");
    } finally {
      setInsightsBusy(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!loading) {
      refreshInsights();
      loadAiLatest();
    }
  }, [loading, refreshInsights, loadAiLatest]);

  async function handleDelete(id) {
    if (!window.confirm("Delete this transaction?")) return;
    try {
      await api.delete(`/transactions/${id}`);
      setTransactions((prev) => prev.filter((t) => t._id !== id));
      await loadAll();
      await refreshInsights();
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
    }
  }

  async function handleMarkRead(insightId) {
    try {
      await api.patch(`/insights/${insightId}/read`, { read: true });
      setInsights((prev) =>
        prev.map((i) => (i._id === insightId ? { ...i, read: true } : i)),
      );
    } catch {
      /* ignore */
    }
  }

  const totals = analytics?.totals?.allTime;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle muted">
            Analytics, AI forecasts, goals, and recommendations
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={insightsBusy}
          onClick={refreshInsights}
        >
          {insightsBusy ? "Refreshing…" : "Refresh insights"}
        </button>
      </div>
      {error ? <p className="form-error">{error}</p> : null}

      {loading || !analytics ? (
        <p className="muted">Loading analytics…</p>
      ) : (
        <>
          <div className="stats-grid stats-grid-4">
            <div className="card stat-card">
              <h3>Total income</h3>
              <p className="value income">{formatMoney(totals?.income ?? 0)}</p>
            </div>
            <div className="card stat-card">
              <h3>Total expenses</h3>
              <p className="value expense">
                {formatMoney(totals?.expense ?? 0)}
              </p>
            </div>
            <div className="card stat-card">
              <h3>Net savings</h3>
              <p className="value net">{formatMoney(totals?.net ?? 0)}</p>
            </div>
            <div className="card stat-card">
              <h3>Last 90 days net</h3>
              <p className="value net">
                {formatMoney(analytics.totals?.last90Days?.net ?? 0)}
              </p>
            </div>
          </div>

          <AIForecastPanel report={aiReport} onReportChange={setAiReport} />

          <div className="dashboard-grid">
            <section className="dash-col-main">
              <div className="card chart-card">
                <h2 className="card-title">Monthly income vs expenses</h2>
                <MonthlyBarChart monthlyTrend={analytics.monthlyTrend} />
              </div>

              <div className="card chart-card">
                <h2 className="card-title">Category expense mix (90 days)</h2>
                <CategoryExpenseChart
                  rows={analytics.categoryExpensesLast90Days}
                />
              </div>

              <div className="card chart-card">
                <h2 className="card-title">Trends</h2>
                <TrendCharts
                  monthlyTrend={analytics.monthlyTrend}
                  weeklyTrend={analytics.weeklyTrend}
                />
              </div>

              <div className="card">
                <div className="table-head">
                  <h2 className="card-title">Transactions</h2>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <Link
                      to="/transactions"
                      className="btn btn-ghost"
                      style={{
                        textDecoration: "none",
                        display: "inline-block",
                      }}
                    >
                      View all
                    </Link>
                    <Link
                      to="/transactions/new"
                      className="btn btn-primary"
                      style={{
                        textDecoration: "none",
                        display: "inline-block",
                      }}
                    >
                      Add transaction
                    </Link>
                  </div>
                </div>
                <div className="table-wrap">
                  {transactions.length === 0 ? (
                    <p className="muted">No transactions yet.</p>
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
                        {transactions.map((t) => (
                          <tr key={t._id}>
                            <td>{formatDate(t.date)}</td>
                            <td>
                              <span className={`badge ${t.type}`}>
                                {t.type}
                              </span>
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
                                fontWeight: 600,
                                color:
                                  t.type === "income"
                                    ? "var(--income)"
                                    : "var(--expense)",
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
            </section>

            <aside className="dash-col-aside">
              <div className="card">
                <SavingsRatioPanel
                  ratioFraction={analytics.savingsRatio?.last90Days}
                />
              </div>

              <div className="card">
                <div className="insight-section-head">
                  <h2 className="card-title">Upcoming reminders</h2>
                </div>
                {!reminders.length ? (
                  <p className="muted">No recurring reminders due soon.</p>
                ) : (
                  <div className="insight-stack">
                    {reminders.map((item) => (
                      <div key={item._id} className="insight-card">
                        <div className="insight-card-title">
                          {item.category}
                        </div>
                        <div className="insight-card-body">
                          <strong>
                            {item.type === "income" ? "+" : "-"}
                            {formatMoney(item.amount)}
                          </strong>
                          <span>
                            {item.description || "Recurring transaction"}
                          </span>
                        </div>
                        <div className="muted" style={{ fontSize: "0.84rem" }}>
                          Due {item.label} · {formatDate(item.nextDue)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card">
                <div className="insight-section-head">
                  <h2 className="card-title">Insights &amp; alerts</h2>
                </div>
                {!insights.length && !insightsBusy ? (
                  <p className="muted">No insights yet.</p>
                ) : (
                  <div className="insight-stack">
                    {insights.map((i) => (
                      <InsightCard
                        key={i._id}
                        insight={i}
                        onMarkRead={handleMarkRead}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="card">
                <GoalSnapshot goals={goals} />
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
