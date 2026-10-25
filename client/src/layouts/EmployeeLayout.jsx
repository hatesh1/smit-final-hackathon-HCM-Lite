import { Outlet } from 'react-router-dom';
import AppShell from '../components/AppShell';
import {
  LayoutDashboard,
  CalendarCheck,
  CalendarDays,
  Receipt,
  User,
} from 'lucide-react';

const NAV = [
  { to: '/app', label: 'My Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, end: true },
  { to: '/app/attendance', label: 'Attendance & Clock', icon: <CalendarCheck className="h-4 w-4" /> },
  { to: '/app/leave', label: 'Leave Applications', icon: <CalendarDays className="h-4 w-4" /> },
  { to: '/app/payroll', label: 'My Payslips', icon: <Receipt className="h-4 w-4" /> },
  { to: '/app/profile', label: 'My 360 Profile', icon: <User className="h-4 w-4" /> },
];

export default function EmployeeLayout() {
  return (
    <AppShell title="Employee Self-Service" nav={NAV}>
      <Outlet />
    </AppShell>
  );
}
