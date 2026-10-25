import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, homePathFor } from './context/AuthContext';
import { ProtectedRoute, RoleRoute } from './routes/guards';
import { Spinner } from './components/ui';

// Auth & Setup
import SignIn from './pages/auth/SignIn';
import SetupWizard from './pages/setup/SetupWizard';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import HRLayout from './layouts/HRLayout';
import EmployeeLayout from './layouts/EmployeeLayout';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminSetup from './pages/admin/Setup';
import UserManagement from './pages/admin/Users';
import Directory from './pages/admin/Directory';
import AttendanceRecords from './pages/admin/AttendanceRecords';
import LeaveApprovals from './pages/admin/LeaveApprovals';
import AdminPayroll from './pages/admin/Payroll';
import AuditTrail from './pages/admin/AuditTrail';

// HR Pages
import HRDashboard from './pages/hr/Dashboard';

// Employee Pages
import EmployeeDashboard from './pages/employee/Dashboard';
import EmployeeAttendance from './pages/employee/Attendance';
import EmployeeLeave from './pages/employee/Leave';
import EmployeePayroll from './pages/employee/Payroll';
import EmployeeProfile from './pages/employee/Profile';

// Common
import Announcements from './pages/common/Announcements';

function Landing() {
  const { user, loading, isFirstRun } = useAuth();
  if (loading) return <Spinner />;
  if (isFirstRun) return <Navigate to="/setup" replace />;
  return <Navigate to={user ? homePathFor(user) : '/login'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/setup" element={<SetupWizard />} />
        <Route path="/login" element={<SignIn />} />

        {/* Protected App Routes */}
        <Route element={<ProtectedRoute />}>
          {/* Admin Routes */}
          <Route element={<RoleRoute role="admin" />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="setup" element={<AdminSetup />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="employees" element={<Directory />} />
              <Route path="attendance" element={<AttendanceRecords />} />
              <Route path="leaves" element={<LeaveApprovals />} />
              <Route path="payroll" element={<AdminPayroll />} />
              <Route path="announcements" element={<Announcements />} />
              <Route path="audit" element={<AuditTrail />} />
            </Route>
          </Route>

          {/* HR Routes */}
          <Route element={<RoleRoute role="hr" />}>
            <Route path="/hr" element={<HRLayout />}>
              <Route index element={<HRDashboard />} />
              <Route path="employees" element={<Directory />} />
              <Route path="attendance" element={<AttendanceRecords />} />
              <Route path="leaves" element={<LeaveApprovals />} />
              <Route path="payroll" element={<AdminPayroll />} />
              <Route path="announcements" element={<Announcements />} />
            </Route>
          </Route>

          {/* Employee Routes */}
          <Route element={<RoleRoute role="employee" />}>
            <Route path="/app" element={<EmployeeLayout />}>
              <Route index element={<EmployeeDashboard />} />
              <Route path="attendance" element={<EmployeeAttendance />} />
              <Route path="leave" element={<EmployeeLeave />} />
              <Route path="payroll" element={<EmployeePayroll />} />
              <Route path="profile" element={<EmployeeProfile />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
