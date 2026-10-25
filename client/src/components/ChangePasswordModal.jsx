import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Field, Alert } from './ui';
import { KeyRound, ShieldCheck } from 'lucide-react';

export default function ChangePasswordModal({ isOpen, onClose, mandatory = false }) {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              {mandatory ? 'Temporary Password Update Required' : 'Change Password'}
            </h3>
            <p className="text-xs text-slate-500">
              {mandatory
                ? 'Your account was created with a temporary password. You must set a new secure password to proceed.'
                : 'Update your account login password'}
            </p>
          </div>
        </div>

        {error && <Alert kind="error" className="mb-4">{error}</Alert>}
        {success && <Alert kind="success" className="mb-4">Password updated successfully!</Alert>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!mandatory && (
            <Field label="Current Password">
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </Field>
          )}

          <Field label="New Password">
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
            />
          </Field>

          <Field label="Confirm New Password">
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-type new password"
              required
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            {!mandatory && (
              <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
            )}
            <Button type="submit" variant="primary" disabled={loading} className="w-full sm:w-auto">
              {loading ? 'Updating...' : 'Set New Password'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
