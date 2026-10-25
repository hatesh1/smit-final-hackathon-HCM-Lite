import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Field, Input, Select, Button, Alert, Card, apiError } from '../../components/ui';

export default function SignUp() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ employeeId: '', email: '', password: '', role: 'employee' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register(form);
      navigate('/login', {
        state: { notice: 'Account created - check your email for the verification link.' },
      });
    } catch (err) {
      setError(apiError(err, 'Registration failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <h1 className="mb-1 text-xl font-semibold">Create your account</h1>
        <p className="mb-4 text-sm text-slate-500">
          Password needs 8+ characters with upper case, lower case and a number.
        </p>
        <div className="space-y-3">
          <Alert>{error}</Alert>
          <form onSubmit={onSubmit} className="space-y-3">
            <Field label="Employee ID">
              <Input required placeholder="EMP123" value={form.employeeId} onChange={set('employeeId')} />
            </Field>
            <Field label="Email">
              <Input type="email" required autoComplete="email" value={form.email} onChange={set('email')} />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                required
                autoComplete="new-password"
                value={form.password}
                onChange={set('password')}
              />
            </Field>
            <Field label="Role">
              <Select value={form.role} onChange={set('role')}>
                <option value="employee">Employee</option>
                <option value="admin">HR / Admin</option>
              </Select>
            </Field>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? 'Creating…' : 'Sign up'}
            </Button>
          </form>
          <p className="text-center text-sm text-slate-500">
            Already registered?{' '}
            <Link to="/login" className="font-medium text-indigo-600 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
