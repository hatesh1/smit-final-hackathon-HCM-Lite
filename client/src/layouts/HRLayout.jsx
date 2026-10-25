import { Outlet } from 'react-router-dom';
import AppShell from '../components/AppShell';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CalendarDays,
  Receipt,
  Megaphone,
} from 'lucide-react';

const NAV = [
  { to: '/hr', label: 'HR Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, end: true },
  { to: '/hr/employees', label: 'Employee Operations', icon: <Users className="h-4 w-4" /> },
  { to: '/hr/attendance', label: 'Attendance Board', icon: <CalendarCheck className="h-4 w-4" /> },
  { to: '/hr/leaves', label: 'Leave Approvals', icon: <CalendarDays className="h-4 w-4" /> },
  { to: '/hr/payroll', label: 'Monthly Payroll', icon: <Receipt className="h-4 w-4" /> },
  { to: '/hr/announcements', label: 'Announcements', icon: <Megaphone className="h-4 w-4" /> },
];

export default function HRLayout() {
  return (
    <AppShell title="HR Operations Portal" nav={NAV}>
      <Outlet />
    </AppShell>
  );
}
