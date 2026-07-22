const investmentRecommendationService = require('../services/investmentRecommendationService');

async function getRecommendations(req, res, next) {
  try {
    const riskLevel = req.body?.riskLevel || req.query?.riskLevel;
    const monthlySurplus = req.body?.monthlySurplus ?? req.query?.monthlySurplus;

    const result = await investmentRecommendationService.getRecommendations({
      userId: req.user._id,
      riskLevel,
      monthlySurplus,
    });

    if (result.error) {
      return res.status(400).json({ message: result.error, monthlySurplus: result.monthlySurplus });
    }

    return res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { getRecommendations };
