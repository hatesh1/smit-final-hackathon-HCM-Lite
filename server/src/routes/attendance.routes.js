const router = require('express').Router();
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const attendanceService = require('../services/attendance.service');

router.use(auth);

// Web & Camera Check-in (HR and Employee for self)
router.post('/check-in', async (req, res, next) => {
  try {
    const record = await attendanceService.checkIn(req.user.id, req.body, req);
    res.status(201).json({ record });
  } catch (err) {
    next(err);
  }
});

// Check-out
router.post('/check-out', async (req, res, next) => {
  try {
    const record = await attendanceService.checkOut(req.user.id, req);
    res.json({ record });
  } catch (err) {
    next(err);
  }
});

// Own Attendance History
router.get('/me', async (req, res, next) => {
  try {
    const records = await attendanceService.listOwn(req.user.id, req.query);
    res.json({ records });
  } catch (err) {
    next(err);
  }
});

// Daily Attendance Board (Admin and HR)
router.get('/daily-board', rbac('admin', 'hr'), async (req, res, next) => {
  try {
    const board = await attendanceService.getDailyBoard(req.query);
    res.json(board);
  } catch (err) {
    next(err);
  }
});

// Run Absentee Sweep (Admin and HR)
router.post('/mark-absentees', rbac('admin', 'hr'), async (req, res, next) => {
  try {
    const result = await attendanceService.markAbsentees(req.body.date);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Request Attendance Correction (Employee and HR for self)
router.post('/corrections', async (req, res, next) => {
  try {
    const correction = await attendanceService.requestCorrection(req.user.id, req.body, req);
    res.status(201).json({ correction });
  } catch (err) {
    next(err);
  }
});

// List Attendance Corrections (Admin view all, HR view all, Employee view own)
router.get('/corrections', async (req, res, next) => {
  try {
    const query = { ...req.query };
    if (req.user.role === 'employee') {
      query.userId = req.user.id;
    }
    const corrections = await attendanceService.listCorrections(query);
    res.json({ corrections });
  } catch (err) {
    next(err);
  }
});

// Approve or Reject Attendance Correction (HR only)
router.patch('/corrections/:id', rbac('hr'), async (req, res, next) => {
  try {
    const updated = await attendanceService.decideCorrection(req.params.id, req.body, req.user, req);
    res.json({ correction: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
