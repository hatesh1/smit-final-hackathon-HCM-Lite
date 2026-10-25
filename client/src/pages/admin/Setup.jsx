import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Card, Button, Input, Field, Alert, Spinner } from '../../components/ui';
import { Building2, Clock, MapPin, Plus, Check, Calendar, ShieldCheck } from 'lucide-react';

export default function AdminSetup() {
  const [settings, setSettings] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Forms
  const [newDept, setNewDept] = useState({ name: '', code: '', description: '' });
  const [newDesig, setNewDesig] = useState({ title: '', department: '' });
  const [newHoliday, setNewHoliday] = useState({ name: '', date: '', isRecurring: false });

  const [savingSettings, setSavingSettings] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [sRes, deptRes, desRes, holRes, ltRes] = await Promise.all([
        api.get('/settings'),
        api.get('/settings/departments'),
        api.get('/settings/designations'),
        api.get('/settings/holidays'),
        api.get('/settings/leave-types'),
      ]);
      setSettings(sRes.data);
      setDepartments(deptRes.data || []);
      setDesignations(desRes.data || []);
      setHolidays(holRes.data || []);
      setLeaveTypes(ltRes.data || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    setError(null);
    setSuccess(null);
    try {
      const { data } = await api.put('/settings', settings);
      setSettings(data);
      setSuccess('Company configuration and attendance rules updated successfully');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to update settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    if (!newDept.name || !newDept.code) return;
    try {
      await api.post('/settings/departments', newDept);
      setNewDept({ name: '', code: '', description: '' });
      const { data } = await api.get('/settings/departments');
      setDepartments(data);
      setSuccess('Department created');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to create department');
    }
  };

  const handleAddDesignation = async (e) => {
    e.preventDefault();
    if (!newDesig.title || !newDesig.department) return;
    try {
      await api.post('/settings/designations', newDesig);
      setNewDesig({ title: '', department: '' });
      const { data } = await api.get('/settings/designations');
      setDesignations(data);
      setSuccess('Designation created');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to create designation');
    }
  };

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!newHoliday.name || !newHoliday.date) return;
    try {
      await api.post('/settings/holidays', newHoliday);
      setNewHoliday({ name: '', date: '', isRecurring: false });
      const { data } = await api.get('/settings/holidays');
      setHolidays(data);
      setSuccess('Public holiday added');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to add holiday');
    }
  };

  if (loading && !settings) return <Spinner />;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Organization Setup & Business Rules</h2>
        <p className="text-xs text-slate-500">Configure company-wide attendance rules, geofence, departments, and leave quotas</p>
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {success && <Alert kind="success">{success}</Alert>}

      {/* Company Rules & Attendance Hours */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
          <Clock className="h-5 w-5 text-indigo-600" />
          <h3 className="font-bold text-slate-800 text-sm">Attendance Timing & Geofence Coordinates</h3>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Company Name">
              <Input
                value={settings?.companyName || ''}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                required
              />
            </Field>

            <Field label="Office Start Time (09:00)">
              <Input
                type="time"
                value={settings?.officeStart || '09:00'}
                onChange={(e) => setSettings({ ...settings, officeStart: e.target.value })}
                required
              />
            </Field>

            <Field label="Grace Minutes (15m)">
              <Input
                type="number"
                value={settings?.graceMinutes ?? 15}
                onChange={(e) => setSettings({ ...settings, graceMinutes: Number(e.target.value) })}
                required
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Field label="Half-Day Hours (<5h)">
              <Input
                type="number"
                value={settings?.halfDayHours ?? 5}
                onChange={(e) => setSettings({ ...settings, halfDayHours: Number(e.target.value) })}
                required
              />
            </Field>

            <Field label="Office Latitude">
              <Input
                type="number"
                step="0.0001"
                value={settings?.officeLocation?.lat ?? 24.8607}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    officeLocation: { ...settings.officeLocation, lat: Number(e.target.value) },
                  })
                }
                required
              />
            </Field>

            <Field label="Office Longitude">
              <Input
                type="number"
                step="0.0001"
                value={settings?.officeLocation?.lng ?? 67.0011}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    officeLocation: { ...settings.officeLocation, lng: Number(e.target.value) },
                  })
                }
                required
              />
            </Field>

            <Field label="Geofence Radius (Meters)">
              <Input
                type="number"
                value={settings?.officeLocation?.radiusMeters ?? 150}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    officeLocation: { ...settings.officeLocation, radiusMeters: Number(e.target.value) },
                  })
                }
                required
              />
            </Field>
          </div>

          <div className="flex justify-end">
            <Button type="submit" variant="primary" disabled={savingSettings}>
              {savingSettings ? 'Saving...' : 'Save Attendance Rules'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Departments & Designations Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Departments */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4 text-indigo-600" />
              Departments ({departments.length})
            </h3>
          </div>

          <form onSubmit={handleAddDepartment} className="flex gap-2 mb-4">
            <Input
              placeholder="Name e.g. Finance"
              value={newDept.name}
              onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
              required
              className="text-xs"
            />
            <Input
              placeholder="Code e.g. FIN"
              value={newDept.code}
              onChange={(e) => setNewDept({ ...newDept, code: e.target.value })}
              required
              className="w-24 text-xs uppercase"
            />
            <Button type="submit" variant="primary" className="text-xs shrink-0">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </form>

          <div className="space-y-2 max-h-56 overflow-y-auto">
            {departments.map((d) => (
              <div key={d._id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <div>
                  <span className="font-semibold text-slate-800">{d.name}</span>
                  <span className="ml-2 font-mono text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold">
                    {d.code}
                  </span>
                </div>
                <span className="text-[10px] text-emerald-600 font-semibold">Active</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Designations */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Designations ({designations.length})
            </h3>
          </div>

          <form onSubmit={handleAddDesignation} className="flex gap-2 mb-4">
            <Input
              placeholder="Title e.g. Staff Engineer"
              value={newDesig.title}
              onChange={(e) => setNewDesig({ ...newDesig, title: e.target.value })}
              required
              className="text-xs"
            />
            <select
              value={newDesig.department}
              onChange={(e) => setNewDesig({ ...newDesig, department: e.target.value })}
              required
              className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
            >
              <option value="">Dept...</option>
              {departments.map((d) => (
                <option key={d._id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
            <Button type="submit" variant="primary" className="text-xs shrink-0">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </form>

          <div className="space-y-2 max-h-56 overflow-y-auto">
            {designations.map((des) => (
              <div key={des._id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <span className="font-semibold text-slate-800">{des.title}</span>
                <span className="text-slate-500 text-[11px]">{des.department}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Leave Quotas & Public Holidays */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Leave Quotas (Section 3 M5 Rules) */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-sky-600" />
              Official Leave Quotas (Section 3 Rules)
            </h3>
          </div>
          <div className="space-y-3">
            {leaveTypes.map((lt) => (
              <div key={lt._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <div className="font-semibold text-xs text-slate-800">{lt.name}</div>
                  <div className="text-[10px] text-slate-400 capitalize">{lt.description || lt.code}</div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-extrabold text-indigo-700 font-mono">
                    {lt.yearlyQuota > 0 ? `${lt.yearlyQuota} Days/Year` : 'Unlimited'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Public Holidays */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-rose-600" />
              Company Public Holidays ({holidays.length})
            </h3>
          </div>

          <form onSubmit={handleAddHoliday} className="flex gap-2 mb-4">
            <Input
              placeholder="Holiday name"
              value={newHoliday.name}
              onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
              required
              className="text-xs"
            />
            <Input
              type="date"
              value={newHoliday.date}
              onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
              required
              className="w-36 text-xs"
            />
            <Button type="submit" variant="primary" className="text-xs shrink-0">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </form>

          <div className="space-y-2 max-h-56 overflow-y-auto">
            {holidays.map((h) => (
              <div key={h._id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <span className="font-semibold text-slate-800">{h.name}</span>
                <span className="font-mono text-slate-500 text-[11px]">
                  {new Date(h.date).toISOString().slice(0, 10)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
