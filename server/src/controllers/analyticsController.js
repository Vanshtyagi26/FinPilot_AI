const analyticsService = require('../services/analyticsService');

async function getDashboard(req, res, next) {
  try {
    const raw = await analyticsService.getDashboardAnalytics(req.user._id);
    res.json(analyticsService.toPublicPayload(raw));
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboard };
