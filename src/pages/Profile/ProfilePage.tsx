import { useAuth } from '../../context/AuthContext';

export default function ProfilePage() {
  const { profile, signOut } = useAuth();

  if (!profile) return null;

  const initials = profile.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : profile.email[0]?.toUpperCase() ?? '?';

  const statusColors: Record<string, string> = {
    approved:  'badge-success',
    pending:   'badge-warning',
    suspended: 'badge-danger',
    rejected:  'badge-danger',
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Profile</h1>
      </div>

      <div className="page-body" style={{ maxWidth: 560 }}>
        {/* Avatar + name hero */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div className="profile-avatar">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name ?? ''} />
              ) : (
                initials
              )}
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em' }}>
                {profile.full_name ?? '—'}
              </div>
              <div className="text-muted text-sm" style={{ marginTop: 3 }}>
                {profile.email}
              </div>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="card">
          <div className="card-header">
            <h2>Account Details</h2>
            <span className="text-xs text-subtle">Read-only</span>
          </div>
          <div className="card-body">
            <div className="profile-field">
              <div className="profile-field-key">Full Name</div>
              <div className="profile-field-val">{profile.full_name ?? '—'}</div>
            </div>
            <div className="profile-field">
              <div className="profile-field-key">Email</div>
              <div className="profile-field-val">{profile.email}</div>
            </div>
            <div className="profile-field">
              <div className="profile-field-key">Role</div>
              <div className="profile-field-val">
                <span className={`badge ${profile.role === 'admin' ? 'badge-info' : 'badge-neutral'}`}>
                  {profile.role}
                </span>
              </div>
            </div>
            <div className="profile-field">
              <div className="profile-field-key">Status</div>
              <div className="profile-field-val">
                <span className={`badge ${statusColors[profile.status] ?? 'badge-neutral'}`}>
                  <span className="badge-dot" />
                  {profile.status}
                </span>
              </div>
            </div>
            <div className="profile-field">
              <div className="profile-field-key">Member Since</div>
              <div className="profile-field-val">
                {new Date(profile.created_at).toLocaleDateString(undefined, {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </div>
            </div>
            {profile.approved_at && (
              <div className="profile-field">
                <div className="profile-field-key">Approved On</div>
                <div className="profile-field-val">
                  {new Date(profile.approved_at).toLocaleDateString(undefined, {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <button className="btn btn-danger btn-lg w-full" onClick={signOut}>
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
}
