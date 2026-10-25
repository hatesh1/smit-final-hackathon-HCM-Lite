import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui';
import AiAssistantModal from './AiAssistantModal';
import ChangePasswordModal from './ChangePasswordModal';
import api from '../api/axios';
import {
  Sparkles,
  Building2,
  Bell,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

export default function AppShell({ title, nav, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [aiOpen, setAiOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchNotifs = async () => {
      try {
        const { data } = await api.get('/notifications');
        setNotifications(data.notifications || []);
      } catch (err) {
        //ignore
      }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const onLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/all/read');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      // ignore
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans">
      <ChangePasswordModal
        isOpen={user?.mustChangePassword || passwordModalOpen}
        mandatory={user?.mustChangePassword}
        onClose={() => setPasswordModalOpen(false)}
      />

      <AiAssistantModal isOpen={aiOpen} onClose={() => setAiOpen(false)} />

      {/* Sidebar Desktop */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-4 lg:flex shadow-xs">
        {/* Brand */}
        <div className="mb-6 px-3 py-2 flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-linear-to-br from-indigo-600 to-indigo-800 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-extrabold tracking-tight text-slate-900 leading-none">
              HCM <span className="text-indigo-600">Lite</span>
            </div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">
              AI-Assisted HRM
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto pr-1">
          <div className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            {user?.role} Navigation
          </div>
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <span className="shrink-0">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* AI Assistant Quick Launcher */}
        <div className="my-3 rounded-xl bg-linear-to-r from-indigo-50 to-indigo-100/60 p-3.5 border border-indigo-200/60">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              AI Assistant
            </span>
            <span className="text-[10px] bg-indigo-600 text-white rounded-full px-1.5 py-0.2 font-semibold">
              M8
            </span>
          </div>
          <p className="text-[11px] text-indigo-700 leading-tight mb-2.5">
            Query live database with role-level guardrails & policies.
          </p>
          <Button
            variant="primary"
            onClick={() => setAiOpen(true)}
            className="w-full text-xs py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Launch Assistant</span>
          </Button>
        </div>

        {/* User Footer */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 uppercase shrink-0">
              {user?.employeeId?.slice(0, 2) || 'US'}
            </div>
            <div className="truncate text-xs">
              <div className="font-semibold text-slate-800 truncate">{user?.email}</div>
              <div className="text-[10px] text-slate-400 uppercase font-mono">{user?.employeeId}</div>
            </div>
          </div>
          <button
            onClick={onLogout}
            title="Sign out"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* AI Assistant Button */}
            <Button
              variant="primary"
              onClick={() => setAiOpen(true)}
              className="flex items-center gap-1.5 rounded-lg text-xs py-1.5 px-3 bg-linear-to-r from-indigo-600 to-indigo-700 shadow-xs"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ask AI</span>
            </Button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 transition-colors"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl z-50">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Notifications ({unreadCount} new)
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[11px] text-indigo-600 hover:underline font-semibold"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">No notifications</div>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <div
                          key={n._id}
                          className={`rounded-xl p-2.5 text-xs transition-colors ${
                            n.isRead ? 'bg-slate-50 text-slate-600' : 'bg-indigo-50/60 text-slate-800 font-medium'
                          }`}
                        >
                          <div>{n.message}</div>
                          <div className="text-[10px] text-slate-400 mt-1">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Role Badge */}
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-indigo-700 border border-indigo-200">
              {user?.role}
            </span>

            <button
              onClick={onLogout}
              className="rounded-lg p-2 text-slate-500 hover:text-rose-600 lg:hidden"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden bg-slate-900/50 backdrop-blur-xs flex">
            <div className="w-64 bg-white p-4 shadow-xl flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="text-base font-bold text-indigo-700">HCM Lite</div>
                  <button onClick={() => setMobileMenuOpen(false)}>
                    <X className="h-5 w-5 text-slate-500" />
                  </button>
                </div>
                <nav className="flex flex-col gap-1">
                  {nav.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      end={item.end}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                          isActive ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
                        }`
                      }
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </nav>
              </div>
              <div className="border-t border-slate-100 pt-3">
                <Button variant="secondary" onClick={onLogout} className="w-full text-xs">
                  Sign out
                </Button>
              </div>
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">{children}</main>
      </div>
    </div>
  );
}
