import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { Card, Button, Input, Field, Alert, Spinner } from '../../components/ui';
import ChangePasswordModal from '../../components/ChangePasswordModal';
import { User, Phone, MapPin, KeyRound, Shield, Briefcase, Mail } from 'lucide-react';

export default function EmployeeProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/auth/me');
      setProfile(data.profile || null);
      if (data.profile?.personal) {
        setPhone(data.profile.personal.phone || '');
        setAddress(data.profile.personal.address || '');
        setEmergencyContact(data.profile.personal.emergencyContact || '');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSaveContact = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      // Employee role: only phone and address allowed to be modified on server
      await api.put(`/employees/${user.id}`, {
        personal: { phone, address, emergencyContact },
      });
      setSuccess('Contact details updated successfully');
      fetchProfile();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to update contact');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6 max-w-4xl">
      <ChangePasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">My Profile & Credentials</h2>
          <p className="text-xs text-slate-500">Employee 360: View job details, update personal contact info, and manage password</p>
        </div>

        <Button
          variant="secondary"
          onClick={() => setPasswordModalOpen(true)}
          className="flex items-center gap-1.5 text-xs py-2 px-3 rounded-xl border border-slate-300"
        >
          <KeyRound className="h-4 w-4 text-slate-600" />
          <span>Change Password</span>
        </Button>
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {success && <Alert kind="success">{success}</Alert>}

      {/* Profile Overview Card */}
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-16 w-16 rounded-2xl bg-indigo-600 text-white font-extrabold text-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
            {profile?.personal?.firstName?.charAt(0) || 'U'}
            {profile?.personal?.lastName?.charAt(0) || ''}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {profile?.personal?.firstName} {profile?.personal?.lastName}
            </h3>
            <div className="text-xs text-slate-500 font-mono mt-0.5">
              {user?.employeeId} · {user?.email} · Role: <span className="uppercase font-bold text-indigo-600">{user?.role}</span>
            </div>
          </div>
        </div>

        {/* Read-Only Job Information */}
        <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 mb-6">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
            <Briefcase className="h-4 w-4 text-indigo-600" />
            Official Job Information (Managed by HR)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400">Department:</span>
              <div className="font-semibold text-slate-800 mt-0.5">{profile?.job?.department || '—'}</div>
            </div>
            <div>
              <span className="text-slate-400">Designation:</span>
              <div className="font-semibold text-slate-800 mt-0.5">{profile?.job?.designation || '—'}</div>
            </div>
            <div>
              <span className="text-slate-400">Employment Type:</span>
              <div className="font-semibold text-slate-800 mt-0.5 capitalize">{profile?.job?.employmentType || 'Full-time'}</div>
            </div>
            <div>
              <span className="text-slate-400">Joining Date:</span>
              <div className="font-semibold text-slate-800 mt-0.5">
                {profile?.job?.joiningDate ? new Date(profile.job.joiningDate).toISOString().slice(0, 10) : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Editable Contact Fields (Section 2 Rule: Employee can edit own phone and address only) */}
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
            <Phone className="h-4 w-4 text-emerald-600" />
            Editable Personal Contact Information
          </div>

          <form onSubmit={handleSaveContact} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Phone Number">
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+92 300 0000000"
                />
              </Field>

              <Field label="Emergency Contact">
                <Input
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="Name / Relationship / Phone"
                />
              </Field>
            </div>

            <Field label="Residential Address">
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street, City, Postal Code"
              />
            </Field>

            <div className="flex justify-end pt-2">
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Saving...' : 'Update Contact Info'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
