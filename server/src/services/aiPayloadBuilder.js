const Goal = require('../models/Goal');
const User = require('../models/User');
const analyticsService = require('./analyticsService');
const { DEFAULT_CURRENCY_CODE } = require('../config/currency');

/**
 * Build JSON payload for the Python AI service from Mongo data.
 */
async function buildPredictPayload(userId) {
  const user = await User.findById(userId).select('currencyCode').lean();
  const full = await analyticsService.getDashboardAnalytics(userId);
  const pub = analyticsService.toPublicPayload(full);
  const goals = await Goal.find({ user: userId }).sort({ deadline: 1 }).lean();

  return {
    monthly: (pub.monthlyTrend || []).map((m) => ({
      month: m.month,
      income: m.income,
      expense: m.expense,
    })),
    goals: goals.map((g) => ({
      id: String(g._id),
      title: g.title,
      target_amount: g.targetAmount,
      current_amount: g.currentAmount ?? 0,
      deadline: new Date(g.deadline).toISOString(),
    })),
    category_expenses_90d: pub.categoryExpensesLast90Days || [],
    income_volatility: pub.incomeVolatilityLast6Months ?? 0,
    currency_code: user?.currencyCode || DEFAULT_CURRENCY_CODE,
  };
}

module.exports = { buildPredictPayload };
