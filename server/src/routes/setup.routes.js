const router = require('express').Router();
const authService = require('../services/auth.service');
const settingsService = require('../services/settings.service');
const Profile = require('../models/Profile');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const PayrollRun = require('../models/PayrollRun');
const { startOfDayUTC } = require('../utils/dates');

router.get('/check', async (req, res, next) => {
  try {
    const status = await settingsService.checkFirstRun();
    res.json(status);
  } catch (err) {
    next(err);
  }
});

router.post('/init', async (req, res, next) => {
  try {
    const result = await authService.firstRunSetup(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// Demo seed route for judges to test immediately with 1 click
router.post('/demo-seed', async (req, res, next) => {
  try {
    // 1. Company Setup
    await settingsService.updateSettings({
      companyName: 'HCM Lite Demo Company',
      officeStart: '09:00',
      graceMinutes: 15,
      halfDayHours: 5,
      weekendDays: ['Saturday', 'Sunday'],
      officeLocation: {
        lat: 24.8607,
        lng: 67.0011,
        radiusMeters: 150,
        address: 'Demo Office, Karachi',
      },
      currency: 'PKR',
      isConfigured: true,
    }, req);

    await settingsService.initializeDefaults(req);

    // 2. Create Admin if not exists
    let admin = await User.findOne({ email: 'admin@hcmlite.com' });
    if (!admin) {
      admin = new User({
        employeeId: 'ADM001',
        email: 'admin@hcmlite.com',
        role: 'admin',
        isEmailVerified: true,
        isActive: true,
      });
      await admin.setPassword('Admin@123');
      await admin.save();

      await Profile.findOneAndUpdate(
        { user: admin._id },
        {
          $setOnInsert: {
            user: admin._id,
            personal: { firstName: 'Syed', lastName: 'Administrator', phone: '+92 300 1111111', gender: 'male' },
            job: { department: 'Engineering', designation: 'Chief Technology Officer', status: 'active', joiningDate: new Date('2024-01-01') },
            salary: { basic: 250000, hra: 100000, medical: 25000, allowances: 25000, gross: 400000, currency: 'PKR' },
          },
        },
        { upsert: true }
      );
    }

    // 3. Create HR Specialist
    let hrUser = await User.findOne({ email: 'hr@hcmlite.com' });
    if (!hrUser) {
      hrUser = new User({
        employeeId: 'HR001',
        email: 'hr@hcmlite.com',
        role: 'hr',
        isEmailVerified: true,
        isActive: true,
      });
      await hrUser.setPassword('Hr@12345');
      await hrUser.save();

      await Profile.findOneAndUpdate(
        { user: hrUser._id },
        {
          $setOnInsert: {
            user: hrUser._id,
            personal: { firstName: 'Fatima', lastName: 'Zahra', phone: '+92 300 2222222', gender: 'female' },
            job: { department: 'Human Resources', designation: 'Senior HR Specialist', status: 'active', joiningDate: new Date('2024-03-01') },
            salary: { basic: 120000, hra: 48000, medical: 12000, allowances: 10000, gross: 190000, currency: 'PKR' },
          },
        },
        { upsert: true }
      );
    }

    // 4. Create 3 Sample Employees
    const demoEmployees = [
      {
        employeeId: 'EMP001',
        email: 'ali@hcmlite.com',
        password: 'Ali@12345',
        firstName: 'Ali',
        lastName: 'Raza',
        gender: 'male',
        department: 'Engineering',
        designation: 'Senior Software Engineer',
        basic: 100000,
        joiningDate: new Date('2024-06-15'),
      },
      {
        employeeId: 'EMP002',
        email: 'aisha@hcmlite.com',
        password: 'Aisha@12345',
        firstName: 'Aisha',
        lastName: 'Khan',
        gender: 'female',
        department: 'Engineering',
        designation: 'Software Engineer',
        basic: 70000,
        joiningDate: new Date('2025-01-10'),
      },
      {
        employeeId: 'EMP003',
        email: 'usman@hcmlite.com',
        password: 'Usman@12345',
        firstName: 'Usman',
        lastName: 'Ahmed',
        gender: 'male',
        department: 'Finance & Accounts',
        designation: 'Financial Analyst',
        basic: 80000,
        joiningDate: new Date('2024-09-01'),
      },
    ];

    const createdEmployees = [];
    for (const d of demoEmployees) {
      let u = await User.findOne({ email: d.email });
      if (!u) {
        u = new User({
          employeeId: d.employeeId,
          email: d.email,
          role: 'employee',
          isEmailVerified: true,
          mustChangePassword: false,
          isActive: true,
        });
        await u.setPassword(d.password);
        await u.save();

        const hra = Math.round(d.basic * 0.4);
        const medical = Math.round(d.basic * 0.1);
        const gross = d.basic + hra + medical;

        await Profile.findOneAndUpdate(
          { user: u._id },
          {
            $setOnInsert: {
              user: u._id,
              personal: { firstName: d.firstName, lastName: d.lastName, phone: '+92 311 0000000', gender: d.gender },
              job: { department: d.department, designation: d.designation, status: 'active', joiningDate: d.joiningDate },
              salary: { basic: d.basic, hra, medical, allowances: 0, gross, currency: 'PKR' },
            },
          },
          { upsert: true }
        );
      }
      createdEmployees.push(u);
    }

    // 5. Seed today attendance records for realistic analytics
    const today = startOfDayUTC(new Date());
    const now = new Date();

    if (createdEmployees[0]) {
      // Ali: present on time (09:05)
      const onTime = new Date(today);
      onTime.setHours(9, 5, 0);
      await Attendance.findOneAndUpdate(
        { user: createdEmployees[0]._id, date: today },
        { $set: { checkIn: onTime, status: 'present', source: 'camera', faceVerified: true } },
        { upsert: true }
      );
    }

    if (createdEmployees[1]) {
      // Aisha: late (09:28)
      const lateTime = new Date(today);
      lateTime.setHours(9, 28, 0);
      await Attendance.findOneAndUpdate(
        { user: createdEmployees[1]._id, date: today },
        { $set: { checkIn: lateTime, status: 'late', source: 'web' } },
        { upsert: true }
      );
    }

    if (createdEmployees[2]) {
      // Usman: approved leave today
      await Attendance.findOneAndUpdate(
        { user: createdEmployees[2]._id, date: today },
        { $set: { status: 'leave', workHours: 0, remarks: 'Approved casual leave' } },
        { upsert: true }
      );

      await LeaveRequest.findOneAndUpdate(
        { user: createdEmployees[2]._id, startDate: today },
        {
          $set: {
            user: createdEmployees[2]._id,
            type: 'casual',
            startDate: today,
            endDate: today,
            workingDaysCount: 1,
            remarks: 'Family personal work',
            status: 'approved',
            adminComment: 'Approved by HR',
          },
        },
        { upsert: true }
      );
    }

    // 6. Generate Payroll Draft for current month
    const payrollService = require('../services/payroll.service');
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    await payrollService.createOrUpdateMonthlyRun(monthStr, hrUser, req);

    res.json({
      success: true,
      message: 'Demo dataset populated successfully with Admin, HR, 3 Employees, attendance, leaves, and payroll draft.',
      credentials: [
        { role: 'Admin', email: 'admin@hcmlite.com', password: 'Admin@123' },
        { role: 'HR Specialist', email: 'hr@hcmlite.com', password: 'Hr@12345' },
        { role: 'Employee', email: 'ali@hcmlite.com', password: 'Ali@12345' },
      ],
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
