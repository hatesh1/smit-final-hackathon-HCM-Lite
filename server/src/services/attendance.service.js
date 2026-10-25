const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const AttendanceCorrection = require('../models/AttendanceCorrection');
const User = require('../models/User');
const Profile = require('../models/Profile');
const CompanySettings = require('../models/CompanySettings');
const LeaveRequest = require('../models/LeaveRequest');
const { ApiError } = require('../middleware/errorHandler');
const { startOfDayUTC } = require('../utils/dates');
const { logAction } = require('./audit.service');
const { notify } = require('./notification.service');

// Haversine formula for calculating GPS distance in meters
function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

async function checkIn(userId, { location, source = 'web', faceVerified = false } = {}, req) {
  const settings = await CompanySettings.findOne().lean() || {
    officeStart: '09:00',
    graceMinutes: 15,
    halfDayHours: 5,
    officeLocation: { lat: 24.8607, lng: 67.0011, radiusMeters: 150 },
  };

  // Optional Geolocation & Geofence check
  let locationData = null;
  if (location && location.lat && location.lng) {
    if (location.accuracy && location.accuracy > 100) {
      throw new ApiError(400, `GPS accuracy too low (${Math.round(location.accuracy)}m > 100m threshold). Please move to an open area.`);
    }

    const dist = haversineDistanceMeters(
      location.lat,
      location.lng,
      settings.officeLocation.lat,
      settings.officeLocation.lng
    );

    locationData = {
      lat: location.lat,
      lng: location.lng,
      distanceMeters: dist,
      accuracy: location.accuracy || 0,
    };

    if (source === 'camera' && dist > (settings.officeLocation.radiusMeters || 150)) {
      throw new ApiError(
        400,
        `Geofence check failed: You are ${dist}m away from the office (Allowed: ${settings.officeLocation.radiusMeters || 150}m).`
      );
    }
  }

  const now = new Date();
  const today = startOfDayUTC(now);

  // Check if today is marked as approved leave
  const onLeave = await LeaveRequest.findOne({
    user: userId,
    status: 'approved',
    startDate: { $lte: today },
    endDate: { $gte: today },
  }).lean();

  if (onLeave) {
    throw new ApiError(409, `You are on approved ${onLeave.type} leave today.`);
  }

  // Determine if late based on office start + grace minutes
  const [startHour, startMin] = (settings.officeStart || '09:00').split(':').map(Number);
  const grace = settings.graceMinutes || 15;
  const lateCutoff = new Date(now);
  lateCutoff.setHours(startHour, startMin + grace, 0, 0);

  const isLate = now > lateCutoff;
  const initialStatus = isLate ? 'late' : 'present';

  let previous;
  try {
    previous = await Attendance.findOneAndUpdate(
      { user: userId, date: today },
      {
        $setOnInsert: {
          checkIn: now,
          status: initialStatus,
          source,
          faceVerified: !!faceVerified,
          location: locationData,
        },
      },
      { upsert: true, returnDocument: 'before' }
    );
  } catch (err) {
    if (err.code === 11000) throw new ApiError(409, 'You have already checked in today');
    throw err;
  }

  if (previous) {
    if (previous.status === 'leave') throw new ApiError(409, 'You are on approved leave today');
    throw new ApiError(409, 'You have already checked in today');
  }

  const record = await Attendance.findOne({ user: userId, date: today }).lean();

  await logAction({
    req,
    action: 'create',
    entity: 'Attendance',
    entityId: record._id,
    details: `Employee checked in (${initialStatus}) at ${now.toLocaleTimeString()}`,
  });

  return record;
}

async function checkOut(userId, req) {
  const settings = await CompanySettings.findOne().lean() || { halfDayHours: 5 };
  const today = startOfDayUTC(new Date());

  const record = await Attendance.findOne({ user: userId, date: today });
  if (!record || !record.checkIn) throw new ApiError(400, 'Please check in before checking out');
  if (record.checkOut) throw new ApiError(409, 'You have already checked out today');

  const now = new Date();
  record.checkOut = now;
  const hours = ((now.getTime() - record.checkIn.getTime()) / 36e5);
  record.workHours = Math.round(hours * 100) / 100;

  // Rule: Half day under 5 hours
  if (record.workHours < (settings.halfDayHours || 5)) {
    record.status = 'half-day';
  } else if (record.status !== 'late') {
    record.status = 'present';
  }

  await record.save();

  await logAction({
    req,
    action: 'update',
    entity: 'Attendance',
    entityId: record._id,
    details: `Employee checked out. Total hours: ${record.workHours}h (Status: ${record.status})`,
  });

  return record.toObject();
}

async function listOwn(userId, { from, to }) {
  const filter = { user: userId };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = startOfDayUTC(from);
    if (to) filter.date.$lte = startOfDayUTC(to);
  }
  return Attendance.find(filter).sort({ date: -1 }).limit(100).lean();
}

async function getDailyBoard({ date, department, status }) {
  const targetDate = date ? startOfDayUTC(date) : startOfDayUTC(new Date());

  const profileQuery = { 'job.status': { $in: ['active', 'probation'] } };
  if (department) profileQuery['job.department'] = department;

  const profiles = await Profile.find(profileQuery)
    .populate('user', 'employeeId email role isActive')
    .lean();

  const userIds = profiles.map((p) => p.user?._id).filter(Boolean);

  const attendanceRecords = await Attendance.find({
    user: { $in: userIds },
    date: targetDate,
  }).lean();

  const attendanceMap = new Map(attendanceRecords.map((a) => [a.user.toString(), a]));

  const rows = profiles.map((p) => {
    const userIdStr = p.user?._id.toString();
    const att = attendanceMap.get(userIdStr);
    return {
      userId: p.user?._id,
      employeeId: p.user?.employeeId,
      name: `${p.personal?.firstName || ''} ${p.personal?.lastName || ''}`.trim(),
      department: p.job?.department || '',
      designation: p.job?.designation || '',
      attendance: att || {
        date: targetDate,
        status: 'absent',
        checkIn: null,
        checkOut: null,
        workHours: 0,
        source: 'system',
      },
    };
  });

  const filtered = status ? rows.filter((r) => r.attendance.status === status) : rows;

  return {
    date: targetDate.toISOString().slice(0, 10),
    totalEmployees: rows.length,
    counts: {
      present: rows.filter((r) => r.attendance.status === 'present').length,
      late: rows.filter((r) => r.attendance.status === 'late').length,
      halfDay: rows.filter((r) => r.attendance.status === 'half-day').length,
      leave: rows.filter((r) => r.attendance.status === 'leave').length,
      absent: rows.filter((r) => r.attendance.status === 'absent').length,
      missingCheckout: rows.filter((r) => r.attendance.status === 'missing_checkout').length,
    },
    rows: filtered,
  };
}

async function requestCorrection(userId, { date, requestedCheckIn, requestedCheckOut, requestedStatus = 'present', reason }, req) {
  const targetDate = startOfDayUTC(date);
  if (!reason) throw new ApiError(400, 'Reason for correction request is required');

  const correction = await AttendanceCorrection.create({
    user: userId,
    date: targetDate,
    requestedCheckIn: new Date(requestedCheckIn),
    requestedCheckOut: requestedCheckOut ? new Date(requestedCheckOut) : null,
    requestedStatus,
    reason,
    status: 'pending',
  });

  await logAction({
    req,
    action: 'create',
    entity: 'AttendanceCorrection',
    entityId: correction._id,
    details: `Employee submitted attendance correction request for ${targetDate.toISOString().slice(0, 10)}`,
  });

  return correction.toObject();
}

async function listCorrections({ status, userId }) {
  const query = {};
  if (status) query.status = status;
  if (userId) query.user = userId;

  return AttendanceCorrection.find(query)
    .populate('user', 'employeeId email')
    .sort({ createdAt: -1 })
    .lean();
}

async function decideCorrection(correctionId, { status, reviewComment }, reviewer, req) {
  const correction = await AttendanceCorrection.findById(correctionId);
  if (!correction) throw new ApiError(404, 'Correction request not found');
  if (correction.status !== 'pending') throw new ApiError(400, 'Correction request has already been processed');

  correction.status = status;
  correction.reviewComment = reviewComment || '';
  correction.reviewedBy = reviewer.id || reviewer._id;
  correction.reviewedAt = new Date();
  await correction.save();

  if (status === 'approved') {
    let workHours = 0;
    if (correction.requestedCheckIn && correction.requestedCheckOut) {
      workHours = Math.round(((correction.requestedCheckOut - correction.requestedCheckIn) / 36e5) * 100) / 100;
    }

    await Attendance.findOneAndUpdate(
      { user: correction.user, date: correction.date },
      {
        $set: {
          checkIn: correction.requestedCheckIn,
          checkOut: correction.requestedCheckOut,
          status: correction.requestedStatus,
          workHours,
          source: 'manual',
          remarks: `Approved correction: ${correction.reason}`,
        },
      },
      { upsert: true }
    );
  }

  await notify({
    userId: correction.user,
    message: `Your attendance correction for ${correction.date.toISOString().slice(0, 10)} was ${status}.`,
    type: 'attendance',
    link: '/app/attendance',
  });

  await logAction({
    req,
    action: status === 'approved' ? 'approve' : 'reject',
    entity: 'AttendanceCorrection',
    entityId: correction._id,
    details: `HR ${status} attendance correction for employee ${correction.user}`,
  });

  return correction.toObject();
}

async function markAbsentees(date) {
  const targetDate = startOfDayUTC(date || new Date());
  const activeProfiles = await Profile.find({ 'job.status': { $in: ['active', 'probation'] } })
    .populate('user', 'employeeId email isActive')
    .lean();

  const userIds = activeProfiles.map((p) => p.user?._id).filter(Boolean);

  const existingAttendance = await Attendance.find({
    user: { $in: userIds },
    date: targetDate,
  }).lean();

  const existingUserIds = new Set(existingAttendance.map((a) => a.user.toString()));

  const approvedLeaves = await LeaveRequest.find({
    user: { $in: userIds },
    status: 'approved',
    startDate: { $lte: targetDate },
    endDate: { $gte: targetDate },
  }).lean();

  const onLeaveUserIds = new Set(approvedLeaves.map((l) => l.user.toString()));

  const toInsert = [];
  for (const p of activeProfiles) {
    const uid = p.user?._id.toString();
    if (!existingUserIds.has(uid)) {
      if (onLeaveUserIds.has(uid)) {
        toInsert.push({ user: p.user._id, date: targetDate, status: 'leave', source: 'system' });
      } else {
        toInsert.push({ user: p.user._id, date: targetDate, status: 'absent', source: 'system' });
      }
    }
  }

  if (toInsert.length > 0) {
    await Attendance.insertMany(toInsert);
  }

  return { markedCount: toInsert.length, date: targetDate.toISOString().slice(0, 10) };
}

module.exports = {
  checkIn,
  checkOut,
  listOwn,
  getDailyBoard,
  requestCorrection,
  listCorrections,
  decideCorrection,
  markAbsentees,
};
