const env = require('./config/env');
const { connectDb } = require('./config/db');
const app = require('./app');

async function main() {
  await connectDb();
  // NOTE: Auto-seed removed per brief — "no pre-loaded or dummy data"
  // System starts empty; Admin sets up company on first run
  require('./jobs/attendance.job').scheduleAttendanceJobs();
  await require('./utils/mailer').verifyMailer();
  app.listen(env.port, () => {
    console.log(`HCM Lite API listening on http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
