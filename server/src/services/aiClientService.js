/**
 * HTTP client to the Python AI microservice.
 */

function getBaseUrl() {
  const base = process.env.AI_SERVICE_URL;
  if (!base || !String(base).trim()) {
    throw new Error("AI_SERVICE_URL is not configured");
  }
  return String(base).replace(/\/$/, "");
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getCurrencySymbol(code) {
  const normalized = String(code || "USD").toUpperCase();
  const symbols = {
    USD: "$",
    EUR: "€",
    INR: "₹",
    GBP: "£",
    JPY: "¥",
    AUD: "A$",
    CAD: "C$",
    SGD: "S$",
  };
  return symbols[normalized] || "$";
}

function calcSlope(values) {
  if (!values.length || values.length < 2) {
    return 0;
  }
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((sum, value) => sum + value, 0) / n;
  const numerator = values.reduce(
    (sum, value, index) => sum + (index - xMean) * (value - yMean),
    0,
  );
  const denominator = values.reduce(
    (sum, value, index) => sum + (index - xMean) ** 2,
    0,
  );
  return denominator ? numerator / denominator : 0;
}

function buildFallbackPredictResponse(body) {
  const monthly = Array.isArray(body?.monthly) ? body.monthly : [];
  const goals = Array.isArray(body?.goals) ? body.goals : [];
  const categories = Array.isArray(body?.category_expenses_90d)
    ? body.category_expenses_90d
    : [];
  const currencyCode = String(body?.currency_code || "USD").toUpperCase();
  const currencySymbol = getCurrencySymbol(currencyCode);

  if (!monthly.length) {
    return {
      model_version: "finpilot-ai/fallback-v2",
      currency_code: currencyCode,
      currency_symbol: currencySymbol,
      expense_forecast: {
        next_month: null,
        method: "fallback",
        history_months: 0,
        r2_score: null,
      },
      savings_forecast: {
        next_month_net: null,
        trend_slope: null,
        method: "fallback",
      },
      goal_forecasts: [],
      ml_recommendations: [
        {
          title: "Add a few months of history",
          message:
            "Log more transactions so the assistant can build a better forecast for your cash flow.",
          priority: "medium",
          category: "data",
        },
      ],
      risks: [],
      summary: {
        headline: "Add more history to sharpen the forecast",
        detail:
          "Once you log a few more months of transactions, the assistant can make more reliable guidance.",
      },
      action_items: [],
      series: {
        expense_actual: [],
        expense_predicted_next: null,
        savings_actual: [],
        savings_predicted_next: null,
      },
      source: "fallback",
    };
  }

  const series = monthly.map((entry) => ({
    month: entry.month,
    income: Number(entry.income || 0),
    expense: Number(entry.expense || 0),
    net: Number(entry.income || 0) - Number(entry.expense || 0),
  }));

  const expenses = series.map((entry) => entry.expense);
  const nets = series.map((entry) => entry.net);
  const slopeExpense = calcSlope(expenses);
  const slopeNet = calcSlope(nets);
  const recentExpenses = expenses.slice(-3);
  const recentNets = nets.slice(-3);
  const recentIncome =
    series.slice(-3).reduce((sum, entry) => sum + entry.income, 0) /
    Math.max(1, series.slice(-3).length);
  const avgExpense =
    recentExpenses.reduce((sum, value) => sum + value, 0) /
    Math.max(1, recentExpenses.length);
  const avgNet =
    recentNets.reduce((sum, value) => sum + value, 0) /
    Math.max(1, recentNets.length);
  const nextExpense = Math.max(0, avgExpense + slopeExpense);
  const nextNet = avgNet + slopeNet;
  const incomeVolatility = Number(body?.income_volatility || 0);

  const risks = [];
  if (nextExpense > recentIncome * 1.05) {
    risks.push({
      code: "predicted_expense_exceeds_income",
      title: "Projected overspend",
      message: `Your forecasted expenses of ${currencySymbol}${round(nextExpense, 0)} are above your recent income trend. Keep discretionary spending tight this month.`,
      severity: "high",
    });
  }
  if (incomeVolatility >= 0.35) {
    risks.push({
      code: "income_instability",
      title: "Income is uneven",
      message:
        "Your income pattern is a bit volatile. Build a buffer before committing to fixed costs.",
      severity: "medium",
    });
  }
  if (slopeExpense > 0) {
    risks.push({
      code: "expense_trend_rising",
      title: "Expense trend is rising",
      message:
        "Expenses are increasing month over month. Review recurring charges and subscriptions.",
      severity: "medium",
    });
  }

  const recs = [];
  if (nextNet < 0) {
    recs.push({
      title: "Protect your cash buffer",
      message:
        "Your forecast suggests the next month may turn negative. Move money to savings right after your next income hit.",
      priority: "high",
      category: "savings",
    });
  } else if (nextNet / Math.max(recentIncome, 1) < 0.18) {
    recs.push({
      title: "Lift your savings rate",
      message:
        "The forecast is still light on savings relative to recent income. Try a modest recurring transfer.",
      priority: "medium",
      category: "savings",
    });
  }

  if (nextExpense > recentIncome * 0.9) {
    recs.push({
      title: "Trim discretionary spending",
      message:
        "Expenses are running close to your recent income level. Cap non-essential categories for the next month.",
      priority: "medium",
      category: "spending",
    });
  }

  const topCategory = categories
    .slice()
    .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))[0];
  if (topCategory) {
    recs.push({
      title: `Review ${topCategory.category || "your top category"}`,
      message: `Your largest recent expense category is ${topCategory.category || "your top category"}. A small reduction here can influence the next month significantly.`,
      priority: "medium",
      category: "spending",
    });
  }

  if (!recs.length) {
    recs.push({
      title: "Keep the momentum",
      message:
        "Your patterns look balanced. Keep logging transactions so the assistant can refine its guidance.",
      priority: "low",
      category: "general",
    });
  }

  const goalForecasts = goals.map((goal) => {
    const target = Number(goal.target_amount || 0);
    const current = Number(goal.current_amount || 0);
    const remaining = Math.max(0, target - current);
    const requiredMonthly = remaining > 0 ? remaining / 3 : 0;
    const predictedMonthlySave = Math.max(0, nextNet);
    const prob =
      remaining <= 0
        ? 1
        : predictedMonthlySave <= 0
          ? 0.08
          : clamp(
              (predictedMonthlySave - requiredMonthly) /
                (requiredMonthly + 1) /
                2 +
                0.5,
              0.05,
              0.98,
            );
    return {
      goal_id: goal.id,
      title: goal.title || "Goal",
      probability_on_time: round(prob, 3),
      predicted_months_to_complete:
        remaining > 0 && predictedMonthlySave > 0
          ? round(remaining / predictedMonthlySave, 2)
          : 0,
      required_monthly_save: round(requiredMonthly, 2),
      predicted_monthly_save: round(predictedMonthlySave, 2),
    };
  });

  const summary = {
    headline:
      nextNet >= 0
        ? "Your cash flow looks healthy for the next month"
        : "Your next month needs tighter control",
    detail: `Based on ${monthly.length} months of history, the assistant projects ${currencySymbol}${round(nextExpense, 0)} in expenses and ${currencySymbol}${round(nextNet, 0)} in net savings.`,
  };

  return {
    model_version: "finpilot-ai/fallback-v2",
    currency_code: currencyCode,
    currency_symbol: currencySymbol,
    expense_forecast: {
      next_month: round(nextExpense, 2),
      method: "fallback_regression",
      history_months: monthly.length,
      r2_score: null,
    },
    savings_forecast: {
      next_month_net: round(nextNet, 2),
      trend_slope: round(slopeNet, 4),
      method: "fallback_regression",
    },
    goal_forecasts: goalForecasts,
    ml_recommendations: recs,
    risks,
    summary,
    action_items: recs.slice(0, 3).map((item) => ({
      title: item.title,
      detail: item.message,
      priority: item.priority,
    })),
    series: {
      expense_actual: series.map((entry) => ({
        month: entry.month,
        value: entry.expense,
      })),
      expense_predicted_next: round(nextExpense, 2),
      savings_actual: series.map((entry) => ({
        month: entry.month,
        value: entry.net,
      })),
      savings_predicted_next: round(nextNet, 2),
    },
    source: "fallback",
  };
}

async function requestPredict(body) {
  const baseUrl = process.env.AI_SERVICE_URL;
  if (!baseUrl || !String(baseUrl).trim()) {
    return buildFallbackPredictResponse(body);
  }

  const url = `${String(baseUrl).replace(/\/$/, "")}/predict`;
  const controller = new AbortController();
  const timeoutMs = Number(process.env.AI_SERVICE_TIMEOUT_MS || 30000);
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(
        `AI service responded ${res.status}: ${text.slice(0, 500)}`,
      );
    }
    return JSON.parse(text);
  } catch (err) {
    return buildFallbackPredictResponse(body);
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { requestPredict, getBaseUrl };
