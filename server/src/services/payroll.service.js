const Profile = require('../models/Profile');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const PayrollRun = require('../models/PayrollRun');
const Holiday = require('../models/Holiday');
const CompanySettings = require('../models/CompanySettings');
const { ApiError } = require('../middleware/errorHandler');
const { logAction } = require('./audit.service');
const { notify } = require('./notification.service');

// Calculate annual tax based on tax slab in Challenge Brief Section 3:
// 0 to 600k: 0
// 600k to 1.2M: 5% of amount > 600k
// 1.2M to 2.4M: 30k + 15% of amount > 1.2M
// 2.4M to 3.6M: 210k + 25% of amount > 2.4M
// Above 3.6M: 510k + 35% of amount > 3.6M
function calculateAnnualTax(annualGross) {
  if (annualGross <= 600000) return 0;
  if (annualGross <= 1200000) {
    return Math.round((annualGross - 600000) * 0.05);
  }
  if (annualGross <= 2400000) {
    return Math.round(30000 + (annualGross - 1200000) * 0.15);
  }
  if (annualGross <= 3600000) {
    return Math.round(210000 + (annualGross - 2400000) * 0.25);
  }
  return Math.round(510000 + (annualGross - 3600000) * 0.35);
}

// Get working days count for a given month (YYYY-MM)
async function getWorkingDaysForMonth(year, monthIndex) {
  const settings = await CompanySettings.findOne().lean() || { weekendDays: ['Saturday', 'Sunday'] };
  const weekends = new Set((settings.weekendDays || ['Saturday', 'Sunday']).map((d) => d.toLowerCase()));

  const startDate = new Date(Date.UTC(year, monthIndex, 1));
  const endDate = new Date(Date.UTC(year, monthIndex + 1, 0));

  const holidays = await Holiday.find({
    date: { $gte: startDate, $lte: endDate },
  }).lean();

  const holidayDates = new Set(holidays.map((h) => new Date(h.date).toISOString().slice(0, 10)));
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  let count = 0;
  const cur = new Date(startDate);
  while (cur <= endDate) {
    const dayName = dayNames[cur.getUTCDay()];
    const dateStr = cur.toISOString().slice(0, 10);
    if (!weekends.has(dayName) && !holidayDates.has(dateStr)) {
      count++;
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  return count || 22; // default 22 if month calculation is 0
}

async function createOrUpdateMonthlyRun(monthStr, user, req) {
  // Format: YYYY-MM
  const [yearStr, mStr] = monthStr.split('-');
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(mStr, 10) - 1;

  const existing = await PayrollRun.findOne({ month: monthStr });
  if (existing && existing.status === 'finalized') {
    throw new ApiError(400, `Payroll run for ${monthStr} is finalized and locked. It cannot be modified.`);
  }

  const workingDaysInMonth = await getWorkingDaysForMonth(year, monthIndex);
  const startDate = new Date(Date.UTC(year, monthIndex, 1));
  const endDate = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));

  // Fetch all active/probation employees
  const profiles = await Profile.find({ 'job.status': { $in: ['active', 'probation', 'on_leave'] } })
    .populate('user', 'employeeId email role isActive')
    .lean();

  const payslips = [];

  for (const p of profiles) {
    if (!p.user) continue;

    const basic = p.salary?.basic || 0;
    const hra = p.salary?.hra || Math.round(basic * 0.4);
    const medical = p.salary?.medical || Math.round(basic * 0.1);
    const allowances = p.salary?.allowances || 0;
    let gross = basic + hra + medical + allowances;

    // Proration for joiners in this month
    let proratedDays = workingDaysInMonth;
    if (p.job?.joiningDate) {
      const joinDate = new Date(p.job.joiningDate);
      if (joinDate > startDate && joinDate <= endDate) {
        // Count working days from join date to end of month
        let activeDays = 0;
        const cur = new Date(joinDate);
        while (cur <= endDate) {
          const dayName = cur.getUTCDay();
          if (dayName !== 0 && dayName !== 6) activeDays++;
          cur.setUTCDate(cur.getUTCDate() + 1);
        }
        proratedDays = Math.min(activeDays, workingDaysInMonth);
        gross = Math.round((gross / workingDaysInMonth) * proratedDays);
      }
    }

    const perDayRate = Math.round((gross / workingDaysInMonth) * 100) / 100;

    // Gather attendance stats for this month
    const attendanceRecords = await Attendance.find({
      user: p.user._id,
      date: { $gte: startDate, $lte: endDate },
    }).lean();

    const presentDays = attendanceRecords.filter((a) => a.status === 'present').length;
    const lateDays = attendanceRecords.filter((a) => a.status === 'late').length;
    const halfDays = attendanceRecords.filter((a) => a.status === 'half-day').length;
    const absentDays = attendanceRecords.filter((a) => a.status === 'absent').length;
    const approvedLeaveDays = attendanceRecords.filter((a) => a.status === 'leave').length;

    // Unpaid leaves
    const unpaidLeaves = await LeaveRequest.find({
      user: p.user._id,
      type: 'unpaid',
      status: 'approved',
      startDate: { $gte: startDate, $lte: endDate },
    }).lean();
    const unpaidLeaveDays = unpaidLeaves.reduce((sum, l) => sum + (l.workingDaysCount || 0), 0);

    // Deductions calculation per brief:
    // Deduct absent + unpaid + 0.5 * half days
    const absentDeduction = Math.round(absentDays * perDayRate);
    const unpaidLeaveDeduction = Math.round(unpaidLeaveDays * perDayRate);
    const halfDayDeduction = Math.round(halfDays * 0.5 * perDayRate);

    // Late penalty bonus rule (3 lates = 0.5 day deduction)
    const latePenaltyDays = Math.floor(lateDays / 3) * 0.5;
    const latePenaltyDeduction = Math.round(latePenaltyDays * perDayRate);

    const totalAttendanceDeduction = absentDeduction + unpaidLeaveDeduction + halfDayDeduction + latePenaltyDeduction;

    // Tax calculation
    const annualizedGross = gross * 12;
    const annualTax = calculateAnnualTax(annualizedGross);
    const monthlyTax = Math.round(annualTax / 12);

    const netPay = Math.max(0, gross - totalAttendanceDeduction - monthlyTax);

    payslips.push({
      user: p.user._id,
      employeeId: p.user.employeeId,
      name: `${p.personal?.firstName || ''} ${p.personal?.lastName || ''}`.trim(),
      email: p.user.email,
      department: p.job?.department || '',
      designation: p.job?.designation || '',
      currency: p.salary?.currency || 'PKR',
      salaryStructure: {
        basic,
        hra,
        medical,
        allowances,
        gross,
      },
      workingDaysInMonth,
      proratedDays,
      perDayRate,
      attendanceStats: {
        presentDays,
        lateDays,
        halfDays,
        absentDays,
        approvedLeaveDays,
        unpaidLeaveDays,
      },
      deductions: {
        absentDeduction,
        unpaidLeaveDeduction,
        halfDayDeduction,
        latePenaltyDeduction,
        customDeductions: 0,
        totalDeductions: totalAttendanceDeduction,
      },
      tax: {
        annualizedGross,
        annualTax,
        monthlyTax,
      },
      netPay,
      paymentStatus: 'processed',
    });
  }

  const totalGross = payslips.reduce((sum, s) => sum + s.salaryStructure.gross, 0);
  const totalDeductions = payslips.reduce((sum, s) => sum + s.deductions.totalDeductions, 0);
  const totalTax = payslips.reduce((sum, s) => sum + s.tax.monthlyTax, 0);
  const totalNetPay = payslips.reduce((sum, s) => sum + s.netPay, 0);

  const run = await PayrollRun.findOneAndUpdate(
    { month: monthStr },
    {
      $set: {
        month: monthStr,
        status: 'draft',
        workingDaysInMonth,
        totalEmployees: payslips.length,
        totalGross,
        totalDeductions,
        totalTax,
        totalNetPay,
        currency: 'PKR',
        createdBy: user.id || user._id,
        payslips,
      },
    },
    { upsert: true, new: true }
  );

  await logAction({
    req,
    action: 'create',
    entity: 'PayrollRun',
    entityId: run._id,
    details: `Generated monthly payroll draft for ${monthStr} (${payslips.length} employees, Net Pay: ${totalNetPay} PKR)`,
  });

  return run.toObject();
}

async function finalizePayroll(monthStr, adminUser, req) {
  const run = await PayrollRun.findOne({ month: monthStr });
  if (!run) throw new ApiError(404, `No payroll run found for ${monthStr}`);
  if (run.status === 'finalized') {
    throw new ApiError(400, `Payroll for ${monthStr} is already finalized`);
  }

  run.status = 'finalized';
  run.finalizedBy = adminUser.id || adminUser._id;
  run.finalizedAt = new Date();
  await run.save();

  // Notify all employees that their payslip is available
  for (const slip of run.payslips) {
    await notify({
      userId: slip.user,
      message: `Your payslip for ${monthStr} is finalized and ready for download. Net pay: ${slip.currency} ${slip.netPay.toLocaleString()}`,
      type: 'payroll',
      link: '/app/payroll',
    });
  }

  await logAction({
    req,
    action: 'finalize',
    entity: 'PayrollRun',
    entityId: run._id,
    details: `Admin finalized and locked payroll for ${monthStr} (Total: ${run.totalNetPay} PKR)`,
  });

  return run.toObject();
}

async function getMonthlyRun(monthStr) {
  const run = await PayrollRun.findOne({ month: monthStr }).lean();
  return run;
}

async function listPayrollRuns() {
  return PayrollRun.find().sort({ month: -1 }).select('-payslips').lean();
}

async function getEmployeePayslip(userId, monthStr) {
  const query = { 'payslips.user': userId, status: 'finalized' };
  if (monthStr) query.month = monthStr;

  const run = await PayrollRun.findOne(query).sort({ month: -1 }).lean();
  if (!run) return null;

  const payslip = run.payslips.find((p) => p.user.toString() === userId.toString());
  return {
    month: run.month,
    finalizedAt: run.finalizedAt,
    payslip,
  };
}

async function listEmployeePayslips(userId) {
  const runs = await PayrollRun.find({ 'payslips.user': userId, status: 'finalized' })
    .sort({ month: -1 })
    .lean();

  return runs.map((r) => ({
    month: r.month,
    finalizedAt: r.finalizedAt,
    payslip: r.payslips.find((p) => p.user.toString() === userId.toString()),
  }));
}

module.exports = {
  calculateAnnualTax,
  getWorkingDaysForMonth,
  createOrUpdateMonthlyRun,
  finalizePayroll,
  getMonthlyRun,
  listPayrollRuns,
  getEmployeePayslip,
  listEmployeePayslips,
};
