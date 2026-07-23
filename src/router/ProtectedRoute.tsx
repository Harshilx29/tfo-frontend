import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTempAccess } from '../context/TempAccessContext';

interface Props {
  children: React.ReactNode;
}

/**
 * ProtectedRoute — guards the main app shell.
 *
 * Passes through if:
 *  - Profile is loaded and approved/admin, OR
 *  - The session is a valid temp-link session (isReadOnly=true)
 *
 * Redirects:
 *  - No profile → /login
 *  - Pending  → /pending
 *  - Suspended/Rejected → /login
 */
export default function ProtectedRoute({ children }: Props) {
  const { profile, loading } = useAuth();
  const { isReadOnly, tempAccess, canAccessPage } = useTempAccess();
  const location = useLocation();

  // Temp link sessions bypass normal auth but are locked to allowed_pages
  if (isReadOnly) {
    const pageName = location.pathname.split('/')[1] || ''; // handles subpaths correctly
    if (pageName && !canAccessPage(pageName)) {
      const fallback = tempAccess?.allowed_pages?.[0] || 'login';
      return <Navigate to={`/${fallback}`} replace />;
    }
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="spinner" />
        Loading…
      </div>
    );
  }

  if (!profile) return <Navigate to="/login" replace />;

  if (profile.status === 'pending') return <Navigate to="/pending" replace />;

  if (profile.status === 'suspended' || profile.status === 'rejected') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
