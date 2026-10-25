const router = require('express').Router();
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const dashboardService = require('../services/dashboard.service');

router.use(auth);

// Admin Dashboard: company-wide KPIs, attrition, payroll cost, dept breakdown, audit feed
router.get('/admin', rbac('admin'), async (req, res, next) => {
  try {
    const data = await dashboardService.getAdminDashboard(req.query);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// HR Dashboard: daily operations, attendance rate, late-comers, absenteeism, leave use
router.get('/hr', rbac('hr'), async (req, res, next) => {
  try {
    const data = await dashboardService.getHRDashboard(req.query);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Employee Dashboard: personal check-in status, weekly hours, late count, leave balance, last payslip
router.get('/employee', async (req, res, next) => {
  try {
    const data = await dashboardService.getEmployeeDashboard(req.user.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
