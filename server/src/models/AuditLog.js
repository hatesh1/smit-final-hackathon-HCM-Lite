const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      employeeId: { type: String, default: '' },
      email: { type: String, default: '' },
      role: { type: String, default: '' },
      name: { type: String, default: '' },
    },
    action: {
      type: String,
      required: true,
      enum: ['create', 'update', 'approve', 'reject', 'finalize', 'deactivate', 'activate', 'reset_password', 'delete', 'login'],
    },
    entity: {
      type: String,
      required: true, // e.g. 'Employee', 'CompanySettings', 'Attendance', 'LeaveRequest', 'PayrollRun', 'Announcement'
    },
    entityId: { type: String, default: '' },
    details: { type: String, default: '' },
    beforeJSON: { type: mongoose.Schema.Types.Mixed, default: null },
    afterJSON: { type: mongoose.Schema.Types.Mixed, default: null },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Immutable: no updatedAt
  }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entity: 1, action: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
