const mongoose = require('mongoose');

const payslipItemSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  employeeId: { type: String, required: true },
  name: { type: String, default: '' },
  email: { type: String, default: '' },
  department: { type: String, default: '' },
  designation: { type: String, default: '' },
  currency: { type: String, default: 'PKR' },
  salaryStructure: {
    basic: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    medical: { type: Number, default: 0 },
    allowances: { type: Number, default: 0 },
    gross: { type: Number, default: 0 },
  },
  workingDaysInMonth: { type: Number, default: 22 },
  proratedDays: { type: Number, default: 22 },
  perDayRate: { type: Number, default: 0 },
  attendanceStats: {
    presentDays: { type: Number, default: 0 },
    lateDays: { type: Number, default: 0 },
    halfDays: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    approvedLeaveDays: { type: Number, default: 0 },
    unpaidLeaveDays: { type: Number, default: 0 },
  },
  deductions: {
    absentDeduction: { type: Number, default: 0 },
    unpaidLeaveDeduction: { type: Number, default: 0 },
    halfDayDeduction: { type: Number, default: 0 },
    latePenaltyDeduction: { type: Number, default: 0 },
    customDeductions: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
  },
  tax: {
    annualizedGross: { type: Number, default: 0 },
    annualTax: { type: Number, default: 0 },
    monthlyTax: { type: Number, default: 0 },
  },
  netPay: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['unpaid', 'processed', 'paid'], default: 'unpaid' },
});

const payrollRunSchema = new mongoose.Schema(
  {
    month: { type: String, required: true, unique: true }, // Format: YYYY-MM e.g. "2026-10"
    status: { type: String, enum: ['draft', 'finalized'], default: 'draft' },
    workingDaysInMonth: { type: Number, default: 22 },
    totalEmployees: { type: Number, default: 0 },
    totalGross: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    totalNetPay: { type: Number, default: 0 },
    currency: { type: String, default: 'PKR' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    finalizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    finalizedAt: { type: Date, default: null },
    payslips: [payslipItemSchema],
  },
  { timestamps: true }
);

payrollRunSchema.index({ month: 1 });

module.exports = mongoose.model('PayrollRun', payrollRunSchema);
