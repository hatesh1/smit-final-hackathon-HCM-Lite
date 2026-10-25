const LeaveRequest = require('../models/LeaveRequest');
const Attendance = require('../models/Attendance');
const Holiday = require('../models/Holiday');
const CompanySettings = require('../models/CompanySettings');
const { ApiError } = require('../middleware/errorHandler');
const { startOfDayUTC, eachDayUTC } = require('../utils/dates');
const { notify, notifyAdmins } = require('./notification.service');
const { logAction } = require('./audit.service');

const DEFAULT_QUOTAS = {
  annual: 14,
  sick: 8,
  casual: 10,
  unpaid: 0, // unlimited
};

// Calculate working days excluding weekends (Sat-Sun) and registered public holidays
async function calculateWorkingDays(startDate, endDate) {
  const settings = await CompanySettings.findOne().lean() || { weekendDays: ['Saturday', 'Sunday'] };
  const weekends = new Set((settings.weekendDays || ['Saturday', 'Sunday']).map((d) => d.toLowerCase()));

  const holidays = await Holiday.find({
    date: { $gte: startDate, $lte: endDate },
  }).lean();

  const holidayDateStrs = new Set(
    holidays.map((h) => new Date(h.date).toISOString().slice(0, 10))
  );

  const days = eachDayUTC(startDate, endDate);
  const workingDays = [];

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  for (const day of days) {
    const dayName = dayNames[day.getUTCDay()];
    const dateStr = day.toISOString().slice(0, 10);
    const isWeekend = weekends.has(dayName);
    const isHoliday = holidayDateStrs.has(dateStr);

    if (!isWeekend && !isHoliday) {
      workingDays.push(day);
    }
  }

  return workingDays;
}

async function getBalances(userId, year = new Date().getFullYear()) {
  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const endOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59));

  const approvedLeaves = await LeaveRequest.find({
    user: userId,
    status: 'approved',
    startDate: { $gte: startOfYear, $lte: endOfYear },
  }).lean();

  const balances = {
    annual: { quota: DEFAULT_QUOTAS.annual, used: 0, balance: DEFAULT_QUOTAS.annual },
    sick: { quota: DEFAULT_QUOTAS.sick, used: 0, balance: DEFAULT_QUOTAS.sick },
    casual: { quota: DEFAULT_QUOTAS.casual, used: 0, balance: DEFAULT_QUOTAS.casual },
    unpaid: { quota: 0, used: 0, balance: 999 },
  };

  for (const req of approvedLeaves) {
    const type = req.type === 'paid' ? 'annual' : req.type;
    if (balances[type]) {
      balances[type].used += req.workingDaysCount || 1;
      if (balances[type].quota > 0) {
        balances[type].balance = Math.max(0, balances[type].quota - balances[type].used);
      }
    }
  }

  return balances;
}

async function create(userId, { type, startDate, endDate, remarks }, req) {
  const start = startOfDayUTC(startDate);
  const end = startOfDayUTC(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new ApiError(400, 'Invalid date range');
  }
  if (start > end) {
    throw new ApiError(400, 'Start date must be on or before end date');
  }

  // 1. Calculate working days (skip weekends and public holidays)
  const workingDays = await calculateWorkingDays(start, end);
  if (workingDays.length === 0) {
    throw new ApiError(400, 'Selected date range contains only weekends or public holidays');
  }

  const workingDaysCount = workingDays.length;

  // 2. Overlap check -> 422
  const overlap = await LeaveRequest.findOne({
    user: userId,
    status: { $in: ['pending', 'approved'] },
    startDate: { $lte: end },
    endDate: { $gte: start },
  }).lean();

  if (overlap) {
    throw new ApiError(422, 'Overlapping leave request already exists for these dates');
  }

  // 3. Balance / Quota check -> 422
  const normalizedType = type === 'paid' ? 'annual' : type;
  if (normalizedType !== 'unpaid') {
    const balances = await getBalances(userId, start.getUTCFullYear());
    const available = balances[normalizedType]?.balance || 0;
    if (workingDaysCount > available) {
      throw new ApiError(
        422,
        `Leave balance exceeded for ${normalizedType} leave. Available: ${available} days, Requested: ${workingDaysCount} working days.`
      );
    }
  }

  const leave = await LeaveRequest.create({
    user: userId,
    type: normalizedType,
    startDate: start,
    endDate: end,
    workingDaysCount,
    remarks: remarks || '',
  });

  await notifyAdmins({
    message: `New ${normalizedType} leave application (${workingDaysCount} working days)`,
    type: 'leave',
    link: '/admin/leaves',
  });

  await logAction({
    req,
    action: 'create',
    entity: 'LeaveRequest',
    entityId: leave._id,
    details: `Applied for ${workingDaysCount} days ${normalizedType} leave (${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)})`,
  });

  return leave.toObject();
}

async function listOwn(userId, { from, to }) {
  const filter = { user: userId };
  if (from && to) {
    filter.startDate = { $lte: startOfDayUTC(to) };
    filter.endDate = { $gte: startOfDayUTC(from) };
  }
  return LeaveRequest.find(filter).sort({ startDate: -1 }).limit(100).lean();
}

async function cancelOwn(userId, requestId, req) {
  const request = await LeaveRequest.findOne({ _id: requestId, user: userId });
  if (!request) throw new ApiError(404, 'Leave request not found');
  if (request.status !== 'pending') {
    throw new ApiError(400, 'Only pending leave requests can be cancelled');
  }

  request.status = 'cancelled';
  await request.save();

  await logAction({
    req,
    action: 'update',
    entity: 'LeaveRequest',
    entityId: request._id,
    details: `Employee cancelled pending ${request.type} leave request`,
  });

  return { message: 'Leave request cancelled' };
}

async function adminList({ status, department, page = 1, limit = 50 }) {
  const query = {};
  if (status) query.status = status;

  const total = await LeaveRequest.countDocuments(query);
  const requests = await LeaveRequest.find(query)
    .populate('user', 'employeeId email role')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .lean();

  return { requests, total, page: Number(page), pages: Math.ceil(total / limit) || 1 };
}

async function decide(reviewerId, requestId, { status, adminComment }, req) {
  const request = await LeaveRequest.findById(requestId);
  if (!request) throw new ApiError(404, 'Leave request not found');
  if (request.status !== 'pending') {
    throw new ApiError(400, 'Leave request has already been processed');
  }

  const beforeJSON = request.toObject();

  request.status = status;
  request.adminComment = adminComment || '';
  request.reviewedBy = reviewerId;
  request.reviewedAt = new Date();
  await request.save();

  // If approved: bulk upsert 'leave' status attendance records for all working days in range!
  if (status === 'approved') {
    const workingDays = await calculateWorkingDays(request.startDate, request.endDate);
    for (const day of workingDays) {
      await Attendance.findOneAndUpdate(
        { user: request.user, date: day },
        {
          $set: {
            status: 'leave',
            workHours: 0,
            source: 'system',
            remarks: `Approved ${request.type} leave`,
          },
        },
        { upsert: true }
      );
    }
  }

  await notify({
    userId: request.user,
    message: `Your ${request.type} leave request was ${status} by HR.`,
    type: 'leave',
    link: '/app/leave',
  });

  await logAction({
    req,
    action: status === 'approved' ? 'approve' : 'reject',
    entity: 'LeaveRequest',
    entityId: request._id,
    details: `HR ${status} ${request.type} leave for employee ${request.user}`,
    beforeJSON,
    afterJSON: request.toObject(),
  });

  return request.toObject();
}

module.exports = {
  calculateWorkingDays,
  getBalances,
  create,
  listOwn,
  cancelOwn,
  adminList,
  decide,
};
