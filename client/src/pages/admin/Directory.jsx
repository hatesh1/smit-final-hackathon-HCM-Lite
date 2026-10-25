import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { Card, Button, Input, Field, Alert, Spinner } from '../../components/ui';
import StatusBadge from '../../components/StatusBadge';
import {
  Users,
  Search,
  Plus,
  Download,
  Upload,
  Eye,
  Edit2,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  FileText,
  X,
} from 'lucide-react';

export default function Directory() {
  const { user } = useAuth();
  const isHR = user?.role === 'hr';

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Register Employee Modal
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regForm, setRegForm] = useState({
    employeeId: '',
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    department: 'Engineering',
    designation: 'Software Engineer',
    basicSalary: 50000,
    allowances: 0,
    gender: 'male',
    joiningDate: new Date().toISOString().slice(0, 10),
  });

  // CSV Import Modal (Feature 08)
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [dryRunReport, setDryRunReport] = useState(null);
  const [csvLoading, setCsvLoading] = useState(false);

  // Employee 360 View Modal (Feature 07)
  const [selected360, setSelected360] = useState(null);
  const [loading360, setLoading360] = useState(false);

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const [empRes, deptRes] = await Promise.all([
        api.get('/employees', {
          params: { search, department: deptFilter || undefined, status: statusFilter || undefined },
        }),
        api.get('/settings/departments'),
      ]);
      setEmployees(empRes.data.employees || []);
      setDepartments(deptRes.data || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [deptFilter, statusFilter]);

  const handleRegisterEmployee = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const { data } = await api.post('/employees', regForm);
      setSuccess(`Employee registered! Temporary Password: ${data.temporaryPassword}`);
      setShowRegisterModal(false);
      fetchEmployees();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Registration failed');
    }
  };

  const handleCsvDryRun = async () => {
    setError(null);
    setCsvLoading(true);
    try {
      // Parse CSV text into array of objects
      const lines = csvText.trim().split('\n');
      if (lines.length < 2) throw new Error('CSV must contain a header row and at least one data row');

      const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));
      const rows = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const vals = lines[i].split(',').map((v) => v.trim().replace(/"/g, ''));
        const obj = {};
        headers.forEach((h, idx) => {
          // Map header to field names
          const key =
            h === 'Employee ID' || h === 'employeeId' ? 'employeeId' :
            h === 'Email' || h === 'email' ? 'email' :
            h === 'First Name' || h === 'firstName' ? 'firstName' :
            h === 'Last Name' || h === 'lastName' ? 'lastName' :
            h === 'Department' || h === 'department' ? 'department' :
            h === 'Designation' || h === 'designation' ? 'designation' :
            h === 'Basic Salary' || h === 'basicSalary' ? 'basicSalary' :
            h === 'Joining Date' || h === 'joiningDate' ? 'joiningDate' : h;
          obj[key] = vals[idx] || '';
        });
        rows.push(obj);
      }

      const { data } = await api.post('/employees/csv-dry-run', { rows });
      setDryRunReport(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Dry run failed');
    } finally {
      setCsvLoading(false);
    }
  };

  const handleCsvCommit = async () => {
    if (!dryRunReport?.validRows?.length) return;
    setCsvLoading(true);
    try {
      const { data } = await api.post('/employees/csv-commit', {
        validRows: dryRunReport.validRows,
      });
      setSuccess(`Successfully imported ${data.count} employees!`);
      setShowCsvModal(false);
      setDryRunReport(null);
      setCsvText('');
      fetchEmployees();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'CSV commit failed');
    } finally {
      setCsvLoading(false);
    }
  };

  const handleExportCSV = () => {
    window.open('/api/employees/export-csv', '_blank');
  };

  const handleOpen360 = async (userId) => {
    setLoading360(true);
    try {
      const { data } = await api.get(`/employees/${userId}/360`);
      setSelected360(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load Employee 360');
    } finally {
      setLoading360(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Employee Directory & 360</h2>
          <p className="text-xs text-slate-500">Searchable workforce database, CSV dry-run import/export, and complete Employee 360 dossiers</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 text-xs py-2 px-3 rounded-xl border border-slate-300"
          >
            <Download className="h-3.5 w-3.5 text-slate-600" />
            <span>Export CSV</span>
          </Button>

          {isHR && (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowCsvModal(true);
                  setDryRunReport(null);
                }}
                className="flex items-center gap-1.5 text-xs py-2 px-3 rounded-xl border border-indigo-200 text-indigo-700 bg-indigo-50/50"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>CSV Import (Dry-Run)</span>
              </Button>

              <Button
                variant="primary"
                onClick={() => setShowRegisterModal(true)}
                className="flex items-center gap-1.5 text-xs py-2 px-3.5 rounded-xl shadow-xs"
              >
                <Plus className="h-4 w-4" />
                <span>Register Employee</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {success && <Alert kind="success">{success}</Alert>}

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchEmployees();
          }}
          className="flex-1 max-w-md relative"
        >
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, employee ID, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-300 pl-9 pr-4 py-2 text-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-200"
          />
        </form>

        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d._id} value={d.name}>
              {d.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="probation">Probation</option>
          <option value="on_leave">On Leave</option>
        </select>
      </div>

      {/* Directory Table */}
      <Card className="overflow-hidden p-0 border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4">Gross Salary</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Joined</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading directory...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No employees found
                  </td>
                </tr>
              ) : (
                employees.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">
                        {p.personal?.firstName} {p.personal?.lastName}
                      </div>
                      <div className="font-mono text-[10px] text-indigo-600 font-semibold">
                        {p.user?.employeeId} · {p.user?.email}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">{p.job?.department || '—'}</td>
                    <td className="py-3 px-4 text-slate-600">{p.job?.designation || '—'}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {p.salary?.currency || 'PKR'} {Number(p.salary?.gross || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={p.job?.status || 'active'} />
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {p.job?.joiningDate ? new Date(p.job.joiningDate).toISOString().slice(0, 10) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="secondary"
                        onClick={() => handleOpen360(p.user?._id)}
                        className="py-1 px-2.5 text-xs rounded-lg inline-flex items-center gap-1 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>360 Profile</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Register Employee Modal */}
      ```jsx
{showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
              <h3 className="text-base font-bold text-slate-900">Register Employee (Creates Login)</h3>
              <button onClick={() => setShowRegisterModal(false)}>
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleRegisterEmployee} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="First">
                  <Input
                    value={regForm.employeeId}
                    onChange={(e) => setRegForm({ ...regForm, employeeId: e.target.value })}
                    placeholder="e.g. EMP-001"
                    required
                  />
                </Field>
                <Field label="Official Email">
                  <Input
                    type="email"
                    value={regForm.email}
                    onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                    placeholder="e.g. ali.khan@company.com"
                    required
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="First Name">
                  <Input
                    value={regForm.firstName}
                    onChange={(e) => setRegForm({ ...regForm, firstName: e.target.value })}
                    placeholder="e.g. Ali"
                    required
                  />
                </Field>
                <Field label="Last Name">
                  <Input
                    value={regForm.lastName}
                    onChange={(e) => setRegForm({ ...regForm, lastName: e.target.value })}
                    placeholder="e.g. Khan"
                    required
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Department">
                  <select
                    value={regForm.department}
                    onChange={(e) => setRegForm({ ...regForm, department: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                  >
                    {departments.map((d) => (
                      <option key={d._id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Designation">
                  <Input
                    value={regForm.designation}
                    onChange={(e) => setRegForm({ ...regForm, designation: e.target.value })}
                    placeholder="e.g. Software Developer"
                    required
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Basic Salary (PKR)">
                  <Input
                    type="number"
                    value={regForm.basicSalary}
                    onChange={(e) => setRegForm({ ...regForm, basicSalary: Number(e.target.value) })}
                    placeholder="e.g. 50000"
                    required
                  />
                </Field>
                <Field label="Joining Date">
                  <Input
                    type="date"
                    value={regForm.joiningDate}
                    onChange={(e) => setRegForm({ ...regForm, joiningDate: e.target.value })}
                    required
                  />
                </Field>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 border border-slate-200">
                <strong>Computed Salary Structure (Section 3 Rule):</strong>
                <div className="mt-1 flex justify-between font-mono">
                  <span>HRA (40%): {Math.round(regForm.basicSalary * 0.4)}</span>
                  <span>Medical (10%): {Math.round(regForm.basicSalary * 0.1)}</span>
                  <span className="font-bold text-indigo-700">Gross: {Math.round(regForm.basicSalary * 1.5)} PKR</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowRegisterModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Register & Create Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
```

      {/* CSV Import Modal with Dry Run Report (Feature 08) */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Upload className="h-5 w-5 text-indigo-600" />
                CSV Bulk Import with Dry-Run Validation (Section 3 M3)
              </h3>
              <button onClick={() => setShowCsvModal(false)}>
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-3">
              Paste CSV data below. Header required: <code>employeeId,email,firstName,lastName,department,designation,basicSalary,joiningDate</code>
            </p>

            <textarea
              rows={5}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={`employeeId,email,firstName,lastName,department,designation,basicSalary,joiningDate\nEMP101,zain@company.com,Zain,Abbas,Engineering,Junior Dev,55000,2026-02-01\nEMP102,sara@company.com,Sara,Malik,Marketing,Specialist,65000,2026-03-01`}
              className="w-full font-mono text-xs rounded-xl border border-slate-300 p-3 outline-none focus:border-indigo-600"
            />

            <div className="flex justify-between items-center mt-3">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCsvDryRun}
                disabled={csvLoading || !csvText.trim()}
                className="text-xs"
              >
                {csvLoading ? 'Validating...' : 'Run Dry-Run Verification'}
              </Button>

              {dryRunReport?.validCount > 0 && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleCsvCommit}
                  disabled={csvLoading}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700"
                >
                  Commit Import ({dryRunReport.validCount} valid rows)
                </Button>
              )}
            </div>

            {/* Dry Run Result Table */}
            {dryRunReport && (
              <div className="mt-4 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-3 mb-2 text-xs font-semibold">
                  <span className="text-emerald-700">Valid: {dryRunReport.validCount}</span>
                  <span className="text-rose-700">Errors: {dryRunReport.errorCount}</span>
                </div>

                {dryRunReport.errors.length > 0 && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 mb-3 max-h-40 overflow-y-auto">
                    <div className="text-xs font-bold text-rose-800 mb-1">Dry-Run Validation Errors:</div>
                    <ul className="text-[11px] text-rose-700 space-y-1">
                      {dryRunReport.errors.map((e, idx) => (
                        <li key={idx}>
                          Row {e.row} · Field: <strong>{e.field}</strong> — {e.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Employee 360 Dossier Modal (Feature 07) */}
      {selected360 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Employee 360° Profile: {selected360.profile?.personal?.firstName} {selected360.profile?.personal?.lastName}
                </h3>
                <div className="text-xs font-mono text-indigo-600">
                  {selected360.user?.employeeId} · {selected360.user?.email} · Role: {selected360.user?.role?.toUpperCase()}
                </div>
              </div>
              <button onClick={() => setSelected360(null)}>
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Job Details */}
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs space-y-2">
                <div className="font-bold text-slate-700 uppercase tracking-wider mb-1">Job Details</div>
                <div><strong>Department:</strong> {selected360.profile?.job?.department}</div>
                <div><strong>Designation:</strong> {selected360.profile?.job?.designation}</div>
                <div><strong>Employment Type:</strong> {selected360.profile?.job?.employmentType}</div>
                <div><strong>Status:</strong> {selected360.profile?.job?.status}</div>
              </div>

              {/* Salary Breakdown (Gross = 1.5 * Basic) */}
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs space-y-2">
                <div className="font-bold text-slate-700 uppercase tracking-wider mb-1">Salary Breakdown</div>
                <div><strong>Basic:</strong> {selected360.profile?.salary?.basic?.toLocaleString()} PKR</div>
                <div><strong>HRA (40%):</strong> {selected360.profile?.salary?.hra?.toLocaleString()} PKR</div>
                <div><strong>Medical (10%):</strong> {selected360.profile?.salary?.medical?.toLocaleString()} PKR</div>
                <div className="text-indigo-700 font-bold">
                  <strong>Total Gross:</strong> {selected360.profile?.salary?.gross?.toLocaleString()} PKR
                </div>
              </div>
            </div>

            {/* Attendance & Leave Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 text-center text-xs">
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                <div className="text-lg font-bold text-indigo-700">{selected360.attendanceStats?.present || 0}</div>
                <div className="text-[10px] text-slate-500 font-semibold uppercase">Present Days</div>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                <div className="text-lg font-bold text-amber-700">{selected360.attendanceStats?.late || 0}</div>
                <div className="text-[10px] text-slate-500 font-semibold uppercase">Late Arrivals</div>
              </div>
              <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl">
                <div className="text-lg font-bold text-sky-700">
                  {selected360.leaveBalances?.annual?.balance ?? 14}d
                </div>
                <div className="text-[10px] text-slate-500 font-semibold uppercase">Annual Leave Left</div>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                <div className="text-lg font-bold text-emerald-700">
                  {selected360.leaveBalances?.sick?.balance ?? 8}d
                </div>
                <div className="text-[10px] text-slate-500 font-semibold uppercase">Sick Leave Left</div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setSelected360(null)}>
                Close Dossier
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
