const mongoose = require('mongoose');

const aiReportSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    modelVersion: { type: String, default: '' },
    result: { type: mongoose.Schema.Types.Mixed, required: true },
    error: { type: String, default: '' },
  },
  { timestamps: true }
);

aiReportSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('AIReport', aiReportSchema);
