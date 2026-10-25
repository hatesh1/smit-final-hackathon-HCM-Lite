import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Card, Button, Spinner, Alert } from '../../components/ui';
import { ShieldCheck, Eye, Search, Filter, X } from 'lucide-react';

export default function AuditTrail() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [error, setError] = useState(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/audit-logs', {
        params: { entity: entityFilter || undefined, action: actionFilter || undefined },
      });
      setLogs(data.logs || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [entityFilter, actionFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">System Audit Log & Compliance</h2>
          <p className="text-xs text-slate-500">Feature 25: Immutable ledger of all create, update, approve, and finalize operations</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none"
          >
            <option value="">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="approve">Approve</option>
            <option value="reject">Reject</option>
            <option value="finalize">Finalize</option>
            <option value="reset_password">Reset Password</option>
            <option value="deactivate">Deactivate</option>
          </select>

          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none"
          >
            <option value="">All Entities</option>
            <option value="Employee">Employee</option>
            <option value="Attendance">Attendance</option>
            <option value="LeaveRequest">LeaveRequest</option>
            <option value="PayrollRun">PayrollRun</option>
            <option value="CompanySettings">CompanySettings</option>
            <option value="User">User</option>
          </select>
        </div>
      </div>

      {error && <Alert kind="error">{error}</Alert>}

      <Card className="overflow-hidden p-0 border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-4 text-right">State Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">Loading audit trail...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">No audit records found</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      <div>{log.actor?.email || 'System'}</div>
                      <div className="text-[10px] text-indigo-600 font-mono uppercase">{log.actor?.role}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{log.entity}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-sm truncate">{log.details}</td>
                    <td className="py-3 px-4 text-right">
                      {(log.beforeJSON || log.afterJSON) && (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="rounded-lg p-1.5 text-indigo-600 hover:bg-indigo-50"
                          title="View JSON Diff"
                        >
                          <Eye className="h-4 w-4" />
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

      {/* JSON Diff Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-4">
              <h3 className="text-base font-bold text-slate-900">
                Audit Record State: {selectedLog.action} on {selectedLog.entity}
              </h3>
              <button onClick={() => setSelectedLog(null)}>
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-bold text-slate-600 block mb-1">State Before Action:</span>
                <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl overflow-x-auto text-[11px] font-mono max-h-80">
                  {selectedLog.beforeJSON ? JSON.stringify(selectedLog.beforeJSON, null, 2) : 'None (New Record)'}
                </pre>
              </div>
              <div>
                <span className="font-bold text-slate-600 block mb-1">State After Action:</span>
                <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl overflow-x-auto text-[11px] font-mono max-h-80">
                  {selectedLog.afterJSON ? JSON.stringify(selectedLog.afterJSON, null, 2) : 'None'}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button variant="secondary" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
