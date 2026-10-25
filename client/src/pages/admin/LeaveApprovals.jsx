import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { Card, Button, Input, Field, Alert, Spinner } from '../../components/ui';
import StatusBadge from '../../components/StatusBadge';
import { CalendarDays, Check, X, MessageSquare, Clock, Filter, User } from 'lucide-react';

export default function LeaveApprovals() {
  const { user } = useAuth();
  const isHR = user?.role === 'hr';

  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(true);

  // Review Modal State
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [decision, setDecision] = useState('approved');
  const [adminComment, setAdminComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/leaves', {
        params: { status: statusFilter || undefined },
      });
      setRequests(data.requests || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const handleOpenDecision = (req, status) => {
    setSelectedRequest(req);
    setDecision(status);
    setAdminComment('');
  };

  const handleSubmitDecision = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await api.patch(`/leaves/${selectedRequest._id}/decision`, {
        status: decision,
        adminComment,
      });

      setSuccess(
        `Leave request ${decision} successfully. Attendance records synced for ${selectedRequest.workingDaysCount} working days.`
      );
      setSelectedRequest(null);
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to process decision');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Leave Approvals & Workflow</h2>
          <p className="text-xs text-slate-500">
            {isHR
              ? 'HR Authority: Review applications, enforce quota policies, and approve/reject with comments'
              : 'Admin View: Full workforce leave records and decision audits'}
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
          <button
            onClick={() => setStatusFilter('pending')}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              statusFilter === 'pending' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setStatusFilter('approved')}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              statusFilter === 'approved' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              statusFilter === 'rejected' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Rejected
          </button>
          <button
            onClick={() => setStatusFilter('')}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              statusFilter === '' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {success && <Alert kind="success">{success}</Alert>}

      {/* Requests List */}
      <div className="space-y-4">
        {loading ? (
          <Spinner />
        ) : requests.length === 0 ? (
          <Card className="py-12 text-center text-slate-400 text-sm">
            No leave requests matching the selected filter.
          </Card>
        ) : (
          requests.map((r) => (
            <Card key={r._id} className="p-5 border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm">
                    {r.user?.employeeId || 'EMP'}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900">{r.user?.email}</div>
                    <div className="text-xs text-slate-500 font-mono">
                      Applied on: {new Date(r.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold uppercase text-slate-700">
                    {r.type} Leave
                  </span>
                  <StatusBadge status={r.status} />
                </div>
              </div>

              {/* Leave Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-100 mb-3">
                <div>
                  <span className="text-slate-400 font-medium">Dates: </span>
                  <span className="font-mono font-semibold text-slate-800">
                    {new Date(r.startDate).toISOString().slice(0, 10)} → {new Date(r.endDate).toISOString().slice(0, 10)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Duration: </span>
                  <span className="font-bold text-indigo-700">{r.workingDaysCount} working days</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Policy Check: </span>
                  <span className="text-emerald-700 font-semibold">✓ Skips weekends & holidays</span>
                </div>
              </div>

              <div className="text-xs text-slate-700 mb-2">
                <strong>Employee Remarks:</strong> {r.remarks || 'No remarks provided'}
              </div>

              {r.adminComment && (
                <div className="text-xs text-indigo-900 bg-indigo-50/70 p-2.5 rounded-lg border border-indigo-100">
                  <strong>HR Review Comment:</strong> {r.adminComment}
                </div>
              )}

              {/* Action Buttons for HR */}
              {r.status === 'pending' && isHR && (
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button
                    variant="danger"
                    onClick={() => handleOpenDecision(r, 'rejected')}
                    className="text-xs py-1.5 px-3 flex items-center gap-1"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Reject</span>
                  </Button>
                  <Button
                    variant="success"
                    onClick={() => handleOpenDecision(r, 'approved')}
                    className="text-xs py-1.5 px-3.5 flex items-center gap-1"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Approve & Sync Attendance</span>
                  </Button>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Decision Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-2 capitalize">
              {decision} Leave Request
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Employee: <strong>{selectedRequest.user?.employeeId}</strong> · {selectedRequest.workingDaysCount} working days ({selectedRequest.type} leave).
            </p>

            <form onSubmit={handleSubmitDecision} className="space-y-4">
              <Field label="Review Feedback Comment (Required)">
                <textarea
                  rows={3}
                  value={adminComment}
                  onChange={(e) => setAdminComment(e.target.value)}
                  placeholder="Enter feedback rationale for employee..."
                  required
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs outline-none focus:border-indigo-600"
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setSelectedRequest(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant={decision === 'approved' ? 'success' : 'danger'}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Processing...' : `Confirm ${decision}`}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
