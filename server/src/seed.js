/* Seeds a verified admin and sample employees for local development.
   Runs automatically on server boot in dev when the DB is empty,
   or standalone (with the API stopped) via: npm run seed */
const User = require('./models/User');
const Profile = require('./models/Profile');

const USERS = [
  {
    employeeId: 'ADM001', email: 'admin@hr-system.local', password: 'Admin@123', role: 'admin',
    profile: {
      personal: { firstName: 'Sonia', lastName: 'Suresh', phone: '+91 12345 67895', address: 'Lahore' },
      job: { designation: 'HR Manager', department: 'Human Resources', joiningDate: new Date('2026-10-24') },
      salary: { basic: 45000, hra: 12000, allowances: 5000, deductions: 2000 },
    },
  },
  {
    employeeId: 'EMP001', email: 'alice@hr-system.local', password: 'Alice@123', role: 'employee',
    profile: {
      personal: { firstName: 'Alice', lastName: 'Kumar', phone: '+91 98400 00002', address: 'Bengaluru' },
      job: { designation: 'Software Engineer', department: 'Engineering', joiningDate: new Date('2023-06-01') },
      salary: { basic: 45000, hra: 18000, allowances: 7000, deductions: 4500 },
    },
  },
  {
    employeeId: 'EMP002', email: 'bob@hr-system.local', password: 'Bob@12345', role: 'employee',
    profile: {
      personal: { firstName: 'Bob', lastName: 'Menon', phone: '+91 98400 00003', address: 'Kochi' },
      job: { designation: 'QA Analyst', department: 'Engineering', joiningDate: new Date('2024-02-15') },
      salary: { basic: 38000, hra: 15200, allowances: 5000, deductions: 3800 },
    },
  },
];

async function seedUsers() {
  for (const spec of USERS) {
    let user = await User.findOne({ email: spec.email });
    if (!user) {
      user = new User({ employeeId: spec.employeeId, email: spec.email, role: spec.role });
      await user.setPassword(spec.password);
      user.isEmailVerified = true;
      await user.save();
      console.log(`[seed] Created ${spec.role}: ${spec.email} / ${spec.password}`);
    }
    await Profile.findOneAndUpdate(
      { user: user._id },
      { $setOnInsert: { user: user._id, ...spec.profile } },
      { upsert: true }
    );
  }
}

module.exports = { seedUsers };

if (require.main === module) {
  const { connectDb, disconnectDb } = require('./config/db');
  connectDb()
    .then(seedUsers)
    .then(disconnectDb)
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
