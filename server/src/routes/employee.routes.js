const router = require('express').Router();
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const employeeService = require('../services/employee.service');

router.use(auth);

// Employee Directory with Search, Filters, Pagination (Admin and HR all; Employee basic view)
router.get('/', rbac('admin', 'hr'), async (req, res, next) => {
  try {
    const result = await employeeService.listEmployees(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Register Employee (creates User login + temporary password + Profile) (HR only)
router.post('/', rbac('hr'), async (req, res, next) => {
  try {
    const result = await employeeService.registerEmployee(req.body, req);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// CSV Dry Run validation (HR only)
router.post('/csv-dry-run', rbac('hr'), async (req, res, next) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: 'Array of CSV rows is required' });
    }
    const report = await employeeService.csvDryRun(rows);
    res.json(report);
  } catch (err) {
    next(err);
  }
});

// CSV Commit import (HR only)
router.post('/csv-commit', rbac('hr'), async (req, res, next) => {
  try {
    const { validRows } = req.body;
    if (!Array.isArray(validRows) || validRows.length === 0) {
      return res.status(400).json({ message: 'Valid rows array required' });
    }
    const result = await employeeService.csvCommit(validRows, req);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// CSV Export (Admin & HR)
router.get('/export-csv', rbac('admin', 'hr'), async (req, res, next) => {
  try {
    const csvContent = await employeeService.exportEmployeesCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="employees-export.csv"');
    res.send(csvContent);
  } catch (err) {
    next(err);
  }
});

// Employee 360 profile (Admin & HR all, Employee own only)
router.get('/:userId/360', async (req, res, next) => {
  try {
    const data = await employeeService.getEmployee360(req.params.userId, req.user);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Update Employee Profile (Admin & HR all fields; Employee own phone/address)
router.put('/:userId', async (req, res, next) => {
  try {
    const updated = await employeeService.updateEmployee(req.params.userId, req.body, req.user, req);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
