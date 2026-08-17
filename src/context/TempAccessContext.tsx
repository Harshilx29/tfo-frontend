import React, { createContext, useContext, useState, useEffect } from 'react';
import socket from '../lib/socket';

export interface TempAccess {
  token: string;
  allowed_pages: string[];
  label: string | null;
  expires_at: string;
}

interface TempAccessContextValue {
  tempAccess: TempAccess | null;
  setTempAccess: (a: TempAccess | null) => void;
  /** True when the current session is a read-only temp-link session */
  isReadOnly: boolean;
  /** Whether this temp user is allowed on a given page name */
  canAccessPage: (page: string) => boolean;
}

const TempAccessContext = createContext<TempAccessContextValue | null>(null);

export function TempAccessProvider({ children }: { children: React.ReactNode }) {
  const [tempAccess, setTempAccessState] = useState<TempAccess | null>(() => {
    try {
      const saved = sessionStorage.getItem('tm_temp_access');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const setTempAccess = (a: TempAccess | null) => {
    setTempAccessState(a);
    if (a) {
      sessionStorage.setItem('tm_temp_access', JSON.stringify(a));
      socket.auth.tempToken = a.token;
      if (!socket.connected) {
        socket.connect();
      }
    } else {
      sessionStorage.removeItem('tm_temp_access');
      socket.auth.tempToken = null;
    }
  };

  useEffect(() => {
    if (tempAccess?.token) {
      socket.auth.tempToken = tempAccess.token;
      if (!socket.connected) {
        socket.connect();
      }
    }
  }, [tempAccess]);

  const canAccessPage = (page: string) => {
    if (!tempAccess) return false;
    const pages = tempAccess.allowed_pages || [];
    if (pages.includes(page)) return true;
    // Map alias routes (e.g. tfo_status / tfo-status)
    if (page === 'tfo_status' || page === 'tfo-status') {
      return pages.includes('tfo_status') || pages.includes('track') || pages.includes('dashboard');
    }
    if (page === 'batch_log' || page === 'batch-log') {
      return pages.includes('batch_log') || pages.includes('track') || pages.includes('dashboard');
    }
    return false;
  };

  return (
    <TempAccessContext.Provider
      value={{ tempAccess, setTempAccess, isReadOnly: tempAccess !== null, canAccessPage }}
    >
      {children}
    </TempAccessContext.Provider>
  );
}

export function useTempAccess() {
  const ctx = useContext(TempAccessContext);
  if (!ctx) throw new Error('useTempAccess must be used within TempAccessProvider');
  return ctx;
}
