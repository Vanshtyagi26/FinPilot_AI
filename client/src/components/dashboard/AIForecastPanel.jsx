import { useCallback, useState } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../../api/client";
import { formatMoney } from "../../utils/format";
import "./AIForecastPanel.css";

function RiskPill({ risk }) {
  const sev = risk.severity || "medium";
  return (
    <div className={`ai-risk ai-risk-${sev}`}>
      <strong>{risk.title}</strong>
      <p>{risk.message}</p>
    </div>
  );
}

function MLRecCard({ rec }) {
  const p = rec.priority || "medium";
  return (
    <div className={`ai-ml-rec priority-${p}`}>
      <span className="ai-ml-badge">{rec.category || "general"}</span>
      <h4>{rec.title}</h4>
      <p>{rec.message}</p>
    </div>
  );
}

export default function AIForecastPanel({ report, onReportChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const runAnalysis = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/ai/refresh");
      onReportChange?.(data.report || null);
    } catch (err) {
      const msg =
        err.response?.data?.message || err.message || "AI analysis failed";
      setError(msg);
      if (err.response?.data?.report) {
        onReportChange?.(err.response.data.report);
      }
    } finally {
      setBusy(false);
    }
  }, [onReportChange]);

  const result = report?.result;
  const exp = result?.expense_forecast;
  const sav = result?.savings_forecast;
  const chartRows = buildChartRows(result);
  const summary = result?.summary;
  const actionItems = result?.action_items || result?.ml_recommendations || [];

  return (
    <div className="ai-panel card">
      <div className="ai-panel-head">
        <div>
          <h2 className="card-title">AI assistant</h2>
          <p className="muted ai-panel-sub">
            Predictions from sklearn linear regression on your monthly
            aggregates
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={runAnalysis}
        >
          {busy ? "Running…" : "Run AI analysis"}
        </button>
      </div>

      {report?.error ? <p className="form-error">{report.error}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      {!result ? (
        <p className="muted">
          Run an analysis to generate forecasts, ML-assisted suggestions, and
          risk flags (stored for your dashboard).
        </p>
      ) : (
        <>
          <div className="ai-stat-grid">
            <div className="ai-stat">
              <span className="muted">Next month expenses (est.)</span>
              <strong>
                {exp?.next_month != null ? formatMoney(exp.next_month) : "—"}
              </strong>
              <small className="muted">
                {exp?.method} · R² {exp?.r2_score != null ? exp.r2_score : "—"}{" "}
                · n={exp?.history_months ?? 0}
              </small>
            </div>
            <div className="ai-stat">
              <span className="muted">Next month net savings (est.)</span>
              <strong className={sav?.next_month_net < 0 ? "neg" : ""}>
                {sav?.next_month_net != null
                  ? formatMoney(sav.next_month_net)
                  : "—"}
              </strong>
              <small className="muted">
                {sav?.method} · slope {sav?.trend_slope ?? "—"}
              </small>
            </div>
            <div className="ai-stat">
              <span className="muted">Model</span>
              <strong>{result.model_version || "—"}</strong>
              <small className="muted">
                Updated{" "}
                {report.createdAt
                  ? new Date(report.createdAt).toLocaleString()
                  : ""}
              </small>
            </div>
          </div>

          {summary ? (
            <div className="ai-summary-card">
              <h3 className="ai-section-title">Assistant summary</h3>
              <p className="ai-summary-headline">{summary.headline}</p>
              <p className="muted ai-summary-detail">{summary.detail}</p>
              {actionItems.length ? (
                <ul className="ai-action-list">
                  {actionItems.slice(0, 3).map((item, index) => (
                    <li key={`${item.title}-${index}`}>
                      <strong>{item.title}</strong>
                      <span>{item.detail || item.message}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="ai-chart-block">
            <h3 className="ai-section-title">Expense history vs forecast</h3>
            {chartRows.length ? (
              <div className="chart-wrap chart-wrap-ai">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartRows}
                    margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e6ea" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(v) => (v == null ? "—" : formatMoney(v))}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      name="Actual expenses"
                      stroke="#d97706"
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="forecast"
                      name="Model (next)"
                      stroke="#0d9488"
                      strokeWidth={2}
                      dot
                      connectNulls
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="muted">Not enough monthly data to chart.</p>
            )}
          </div>

          {result.goal_forecasts?.length ? (
            <div className="ai-goals-block">
              <h3 className="ai-section-title">Goal completion outlook</h3>
              <div className="ai-goal-grid">
                {result.goal_forecasts.map((g) => (
                  <div key={g.goal_id} className="ai-goal-card">
                    <div className="ai-goal-title">{g.title}</div>
                    <div className="ai-prob-row">
                      <span>On-time probability</span>
                      <span>
                        {Math.round((g.probability_on_time || 0) * 100)}%
                      </span>
                    </div>
                    <div className="ai-prob-track">
                      <div
                        className="ai-prob-fill"
                        style={{
                          width: `${Math.min(100, (g.probability_on_time || 0) * 100)}%`,
                        }}
                      />
                    </div>
                    <ul className="ai-goal-meta muted">
                      <li>
                        Pred. monthly save:{" "}
                        {formatMoney(g.predicted_monthly_save || 0)}
                      </li>
                      <li>
                        Required / month:{" "}
                        {formatMoney(g.required_monthly_save || 0)}
                      </li>
                      <li>
                        Est. months left:{" "}
                        {g.predicted_months_to_complete ?? "—"}
                      </li>
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {result.risks?.length ? (
            <div className="ai-risks-block">
              <h3 className="ai-section-title">Risk detection</h3>
              <div className="ai-risk-stack">
                {result.risks.map((r) => (
                  <RiskPill key={r.code} risk={r} />
                ))}
              </div>
            </div>
          ) : (
            <p className="muted">
              No elevated risk flags from the current model snapshot.
            </p>
          )}

          {result.ml_recommendations?.length ? (
            <div className="ai-rec-block">
              <h3 className="ai-section-title">
                Personalized suggestions (ML-assisted)
              </h3>
              <div className="ai-rec-grid">
                {result.ml_recommendations.map((rec, idx) => (
                  <MLRecCard key={`${rec.title}-${idx}`} rec={rec} />
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function buildChartRows(result) {
  const series = result?.series;
  if (!series?.expense_actual?.length) return [];
  const rows = series.expense_actual.map((p) => ({
    month: p.month,
    actual: p.value,
    forecast: null,
  }));
  if (series.expense_predicted_next != null) {
    rows.push({
      month: "Next (est.)",
      actual: null,
      forecast: series.expense_predicted_next,
    });
  }
  return rows;
}
