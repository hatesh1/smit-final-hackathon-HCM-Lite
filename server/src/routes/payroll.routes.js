const router = require('express').Router();
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const payrollService = require('../services/payroll.service');
const employeeService = require('../services/employee.service');

router.use(auth);

// Employee: list own finalized payslips
router.get('/me/payslips', async (req, res, next) => {
  try {
    const list = await payrollService.listEmployeePayslips(req.user.id);
    res.json({ payslips: list });
  } catch (err) {
    next(err);
  }
});

// Employee: get specific payslip
router.get('/me/payslips/:month', async (req, res, next) => {
  try {
    const slip = await payrollService.getEmployeePayslip(req.user.id, req.params.month);
    if (!slip) return res.status(404).json({ message: 'Payslip not found for this month' });
    res.json(slip);
  } catch (err) {
    next(err);
  }
});

// Admin & HR: list all payroll runs
router.get('/runs', rbac('admin', 'hr'), async (req, res, next) => {
  try {
    const runs = await payrollService.listPayrollRuns();
    res.json({ runs });
  } catch (err) {
    next(err);
  }
});

// Admin & HR: get full monthly payroll run (with all employee payslips)
router.get('/runs/:month', rbac('admin', 'hr'), async (req, res, next) => {
  try {
    const run = await payrollService.getMonthlyRun(req.params.month);
    if (!run) return res.status(404).json({ message: 'Payroll run not found for this month' });
    res.json({ run });
  } catch (err) {
    next(err);
  }
});

// HR: Create / recalculate monthly payroll draft (HR only)
router.post('/generate', rbac('hr'), async (req, res, next) => {
  try {
    const { month } = req.body;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: 'Month format must be YYYY-MM e.g. 2026-10' });
    }
    const run = await payrollService.createOrUpdateMonthlyRun(month, req.user, req);
    res.json({ message: 'Payroll draft generated successfully', run });
  } catch (err) {
    next(err);
  }
});

// Admin: Finalize and lock monthly payroll run (Admin only)
router.post('/finalize', rbac('admin'), async (req, res, next) => {
  try {
    const { month } = req.body;
    if (!month) return res.status(400).json({ message: 'Month is required' });
    const run = await payrollService.finalizePayroll(month, req.user, req);
    res.json({ message: `Payroll for ${month} has been finalized and locked`, run });
  } catch (err) {
    next(err);
  }
});

// HR: Update salary structure per employee (HR only)
router.put('/salary/:userId', rbac('hr'), async (req, res, next) => {
  try {
    const { basic, allowances, deductions } = req.body;
    const updated = await employeeService.updateEmployee(
      req.params.userId,
      { salary: { basic, allowances, deductions } },
      req.user,
      req
    );
    res.json({ message: 'Salary structure updated successfully', profile: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
