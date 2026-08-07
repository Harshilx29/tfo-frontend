import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, GitBranch, Users, User, LogOut, Package, Building2, Layers, Palette, Cpu
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePermission } from '../../hooks/usePermission';
import { useTempAccess } from '../../context/TempAccessContext';

export default function Sidebar() {
  const { profile, signOut } = useAuth();
  const { isReadOnly, tempAccess, canAccessPage, setTempAccess } = useTempAccess();
  const navigate = useNavigate();

  const canViewDashboard = isReadOnly
    ? canAccessPage('dashboard')
    : (profile?.role === 'admin' || usePermission('dashboard.view'));

  const canViewTrack = isReadOnly
    ? canAccessPage('track')
    : (profile?.role === 'admin' || usePermission('track.view'));

  const canViewCompany = isReadOnly
    ? false
    : (profile?.role === 'admin' || usePermission('company.view'));

  const canViewYarn = isReadOnly
    ? false
    : (profile?.role === 'admin' || usePermission('yarn.view'));

  const canViewCopColour = isReadOnly
    ? false
    : (profile?.role === 'admin' || usePermission('cop.view'));

  const canViewMachine = isReadOnly
    ? false
    : (profile?.role === 'admin' || usePermission('machine.view'));

  const canManageUsers = isReadOnly ? false : (profile?.role === 'admin');

  const handleSignOut = async () => {
    if (isReadOnly) {
      setTempAccess(null);
      navigate('/login');
    } else {
      await signOut();
      navigate('/login');
    }
  };

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : profile?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Package size={15} />
        </div>
        <span className="sidebar-name">Track Manager</span>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <div className="nav-section">Navigation</div>

        {canViewDashboard && (
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <LayoutDashboard size={15} />
            <span className="nav-text">Dashboard</span>
          </NavLink>
        )}

        {canViewTrack && (
          <NavLink
            to="/track"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <GitBranch size={15} />
            <span className="nav-text">Track</span>
          </NavLink>
        )}

        {canViewCompany && (
          <NavLink
            to="/company"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <Building2 size={15} />
            <span className="nav-text">Company</span>
          </NavLink>
        )}

        {canViewYarn && (
          <NavLink
            to="/yarn"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <Layers size={15} />
            <span className="nav-text">Yarn</span>
          </NavLink>
        )}

        {canViewCopColour && (
          <NavLink
            to="/cop-colors"
            className={({ isActive }) => `nav-link desktop-only-nav${isActive ? ' active' : ''}`}
          >
            <Palette size={15} />
            <span className="nav-text">Cop Colours</span>
          </NavLink>
        )}

        {canViewMachine && (
          <NavLink
            to="/machines"
            className={({ isActive }) => `nav-link desktop-only-nav${isActive ? ' active' : ''}`}
          >
            <Cpu size={15} />
            <span className="nav-text">Machines</span>
          </NavLink>
        )}

        {canManageUsers && (
          <>
            <div className="nav-section" style={{ marginTop: 8 }}>Admin</div>
            <NavLink
              to="/users"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <Users size={15} />
              <span className="nav-text">Users</span>
            </NavLink>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {!isReadOnly && (
          <NavLink
            to="/profile"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <User size={15} />
            <span className="nav-text">Profile</span>
          </NavLink>
        )}

        <div className="user-tile">
          <div className="user-avatar">
            {isReadOnly ? 'G' : profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.full_name ?? ''} />
            ) : (
              initials
            )}
          </div>
          <div className="user-info" style={{ flex: 1, minWidth: 0 }}>
            <div className="user-name truncate">
              {isReadOnly ? (tempAccess?.label || 'Guest User') : (profile?.full_name ?? profile?.email ?? '—')}
            </div>
            <div className="user-role">{isReadOnly ? 'Read-only Session' : profile?.role}</div>
          </div>
          <button
            className="btn btn-ghost btn-icon btn-sm user-logout"
            onClick={handleSignOut}
            title={isReadOnly ? "Exit session" : "Sign out"}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
