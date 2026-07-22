const mongoose = require('mongoose');

const insightSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    code: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    priority: { type: String, enum: ['high', 'medium', 'low'], required: true },
    insightType: {
      type: String,
      enum: ['spending', 'savings', 'income_pattern', 'category', 'goal'],
      required: true,
    },
    read: { type: Boolean, default: false },
    source: { type: String, enum: ['rule'], default: 'rule' },
    meta: { type: mongoose.Schema.Types.Mixed, default: undefined },
  },
  { timestamps: true }
);

insightSchema.index({ user: 1, createdAt: -1 });
insightSchema.index({ user: 1, read: 1 });
insightSchema.index({ user: 1, code: 1 });

module.exports = mongoose.model('Insight', insightSchema);
