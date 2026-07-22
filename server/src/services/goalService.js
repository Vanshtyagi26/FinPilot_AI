const Goal = require('../models/Goal');
const User = require('../models/User');
const analyticsService = require('./analyticsService');
const { DEFAULT_CURRENCY_CODE } = require('../config/currency');

const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: 'EUR ',
  INR: '₹',
  GBP: 'GBP ',
  JPY: 'JPY ',
  AUD: 'AUD ',
  CAD: 'CAD ',
  SGD: 'SGD ',
};

function clampProgress(current, target) {
  return Math.min(Math.max(Number(current) || 0, 0), Number(target));
}

function enrichGoalDoc(goal, avgMonthlyNet, currencySymbol) {
  const target = Number(goal.targetAmount);
  const current = clampProgress(goal.currentAmount, target);
  const remaining = Math.max(0, target - current);
  const progressPercent = target > 0 ? Math.min(100, Math.round((current / target) * 1000) / 10) : 0;
  const deadline = new Date(goal.deadline);
  const now = new Date();

  let estimatedCompletionDate = null;
  let paceMonths = null;
  let paceNote = '';

  if (remaining <= 0) {
    paceNote = 'Target reached.';
  } else if (avgMonthlyNet > 0) {
    paceMonths = remaining / avgMonthlyNet;
    const est = new Date(now);
    est.setDate(1);
    est.setMonth(est.getMonth() + Math.ceil(paceMonths));
    estimatedCompletionDate = est.toISOString();
    paceNote = `Based on ~${currencySymbol}${avgMonthlyNet.toFixed(
      2
    )}/mo recent net savings, you might reach this around ${est.toLocaleDateString(undefined, {
      month: 'short',
      year: 'numeric',
    })}.`;
  } else {
    paceNote =
      'Recent net savings are flat or negative. Increase income or cut expenses to make meaningful progress before the deadline.';
  }

  const daysToDeadline = (deadline.getTime() - now.getTime()) / 86400000;
  const onTrack =
    remaining <= 0
      ? true
      : avgMonthlyNet > 0 && estimatedCompletionDate
        ? new Date(estimatedCompletionDate).getTime() <= deadline.getTime()
        : null;

  return {
    ...goal,
    currentAmount: current,
    progressPercent,
    remainingAmount: Math.round(remaining * 100) / 100,
    estimatedCompletionDate,
    estimatedMonthsAtCurrentPace: paceMonths != null ? Math.round(paceMonths * 10) / 10 : null,
    paceNote,
    daysToDeadline: Math.round(daysToDeadline),
    onTrackVsDeadline: onTrack,
  };
}

async function listGoals(userId) {
  const user = await User.findById(userId).select('currencyCode').lean();
  const currencyCode = user?.currencyCode || DEFAULT_CURRENCY_CODE;
  const currencySymbol = CURRENCY_SYMBOLS[currencyCode] || '$';
  const avgMonthlyNet = await analyticsService.getAverageMonthlyNetSavings(userId, 3);
  const goals = await Goal.find({ user: userId }).sort({ deadline: 1 }).lean();
  return goals.map((g) => enrichGoalDoc(g, avgMonthlyNet, currencySymbol));
}

async function getGoal(userId, id) {
  const user = await User.findById(userId).select('currencyCode').lean();
  const currencyCode = user?.currencyCode || DEFAULT_CURRENCY_CODE;
  const currencySymbol = CURRENCY_SYMBOLS[currencyCode] || '$';
  const g = await Goal.findOne({ _id: id, user: userId }).lean();
  if (!g) return null;
  const avgMonthlyNet = await analyticsService.getAverageMonthlyNetSavings(userId, 3);
  return enrichGoalDoc(g, avgMonthlyNet, currencySymbol);
}

function parseBody(body, partial = false) {
  const data = {};
  if (body.title !== undefined) data.title = String(body.title).trim();
  if (body.notes !== undefined) data.notes = String(body.notes ?? '').trim();
  if (body.targetAmount !== undefined) {
    const t = Number(body.targetAmount);
    if (Number.isNaN(t) || t <= 0) return { error: 'targetAmount must be a positive number' };
    data.targetAmount = t;
  }
  if (body.deadline !== undefined) {
    const d = new Date(body.deadline);
    if (Number.isNaN(d.getTime())) return { error: 'invalid deadline' };
    data.deadline = d;
  }
  if (body.currentAmount !== undefined) {
    const c = Number(body.currentAmount);
    if (Number.isNaN(c) || c < 0) return { error: 'currentAmount must be >= 0' };
    data.currentAmount = c;
  }

  if (!partial) {
    if (!data.title) return { error: 'title is required' };
    if (data.targetAmount == null) return { error: 'targetAmount is required' };
    if (data.deadline == null) return { error: 'deadline is required' };
  } else if (Object.keys(data).length === 0) {
    return { error: 'No fields to update' };
  }

  return { data };
}

async function createGoal(userId, body) {
  const parsed = parseBody(body, false);
  if (parsed.error) return { error: parsed.error };
  const current = parsed.data.currentAmount ?? 0;
  if (current > parsed.data.targetAmount) {
    return { error: 'currentAmount cannot exceed targetAmount' };
  }
  const doc = await Goal.create({ ...parsed.data, currentAmount: current, user: userId });
  return getGoal(userId, doc._id);
}

async function updateGoal(userId, id, body) {
  const parsed = parseBody(body, true);
  if (parsed.error) return { error: parsed.error };
  const existing = await Goal.findOne({ _id: id, user: userId });
  if (!existing) return { error: 'not_found' };
  const merged = { ...existing.toObject(), ...parsed.data };
  const ca = merged.currentAmount ?? 0;
  const ta = merged.targetAmount ?? existing.targetAmount;
  if (ca > ta) {
    return { error: 'currentAmount cannot exceed targetAmount' };
  }
  const doc = await Goal.findOneAndUpdate({ _id: id, user: userId }, { $set: parsed.data }, { new: true }).lean();
  return getGoal(userId, doc._id);
}

async function deleteGoal(userId, id) {
  const doc = await Goal.findOneAndDelete({ _id: id, user: userId });
  return doc;
}

module.exports = {
  listGoals,
  getGoal,
  createGoal,
  updateGoal,
  deleteGoal,
};
