const insightService = require('../services/insightService');

async function list(req, res, next) {
  try {
    if (req.query.refresh === 'true') {
      const items = await insightService.refreshRuleInsights(req.user._id);
      return res.json(items);
    }
    const items = await insightService.listForUser(req.user._id);
    res.json(items);
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const items = await insightService.refreshRuleInsights(req.user._id);
    res.json(items);
  } catch (err) {
    next(err);
  }
}

async function markRead(req, res, next) {
  try {
    const read = req.body.read !== false;
    const doc = await insightService.markRead(req.user._id, req.params.id, read);
    if (!doc) {
      return res.status(404).json({ message: 'Insight not found' });
    }
    res.json(doc);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, refresh, markRead };
