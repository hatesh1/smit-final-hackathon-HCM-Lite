const router = require('express').Router();
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const User = require('../models/User');

router.use(auth, rbac('admin'));

// Dashboard summary tiles. Attendance/leave counts are filled in by later
// modules; models are loaded lazily so this endpoint works as modules land.
router.get('/summary', async (req, res, next) => {
  try {
    const [totalEmployees, totalAdmins] = await Promise.all([
      User.countDocuments({ role: 'employee' }),
      User.countDocuments({ role: 'admin' }),
    ]);

    let presentToday = 0;
    let pendingLeaves = 0;
    try {
      const Attendance = require('../models/Attendance');
      const { startOfDayUTC } = require('../utils/dates');
      presentToday = await Attendance.countDocuments({
        date: startOfDayUTC(new Date()),
        status: { $in: ['present', 'half-day'] },
      });
    } catch { /* attendance module not installed yet */ }
    try {
      const LeaveRequest = require('../models/LeaveRequest');
      pendingLeaves = await LeaveRequest.countDocuments({ status: 'pending' });
    } catch { /* leave module not installed yet */ }

    res.json({ summary: { totalEmployees, totalAdmins, presentToday, pendingLeaves } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
