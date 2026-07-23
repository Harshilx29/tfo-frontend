import { Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import socket from '../lib/socket';

export default function PendingPage() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  // Socket.io: listen for live profile approval — no page reload needed
  useEffect(() => {
    if (!profile) return;

    // Connect the socket so we receive real-time events while on this page
    if (!socket.connected) {
      socket.connect();
    }

    function onProfileUpdate(data: { profile: { status: string } }) {
      if (data.profile.status === 'approved') {
        navigate('/', { replace: true });
      }
    }

    socket.on('profile_update', onProfileUpdate);

    return () => {
      socket.off('profile_update', onProfileUpdate);
    };
  }, [profile, navigate]);

  // Also react to profile changes already fetched by AuthContext
  useEffect(() => {
    if (profile?.status === 'approved') {
      navigate('/', { replace: true });
    }
  }, [profile?.status, navigate]);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="pending-icon">
          <Clock size={26} />
        </div>

        <h1 className="auth-title">Waiting for Approval</h1>
        <p className="auth-subtitle">
          Your account has been created and is pending review by an admin.
          You will be automatically redirected once access is granted —
          no need to sign out and back in.
        </p>

        <div
          style={{
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '12px 16px',
            marginBottom: 20, textAlign: 'left',
          }}
        >
          <div className="text-xs text-subtle" style={{ marginBottom: 4 }}>Signed in as</div>
          <div className="font-medium" style={{ fontSize: 13.5 }}>{profile?.email}</div>
        </div>

        <button className="btn btn-secondary w-full" onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    </div>
  );
}
