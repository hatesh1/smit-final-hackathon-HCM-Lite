const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const sanitizeBody = require('./middleware/sanitize');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: env.clientOrigin || true, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());
app.use(sanitizeBody);

// Brute-force protection on the credential surface only.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.nodeEnv === 'test',
});
app.use('/api/auth', authLimiter);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'HCM Lite',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Mount modular REST API routes
app.use('/api/setup', require('./routes/setup.routes'));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/settings', require('./routes/settings.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/employees', require('./routes/employee.routes'));
app.use('/api/attendance', require('./routes/attendance.routes'));
app.use('/api/leaves', require('./routes/leave.routes'));
app.use('/api/payroll', require('./routes/payroll.routes'));
app.use('/api/dashboards', require('./routes/dashboard.routes'));
app.use('/api/ai', require('./routes/ai.routes'));
app.use('/api/announcements', require('./routes/announcement.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/audit-logs', require('./routes/audit.routes'));

// Locally stored uploads (disk storage driver)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api', notFound);
app.use(errorHandler);

module.exports = app;
