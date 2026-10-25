import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, homePathFor } from '../../context/AuthContext';
import { Button, Input, Field, Alert } from '../../components/ui';
import { Building2, LogIn } from 'lucide-react';

export default function SignIn() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(email, password);
      const to = location.state?.from?.pathname || homePathFor(user);
      navigate(to, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-3">
          <div className="h-14 w-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-600/30">
            <Building2 className="h-8 w-8 text-white" />
          </div>
        </div>
        <h2 className="text-center text-2xl font-extrabold text-white tracking-tight">
          HCM Lite
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          AI-Assisted Human Capital Management · Secure Sign-In
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800 py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-slate-700">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && <Alert kind="error">{error}</Alert>}

            <Field label="Email Address">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
                className="bg-slate-900 border-slate-700 text-black"
              />
            </Field>

            <Field label="Password">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-slate-900 border-slate-700 text-black"
              />
            </Field>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/30"
              >
                <LogIn className="h-4 w-4" />
                <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
