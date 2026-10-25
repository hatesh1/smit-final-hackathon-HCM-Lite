const router = require('express').Router();
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const settingsService = require('../services/settings.service');

router.use(auth);

// Get Company Settings (Admin and HR view)
router.get('/', rbac('admin', 'hr'), async (req, res, next) => {
  try {
    const settings = await settingsService.getSettings();
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

// Update Company Settings (Admin only)
router.put('/', rbac('admin'), async (req, res, next) => {
  try {
    const updated = await settingsService.updateSettings(req.body, req);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Departments
router.get('/departments', async (req, res, next) => {
  try {
    const depts = await settingsService.listDepartments();
    res.json(depts);
  } catch (err) {
    next(err);
  }
});

router.post('/departments', rbac('admin'), async (req, res, next) => {
  try {
    const dept = await settingsService.createDepartment(req.body, req);
    res.status(201).json(dept);
  } catch (err) {
    next(err);
  }
});

// Designations
router.get('/designations', async (req, res, next) => {
  try {
    const designations = await settingsService.listDesignations(req.query.department);
    res.json(designations);
  } catch (err) {
    next(err);
  }
});

router.post('/designations', rbac('admin'), async (req, res, next) => {
  try {
    const des = await settingsService.createDesignation(req.body, req);
    res.status(201).json(des);
  } catch (err) {
    next(err);
  }
});

// Leave Types
router.get('/leave-types', async (req, res, next) => {
  try {
    const types = await settingsService.listLeaveTypes();
    res.json(types);
  } catch (err) {
    next(err);
  }
});

// Public Holidays
router.get('/holidays', async (req, res, next) => {
  try {
    const holidays = await settingsService.listHolidays(req.query.year);
    res.json(holidays);
  } catch (err) {
    next(err);
  }
});

router.post('/holidays', rbac('admin'), async (req, res, next) => {
  try {
    const holiday = await settingsService.createHoliday(req.body, req);
    res.status(201).json(holiday);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
