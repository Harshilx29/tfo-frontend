import React, {
  createContext, useContext, useState, useEffect, useCallback,
} from 'react';
import { createApiClient } from '../lib/api';
import socket from '../lib/socket';
import { useTempAccess } from './TempAccessContext';

const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3001';

// ── Types ───────────────────────────────────────────────
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  status: 'pending' | 'approved' | 'suspended' | 'rejected';
  role: 'admin' | 'user';
  created_at: string;
  approved_at: string | null;
}

interface AuthContextValue {
  profile: Profile | null;
  permissions: Set<string>;
  loading: boolean;
  signInWithGoogle: () => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// ── Context ─────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

const api = createApiClient(); // no token — cookie is automatic

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile,     setProfile]  = useState<Profile | null>(null);
  const [permissions, setPerms]    = useState<Set<string>>(new Set());
  const [loading,     setLoading]  = useState(true);

  // ── Load profile from backend ──────────────────────────
  const refreshProfile = useCallback(async () => {
    try {
      const data = await api.get<Profile & { permissions: string[] }>('/auth/me');
      setProfile(data);
      setPerms(new Set(data.permissions ?? []));
    } catch {
      setProfile(null);
      setPerms(new Set());
    }
  }, []);

  // ── Bootstrap on mount ─────────────────────────────────
  useEffect(() => {
    refreshProfile().finally(() => setLoading(false));

    // Handle warm resume
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshProfile();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refreshProfile]);

  const { tempAccess } = useTempAccess();

  // ── Socket.IO connection management ───────────────────
  // Connect socket after profile is loaded, disconnect on sign-out or session end.
  useEffect(() => {
    if (!profile && !tempAccess) {
      socket.disconnect();
      return;
    }

    socket.auth = {
      tempToken: tempAccess?.token ?? null,
    };

    if (!socket.connected) {
      socket.connect();
    }

    if (!profile) return;

    socket.on('profile_update', (data: { profile: Profile }) => {
      setProfile(data.profile);
      if (data.profile.status === 'approved') {
        void refreshProfile();
      } else {
        setPerms(new Set());
      }
    });

    socket.on('permissions_update', () => {
      void refreshProfile();
    });

    return () => {
      socket.off('profile_update');
      socket.off('permissions_update');
    };
  }, [profile?.id, tempAccess?.token, refreshProfile]); // re-run only when the profile ID changes

  // ── Actions ────────────────────────────────────────────

  const signInWithGoogle = () => {
    // Full-page redirect to backend — backend handles OAuth and sets cookies
    window.location.href = `${API_URL}/auth/google`;
  };

  const signOut = async () => {
    try {
      await api.delete('/auth/logout');
    } catch {
      // Non-fatal — clear local state regardless
    }
    setProfile(null);
    setPerms(new Set());
    socket.disconnect();
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{ profile, permissions, loading, signInWithGoogle, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
