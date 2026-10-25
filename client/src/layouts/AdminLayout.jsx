import { Outlet } from 'react-router-dom';
import AppShell from '../components/AppShell';
import {
  LayoutDashboard,
  Building2,
  UserCheck,
  Users,
  CalendarCheck,
  CalendarDays,
  Receipt,
  Megaphone,
  ShieldCheck,
} from 'lucide-react';

const NAV = [
  { to: '/admin', label: 'Company Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, end: true },
  { to: '/admin/setup', label: 'Organization Setup', icon: <Building2 className="h-4 w-4" /> },
  { to: '/admin/users', label: 'User Logins', icon: <UserCheck className="h-4 w-4" /> },
  { to: '/admin/employees', label: 'Employee Directory', icon: <Users className="h-4 w-4" /> },
  { to: '/admin/attendance', label: 'Attendance Board', icon: <CalendarCheck className="h-4 w-4" /> },
  { to: '/admin/leaves', label: 'Leave Records', icon: <CalendarDays className="h-4 w-4" /> },
  { to: '/admin/payroll', label: 'Payroll & Lock', icon: <Receipt className="h-4 w-4" /> },
  { to: '/admin/announcements', label: 'Announcements', icon: <Megaphone className="h-4 w-4" /> },
  { to: '/admin/audit', label: 'Audit Trail', icon: <ShieldCheck className="h-4 w-4" /> },
];

export default function AdminLayout() {
  return (
    <AppShell title="Admin Management Portal" nav={NAV}>
      <Outlet />
    </AppShell>
  );
}
