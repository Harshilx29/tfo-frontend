import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from './AuthContext';
import socket from '../lib/socket';

export interface Yarn {
  id: string;
  denier: number;
  filament: number;
  colour: string;
  type: string;
  whole_name: string;
  show_in_dropdown: boolean;
}

interface YarnDataContextValue {
  yarns: Yarn[];
  loadingYarns: boolean;
  refreshYarns: () => Promise<void>;
}

const YarnDataContext = createContext<YarnDataContextValue | null>(null);

export function YarnDataProvider({ children }: { children: React.ReactNode }) {
  const api = useApi();
  const { profile } = useAuth();

  const [yarns, setYarns] = useState<Yarn[]>(() => {
    try {
      const saved = localStorage.getItem('tfo_yarns');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [loadingYarns, setLoadingYarns] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    if (yarns.length > 0) {
      localStorage.setItem('tfo_yarns', JSON.stringify(yarns));
    } else {
      localStorage.removeItem('tfo_yarns');
    }
  }, [yarns]);

  const loadYarns = useCallback(async () => {
    setLoadingYarns(true);
    try {
      const data = await api.get<Yarn[]>('/yarns');
      setYarns(data || []);
    } catch (err) {
      console.error('Failed to load yarns:', err);
    } finally {
      setLoadingYarns(false);
    }
  }, [api]);

  // Initial load
  useEffect(() => {
    if (profile && profile.status === 'approved') {
      void loadYarns();
    } else {
      setYarns([]);
    }
  }, [profile, loadYarns]);

  // Realtime updates listener
  useEffect(() => {
    if (!profile || profile.status !== 'approved') return;

    const onYarnUpdate = (event: {
      eventType: 'INSERT' | 'UPDATE' | 'DELETE';
      new: any;
      old: any;
    }) => {
      const { eventType, new: newRow, old: oldRow } = event;

      setYarns((prev) => {
        if (eventType === 'INSERT') {
          if (prev.some((y) => y.id === newRow.id)) return prev;
          const updated = [...prev, newRow as Yarn];
          return updated.sort((a, b) => (a.whole_name || '').localeCompare(b.whole_name || ''));
        } else if (eventType === 'UPDATE') {
          const idx = prev.findIndex((y) => y.id === newRow.id);
          if (idx === -1) {
            const updated = [...prev, newRow as Yarn];
            return updated.sort((a, b) => (a.whole_name || '').localeCompare(b.whole_name || ''));
          }
          const updated = [...prev];
          updated[idx] = newRow as Yarn;
          return updated.sort((a, b) => (a.whole_name || '').localeCompare(b.whole_name || ''));
        } else if (eventType === 'DELETE') {
          return prev.filter((y) => y.id !== oldRow.id);
        }
        return prev;
      });
    };

    socket.on('yarns_update', onYarnUpdate);

    return () => {
      socket.off('yarns_update', onYarnUpdate);
    };
  }, [profile]);

  return (
    <YarnDataContext.Provider
      value={{
        yarns,
        loadingYarns,
        refreshYarns: loadYarns,
      }}
    >
      {children}
    </YarnDataContext.Provider>
  );
}

export function useYarnData() {
  const context = useContext(YarnDataContext);
  if (!context) {
    throw new Error('useYarnData must be used within a YarnDataProvider');
  }
  return context;
}
