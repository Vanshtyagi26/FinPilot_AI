const Transaction = require('../models/Transaction');

const MS_DAY = 86400000;

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function getMondayOfWeek(date) {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
}

function monthKeyFromDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function isWithinLastDays(date, days) {
  const cutoff = Date.now() - days * MS_DAY;
  return new Date(date).getTime() >= cutoff;
}

/**
 * Load all transactions for user (lean). For large datasets, switch to aggregation pipelines.
 */
async function fetchUserTransactions(userId) {
  return Transaction.find({ user: userId }).sort({ date: 1 }).lean();
}

function foldMonthly(transactions) {
  const byMonth = {};
  for (const t of transactions) {
    const d = new Date(t.date);
    const key = monthKeyFromDate(d);
    if (!byMonth[key]) byMonth[key] = { month: key, income: 0, expense: 0, net: 0 };
    if (t.type === 'income') {
      byMonth[key].income += t.amount;
      byMonth[key].net += t.amount;
    } else {
      byMonth[key].expense += t.amount;
      byMonth[key].net -= t.amount;
    }
  }
  return Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));
}

function foldWeekly(transactions, weeksBack = 12) {
  const mondayThisWeek = getMondayOfWeek(new Date());
  const buckets = [];
  for (let i = weeksBack - 1; i >= 0; i -= 1) {
    const start = addDays(mondayThisWeek, -i * 7);
    const label = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    buckets.push({ weekStart: label, weekStartDate: start.getTime(), income: 0, expense: 0, net: 0 });
  }
  for (const t of transactions) {
    const txd = new Date(t.date);
    const m = getMondayOfWeek(txd).getTime();
    const b = buckets.find((w) => w.weekStartDate === m);
    if (!b) continue;
    if (t.type === 'income') {
      b.income += t.amount;
      b.net += t.amount;
    } else {
      b.expense += t.amount;
      b.net -= t.amount;
    }
  }
  return buckets.map(({ weekStart, income, expense, net }) => ({
    weekStart,
    income: Math.round(income * 100) / 100,
    expense: Math.round(expense * 100) / 100,
    net: Math.round(net * 100) / 100,
  }));
}

function categoryExpenseBreakdown(transactions, days = 90) {
  const map = {};
  let total = 0;
  for (const t of transactions) {
    if (t.type !== 'expense') continue;
    if (!isWithinLastDays(t.date, days)) continue;
    const c = t.category.trim() || 'Other';
    map[c] = (map[c] || 0) + t.amount;
    total += t.amount;
  }
  const rows = Object.entries(map)
    .map(([category, amount]) => ({
      category,
      amount: Math.round(amount * 100) / 100,
      percentOfExpense: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
  return { rows, totalExpense: Math.round(total * 100) / 100 };
}

function windowTotals(transactions, days) {
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (!isWithinLastDays(t.date, days)) continue;
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  return {
    income: Math.round(income * 100) / 100,
    expense: Math.round(expense * 100) / 100,
    net: Math.round((income - expense) * 100) / 100,
  };
}

function savingsRatioFraction(income, net) {
  if (!income || income <= 0) return null;
  return net / income;
}

function monthlyIncomeSeries(monthlyTrend, lastN = 6) {
  const slice = monthlyTrend.slice(-lastN);
  return slice.map((m) => ({ month: m.month, income: m.income }));
}

function coefficientOfVariation(values) {
  if (!values.length) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}

/**
 * Average net savings per month over the last `months` entries of monthly trend (or fewer).
 */
function averageMonthlyNetFromTrend(monthlyTrend, months = 3) {
  if (!monthlyTrend.length) return 0;
  const slice = monthlyTrend.slice(-months);
  const sumNet = slice.reduce((s, m) => s + m.net, 0);
  return slice.length ? sumNet / slice.length : 0;
}

/**
 * Full dashboard analytics for charts + rule engine.
 */
async function getDashboardAnalytics(userId) {
  const transactions = await fetchUserTransactions(userId);
  const monthlyTrend = foldMonthly(transactions).map((m) => ({
    ...m,
    income: Math.round(m.income * 100) / 100,
    expense: Math.round(m.expense * 100) / 100,
    net: Math.round(m.net * 100) / 100,
  }));

  const allTime = transactions.reduce(
    (acc, t) => {
      if (t.type === 'income') acc.income += t.amount;
      else acc.expense += t.amount;
      return acc;
    },
    { income: 0, expense: 0 }
  );
  allTime.income = Math.round(allTime.income * 100) / 100;
  allTime.expense = Math.round(allTime.expense * 100) / 100;
  allTime.net = Math.round((allTime.income - allTime.expense) * 100) / 100;

  const last90 = windowTotals(transactions, 90);
  const last30 = windowTotals(transactions, 30);

  const ratioAllTime = savingsRatioFraction(allTime.income, allTime.net);
  const ratio90 = savingsRatioFraction(last90.income, last90.net);

  const categoryBlock = categoryExpenseBreakdown(transactions, 90);
  const weeklyTrend = foldWeekly(transactions, 12);
  const incomeLast6 = monthlyIncomeSeries(monthlyTrend, 6).map((x) => x.income);
  const incomeVolatility = coefficientOfVariation(incomeLast6);

  return {
    totals: {
      allTime,
      last90Days: last90,
      last30Days: last30,
    },
    savingsRatio: {
      allTime: ratioAllTime != null ? Math.round(ratioAllTime * 1000) / 1000 : null,
      last90Days: ratio90 != null ? Math.round(ratio90 * 1000) / 1000 : null,
      last90DaysPercent: ratio90 != null ? Math.round(ratio90 * 1000) / 10 : null,
    },
    categoryExpensesLast90Days: categoryBlock.rows,
    categoryExpenseTotalLast90Days: categoryBlock.totalExpense,
    monthlyTrend,
    weeklyTrend,
    incomeVolatilityLast6Months: Math.round(incomeVolatility * 1000) / 1000,
    monthlyIncomeLast6: monthlyIncomeSeries(monthlyTrend, 6),
    _internal: {
      transactions,
      avgMonthlyNet: Math.round(averageMonthlyNetFromTrend(monthlyTrend, 3) * 100) / 100,
    },
  };
}

/**
 * Strip heavy internal data before sending to client.
 */
function toPublicPayload(full) {
  const { _internal, ...rest } = full;
  return rest;
}

async function getAverageMonthlyNetSavings(userId, months = 3) {
  const full = await getDashboardAnalytics(userId);
  return full._internal.avgMonthlyNet;
}

module.exports = {
  getDashboardAnalytics,
  toPublicPayload,
  getAverageMonthlyNetSavings,
  categoryExpenseBreakdown,
  windowTotals,
};
