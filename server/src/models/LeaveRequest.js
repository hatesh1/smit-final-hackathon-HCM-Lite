const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['annual', 'sick', 'casual', 'unpaid', 'paid'], required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    workingDaysCount: { type: Number, default: 1, min: 0.5 },
    remarks: { type: String, default: '', maxlength: 500 },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
    adminComment: { type: String, default: '', maxlength: 500 },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

leaveRequestSchema.index({ user: 1, startDate: -1 });
leaveRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
