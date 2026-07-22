const Insight = require('../models/Insight');
const Goal = require('../models/Goal');
const analyticsService = require('./analyticsService');
const ruleEngineService = require('./ruleEngineService');

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

async function listForUser(userId) {
  const items = await Insight.find({ user: userId }).sort({ createdAt: -1 }).lean();
  items.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  return items;
}

async function refreshRuleInsights(userId) {
  const fullAnalytics = await analyticsService.getDashboardAnalytics(userId);
  const goals = await Goal.find({ user: userId }).lean();
  const rules = ruleEngineService.evaluate(fullAnalytics, goals);

  await Insight.deleteMany({ user: userId, source: 'rule' });

  if (!rules.length) {
    return [];
  }

  const docs = rules.map((r) => ({
    user: userId,
    code: r.code,
    title: r.title,
    message: r.message,
    priority: r.priority,
    insightType: r.insightType,
    read: false,
    source: 'rule',
    meta: r.meta,
  }));

  await Insight.insertMany(docs);
  return listForUser(userId);
}

async function markRead(userId, insightId, read = true) {
  const doc = await Insight.findOneAndUpdate(
    { _id: insightId, user: userId },
    { $set: { read } },
    { new: true }
  ).lean();
  return doc;
}

module.exports = {
  listForUser,
  refreshRuleInsights,
  markRead,
};
