import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { Card, Button, Spinner, Alert } from '../../components/ui';
import StatusBadge from '../../components/StatusBadge';
import {
  Users,
  UserCheck,
  Clock,
  CalendarDays,
  AlertCircle,
  Sparkles,
  TrendingUp,
  RefreshCw,
  PlusCircle,
  Play,
  ArrowRight,
} from 'lucide-react';

export default function HRDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [summarizing, setSummarizing] = useState(false);
  const [summaryBullets, setSummaryBullets] = useState(null);
  const [sweepLoading, setSweepLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const { data: res } = await api.get('/dashboards/hr');
      setData(res);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load HR dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleAiSummarize = async () => {
    if (!data?.kpis) return;
    setSummarizing(true);
    try {
      const { data: res } = await api.post('/ai/summarize-dashboard', { kpis: data.kpis });
      setSummaryBullets(res.bullets);
    } catch (err) {
      setSummaryBullets([
        `Present today: ${data.kpis.presentToday} employees with an attendance rate of ${data.kpis.attendanceRate}%.`,
        `Late today: ${data.kpis.lateToday} check-ins after the 09:15 cutoff.`,
        `Pending approvals: ${data.kpis.pendingApprovals} leave requests waiting for HR action.`,
      ]);
    } finally {
      setSummarizing(false);
    }
  };

  const handleMarkAbsentees = async () => {
    setSweepLoading(true);
    try {
      const { data: res } = await api.post('/attendance/mark-absentees');
      alert(`Absentee sweep complete. ${res.markedCount} employee records updated.`);
      fetchDashboard();
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Sweep failed');
    } finally {
      setSweepLoading(false);
    }
  };

  if (loading && !data) return <Spinner />;

  const kpis = data?.kpis || {};

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">People Operations Dashboard</h2>
          <p className="text-xs text-slate-500">Real-time attendance tracking, leave requests, and workforce metrics</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleMarkAbsentees}
            disabled={sweepLoading}
            className="flex items-center gap-1.5 text-xs py-2 px-3 rounded-xl border border-slate-300"
          >
            <Play className="h-3.5 w-3.5 text-rose-600" />
            <span>{sweepLoading ? 'Running...' : 'Run Absentee Sweep'}</span>
          </Button>

          <Button
            variant="primary"
            onClick={handleAiSummarize}
            disabled={summarizing}
            className="flex items-center gap-1.5 text-xs py-2 px-3.5 bg-linear-to-r from-indigo-600 to-indigo-700 rounded-xl shadow-xs"
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-200" />
            <span>{summarizing ? 'Analyzing...' : 'AI Daily Summary'}</span>
          </Button>

          <button
            onClick={fetchDashboard}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
            title="Refresh Data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && <Alert kind="error">{error}</Alert>}

      {/* AI Summary Card */}
      {summaryBullets && (
        <div className="rounded-2xl border border-indigo-100 bg-linear-to-r from-indigo-50/80 via-white to-indigo-50/40 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-indigo-950 uppercase tracking-wider">
                HR Daily Briefing (Real Numbers Only)
              </h3>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 rounded-full px-2 py-0.5 border border-indigo-200">
              AI-Generated
            </span>
          </div>
          <ul className="space-y-2">
            {summaryBullets.map((bullet, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Operational KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Card className="border-l-4 border-l-indigo-600 p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Headcount</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{kpis.headcount || 0}</div>
          <div className="text-[10px] text-slate-400 mt-1">Active staff</div>
        </Card>

        <Card className="border-l-4 border-l-emerald-600 p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Present Today</div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-600">{kpis.presentToday || 0}</div>
          <div className="text-[10px] text-slate-400 mt-1">Checked in on time</div>
        </Card>

        <Card className="border-l-4 border-l-amber-600 p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Late Today</div>
          <div className="mt-2 text-2xl font-extrabold text-amber-600">{kpis.lateToday || 0}</div>
          <div className="text-[10px] text-slate-400 mt-1">After 09:15 cutoff</div>
        </Card>

        <Card className="border-l-4 border-l-sky-600 p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">On Leave Today</div>
          <div className="mt-2 text-2xl font-extrabold text-sky-600">{kpis.onLeaveToday || 0}</div>
          <div className="text-[10px] text-slate-400 mt-1">Approved leaves</div>
        </Card>

        <Card className="border-l-4 border-l-purple-600 p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Attendance Rate</div>
          <div className="mt-2 text-2xl font-extrabold text-purple-600">{kpis.attendanceRate || 0}%</div>
          <div className="text-[10px] text-slate-400 mt-1">Formula in Sec 7</div>
        </Card>

        <Card className="border-l-4 border-l-rose-600 p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pending Leaves</div>
          <div className="mt-2 text-2xl font-extrabold text-rose-600">{kpis.pendingApprovals || 0}</div>
          <Link to="/hr/leaves" className="text-[10px] text-indigo-600 hover:underline font-semibold mt-1 inline-block">
            Review inbox →
          </Link>
        </Card>
      </div>

      {/* Middle Grid: Top 5 Late-Comers & Absenteeism by Dept */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top 5 Late Comers this Month */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              Top Late-Comers (Current Month)
            </h3>
            <span className="text-[10px] font-semibold text-slate-400">3 lates = 0.5 day penalty</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-y border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Employee</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3 text-right">Late Count</th>
                  <th className="py-2.5 px-3 text-right">Late Penalty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.topLateComers?.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      No late arrivals recorded this month!
                    </td>
                  </tr>
                ) : (
                  data?.topLateComers?.map((lc) => (
                    <tr key={lc.userId} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800">{lc.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{lc.employeeId}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{lc.department}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-800">
                          {lc.lateCount} lates
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                        {Math.floor(lc.lateCount / 3) * 0.5} day deduction
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Absenteeism by Department */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600" />
              Absenteeism by Department (Formula: Absents ÷ Expected Days)
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-y border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3 text-right">Absent Days</th>
                  <th className="py-2.5 px-3 text-right">Absenteeism Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.absenteeismByDept?.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-slate-400">
                      No absenteeism records
                    </td>
                  </tr>
                ) : (
                  data?.absenteeismByDept?.map((row) => (
                    <tr key={row.department} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{row.department}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">{row.absentDays} days</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="font-mono font-bold text-rose-600">{row.absenteeismRate}%</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* 7-Day Attendance Trend */}
      <Card className="p-6">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-indigo-600" />
          7-Day Workforce Attendance Trend
        </h3>
        <div className="grid grid-cols-7 gap-2 text-center">
          {data?.attendanceTrend?.map((t) => (
            <div key={t.date} className="rounded-xl bg-slate-50 p-3 border border-slate-100 flex flex-col justify-between">
              <div className="text-[11px] font-mono font-bold text-slate-600 mb-2">{t.date}</div>
              <div className="space-y-1 text-[11px]">
                <div className="text-emerald-700 font-semibold">{t.present} Present</div>
                <div className="text-amber-700">{t.late} Late</div>
                <div className="text-sky-700">{t.leave} Leave</div>
                <div className="text-rose-700">{t.absent} Absent</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
