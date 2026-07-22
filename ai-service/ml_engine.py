"""
FinPilot AI — rule-guided + sklearn models (linear regression on monthly aggregates).
ARIMA can be swapped in for residuals-heavy series; linear models are the default for stability on short histories.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression

_CURRENCY_SYMBOLS = {
    "USD": "$",
    "EUR": "EUR ",
    "INR": "₹",
    "GBP": "GBP ",
    "JPY": "JPY ",
    "AUD": "AUD ",
    "CAD": "CAD ",
    "SGD": "SGD ",
}


def _sigmoid(x: float) -> float:
    return float(1 / (1 + np.exp(-np.clip(x, -20, 20))))


def _parse_deadline(raw: str) -> datetime:
    s = str(raw).replace("Z", "+00:00")
    d = datetime.fromisoformat(s)
    if d.tzinfo is None:
        d = d.replace(tzinfo=timezone.utc)
    return d


def _fit_trend_line(values: np.ndarray) -> tuple[LinearRegression | None, float | None]:
    """Fit y ~ time index. Returns (model, r2) or (None, None) if insufficient data."""
    n = len(values)
    if n < 2:
        return None, None
    X = np.arange(n, dtype=float).reshape(-1, 1)
    y = values.astype(float)
    model = LinearRegression()
    model.fit(X, y)
    r2 = float(model.score(X, y)) if n >= 2 else None
    return model, r2


def _predict_next(model: LinearRegression, n_hist: int) -> float:
    return float(model.predict(np.array([[float(n_hist)]]))[0])


def _money(amount: float | int | None, symbol: str) -> str:
    if amount is None:
        return "—"
    return f"{symbol}{float(amount):,.0f}"


def build_predictions(data: dict[str, Any]) -> dict[str, Any]:
    monthly = data.get("monthly") or []
    goals_in = data.get("goals") or []
    categories = data.get("category_expenses_90d") or []
    income_volatility = float(data.get("income_volatility") or 0.0)
    currency_code = str(data.get("currency_code") or "USD").upper()
    currency_symbol = _CURRENCY_SYMBOLS.get(currency_code, "$")

    if not monthly:
        return {
            "model_version": "finpilot-ai/1.0.0",
            "expense_forecast": {
                "next_month": None,
                "method": "none",
                "history_months": 0,
                "r2_score": None,
                "note": "Need at least one month of data to forecast.",
            },
            "savings_forecast": {"next_month_net": None, "trend_slope": None, "method": "none"},
            "goal_forecasts": [],
            "ml_recommendations": [
                {
                    "title": "Add more history",
                    "message": "Log a few months of income and expenses so the models can learn your patterns.",
                    "priority": "medium",
                    "category": "data",
                }
            ],
            "risks": [],
            "series": {"expense_actual": [], "expense_predicted_next": None, "savings_actual": [], "savings_predicted_next": None},
        }

    df = pd.DataFrame(monthly)
    for col in ("income", "expense"):
        if col not in df.columns:
            df[col] = 0.0
    df["net"] = df["income"] - df["expense"]

    expenses = df["expense"].values
    nets = df["net"].values
    months = df["month"].tolist()

    exp_model, exp_r2 = _fit_trend_line(expenses)
    net_model, net_r2 = _fit_trend_line(nets)

    n = len(df)
    if exp_model is not None:
        next_exp = max(0.0, _predict_next(exp_model, n))
        exp_method = "linear_regression"
    else:
        next_exp = float(np.mean(expenses)) if n else None
        exp_method = "mean_fallback"
        exp_r2 = None

    if net_model is not None:
        next_net = float(_predict_next(net_model, n))
        slope = float(net_model.coef_[0])
        net_method = "linear_regression"
    else:
        next_net = float(np.mean(nets)) if n else None
        slope = None
        net_method = "mean_fallback"
        net_r2 = None

    # Risk: predicted cashflow
    last_income = float(df["income"].iloc[-1])
    avg_income_3m = float(df["income"].tail(min(3, n)).mean()) if n else last_income
    risks: list[dict[str, Any]] = []
    if next_exp is not None and avg_income_3m > 0 and next_exp > avg_income_3m * 1.05:
        risks.append(
            {
                "code": "predicted_expense_exceeds_income",
                "title": "Projected overspend",
                "message": f"Next-month expense trend (~{_money(next_exp, currency_symbol)}) is above your recent average monthly income (~{_money(avg_income_3m, currency_symbol)}).",
                "severity": "high",
            }
        )
    if income_volatility >= 0.4:
        risks.append(
            {
                "code": "income_instability",
                "title": "Volatile income",
                "message": "Income swings are elevated. Keep a larger emergency buffer and avoid locking new fixed costs.",
                "severity": "medium",
            }
        )
    if exp_model is not None and float(exp_model.coef_[0]) > 0 and n >= 4:
        risks.append(
            {
                "code": "expense_trend_rising",
                "title": "Rising expense trend",
                "message": "Monthly expenses are trending upward. Review subscriptions and variable categories.",
                "severity": "medium",
            }
        )

    # Goal forecasts + probability on-time
    goal_forecasts: list[dict[str, Any]] = []
    now = datetime.now(timezone.utc)
    predicted_monthly_save = max(0.0, next_net) if next_net is not None else max(0.0, float(np.mean(nets[-3:])) if n else 0.0)

    for g in goals_in:
        gid = str(g.get("id"))
        title = str(g.get("title") or "Goal")
        target = float(g.get("target_amount") or 0)
        current = float(g.get("current_amount") or 0)
        remaining = max(0.0, target - current)
        deadline = _parse_deadline(str(g.get("deadline")))
        months_left = max(1.0, (deadline - now).days / 30.0)
        required_monthly = remaining / months_left if remaining > 0 else 0.0

        if remaining <= 0:
            prob = 1.0
            pred_months = 0.0
        elif predicted_monthly_save <= 0:
            prob = 0.05
            pred_months = None
        else:
            pred_months = remaining / predicted_monthly_save
            # Probability on-time: compare required vs predicted savings rate
            prob = _sigmoid((predicted_monthly_save - required_monthly) / (required_monthly + 1e-6))

        goal_forecasts.append(
            {
                "goal_id": gid,
                "title": title,
                "probability_on_time": round(prob, 3),
                "predicted_months_to_complete": round(pred_months, 2) if pred_months is not None else None,
                "required_monthly_save": round(required_monthly, 2),
                "predicted_monthly_save": round(predicted_monthly_save, 2),
            }
        )

    # ML-style recommendations (features -> text templates)
    recs: list[dict[str, Any]] = []
    top_cat = sorted(categories, key=lambda x: float(x.get("amount", 0)), reverse=True)[:1]
    if top_cat:
        pct = float(top_cat[0].get("percentOfExpense") or top_cat[0].get("percent_of_expense") or 0)
        name = str(top_cat[0].get("category") or "a top category")
        if pct >= 25:
            recs.append(
                {
                    "title": "Optimize a dominant category",
                    "message": f"{name} is roughly {pct:.0f}% of recent spending. Try a 10% reduction experiment for 30 days.",
                    "priority": "high" if pct >= 35 else "medium",
                    "category": "spending",
                }
            )

    if next_net is not None and next_net < 0:
        recs.append(
            {
                "title": "Boost savings trajectory",
                "message": "Forecasted net savings next month is negative. Automate a small transfer on payday before discretionary spend.",
                "priority": "high",
                "category": "savings",
            }
        )
    elif next_net is not None and next_net > 0 and avg_income_3m > 0 and (next_net / avg_income_3m) < 0.15:
        recs.append(
            {
                "title": "Increase savings rate",
                "message": "Modeled savings are under 15% of recent average income next month. Incrementally raise auto-save by 2–5%.",
                "priority": "medium",
                "category": "savings",
            }
        )

    if exp_model is not None and float(exp_model.coef_[0]) < 0:
        recs.append(
            {
                "title": "Keep the downward expense trend",
                "message": "Expenses are trending down. Lock wins by freezing any freed subscriptions.",
                "priority": "low",
                "category": "spending",
            }
        )

    if not recs:
        recs.append(
            {
                "title": "Stay consistent",
                "message": "Patterns look stable. Re-run analysis monthly after new transactions.",
                "priority": "low",
                "category": "general",
            }
        )

    return {
        "model_version": "finpilot-ai/1.0.0",
        "currency_code": currency_code,
        "currency_symbol": currency_symbol,
        "expense_forecast": {
            "next_month": None if next_exp is None else round(float(next_exp), 2),
            "method": exp_method,
            "history_months": n,
            "r2_score": None if exp_r2 is None else round(float(exp_r2), 3),
        },
        "savings_forecast": {
            "next_month_net": None if next_net is None else round(float(next_net), 2),
            "trend_slope": None if slope is None else round(float(slope), 4),
            "method": net_method,
            "r2_score": None if net_r2 is None else round(float(net_r2), 3),
        },
        "goal_forecasts": goal_forecasts,
        "ml_recommendations": recs,
        "risks": risks,
        "series": {
            "expense_actual": [{"month": m, "value": float(v)} for m, v in zip(months, expenses)],
            "expense_predicted_next": None if next_exp is None else round(float(next_exp), 2),
            "savings_actual": [{"month": m, "value": float(v)} for m, v in zip(months, nets)],
            "savings_predicted_next": None if next_net is None else round(float(next_net), 2),
        },
    }
