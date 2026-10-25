import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Card, Button, Input, Field, Alert, Spinner } from '../../components/ui';
import StatusBadge from '../../components/StatusBadge';
import { UserCheck, ShieldAlert, KeyRound, Plus, UserX, CheckCircle, Search } from 'lucide-react';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Create HR Modal
  const [showHrModal, setShowHrModal] = useState(false);
  const [hrForm, setHrForm] = useState({
    employeeId: '',
    email: '',
    password: '',
    name: '',
    department: 'Human Resources',
    designation: 'HR Officer',
  });

  // Reset Password Modal
  const [resetModalUser, setResetModalUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/users', {
        params: { search, role: roleFilter || undefined },
      });
      setUsers(data.users || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const handleCreateHR = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await api.post('/users/hr', hrForm);
      setSuccess(`HR login created for ${hrForm.email}`);
      setShowHrModal(false);
      setHrForm({
        employeeId: '',
        email: '',
        password: '',
        name: '',
        department: 'Human Resources',
        designation: 'HR Officer',
      });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to create HR login');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (user) => {
    if (!window.confirm(`Are you sure you want to ${user.isActive ? 'deactivate' : 'activate'} login for ${user.email}?`)) {
      return;
    }
    try {
      await api.patch(`/users/${user._id}/toggle-status`);
      setSuccess(`Status updated for ${user.employeeId}`);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to update user status');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetModalUser || !newPassword) return;
    setActionLoading(true);
    try {
      await api.post(`/users/${resetModalUser._id}/reset-password`, { newPassword });
      setSuccess(`Password reset for ${resetModalUser.employeeId}`);
      setResetModalUser(null);
      setNewPassword('');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to reset password');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">System User Accounts & Logins</h2>
          <p className="text-xs text-slate-500">Feature 05: Admin manages HR & Employee logins, password resets, and account status</p>
        </div>

        <Button
          variant="primary"
          onClick={() => setShowHrModal(true)}
          className="flex items-center gap-1.5 text-xs py-2 px-3.5 rounded-xl shadow-xs"
        >
          <Plus className="h-4 w-4" />
          <span>Create HR Login</span>
        </Button>
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {success && <Alert kind="success">{success}</Alert>}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchUsers();
          }}
          className="flex-1 max-w-md relative"
        >
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search email or Employee ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-300 pl-9 pr-4 py-2 text-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-200"
          />
        </form>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none"
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="hr">HR</option>
          <option value="employee">Employee</option>
        </select>
      </div>

      {/* Users Table */}
      <Card className="overflow-hidden p-0 border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">First Sign-in</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No users matching criteria
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">{u.employeeId}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{u.email}</td>
                    <td className="py-3 px-4 text-slate-700">
                      {u.profile ? `${u.profile.personal?.firstName || ''} ${u.profile.personal?.lastName || ''}`.trim() : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-[10px] font-bold uppercase text-indigo-700">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          u.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {u.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {u.mustChangePassword ? (
                        <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5 font-semibold">
                          Pending Password Change
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Verified</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setResetModalUser(u)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                          title="Reset Password"
                        >
                          <KeyRound className="h-4 w-4" />
                        </button>
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`rounded-lg p-1.5 transition-colors ${
                              u.isActive
                                ? 'text-slate-500 hover:bg-rose-50 hover:text-rose-600'
                                : 'text-slate-500 hover:bg-emerald-50 hover:text-emerald-600'
                            }`}
                            title={u.isActive ? 'Deactivate Account' : 'Activate Account'}
                          >
                            {u.isActive ? <UserX className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create HR Modal */}
      {showHrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">Create New HR Specialist Account</h3>
            <form onSubmit={handleCreateHR} className="space-y-4">
              <Field label="Employee ID">
                <Input
                  value={hrForm.employeeId}
                  onChange={(e) => setHrForm({ ...hrForm, employeeId: e.target.value })}
                  placeholder="e.g. HR002"
                  required
                />
              </Field>
              <Field label="Full Name">
                <Input
                  value={hrForm.name}
                  onChange={(e) => setHrForm({ ...hrForm, name: e.target.value })}
                  placeholder="e.g. Ali khan"
                  required
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={hrForm.email}
                  onChange={(e) => setHrForm({ ...hrForm, email: e.target.value })}
                  placeholder="ali.hr@company.com"
                  required
                />
              </Field>
              <Field label="Temporary Password">
                <Input
                  type="password"
                  value={hrForm.password}
                  onChange={(e) => setHrForm({ ...hrForm, password: e.target.value })}
                  placeholder="Must be changed on first sign-in"
                  required
                />
              </Field>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowHrModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={actionLoading}>
                  {actionLoading ? 'Creating...' : 'Create HR Login'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-2">Reset Password</h3>
            <p className="text-xs text-slate-500 mb-4">
              User: <strong>{resetModalUser.employeeId}</strong> ({resetModalUser.email})
            </p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <Field label="New Temporary Password">
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                />
              </Field>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setResetModalUser(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={actionLoading}>
                  {actionLoading ? 'Resetting...' : 'Reset Password'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
