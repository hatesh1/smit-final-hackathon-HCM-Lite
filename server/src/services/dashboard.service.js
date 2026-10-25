const User = require('../models/User');
const Profile = require('../models/Profile');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const PayrollRun = require('../models/PayrollRun');
const AuditLog = require('../models/AuditLog');
const Announcement = require('../models/Announcement');
const { startOfDayUTC } = require('../utils/dates');

async function getAdminDashboard({ from, to, department } = {}) {
  const now = new Date();
  const today = startOfDayUTC(now);

  // 1. Headcount & Attrition
  const profileFilter = {};
  if (department) profileFilter['job.department'] = department;

  const allProfiles = await Profile.find(profileFilter)
    .populate('user', 'role isActive createdAt')
    .lean();

  const totalEmployees = allProfiles.filter((p) => p.user?.role === 'employee' || p.user?.role === 'hr').length;
  const activeCount = allProfiles.filter((p) => p.job?.status === 'active' || p.job?.status === 'probation').length;
  const exitedCount = allProfiles.filter((p) => p.job?.status === 'resigned' || p.job?.status === 'terminated').length;

  const avgHeadcount = totalEmployees > 0 ? (activeCount + exitedCount) / 2 : 1;
  const attritionRateYTD = avgHeadcount > 0 ? Math.round((exitedCount / avgHeadcount) * 100 * 10) / 10 : 0;

  // 2. Payroll Cost & Average Salary
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const latestRun = await PayrollRun.findOne({ month: currentMonthStr }).lean() ||
    await PayrollRun.findOne().sort({ month: -1 }).lean();

  let totalPayrollCost = 0;
  let totalNetPay = 0;
  let avgSalary = 0;

  if (latestRun && latestRun.payslips?.length) {
    let slips = latestRun.payslips;
    if (department) {
      slips = slips.filter((s) => s.department === department);
    }
    totalPayrollCost = slips.reduce((sum, s) => sum + (s.salaryStructure?.gross || 0), 0);
    totalNetPay = slips.reduce((sum, s) => sum + (s.netPay || 0), 0);
    avgSalary = slips.length > 0 ? Math.round(totalPayrollCost / slips.length) : 0;
  } else {
    // Fallback: sum from profiles
    let profilesForSalary = allProfiles.filter((p) => p.job?.status === 'active' || p.job?.status === 'probation');
    totalPayrollCost = profilesForSalary.reduce((sum, p) => sum + (p.salary?.gross || 0), 0);
    avgSalary = profilesForSalary.length > 0 ? Math.round(totalPayrollCost / profilesForSalary.length) : 0;
    totalNetPay = Math.round(totalPayrollCost * 0.85); // approximate
  }

  // 3. Headcount by Department
  const deptCountMap = {};
  const deptPayrollMap = {};

  allProfiles.forEach((p) => {
    const dept = p.job?.department || 'General';
    deptCountMap[dept] = (deptCountMap[dept] || 0) + 1;
    deptPayrollMap[dept] = (deptPayrollMap[dept] || 0) + (p.salary?.gross || 0);
  });

  const headcountByDept = Object.entries(deptCountMap).map(([dept, count]) => ({
    department: dept,
    count,
    percentage: totalEmployees > 0 ? Math.round((count / totalEmployees) * 100) : 0,
  }));

  const payrollCostByDept = Object.entries(deptPayrollMap).map(([dept, total]) => ({
    department: dept,
    totalPayroll: total,
  }));

  // 4. Gender & Tenure distribution
  const genderMap = { male: 0, female: 0, other: 0, unspecified: 0 };
  const tenureMap = { '< 1 year': 0, '1 - 2 years': 0, '2 - 5 years': 0, '5+ years': 0 };

  allProfiles.forEach((p) => {
    const g = p.personal?.gender || 'unspecified';
    genderMap[g] = (genderMap[g] || 0) + 1;

    if (p.job?.joiningDate) {
      const years = (now - new Date(p.job.joiningDate)) / (365.25 * 864e5);
      if (years < 1) tenureMap['< 1 year']++;
      else if (years < 2) tenureMap['1 - 2 years']++;
      else if (years < 5) tenureMap['2 - 5 years']++;
      else tenureMap['5+ years']++;
    } else {
      tenureMap['< 1 year']++;
    }
  });

  // 5. Recent Audit Feed
  const recentAudit = await AuditLog.find()
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  return {
    kpis: {
      headcount: activeCount,
      totalRegistered: totalEmployees,
      attritionYTD: attritionRateYTD,
      payrollCost: totalPayrollCost,
      netPayable: totalNetPay,
      avgSalary,
      currency: 'PKR',
    },
    headcountByDept,
    payrollCostByDept,
    genderDistribution: genderMap,
    tenureDistribution: tenureMap,
    recentAudit,
  };
}

async function getHRDashboard({ department } = {}) {
  const now = new Date();
  const today = startOfDayUTC(now);

  // 1. Employees query
  const profileFilter = { 'job.status': { $in: ['active', 'probation'] } };
  if (department) profileFilter['job.department'] = department;

  const profiles = await Profile.find(profileFilter)
    .populate('user', 'employeeId email role isActive')
    .lean();

  const userIds = profiles.map((p) => p.user?._id).filter(Boolean);
  const totalEmployees = profiles.length;

  // 2. Today's attendance
  const todayAttendance = await Attendance.find({
    user: { $in: userIds },
    date: today,
  }).lean();

  const presentToday = todayAttendance.filter((a) => a.status === 'present').length;
  const lateToday = todayAttendance.filter((a) => a.status === 'late').length;
  const halfDayToday = todayAttendance.filter((a) => a.status === 'half-day').length;
  const onLeaveToday = todayAttendance.filter((a) => a.status === 'leave').length;
  const missingCheckoutToday = todayAttendance.filter((a) => a.status === 'missing_checkout').length;

  // Missing or absent today
  const attendedIds = new Set(todayAttendance.map((a) => a.user.toString()));
  const notCheckedIn = profiles.filter(
  (p) => !attendedIds.has(p.user?._id?.toString())
).length;

  // 3. Pending approvals
  const pendingLeaves = await LeaveRequest.countDocuments({
    status: 'pending',
    ...(department ? { user: { $in: userIds } } : {}),
  });

  // 4. Attendance Rate formula (Brief Section 7):
  // (present + late + missing_checkout + 0.5 * half_day) / (working-day records - on_leave)
  const attendedUnits = presentToday + lateToday + missingCheckoutToday + (halfDayToday * 0.5);
  const eligibleEmployees = Math.max(1, totalEmployees - onLeaveToday);
  const todayAttendanceRate = Math.min(100, Math.round((attendedUnits / eligibleEmployees) * 100));

  // 5. Top 5 late-comers this month
  const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  const lateRecords = await Attendance.aggregate([
    {
      $match: {
        user: { $in: userIds },
        date: { $gte: startOfMonth },
        status: 'late',
      },
    },
    {
      $group: {
        _id: '$user',
        lateCount: { $sum: 1 },
      },
    },
    { $sort: { lateCount: -1 } },
    { $limit: 5 },
  ]);

  const profileMap = new Map(
  profiles
    .filter((p) => p.user?._id)
    .map((p) => [p.user._id.toString(), p])
);
  const topLateComers = lateRecords.map((item) => {
    const p = profileMap.get(item._id.toString());
    return {
      userId: item._id,
      employeeId: p?.user?.employeeId || 'N/A',
      name: `${p?.personal?.firstName || ''} ${p?.personal?.lastName || ''}`.trim() || 'Employee',
      department: p?.job?.department || '',
      lateCount: item.lateCount,
    };
  });

  // 6. Absenteeism by department this month
  // Formula: absent days / expected working days, per department
  const absenteeismByDept = [];
  const depts = [...new Set(profiles.map((p) => p.job?.department).filter(Boolean))];

  for (const dept of depts) {
    const deptProfiles = profiles.filter((p) => p.job?.department === dept);
    const deptUserIds = deptProfiles.map((p) => p.user?._id).filter(Boolean);

    const absentRecordsCount = await Attendance.countDocuments({
      user: { $in: deptUserIds },
      date: { $gte: startOfMonth },
      status: 'absent',
    });

    const expectedDays = deptUserIds.length * 20; // 20 working days approximate
    const rate = expectedDays > 0 ? Math.round((absentRecordsCount / expectedDays) * 100 * 10) / 10 : 0;

    absenteeismByDept.push({
      department: dept,
      absentDays: absentRecordsCount,
      absenteeismRate: rate,
    });
  }

  // 7. Leave utilization by type
  const approvedLeavesThisYear = await LeaveRequest.find({
    user: { $in: userIds },
    status: 'approved',
    startDate: { $gte: new Date(now.getFullYear(), 0, 1) },
  }).lean();

  const leaveUseByType = {
    annual: 0,
    sick: 0,
    casual: 0,
    unpaid: 0,
  };

  approvedLeavesThisYear.forEach((l) => {
    const t = l.type === 'paid' ? 'annual' : l.type;
    if (leaveUseByType[t] !== undefined) {
      leaveUseByType[t] += l.workingDaysCount || 1;
    }
  });

  // 8. 7-Day Attendance Trend
  const trend = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const dayRecords = await Attendance.find({
      user: { $in: userIds },
      date: d,
    }).lean();

    trend.push({
      date: d.toISOString().slice(5, 10),
      present: dayRecords.filter((r) => r.status === 'present').length,
      late: dayRecords.filter((r) => r.status === 'late').length,
      halfDay: dayRecords.filter((r) => r.status === 'half-day').length,
      leave: dayRecords.filter((r) => r.status === 'leave').length,
      absent: dayRecords.filter((r) => r.status === 'absent').length,
    });
  }

  return {
    kpis: {
      headcount: totalEmployees,
      presentToday,
      lateToday,
      halfDayToday,
      onLeaveToday,
      missingCheckoutToday,
      notCheckedIn,
      pendingApprovals: pendingLeaves,
      attendanceRate: todayAttendanceRate,
    },
    topLateComers,
    absenteeismByDept,
    leaveUseByType,
    attendanceTrend: trend,
  };
}

async function getEmployeeDashboard(userId) {
  const now = new Date();
  const today = startOfDayUTC(now);

  // 1. Today's attendance
  const todayRecord = await Attendance.findOne({ user: userId, date: today }).lean();

  // 2. Weekly hours vs 40h target
  const dayOfWeek = now.getUTCDay(); // 0 is Sun
  const startOfWeek = new Date(today);
  startOfWeek.setUTCDate(today.getUTCDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)); // Monday

  const weekRecords = await Attendance.find({
    user: userId,
    date: { $gte: startOfWeek, $lte: today },
  }).lean();

  const hoursThisWeek = Math.round(weekRecords.reduce((sum, r) => sum + (r.workHours || 0), 0) * 10) / 10;

  // 3. Late count this month
  const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  const lateCountThisMonth = await Attendance.countDocuments({
    user: userId,
    date: { $gte: startOfMonth },
    status: 'late',
  });

  // 4. Leave balances
  const approvedLeaves = await LeaveRequest.find({
    user: userId,
    status: 'approved',
    startDate: { $gte: new Date(now.getFullYear(), 0, 1) },
  }).lean();

  const leaveBalances = {
    annual: { quota: 14, used: 0, remaining: 14 },
    sick: { quota: 8, used: 0, remaining: 8 },
    casual: { quota: 10, used: 0, remaining: 10 },
    unpaid: { quota: 0, used: 0, remaining: 999 },
  };

  approvedLeaves.forEach((l) => {
    const t = l.type === 'paid' ? 'annual' : l.type;
    if (leaveBalances[t]) {
      leaveBalances[t].used += l.workingDaysCount || 1;
      if (leaveBalances[t].quota > 0) {
        leaveBalances[t].remaining = Math.max(0, leaveBalances[t].quota - leaveBalances[t].used);
      }
    }
  });

  // 5. Last payslip
  const latestRun = await PayrollRun.findOne({
    'payslips.user': userId,
    status: 'finalized',
  }).sort({ month: -1 }).lean();

  const lastPayslip = latestRun ? latestRun.payslips.find((p) => p.user.toString() === userId.toString()) : null;

  // 6. Recent Announcements
  const announcements = await Announcement.find({
    isActive: true,
    $or: [{ targetRoles: 'all' }, { targetRoles: 'employee' }],
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  return {
    todayStatus: todayRecord ? todayRecord.status : 'not_checked_in',
    todayRecord,
    hoursThisWeek,
    weeklyTarget: 40,
    lateCountThisMonth,
    leaveBalances,
    lastPayslip: lastPayslip
      ? {
          month: latestRun.month,
          gross: lastPayslip.salaryStructure?.gross,
          netPay: lastPayslip.netPay,
          currency: lastPayslip.currency,
          finalizedAt: latestRun.finalizedAt,
        }
      : null,
    announcements,
  };
}

module.exports = {
  getAdminDashboard,
  getHRDashboard,
  getEmployeeDashboard,
};
