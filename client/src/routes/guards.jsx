import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, homePathFor } from '../context/AuthContext';
import { Spinner } from '../components/ui';

export function ProtectedRoute() {
  const { user, loading, isFirstRun } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner />;
  if (isFirstRun) return <Navigate to="/setup" replace />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}

// Client-side convenience only - the server strictly enforces RBAC on every request.
export function RoleRoute({ role, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;

  const allowedRoles = roles || (role ? [role] : []);
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={homePathFor(user)} replace />;
  }

  return <Outlet />;
}
