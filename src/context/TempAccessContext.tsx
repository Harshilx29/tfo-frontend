import React, { createContext, useContext, useState } from 'react';

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
  const [tempAccess, setTempAccess] = useState<TempAccess | null>(null);

  const canAccessPage = (page: string) =>
    tempAccess?.allowed_pages.includes(page) ?? false;

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
