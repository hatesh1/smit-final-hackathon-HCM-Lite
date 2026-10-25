import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { Card, Field, Input, Select, Button, Alert, Spinner, apiError } from '../../components/ui';
import { Avatar, DocumentsCard } from '../../components/ProfileView';
import MonthlyLeaveTable from '../../components/MonthlyLeaveTable';

const emptyForm = (p) => ({
  personal: {
    firstName: p.personal?.firstName || '',
    lastName: p.personal?.lastName || '',
    phone: p.personal?.phone || '',
    address: p.personal?.address || '',
    emergencyContact: p.personal?.emergencyContact || '',
  },
  job: {
    designation: p.job?.designation || '',
    department: p.job?.department || '',
    joiningDate: p.job?.joiningDate ? p.job.joiningDate.slice(0, 10) : '',
    employmentType: p.job?.employmentType || 'full-time',
  },
  salary: {
    basic: p.salary?.basic ?? 0,
    hra: p.salary?.hra ?? 0,
    allowances: p.salary?.allowances ?? 0,
    deductions: p.salary?.deductions ?? 0,
    currency: p.salary?.currency || 'INR',
  },
});

export default function EmployeeDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState({ kind: 'info', text: '' });
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [leaveMonths, setLeaveMonths] = useState([]);

  useEffect(() => {
    api.get(`/profiles/${userId}`).then(({ data }) => {
      setProfile(data.profile);
      setForm(emptyForm(data.profile));
    });
    api
      .get(`/attendance/leave-summary/${userId}`)
      .then(({ data }) => setLeaveMonths(data.months))
      .catch(() => {});
  }, [userId]);

  if (!profile || !form) return <Spinner />;

  const set = (section, key, isNumber) => (e) =>
    setForm({
      ...form,
      [section]: { ...form[section], [key]: isNumber ? Number(e.target.value) : e.target.value },
    });

  const isOwnAccount = String(profile.user?._id || profile.user?.id || '') === String(me?.id || '');

  const deleteAccount = async () => {
    setDeleting(true);
    setMsg({ kind: 'info', text: '' });
    try {
      await api.delete(`/profiles/${userId}`);
      navigate('/admin/employees', { replace: true });
    } catch (err) {
      setMsg({ kind: 'error', text: apiError(err) });
      setConfirmDelete(false);
      setDeleting(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg({ kind: 'info', text: '' });
    try {
      const payload = {
        ...form,
        job: { ...form.job, joiningDate: form.job.joiningDate || undefined },
      };
      const { data } = await api.put(`/profiles/${userId}`, payload);
      setProfile(data.profile);
      setMsg({ kind: 'success', text: 'Profile saved.' });
    } catch (err) {
      setMsg({ kind: 'error', text: apiError(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link to="/admin/employees" className="text-sm text-indigo-600 hover:underline">
          ← Directory
        </Link>
      </div>

      <Card>
        <div className="flex items-center gap-4">
          <Avatar url={profile.profilePictureUrl} />
          <div>
            <h1 className="text-lg font-semibold text-slate-800">
              {profile.personal?.firstName || profile.user?.employeeId}{' '}
              {profile.personal?.lastName || ''}
            </h1>
            <p className="text-sm text-slate-500">
              {profile.user?.email} · {profile.user?.employeeId} ·{' '}
              <span className="uppercase">{profile.user?.role}</span>
            </p>
          </div>
        </div>
      </Card>

      <Alert kind={msg.kind}>{msg.text}</Alert>

      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="mb-3 font-semibold text-slate-700">Personal</h2>
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="First name">
                  <Input value={form.personal.firstName} onChange={set('personal', 'firstName')} />
                </Field>
                <Field label="Last name">
                  <Input value={form.personal.lastName} onChange={set('personal', 'lastName')} />
                </Field>
              </div>
              <Field label="Phone">
                <Input value={form.personal.phone} onChange={set('personal', 'phone')} />
              </Field>
              <Field label="Address">
                <Input value={form.personal.address} onChange={set('personal', 'address')} />
              </Field>
              <Field label="Emergency contact">
                <Input
                  value={form.personal.emergencyContact}
                  onChange={set('personal', 'emergencyContact')}
                />
              </Field>
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold text-slate-700">Job</h2>
            <div className="space-y-3">
              <Field label="Designation">
                <Input value={form.job.designation} onChange={set('job', 'designation')} />
              </Field>
              <Field label="Department">
                <Input value={form.job.department} onChange={set('job', 'department')} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Joining date">
                  <Input type="date" value={form.job.joiningDate} onChange={set('job', 'joiningDate')} />
                </Field>
                <Field label="Employment type">
                  <Select value={form.job.employmentType} onChange={set('job', 'employmentType')}>
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="intern">Intern</option>
                  </Select>
                </Field>
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <h2 className="mb-3 font-semibold text-slate-700">Salary structure (admin only)</h2>
          <div className="grid gap-3 sm:grid-cols-5">
            <Field label="Basic">
              <Input type="number" min="0" value={form.salary.basic} onChange={set('salary', 'basic', true)} />
            </Field>
            <Field label="HRA">
              <Input type="number" min="0" value={form.salary.hra} onChange={set('salary', 'hra', true)} />
            </Field>
            <Field label="Allowances">
              <Input
                type="number"
                min="0"
                value={form.salary.allowances}
                onChange={set('salary', 'allowances', true)}
              />
            </Field>
            <Field label="Deductions">
              <Input
                type="number"
                min="0"
                value={form.salary.deductions}
                onChange={set('salary', 'deductions', true)}
              />
            </Field>
            <Field label="Currency">
              <Input value={form.salary.currency} onChange={set('salary', 'currency')} />
            </Field>
          </div>
        </Card>

        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save all changes'}
        </Button>
      </form>

      <DocumentsCard documents={profile.documents} />

      <MonthlyLeaveTable title="Leaves by month" months={leaveMonths} />

      {!isOwnAccount && (
        <Card className="border-red-200">
          <h2 className="mb-1 font-semibold text-red-700">Danger zone</h2>
          {confirmDelete ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                This permanently removes {profile.user?.email} and all of their attendance, leave,
                payroll and notification data. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button variant="danger" onClick={deleteAccount} disabled={deleting}>
                  {deleting ? 'Deleting…' : 'Yes, delete this account'}
                </Button>
                <Button variant="secondary" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Permanently delete this account and every record tied to it.
              </p>
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                Delete this account
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
