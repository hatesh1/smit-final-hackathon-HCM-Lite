const CompanySettings = require('../models/CompanySettings');
const Department = require('../models/Department');
const Designation = require('../models/Designation');
const LeaveType = require('../models/LeaveType');
const Holiday = require('../models/Holiday');
const User = require('../models/User');
const Profile = require('../models/Profile');
const { logAction } = require('./audit.service');

const DEFAULT_DEPARTMENTS = [
  { name: 'Engineering', code: 'ENG', description: 'Software Development & Technical Infrastructure' },
  { name: 'Human Resources', code: 'HR', description: 'People Operations, Talent Acquisition & Culture' },
  { name: 'Finance & Accounts', code: 'FIN', description: 'Financial Planning, Payroll & Auditing' },
  { name: 'Operations', code: 'OPS', description: 'Business Operations, Facilities & Administration' },
  { name: 'Marketing', code: 'MKT', description: 'Brand Marketing, Outreach & Growth' },
];

const DEFAULT_DESIGNATIONS = [
  { title: 'Software Engineer', department: 'Engineering' },
  { title: 'Senior Software Engineer', department: 'Engineering' },
  { title: 'Lead Architect', department: 'Engineering' },
  { title: 'HR Officer', department: 'Human Resources' },
  { title: 'Senior HR Manager', department: 'Human Resources' },
  { title: 'Financial Analyst', department: 'Finance & Accounts' },
  { title: 'Operations Specialist', department: 'Operations' },
];

const DEFAULT_LEAVE_TYPES = [
  { name: 'Annual Leave', code: 'annual', yearlyQuota: 14, isPaid: true, description: 'Statutory paid annual vacation' },
  { name: 'Sick Leave', code: 'sick', yearlyQuota: 8, isPaid: true, description: 'Medical and recuperation leave' },
  { name: 'Casual Leave', code: 'casual', yearlyQuota: 10, isPaid: true, description: 'Urgent personal matters & family events' },
  { name: 'Unpaid Leave', code: 'unpaid', yearlyQuota: 0, isPaid: false, description: 'Extended leave without pay' },
];

const DEFAULT_HOLIDAYS = [
  { name: 'New Year Day', date: new Date('2026-01-01'), isRecurring: true },
  { name: 'Kashmir Solidarity Day', date: new Date('2026-02-05'), isRecurring: true },
  { name: 'Pakistan Day', date: new Date('2026-03-23'), isRecurring: true },
  { name: 'Eid-ul-Fitr Day 1', date: new Date('2026-03-20'), isRecurring: false },
  { name: 'Eid-ul-Fitr Day 2', date: new Date('2026-03-21'), isRecurring: false },
  { name: 'Labor Day', date: new Date('2026-05-01'), isRecurring: true },
  { name: 'Eid-ul-Adha Day 1', date: new Date('2026-05-27'), isRecurring: false },
  { name: 'Eid-ul-Adha Day 2', date: new Date('2026-05-28'), isRecurring: false },
  { name: 'Independence Day', date: new Date('2026-08-14'), isRecurring: true },
  { name: 'Iqbal Day', date: new Date('2026-11-09'), isRecurring: true },
  { name: 'Quaid-e-Azam Day', date: new Date('2026-12-25'), isRecurring: true },
];

async function getSettings() {
  let settings = await CompanySettings.findOne().lean();
  if (!settings) {
    settings = await CompanySettings.create({
      companyName: 'HCM Lite Company',
      officeStart: '09:00',
      graceMinutes: 15,
      halfDayHours: 5,
      weekendDays: ['Saturday', 'Sunday'],
      officeLocation: {
        lat: 24.8607,
        lng: 67.0011,
        radiusMeters: 150,
        address: '',
      },
      currency: 'PKR',
      isConfigured: false,
    });
    settings = settings.toObject();
  }
  return settings;
}

async function updateSettings(updates, req) {
  const before = await CompanySettings.findOne().lean();
  const settings = await CompanySettings.findOneAndUpdate(
    {},
    { $set: updates },
    { new: true, upsert: true }
  ).lean();

  await logAction({
    req,
    action: 'update',
    entity: 'CompanySettings',
    entityId: settings._id,
    details: 'Updated company configuration and attendance rules',
    beforeJSON: before,
    afterJSON: settings,
  });

  return settings;
}

async function checkFirstRun() {
  const adminCount = await User.countDocuments({ role: 'admin' });
  const settings = await CompanySettings.findOne().lean();
  return {
    isFirstRun: adminCount === 0 || !settings?.isConfigured,
    adminExists: adminCount > 0,
    isConfigured: !!settings?.isConfigured,
  };
}

async function initializeDefaults(req) {
  for (const dept of DEFAULT_DEPARTMENTS) {
    await Department.findOneAndUpdate({ code: dept.code }, { $setOnInsert: dept }, { upsert: true });
  }
  for (const des of DEFAULT_DESIGNATIONS) {
    await Designation.findOneAndUpdate({ title: des.title, department: des.department }, { $setOnInsert: des }, { upsert: true });
  }
  for (const lt of DEFAULT_LEAVE_TYPES) {
    await LeaveType.findOneAndUpdate({ code: lt.code }, { $setOnInsert: lt }, { upsert: true });
  }
  for (const hol of DEFAULT_HOLIDAYS) {
    await Holiday.findOneAndUpdate({ name: hol.name, date: hol.date }, { $setOnInsert: hol }, { upsert: true });
  }
  if (req) {
    await logAction({
      req,
      action: 'create',
      entity: 'OrganizationDefaults',
      details: 'Initialized standard departments, designations, leave quotas and public holidays',
    });
  }
}

async function listDepartments() {
  let depts = await Department.find({ isActive: true }).sort({ name: 1 }).lean();
  if (depts.length === 0) {
    await initializeDefaults();
    depts = await Department.find({ isActive: true }).sort({ name: 1 }).lean();
  }
  return depts;
}

async function createDepartment(payload, req) {
  const dept = await Department.create(payload);
  await logAction({
    req,
    action: 'create',
    entity: 'Department',
    entityId: dept._id,
    details: `Created department ${dept.name} (${dept.code})`,
    afterJSON: dept.toObject(),
  });
  return dept;
}

async function listDesignations(department) {
  const query = { isActive: true };
  if (department) query.department = department;
  let des = await Designation.find(query).sort({ title: 1 }).lean();
  if (des.length === 0 && !department) {
    await initializeDefaults();
    des = await Designation.find(query).sort({ title: 1 }).lean();
  }
  return des;
}

async function createDesignation(payload, req) {
  const des = await Designation.create(payload);
  await logAction({
    req,
    action: 'create',
    entity: 'Designation',
    entityId: des._id,
    details: `Created designation ${des.title} under ${des.department}`,
    afterJSON: des.toObject(),
  });
  return des;
}

async function listLeaveTypes() {
  let list = await LeaveType.find().lean();
  if (list.length === 0) {
    await initializeDefaults();
    list = await LeaveType.find().lean();
  }
  return list;
}

async function listHolidays(year) {
  const query = {};
  if (year) {
    const start = new Date(`${year}-01-01T00:00:00.000Z`);
    const end = new Date(`${year}-12-31T23:59:59.999Z`);
    query.date = { $gte: start, $lte: end };
  }
  let holidays = await Holiday.find(query).sort({ date: 1 }).lean();
  if (holidays.length === 0 && (!year || year === 2026)) {
    await initializeDefaults();
    holidays = await Holiday.find(query).sort({ date: 1 }).lean();
  }
  return holidays;
}

async function createHoliday(payload, req) {
  const holiday = await Holiday.create(payload);
  await logAction({
    req,
    action: 'create',
    entity: 'Holiday',
    entityId: holiday._id,
    details: `Created public holiday: ${holiday.name} on ${new Date(holiday.date).toISOString().slice(0, 10)}`,
    afterJSON: holiday.toObject(),
  });
  return holiday;
}

module.exports = {
  getSettings,
  updateSettings,
  checkFirstRun,
  initializeDefaults,
  listDepartments,
  createDepartment,
  listDesignations,
  createDesignation,
  listLeaveTypes,
  listHolidays,
  createHoliday,
};
