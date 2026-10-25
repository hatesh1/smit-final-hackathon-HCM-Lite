import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api, { setAccessToken } from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFirstRun, setIsFirstRun] = useState(false);

  // Check first run status & restore session
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: setupData } = await api.get('/setup/check');
        if (!cancelled && setupData.isFirstRun) {
          setIsFirstRun(true);
        }
      } catch (err) {
        // Continue
      }

      try {
        const { data } = await api.post('/auth/refresh');
        if (!cancelled) {
          setAccessToken(data.accessToken);
          setUser(data.user);
        }
      } catch {
        if (!cancelled) setAccessToken(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onForcedLogout = () => setUser(null);
    window.addEventListener('hr:logout', onForcedLogout);
    return () => window.removeEventListener('hr:logout', onForcedLogout);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const { data } = await api.post('/auth/change-password', { currentPassword, newPassword });
    setUser((prev) => (prev ? { ...prev, mustChangePassword: false } : null));
    return data;
  }, []);

  const firstRunSetup = useCallback(async (payload) => {
    const { data } = await api.post('/setup/init', payload);
    setAccessToken(data.accessToken);
    setUser(data.user);
    setIsFirstRun(false);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Session already invalid
    }
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isFirstRun,
        setIsFirstRun,
        login,
        changePassword,
        firstRunSetup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function homePathFor(user) {
  if (!user) return '/login';
  if (user.role === 'admin') return '/admin';
  if (user.role === 'hr') return '/hr';
  return '/app';
}
