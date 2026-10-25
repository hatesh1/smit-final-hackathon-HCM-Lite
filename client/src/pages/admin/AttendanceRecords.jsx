import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { Card, Button, Input, Field, Alert, Spinner } from '../../components/ui';
import StatusBadge from '../../components/StatusBadge';
import {
  CalendarCheck,
  Calendar,
  Filter,
  Check,
  X,
  Clock,
  MapPin,
  Camera,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export default function AttendanceRecords() {
  const { user } = useAuth();
  const isHR = user?.role === 'hr';

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [department, setDepartment] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [boardData, setBoardData] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [corrections, setCorrections] = useState([]);
  const [activeTab, setActiveTab] = useState('board'); // 'board' or 'corrections'
  const [loading, setLoading] = useState(true);

  // Correction decision state
  const [reviewComment, setReviewComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [boardRes, deptRes, corrRes] = await Promise.all([
        api.get('/attendance/daily-board', {
          params: { date, department: department || undefined, status: statusFilter || undefined },
        }),
        api.get('/settings/departments'),
        api.get('/attendance/corrections'),
      ]);
      setBoardData(boardRes.data);
      setDepartments(deptRes.data || []);
      setCorrections(corrRes.data.corrections || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [date, department, statusFilter]);

  const handleCorrectionDecision = async (id, status) => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await api.patch(`/attendance/corrections/${id}`, {
        status,
        reviewComment: reviewComment || undefined,
      });
      setSuccess(`Correction request ${status} successfully`);
      setReviewComment('');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to process correction');
    } finally {
      setActionLoading(false);
    }
  };

  const counts = boardData?.counts || {};

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Workforce Attendance Board</h2>
          <p className="text-xs text-slate-500">Daily workforce check-in ledger, 09:15 late tracking, and correction inbox</p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('board')}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              activeTab === 'board' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Daily Board
          </button>
          <button
            onClick={() => setActiveTab('corrections')}
            className={`rounded-lg px-3 py-1.5 transition-colors flex items-center gap-1.5 ${
              activeTab === 'corrections' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Corrections</span>
            {corrections.filter((c) => c.status === 'pending').length > 0 && (
              <span className="h-4 w-4 rounded-full bg-rose-500 text-[10px] text-white flex items-center justify-center font-bold">
                {corrections.filter((c) => c.status === 'pending').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {success && <Alert kind="success">{success}</Alert>}

      {activeTab === 'board' && (
        <>
          {/* Status summary pills */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-6 text-center text-xs">
            <div
              onClick={() => setStatusFilter(statusFilter === 'present' ? '' : 'present')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                statusFilter === 'present' ? 'ring-2 ring-emerald-500 bg-emerald-50' : 'bg-white border-slate-200'
              }`}
            >
              <div className="text-lg font-bold text-emerald-600">{counts.present || 0}</div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Present</div>
            </div>

            <div
              onClick={() => setStatusFilter(statusFilter === 'late' ? '' : 'late')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                statusFilter === 'late' ? 'ring-2 ring-amber-500 bg-amber-50' : 'bg-white border-slate-200'
              }`}
            >
              <div className="text-lg font-bold text-amber-600">{counts.late || 0}</div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Late (&gt;09:15)</div>
            </div>

            <div
              onClick={() => setStatusFilter(statusFilter === 'half-day' ? '' : 'half-day')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                statusFilter === 'half-day' ? 'ring-2 ring-orange-500 bg-orange-50' : 'bg-white border-slate-200'
              }`}
            >
              <div className="text-lg font-bold text-orange-600">{counts.halfDay || 0}</div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Half-Day (&lt;5h)</div>
            </div>

            <div
              onClick={() => setStatusFilter(statusFilter === 'leave' ? '' : 'leave')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                statusFilter === 'leave' ? 'ring-2 ring-sky-500 bg-sky-50' : 'bg-white border-slate-200'
              }`}
            >
              <div className="text-lg font-bold text-sky-600">{counts.leave || 0}</div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Approved Leave</div>
            </div>

            <div
              onClick={() => setStatusFilter(statusFilter === 'absent' ? '' : 'absent')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                statusFilter === 'absent' ? 'ring-2 ring-rose-500 bg-rose-50' : 'bg-white border-slate-200'
              }`}
            >
              <div className="text-lg font-bold text-rose-600">{counts.absent || 0}</div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Absent</div>
            </div>

            <div
              onClick={() => setStatusFilter(statusFilter === 'missing_checkout' ? '' : 'missing_checkout')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                statusFilter === 'missing_checkout' ? 'ring-2 ring-purple-500 bg-purple-50' : 'bg-white border-slate-200'
              }`}
            >
              <div className="text-lg font-bold text-purple-600">{counts.missingCheckout || 0}</div>
              <div className="text-[10px] uppercase font-bold text-slate-400">No Check-out</div>
            </div>
          </div>

          {/* Date & Dept Filter Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs">
              <Calendar className="h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="outline-none text-xs font-semibold text-slate-700"
              />
            </div>

            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d._id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>

            {statusFilter && (
              <button
                onClick={() => setStatusFilter('')}
                className="rounded-xl bg-slate-200 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-300 flex items-center gap-1"
              >
                <span>Clear status filter ({statusFilter})</span>
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Daily Table */}
          <Card className="overflow-hidden p-0 border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Check-in</th>
                    <th className="py-3 px-4">Check-out</th>
                    <th className="py-3 px-4">Work Hours</th>
                    <th className="py-3 px-4">Source & Geofence</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Loading board...
                      </td>
                    </tr>
                  ) : boardData?.rows?.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No attendance records for this date/department
                      </td>
                    </tr>
                  ) : (
                    boardData?.rows?.map((row) => (
                      <tr key={row.userId} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{row.name}</div>
                          <div className="font-mono text-[10px] text-slate-400">{row.employeeId}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{row.department}</td>
                        <td className="py-3 px-4 font-mono">
                          {row.attendance.checkIn
                            ? new Date(row.attendance.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {row.attendance.checkOut
                            ? new Date(row.attendance.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700">
                          {row.attendance.workHours ? `${row.attendance.workHours}h` : '0h'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            {row.attendance.source === 'camera' ? (
                              <span className="flex items-center gap-1 text-indigo-600 font-semibold">
                                <Camera className="h-3 w-3" /> Camera
                              </span>
                            ) : (
                              <span>Web</span>
                            )}
                            {row.attendance.location?.distanceMeters !== undefined && (
                              <span className="font-mono text-[10px] bg-slate-100 px-1 rounded">
                                {row.attendance.location.distanceMeters}m
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={row.attendance.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Corrections Inbox Tab (Feature 11) */}
      {activeTab === 'corrections' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-600" />
              Attendance Correction Requests ({corrections.length})
            </h3>
            <span className="text-xs text-slate-400">
              {isHR ? 'HR Approval Authority' : 'Admin View Only'}
            </span>
          </div>

          <div className="space-y-4">
            {corrections.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">No attendance correction requests</p>
            ) : (
              corrections.map((corr) => (
                <div key={corr._id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm text-slate-900">
                        Employee: {corr.user?.employeeId} ({corr.user?.email})
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        Target Date: {new Date(corr.date).toISOString().slice(0, 10)}
                      </div>
                    </div>
                    <StatusBadge status={corr.status} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-white p-3 rounded-lg border border-slate-200">
                    <div>
                      <span className="text-slate-400 font-medium">Requested In: </span>
                      <span className="font-mono font-bold text-slate-800">
                        {new Date(corr.requestedCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Requested Out: </span>
                      <span className="font-mono font-bold text-slate-800">
                        {corr.requestedCheckOut
                          ? new Date(corr.requestedCheckOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Requested Status: </span>
                      <span className="font-bold capitalize text-indigo-700">{corr.requestedStatus}</span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-700">
                    <strong>Reason given:</strong> {corr.reason}
                  </div>

                  {corr.status === 'pending' && isHR && (
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-200">
                      <Input
                        placeholder="Review comment (optional)..."
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        className="text-xs max-w-xs"
                      />
                      <Button
                        variant="danger"
                        disabled={actionLoading}
                        onClick={() => handleCorrectionDecision(corr._id, 'rejected')}
                        className="text-xs py-1.5 px-3"
                      >
                        Reject
                      </Button>
                      <Button
                        variant="success"
                        disabled={actionLoading}
                        onClick={() => handleCorrectionDecision(corr._id, 'approved')}
                        className="text-xs py-1.5 px-3"
                      >
                        Approve & Update
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
