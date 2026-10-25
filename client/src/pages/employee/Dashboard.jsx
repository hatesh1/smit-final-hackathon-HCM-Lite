import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { Card, Button, Spinner, Alert } from '../../components/ui';
import StatusBadge from '../../components/StatusBadge';
import {
  Clock,
  CalendarCheck,
  CalendarDays,
  Receipt,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Megaphone,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export default function EmployeeDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clockLoading, setClockLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const { data: res } = await api.get('/dashboards/employee');
      setData(res);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load employee dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleQuickCheckIn = async () => {
    setError(null);
    setSuccess(null);
    setClockLoading(true);
    try {
      const { data: res } = await api.post('/attendance/check-in', { source: 'web' });
      setSuccess(`Checked in successfully! Status: ${res.record.status.toUpperCase()}`);
      fetchDashboard();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Check-in failed');
    } finally {
      setClockLoading(false);
    }
  };

  const handleQuickCheckOut = async () => {
    setError(null);
    setSuccess(null);
    setClockLoading(true);
    try {
      const { data: res } = await api.post('/attendance/check-out');
      setSuccess(`Checked out successfully! Total work hours: ${res.record.workHours}h`);
      fetchDashboard();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Check-out failed');
    } finally {
      setClockLoading(false);
    }
  };

  if (loading && !data) return <Spinner />;

  const todayRecord = data?.todayRecord;
  const isCheckedIn = !!todayRecord?.checkIn;
  const isCheckedOut = !!todayRecord?.checkOut;

  const hours = data?.hoursThisWeek || 0;
  const weeklyTarget = data?.weeklyTarget || 40;
  const weekProgress = Math.min(100, Math.round((hours / weeklyTarget) * 100));

  const balances = data?.leaveBalances || {
    annual: { remaining: 14 },
    sick: { remaining: 8 },
    casual: { remaining: 10 },
    unpaid: { remaining: 999 },
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-linear-to-r from-indigo-700 via-indigo-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-950/10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-indigo-200 border border-white/10 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Employee Self-Service Workspace
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Today's Attendance & Portal</h2>
            <p className="text-xs sm:text-sm text-indigo-200 mt-1 max-w-xl">
              Track your daily work hours, apply for leaves with smart AI assistance, and view your verified payslips.
            </p>
          </div>

          {/* Quick Check-in / Out Widget */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 sm:min-w-[280px]">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-indigo-200 font-semibold">Today's Status</span>
              <StatusBadge status={data?.todayStatus || 'not_checked_in'} />
            </div>

            {todayRecord?.checkIn && (
              <div className="text-xs text-white/90 mb-3 font-mono">
                In: {new Date(todayRecord.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {todayRecord.checkOut && (
                  <span> · Out: {new Date(todayRecord.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                )}
              </div>
            )}

            <div className="flex gap-2">
              {!isCheckedIn ? (
                <Button
                  variant="primary"
                  onClick={handleQuickCheckIn}
                  disabled={clockLoading}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
                >
                  <Clock className="h-4 w-4" />
                  <span>{clockLoading ? 'Checking in...' : 'Clock In Now'}</span>
                </Button>
              ) : !isCheckedOut ? (
                <Button
                  variant="primary"
                  onClick={handleQuickCheckOut}
                  disabled={clockLoading}
                  className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-500/20"
                >
                  <Clock className="h-4 w-4" />
                  <span>{clockLoading ? 'Checking out...' : 'Clock Out Now'}</span>
                </Button>
              ) : (
                <div className="w-full py-2 text-center text-xs font-semibold text-emerald-300 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  ✓ Completed for Today ({todayRecord.workHours}h)
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {success && <Alert kind="success">{success}</Alert>}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Weekly Hours vs 40h target */}
        <Card className="p-5 border-l-4 border-l-indigo-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Weekly Work Hours</span>
            <Clock className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="mt-3 text-2xl font-extrabold text-slate-900">
            {hours}h <span className="text-xs font-semibold text-slate-400">/ 40h target</span>
          </div>
          <div className="mt-2.5 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                weekProgress >= 100 ? 'bg-emerald-500' : 'bg-indigo-600'
              }`}
              style={{ width: `${weekProgress}%` }}
            />
          </div>
        </Card>

        {/* Late count this month */}
        <Card className="p-5 border-l-4 border-l-amber-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Late Count (This Month)</span>
            <AlertCircle className="h-5 w-5 text-amber-600" />
          </div>
          <div className="mt-3 text-2xl font-extrabold text-amber-600">
            {data?.lateCountThisMonth || 0} <span className="text-xs font-semibold text-slate-400">lates</span>
          </div>
          <div className="mt-1 text-xs text-slate-500 font-medium">
            Cutoff 09:15 AM · 3 lates = 0.5 day deduction
          </div>
        </Card>

        {/* Leave Balance Overview */}
        <Card className="p-5 border-l-4 border-l-sky-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Remaining Leaves</span>
            <CalendarDays className="h-5 w-5 text-sky-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">
              {(balances.annual?.remaining || 0) + (balances.casual?.remaining || 0)}
            </span>
            <span className="text-xs font-semibold text-slate-400">Paid days available</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Annual: {balances.annual?.remaining || 0} · Sick: {balances.sick?.remaining || 0} · Casual: {balances.casual?.remaining || 0}
          </div>
        </Card>

        {/* Last Payslip Snapshot */}
        <Card className="p-5 border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Latest Payslip</span>
            <Receipt className="h-5 w-5 text-emerald-600" />
          </div>
          {data?.lastPayslip ? (
            <div>
              <div className="mt-3 text-2xl font-extrabold text-slate-900 font-mono">
                {data.lastPayslip.currency} {Number(data.lastPayslip.netPay).toLocaleString()}
              </div>
              <div className="mt-1 text-xs text-slate-500 font-medium">
                Period: {data.lastPayslip.month} (Finalized)
              </div>
            </div>
          ) : (
            <div className="mt-3 text-xs text-slate-400">
              No finalized monthly payslip available yet
            </div>
          )}
        </Card>
      </div>

      {/* Announcements Bulletin */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-indigo-600" />
            Company Announcements & Notices
          </h3>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Broadcast Board
          </span>
        </div>

        {data?.announcements?.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No current company announcements</p>
        ) : (
          <div className="space-y-3">
            {data?.announcements?.map((a) => (
              <div key={a._id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition-all">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-sm text-slate-900">{a.title}</span>
                  <span className="rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold uppercase">
                    {a.priority}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{a.content}</p>
                <div className="mt-2 text-[10px] text-slate-400">
                  By {a.authorName} ({a.authorRole.toUpperCase()}) · {new Date(a.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
