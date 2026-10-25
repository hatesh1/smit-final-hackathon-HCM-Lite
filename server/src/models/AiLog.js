const mongoose = require('mongoose');

const aiLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, default: 'employee' },
    prompt: { type: String, required: true },
    feature: { type: String, enum: ['chat', 'summary', 'smart-leave', 'policy'], default: 'chat' },
    toolCalled: { type: String, default: null },
    inputParams: { type: mongoose.Schema.Types.Mixed, default: null },
    responseSummary: { type: String, default: '' },
    executionTimeMs: { type: Number, default: 0 },
    status: { type: String, enum: ['success', 'fallback', 'error'], default: 'success' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

aiLogSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('AiLog', aiLogSchema);
