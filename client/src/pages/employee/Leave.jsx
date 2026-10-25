import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Card, Button, Input, Field, Alert, Spinner } from '../../components/ui';
import StatusBadge from '../../components/StatusBadge';
import { CalendarDays, Sparkles, Plus, X, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';

export default function EmployeeLeave() {
  const [requests, setRequests] = useState([]);
  const [balances, setBalances] = useState(null);
  const [loading, setLoading] = useState(true);

  // Apply Modal
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [form, setForm] = useState({
    type: 'casual',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    remarks: '',
  });

  // Smart Leave NLP prompt (Feature 21)
  const [smartInput, setSmartInput] = useState('');
  const [smartLoading, setSmartLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reqRes, balRes] = await Promise.all([
        api.get('/leaves/me'),
        api.get('/leaves/balances'),
      ]);
      setRequests(reqRes.data.requests || []);
      setBalances(balRes.data.balances || null);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load leave data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Smart Leave NLP Parser
  const handleSmartLeaveParse = async (e) => {
    e.preventDefault();
    if (!smartInput.trim()) return;
    setSmartLoading(true);
    setError(null);

    try {
      const { data } = await api.post('/ai/smart-leave', { text: smartInput });
      const parsed = data.form;
      setForm({
        type: parsed.type || 'casual',
        startDate: parsed.startDate,
        endDate: parsed.endDate,
        remarks: parsed.reason,
      });
      setShowApplyModal(true);
      setSuccess('Smart Leave: Form auto-filled from your sentence! Please review and confirm.');
    } catch (err) {
      setError('Could not auto-parse sentence. You can fill out the form manually.');
      setShowApplyModal(true);
    } finally {
      setSmartLoading(false);
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await api.post('/leaves', form);
      setSuccess('Leave application submitted successfully. HR approval is pending.');
      setShowApplyModal(false);
      setSmartInput('');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this pending leave application?')) return;
    try {
      await api.delete(`/leaves/${id}`);
      setSuccess('Leave request cancelled');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to cancel request');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Leave Center & Balances</h2>
          <p className="text-xs text-slate-500">Apply for leave, check remaining yearly quotas, or use smart natural language parsing</p>
        </div>

        <Button
          variant="primary"
          onClick={() => setShowApplyModal(true)}
          className="flex items-center gap-1.5 text-xs py-2 px-3.5 rounded-xl shadow-xs"
        >
          <Plus className="h-4 w-4" />
          <span>Apply for Leave</span>
        </Button>
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {success && <Alert kind="success">{success}</Alert>}

      {/* Feature 21: Smart Leave Assistant Box */}
      <Card className="p-5 bg-linear-to-r from-indigo-50/80 via-white to-indigo-50/40 border border-indigo-200/60 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-7 w-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-amber-300" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-indigo-950">
              Smart Leave Form (Feature 21: Natural Language Pre-fill)
            </h3>
            <p className="text-[11px] text-indigo-700">
              Type your leave request in plain words (e.g. <em>"Need next Monday and Tuesday off for my sister's wedding"</em> or in Roman Urdu: <em>"Mujhe aglay peer ko chutti chahiye"</em>).
            </p>
          </div>
        </div>

        <form onSubmit={handleSmartLeaveParse} className="flex gap-2 mt-3">
          <input
            type="text"
            value={smartInput}
            onChange={(e) => setSmartInput(e.target.value)}
            placeholder="e.g. Need next Monday and Tuesday off for my brother's wedding ceremony..."
            className="flex-1 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-300"
          />
          <Button
            type="submit"
            disabled={smartLoading || !smartInput.trim()}
            className="text-xs py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-1.5 shadow-xs shrink-0"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{smartLoading ? 'Extracting...' : 'Auto-Fill Form'}</span>
          </Button>
        </form>
      </Card>

      {/* Leave Balance Quota Cards (Section 3 Rules: Annual 14, Sick 8, Casual 10, Unpaid unlimited) */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4 border-l-4 border-l-indigo-600">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Annual Vacation</div>
          <div className="mt-2 text-2xl font-extrabold text-indigo-700">
            {balances?.annual?.balance ?? 14} <span className="text-xs font-semibold text-slate-400">/ 14 days</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Used: {balances?.annual?.used || 0} days</div>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-600">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Sick Leave</div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-700">
            {balances?.sick?.balance ?? 8} <span className="text-xs font-semibold text-slate-400">/ 8 days</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Used: {balances?.sick?.used || 0} days</div>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-600">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Casual Leave</div>
          <div className="mt-2 text-2xl font-extrabold text-amber-700">
            {balances?.casual?.balance ?? 10} <span className="text-xs font-semibold text-slate-400">/ 10 days</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Used: {balances?.casual?.used || 0} days</div>
        </Card>

        <Card className="p-4 border-l-4 border-l-slate-600">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Unpaid Leave</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-800">Unlimited</div>
          <div className="text-[10px] text-slate-500 mt-1">Used: {balances?.unpaid?.used || 0} days</div>
        </Card>
      </div>

      {/* Leave Application History */}
      <Card className="overflow-hidden p-0 border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">My Leave Applications</h3>
          <span className="text-xs text-slate-400">{requests.length} records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Leave Type</th>
                <th className="py-3 px-4">From</th>
                <th className="py-3 px-4">To</th>
                <th className="py-3 px-4">Working Days</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">HR Feedback</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">Loading leave requests...</td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">No leave applications yet</td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold capitalize text-slate-800">{r.type}</td>
                    <td className="py-3 px-4 font-mono">{new Date(r.startDate).toISOString().slice(0, 10)}</td>
                    <td className="py-3 px-4 font-mono">{new Date(r.endDate).toISOString().slice(0, 10)}</td>
                    <td className="py-3 px-4 font-semibold text-indigo-700">{r.workingDaysCount} days</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                      {r.adminComment || '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {r.status === 'pending' && (
                        <button
                          onClick={() => handleCancel(r._id)}
                          className="text-rose-600 hover:text-rose-800 font-semibold text-[11px] flex items-center gap-1 ml-auto"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Cancel</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
              <h3 className="text-base font-bold text-slate-900">Apply for Leave</h3>
              <button onClick={() => setShowApplyModal(false)}>
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleApply} className="space-y-4">
              <Field label="Leave Type">
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold"
                >
                  <option value="casual">Casual Leave ({balances?.casual?.balance ?? 10}d left)</option>
                  <option value="sick">Sick Leave ({balances?.sick?.balance ?? 8}d left)</option>
                  <option value="annual">Annual Leave ({balances?.annual?.balance ?? 14}d left)</option>
                  <option value="unpaid">Unpaid Leave (Unlimited)</option>
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Start Date">
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    required
                  />
                </Field>
                <Field label="End Date">
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    required
                  />
                </Field>
              </div>

              <div className="rounded-xl bg-slate-50 p-2.5 text-[11px] text-slate-500 border border-slate-100">
                Notice: Weekends (Sat-Sun) and company public holidays are excluded automatically from the day count.
              </div>

              <Field label="Reason / Remarks">
                <textarea
                  rows={3}
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  placeholder="Detail the reason for your leave request..."
                  required
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs outline-none focus:border-indigo-600"
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowApplyModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Confirm & Apply'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
