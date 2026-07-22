const AIReport = require('../models/AIReport');
const aiPayloadBuilder = require('./aiPayloadBuilder');
const aiClientService = require('./aiClientService');

async function getLatestReport(userId) {
  const doc = await AIReport.findOne({ user: userId }).sort({ createdAt: -1 }).lean();
  return doc;
}

async function refreshReport(userId) {
  const payload = await aiPayloadBuilder.buildPredictPayload(userId);
  let result;
  try {
    result = await aiClientService.requestPredict(payload);
  } catch (err) {
    const doc = await AIReport.create({
      user: userId,
      modelVersion: '',
      result: {},
      error: err.message || 'AI request failed',
    });
    const plain = doc.toObject();
    const errObj = new Error(plain.error);
    errObj.statusCode = 502;
    errObj.report = plain;
    throw errObj;
  }

  const doc = await AIReport.create({
    user: userId,
    modelVersion: result.model_version || '',
    result,
    error: '',
  });
  return doc.toObject();
}

module.exports = { getLatestReport, refreshReport };
