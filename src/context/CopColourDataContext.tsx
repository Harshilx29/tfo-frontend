import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from './AuthContext';
import socket from '../lib/socket';

export interface CopColour {
  id: string;
  name: string;
  hex_code: string;
  show_in_dropdown: boolean;
  created_at: string;
}

interface CopColourDataContextValue {
  copColours: CopColour[];
  loadingCopColours: boolean;
  refreshCopColours: () => Promise<void>;
}

const CopColourDataContext = createContext<CopColourDataContextValue | null>(null);

export function CopColourDataProvider({ children }: { children: React.ReactNode }) {
  const api = useApi();
  const { profile } = useAuth();

  const [copColours, setCopColours] = useState<CopColour[]>(() => {
    try {
      const saved = localStorage.getItem('tfo_cop_colors');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [loadingCopColours, setLoadingCopColours] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    if (copColours.length > 0) {
      localStorage.setItem('tfo_cop_colors', JSON.stringify(copColours));
    } else {
      localStorage.removeItem('tfo_cop_colors');
    }
  }, [copColours]);

  const loadCopColours = useCallback(async () => {
    setLoadingCopColours(true);
    try {
      const data = await api.get<CopColour[]>('/cop-colors');
      setCopColours(data || []);
    } catch (err) {
      console.error('Failed to load cop colours:', err);
    } finally {
      setLoadingCopColours(false);
    }
  }, [api]);

  // Initial load
  useEffect(() => {
    if (profile && profile.status === 'approved') {
      void loadCopColours();
    } else {
      setCopColours([]);
    }
  }, [profile, loadCopColours]);

  // Realtime updates listener
  useEffect(() => {
    if (!profile || profile.status !== 'approved') return;

    const onCopColourUpdate = (event: {
      eventType: 'INSERT' | 'UPDATE' | 'DELETE';
      new: any;
      old: any;
    }) => {
      const { eventType, new: newRow, old: oldRow } = event;

      setCopColours((prev) => {
        if (eventType === 'INSERT') {
          if (prev.some((c) => c.id === newRow.id)) return prev;
          const updated = [...prev, newRow as CopColour];
          return updated.sort((a, b) => a.name.localeCompare(b.name));
        } else if (eventType === 'UPDATE') {
          const idx = prev.findIndex((c) => c.id === newRow.id);
          if (idx === -1) {
            const updated = [...prev, newRow as CopColour];
            return updated.sort((a, b) => a.name.localeCompare(b.name));
          }
          const updated = [...prev];
          updated[idx] = newRow as CopColour;
          return updated.sort((a, b) => a.name.localeCompare(b.name));
        } else if (eventType === 'DELETE') {
          return prev.filter((c) => c.id !== oldRow.id);
        }
        return prev;
      });
    };

    socket.on('cop_colors_update', onCopColourUpdate);

    return () => {
      socket.off('cop_colors_update', onCopColourUpdate);
    };
  }, [profile]);

  return (
    <CopColourDataContext.Provider
      value={{
        copColours,
        loadingCopColours,
        refreshCopColours: loadCopColours,
      }}
    >
      {children}
    </CopColourDataContext.Provider>
  );
}

export function useCopColourData() {
  const context = useContext(CopColourDataContext);
  if (!context) {
    throw new Error('useCopColourData must be used within a CopColourDataProvider');
  }
  return context;
}
