import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from './AuthContext';
import socket from '../lib/socket';

export interface ActiveBatch {
  uid: string;
  tpm: number | null;
  loading_date: string | null;
  color_s: { name: string; hex_code: string | null } | null;
  color_z: { name: string; hex_code: string | null } | null;
}

export interface Machine {
  id: string;
  machine_number: number;
  max_capacity: number | null;
  vendor_name: string | null;
  vendor_phone: string | null;
  purchase_date: string | null;
  enabled: boolean;
  occupancy_status: 'free' | 'loaded';
  created_at: string;
  active_batch?: ActiveBatch | null;
}

interface MachineDataContextValue {
  machines: Machine[];
  loadingMachines: boolean;
  refreshMachines: () => Promise<void>;
}

const MachineDataContext = createContext<MachineDataContextValue | null>(null);

export function MachineDataProvider({ children }: { children: React.ReactNode }) {
  const api = useApi();
  const { profile } = useAuth();

  const [machines, setMachines] = useState<Machine[]>(() => {
    try {
      const saved = localStorage.getItem('tfo_machines');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [loadingMachines, setLoadingMachines] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    if (machines.length > 0) {
      localStorage.setItem('tfo_machines', JSON.stringify(machines));
    } else {
      localStorage.removeItem('tfo_machines');
    }
  }, [machines]);

  const loadMachines = useCallback(async () => {
    setLoadingMachines(true);
    try {
      const data = await api.get<Machine[]>('/machines');
      setMachines(data || []);
    } catch (err) {
      console.error('Failed to load machines:', err);
    } finally {
      setLoadingMachines(false);
    }
  }, [api]);

  // Initial load — requires machine.view permission (admin or explicit grant)
  useEffect(() => {
    if (profile && profile.status === 'approved') {
      void loadMachines();
    } else {
      setMachines([]);
    }
  }, [profile, loadMachines]);

  // Realtime updates listener
  useEffect(() => {
    if (!profile || profile.status !== 'approved') return;

    const onMachineUpdate = (event: {
      eventType: 'INSERT' | 'UPDATE' | 'DELETE';
      new: any;
      old: any;
    }) => {
      const { eventType, new: newRow, old: oldRow } = event;

      setMachines((prev) => {
        if (eventType === 'INSERT') {
          if (prev.some((m) => m.id === newRow.id)) return prev;
          const updated = [...prev, newRow as Machine];
          return updated.sort((a, b) => a.machine_number - b.machine_number);
        } else if (eventType === 'UPDATE') {
          const idx = prev.findIndex((m) => m.id === newRow.id);
          if (idx === -1) {
            const updated = [...prev, newRow as Machine];
            return updated.sort((a, b) => a.machine_number - b.machine_number);
          }
          const updated = [...prev];
          updated[idx] = newRow as Machine;
          return updated.sort((a, b) => a.machine_number - b.machine_number);
        } else if (eventType === 'DELETE') {
          return prev.filter((m) => m.id !== oldRow.id);
        }
        return prev;
      });
    };

    socket.on('machines_update', onMachineUpdate);
    return () => {
      socket.off('machines_update', onMachineUpdate);
    };
  }, [profile]);

  return (
    <MachineDataContext.Provider
      value={{
        machines,
        loadingMachines,
        refreshMachines: loadMachines,
      }}
    >
      {children}
    </MachineDataContext.Provider>
  );
}

export function useMachineData() {
  const context = useContext(MachineDataContext);
  if (!context) {
    throw new Error('useMachineData must be used within a MachineDataProvider');
  }
  return context;
}
