const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    targetAmount: { type: Number, required: true, min: 0.01 },
    deadline: { type: Date, required: true },
    currentAmount: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

goalSchema.index({ user: 1, deadline: 1 });
goalSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Goal', goalSchema);
