const User = require('../models/User');
const Profile = require('../models/Profile');
const Department = require('../models/Department');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const PayrollRun = require('../models/PayrollRun');
const { ApiError } = require('../middleware/errorHandler');
const { logAction } = require('./audit.service');

function computeSalary(basic = 0, customAllowances = 0, customDeductions = 0, currency = 'PKR') {
  const basicNum = Number(basic) || 0;
  const hra = Math.round(basicNum * 0.4); // 40%
  const medical = Math.round(basicNum * 0.1); // 10%
  const allowances = Number(customAllowances) || 0;
  const gross = basicNum + hra + medical + allowances; // 1.5 * basic + allowances
  return {
    basic: basicNum,
    hra,
    medical,
    allowances,
    deductions: Number(customDeductions) || 0,
    gross,
    currency,
  };
}

async function registerEmployee(data, req) {
  const {
    employeeId,
    email,
    password = 'ChangeMe@123',
    firstName,
    lastName,
    phone,
    address,
    gender,
    department,
    designation,
    joiningDate,
    employmentType = 'full-time',
    basicSalary = 50000,
    allowances = 0,
    currency = 'PKR',
  } = data;

  if (!employeeId || !email || !firstName || !lastName) {
    throw new ApiError(400, 'Employee ID, email, first name, and last name are required');
  }

  const existing = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { employeeId: employeeId.toUpperCase() }],
  });
  if (existing) {
    throw new ApiError(409, 'An employee with this email or employee ID already exists');
  }

  const user = new User({
    employeeId: employeeId.toUpperCase(),
    email: email.toLowerCase(),
    role: 'employee',
    isEmailVerified: true,
    mustChangePassword: true,
    isActive: true,
  });
  await user.setPassword(password);
  await user.save();

  const salaryCalc = computeSalary(basicSalary, allowances, 0, currency);

  const profile = await Profile.create({
    user: user._id,
    personal: {
      firstName,
      lastName,
      gender: gender || 'unspecified',
      phone: phone || '',
      address: address || '',
    },
    job: {
      department: department || 'Engineering',
      designation: designation || 'Staff',
      joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      employmentType,
      status: 'active',
    },
    salary: salaryCalc,
  });

  await logAction({
    req,
    action: 'create',
    entity: 'Employee',
    entityId: user._id,
    details: `Registered employee ${user.employeeId} (${firstName} ${lastName})`,
    afterJSON: { employeeId: user.employeeId, email: user.email, department, designation, salary: salaryCalc },
  });

  return {
    user: user.toSafeJSON(),
    profile,
    temporaryPassword: password,
  };
}

async function listEmployees({ search, department, designation, status, page = 1, limit = 20 }) {
  const profileQuery = {};
  if (department) profileQuery['job.department'] = department;
  if (designation) profileQuery['job.designation'] = designation;
  if (status) profileQuery['job.status'] = status;

  if (search) {
    profileQuery.$or = [
      { 'personal.firstName': { $regex: search, $options: 'i' } },
      { 'personal.lastName': { $regex: search, $options: 'i' } },
      { 'personal.phone': { $regex: search, $options: 'i' } },
    ];
  }

  let userQuery = {};
  if (search) {
    userQuery.$or = [
      { email: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } },
    ];
  }

  const users = await User.find(userQuery).lean();
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  if (search && users.length > 0) {
    profileQuery.$or = [
      ...(profileQuery.$or || []),
      { user: { $in: users.map((u) => u._id) } },
    ];
  }

  const total = await Profile.countDocuments(profileQuery);
  const profiles = await Profile.find(profileQuery)
    .populate('user', 'employeeId email role isActive createdAt')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .lean();

  return { employees: profiles, total, page: Number(page), pages: Math.ceil(total / limit) || 1 };
}

async function getEmployee360(userId, requestingUser) {
  // Scope check: employee can only view own 360 profile!
  if (requestingUser.role === 'employee' && requestingUser.id !== userId && requestingUser._id?.toString() !== userId) {
    throw new ApiError(403, 'Employees can only view their own 360 profile');
  }

  const user = await User.findById(userId).lean();
  if (!user) throw new ApiError(404, 'Employee not found');

  const profile = await Profile.findOne({ user: userId }).lean();

  // Attendance stats for current year/month
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const attendanceRecords = await Attendance.find({
    user: userId,
    date: { $gte: startOfYear },
  }).sort({ date: -1 }).limit(60).lean();

  const attendanceStats = {
    totalRecorded: attendanceRecords.length,
    present: attendanceRecords.filter((a) => a.status === 'present').length,
    late: attendanceRecords.filter((a) => a.status === 'late').length,
    halfDay: attendanceRecords.filter((a) => a.status === 'half-day').length,
    absent: attendanceRecords.filter((a) => a.status === 'absent').length,
    leave: attendanceRecords.filter((a) => a.status === 'leave').length,
    totalHours: Math.round(attendanceRecords.reduce((acc, a) => acc + (a.workHours || 0), 0) * 10) / 10,
  };

  // Leave stats
  const leaves = await LeaveRequest.find({
    user: userId,
    startDate: { $gte: startOfYear },
  }).sort({ startDate: -1 }).lean();

  const leaveBalances = {
    annual: { quota: 14, used: 0, balance: 14 },
    sick: { quota: 8, used: 0, balance: 8 },
    casual: { quota: 10, used: 0, balance: 10 },
    unpaid: { quota: 0, used: 0, balance: 999 },
  };

  leaves
    .filter((l) => l.status === 'approved')
    .forEach((l) => {
      const type = l.type === 'paid' ? 'annual' : l.type;
      if (leaveBalances[type]) {
        leaveBalances[type].used += l.workingDaysCount || 1;
        if (leaveBalances[type].quota > 0) {
          leaveBalances[type].balance = Math.max(0, leaveBalances[type].quota - leaveBalances[type].used);
        }
      }
    });

  // Payroll payslips
  const payrollRuns = await PayrollRun.find({ 'payslips.user': userId, status: 'finalized' })
    .sort({ month: -1 })
    .lean();

  const payslips = payrollRuns.map((run) => {
    const slip = run.payslips.find((p) => p.user.toString() === userId.toString());
    return {
      month: run.month,
      runId: run._id,
      finalizedAt: run.finalizedAt,
      slip,
    };
  });

  return {
    user: {
      id: user._id,
      employeeId: user.employeeId,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    },
    profile,
    attendanceStats,
    recentAttendance: attendanceRecords.slice(0, 10),
    leaveBalances,
    recentLeaves: leaves.slice(0, 10),
    payslips,
  };
}

async function updateEmployee(userId, updates, requestingUser, req) {
  const profile = await Profile.findOne({ user: userId });
  if (!profile) throw new ApiError(404, 'Employee profile not found');

  const beforeJSON = profile.toObject();

  // Scope check:
  if (requestingUser.role === 'employee') {
    if (requestingUser.id !== userId && requestingUser._id?.toString() !== userId) {
      throw new ApiError(403, 'Employees can only edit their own profile');
    }
    // Employee can ONLY edit personal phone and address!
    if (updates.personal?.phone !== undefined) profile.personal.phone = updates.personal.phone;
    if (updates.personal?.address !== undefined) profile.personal.address = updates.personal.address;
    if (updates.personal?.emergencyContact !== undefined) profile.personal.emergencyContact = updates.personal.emergencyContact;
    await profile.save();
    return profile.toObject();
  }

  // Admin and HR can edit personal, job, salary
  if (updates.personal) {
    profile.personal = { ...profile.personal, ...updates.personal };
  }
  if (updates.job) {
    profile.job = { ...profile.job, ...updates.job };
  }
  if (updates.salary) {
    const basic = updates.salary.basic !== undefined ? updates.salary.basic : profile.salary.basic;
    const allowances = updates.salary.allowances !== undefined ? updates.salary.allowances : profile.salary.allowances;
    const deductions = updates.salary.deductions !== undefined ? updates.salary.deductions : profile.salary.deductions;
    profile.salary = computeSalary(basic, allowances, deductions, profile.salary.currency || 'PKR');
  }

  await profile.save();

  await logAction({
    req,
    action: 'update',
    entity: 'EmployeeProfile',
    entityId: userId,
    details: `Updated details for employee ${userId}`,
    beforeJSON,
    afterJSON: profile.toObject(),
  });

  return profile.toObject();
}

async function csvDryRun(csvRows) {
  // Checks: required fields, unique employeeId and email, valid email, known dept, ISO date, salary > 0
  const depts = await Department.find({ isActive: true }).select('name').lean();
  const deptNames = new Set(depts.map((d) => d.name.toLowerCase()));

  const existingUsers = await User.find({}).select('email employeeId').lean();
  const existingEmails = new Set(existingUsers.map((u) => u.email.toLowerCase()));
  const existingEmpIds = new Set(existingUsers.map((u) => u.employeeId.toUpperCase()));

  const seenInCsvEmails = new Set();
  const seenInCsvEmpIds = new Set();

  const errors = [];
  const validRows = [];

  csvRows.forEach((row, index) => {
    const rowNum = index + 1;
    const { employeeId, email, firstName, lastName, department, joiningDate, basicSalary } = row;

    if (!employeeId) errors.push({ row: rowNum, field: 'employeeId', reason: 'Employee ID is required' });
    else if (existingEmpIds.has(employeeId.toUpperCase())) errors.push({ row: rowNum, field: 'employeeId', reason: `Employee ID '${employeeId}' already exists in database` });
    else if (seenInCsvEmpIds.has(employeeId.toUpperCase())) errors.push({ row: rowNum, field: 'employeeId', reason: `Duplicate Employee ID '${employeeId}' in CSV` });
    else seenInCsvEmpIds.add(employeeId.toUpperCase());

    if (!email) errors.push({ row: rowNum, field: 'email', reason: 'Email is required' });
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push({ row: rowNum, field: 'email', reason: `Invalid email format: '${email}'` });
    else if (existingEmails.has(email.toLowerCase())) errors.push({ row: rowNum, field: 'email', reason: `Email '${email}' already exists in database` });
    else if (seenInCsvEmails.has(email.toLowerCase())) errors.push({ row: rowNum, field: 'email', reason: `Duplicate email '${email}' in CSV` });
    else seenInCsvEmails.add(email.toLowerCase());

    if (!firstName) errors.push({ row: rowNum, field: 'firstName', reason: 'First name is required' });
    if (!lastName) errors.push({ row: rowNum, field: 'lastName', reason: 'Last name is required' });

    if (department && !deptNames.has(department.toLowerCase())) {
      errors.push({ row: rowNum, field: 'department', reason: `Unknown department '${department}'` });
    }

    if (joiningDate) {
      const d = new Date(joiningDate);
      if (Number.isNaN(d.getTime())) errors.push({ row: rowNum, field: 'joiningDate', reason: `Invalid date '${joiningDate}'. Must be YYYY-MM-DD` });
    }

    const basicNum = Number(basicSalary);
    if (!basicSalary || Number.isNaN(basicNum) || basicNum <= 0) {
      errors.push({ row: rowNum, field: 'basicSalary', reason: 'Basic salary must be a positive number greater than 0' });
    }

    if (!errors.some((e) => e.row === rowNum)) {
      validRows.push({
        ...row,
        employeeId: employeeId.toUpperCase(),
        email: email.toLowerCase(),
      });
    }
  });

  return {
    totalRows: csvRows.length,
    validCount: validRows.length,
    errorCount: errors.length,
    errors,
    validRows,
  };
}

async function csvCommit(validRows, req) {
  const created = [];
  for (const row of validRows) {
    const result = await registerEmployee(
      {
        employeeId: row.employeeId,
        email: row.email,
        firstName: row.firstName,
        lastName: row.lastName,
        phone: row.phone || '',
        department: row.department || 'Engineering',
        designation: row.designation || 'Staff',
        joiningDate: row.joiningDate || new Date(),
        basicSalary: Number(row.basicSalary) || 50000,
        allowances: Number(row.allowances) || 0,
        currency: row.currency || 'PKR',
      },
      req
    );
    created.push(result);
  }

  await logAction({
    req,
    action: 'create',
    entity: 'CSVImport',
    details: `Imported ${created.length} employees via CSV`,
  });

  return { count: created.length, employees: created };
}

async function exportEmployeesCSV() {
  const profiles = await Profile.find()
    .populate('user', 'employeeId email role isActive')
    .sort({ createdAt: -1 })
    .lean();

  const headers = [
    'Employee ID',
    'First Name',
    'Last Name',
    'Email',
    'Phone',
    'Department',
    'Designation',
    'Employment Type',
    'Status',
    'Joining Date',
    'Basic Salary',
    'HRA',
    'Medical',
    'Gross Salary',
    'Currency',
  ];

  const rows = profiles.map((p) => [
    p.user?.employeeId || '',
    `"${(p.personal?.firstName || '').replace(/"/g, '""')}"`,
    `"${(p.personal?.lastName || '').replace(/"/g, '""')}"`,
    p.user?.email || '',
    p.personal?.phone || '',
    `"${(p.job?.department || '').replace(/"/g, '""')}"`,
    `"${(p.job?.designation || '').replace(/"/g, '""')}"`,
    p.job?.employmentType || '',
    p.job?.status || '',
    p.job?.joiningDate ? new Date(p.job.joiningDate).toISOString().slice(0, 10) : '',
    p.salary?.basic || 0,
    p.salary?.hra || 0,
    p.salary?.medical || 0,
    p.salary?.gross || 0,
    p.salary?.currency || 'PKR',
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

module.exports = {
  computeSalary,
  registerEmployee,
  listEmployees,
  getEmployee360,
  updateEmployee,
  csvDryRun,
  csvCommit,
  exportEmployeesCSV,
};
