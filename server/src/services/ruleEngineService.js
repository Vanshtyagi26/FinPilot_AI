/**
 * Rule-based recommendations (no ML).
 * @param {object} analytics - output from analyticsService.getDashboardAnalytics (including _internal)
 * @param {object[]} goals - plain goal objects with deadline, targetAmount, currentAmount
 * @returns {Array<{ code: string, title: string, message: string, priority: 'high'|'medium'|'low', insightType: string, meta?: object }>}
 */
function evaluate(analytics, goals = []) {
  const insights = [];
  const last90 = analytics.totals?.last90Days || { income: 0, expense: 0, net: 0 };
  const ratio90 = analytics.savingsRatio?.last90Days;
  const categories = analytics.categoryExpensesLast90Days || [];
  const totalCatExpense = analytics.categoryExpenseTotalLast90Days || 0;
  const volatility = analytics.incomeVolatilityLast6Months ?? 0;

  if (last90.income > 0 && last90.expense > last90.income) {
    insights.push({
      code: 'overspend_vs_income_90d',
      title: 'Spending exceeds income',
      message:
        'In the last 90 days your expenses are higher than your income. Prioritize essential categories and pause discretionary spending until cash flow is positive.',
      priority: 'high',
      insightType: 'savings',
      meta: { windowDays: 90 },
    });
  }

  if (last90.income > 0 && ratio90 != null && ratio90 < 0.2) {
    const pct = Math.round(ratio90 * 100);
    insights.push({
      code: 'low_savings_rate_90d',
      title: 'Savings rate below 20%',
      message: `Your savings rate is about ${pct}% of income over the last 90 days. Aim for at least 20% to build a buffer and reach goals faster — try trimming recurring subscriptions or variable categories first.`,
      priority: ratio90 < 0.1 ? 'high' : 'medium',
      insightType: 'savings',
      meta: { savingsRate: ratio90 },
    });
  }

  if (last90.income <= 0 && last90.expense > 0) {
    insights.push({
      code: 'no_income_logged_90d',
      title: 'No income recorded recently',
      message:
        'There is no income in the last 90 days but expenses exist. Log salary or other inflows so insights and savings rate stay accurate.',
      priority: 'medium',
      insightType: 'income_pattern',
    });
  }

  const foodRegex = /food|grocer|dining|restaurant|eat|lunch|coffee/i;
  let foodPct = 0;
  for (const row of categories) {
    if (foodRegex.test(row.category)) {
      foodPct += row.percentOfExpense;
    }
  }
  if (totalCatExpense > 0 && foodPct >= 20) {
    const suggest = Math.max(5, Math.round(foodPct * 0.1));
    insights.push({
      code: 'food_share_elevated',
      title: 'Food spending is a large share',
      message: `About ${Math.round(foodPct)}% of your last-90-day expenses are food-related. Try reducing that slice by around ${suggest}% by cooking more meals at home or setting a weekly dining-out cap.`,
      priority: foodPct >= 35 ? 'high' : 'medium',
      insightType: 'category',
      meta: { foodPercent: foodPct },
    });
  }

  for (const row of categories) {
    if (!totalCatExpense) break;
    if (row.percentOfExpense >= 30) {
      insights.push({
        code: `category_dominant_${row.category}`.replace(/\s+/g, '_').slice(0, 64),
        title: `High spending: ${row.category}`,
        message: `${row.category} represents about ${row.percentOfExpense}% of your expenses in the last 90 days. Review recurring charges in this bucket and set a tighter monthly limit.`,
        priority: row.percentOfExpense >= 40 ? 'high' : 'medium',
        insightType: 'spending',
        meta: { category: row.category, percent: row.percentOfExpense },
      });
    }
  }

  if (volatility >= 0.35 && (analytics.monthlyIncomeLast6 || []).length >= 4) {
    insights.push({
      code: 'irregular_income_pattern',
      title: 'Irregular income pattern',
      message:
        'Your monthly income fluctuates quite a bit. Build a minimum baseline budget using your lower months and keep a separate buffer for variable months.',
      priority: 'medium',
      insightType: 'income_pattern',
      meta: { coefficientOfVariation: volatility },
    });
  }

  const now = Date.now();
  for (const g of goals) {
    const deadline = new Date(g.deadline).getTime();
    const remaining = Math.max(0, Number(g.targetAmount) - Number(g.currentAmount || 0));
    const progress = g.targetAmount > 0 ? (Number(g.currentAmount || 0) / Number(g.targetAmount)) * 100 : 0;
    const daysLeft = (deadline - now) / 86400000;
    if (daysLeft > 0 && daysLeft <= 60 && progress < 60) {
      insights.push({
        code: `goal_at_risk_${g._id}`,
        title: `Goal needs attention: ${g.title}`,
        message: `"${g.title}" is under 60% complete with ${Math.ceil(daysLeft)} days left. Increase contributions or extend the deadline after reviewing cash flow.`,
        priority: daysLeft <= 30 ? 'high' : 'medium',
        insightType: 'goal',
        meta: { goalId: String(g._id), progress, daysLeft: Math.ceil(daysLeft) },
      });
    }
    if (remaining > 0 && deadline < now) {
      insights.push({
        code: `goal_overdue_${g._id}`,
        title: `Overdue goal: ${g.title}`,
        message: `The deadline for "${g.title}" has passed with ${remaining.toFixed(0)} still to go. Update the target date or adjust the goal amount to stay realistic.`,
        priority: 'high',
        insightType: 'goal',
        meta: { goalId: String(g._id), remaining },
      });
    }
  }

  if (!insights.length) {
    insights.push({
      code: 'all_clear_snapshot',
      title: 'Finances look steady',
      message:
        'No major rule-based alerts right now. Keep logging transactions weekly so trends and savings rate stay meaningful.',
      priority: 'low',
      insightType: 'savings',
    });
  }

  return insights;
}

module.exports = { evaluate };
