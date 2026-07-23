import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from './AuthContext';
import socket from '../lib/socket';

export interface Company {
  id: string;
  name: string;
  gst_number: string | null;
  address: string | null;
  phone_number: string | null;
  show_in_dropdown: boolean;
}

interface CompanyDataContextValue {
  companies: Company[];
  loadingCompanies: boolean;
  refreshCompanies: () => Promise<void>;
}

const CompanyDataContext = createContext<CompanyDataContextValue | null>(null);

export function CompanyDataProvider({ children }: { children: React.ReactNode }) {
  const api = useApi();
  const { profile } = useAuth();

  const [companies, setCompanies] = useState<Company[]>(() => {
    try {
      const saved = localStorage.getItem('tfo_companies');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [loadingCompanies, setLoadingCompanies] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    if (companies.length > 0) {
      localStorage.setItem('tfo_companies', JSON.stringify(companies));
    } else {
      localStorage.removeItem('tfo_companies');
    }
  }, [companies]);

  const loadCompanies = useCallback(async () => {
    setLoadingCompanies(true);
    try {
      const data = await api.get<Company[]>('/companies');
      setCompanies(data || []);
    } catch (err) {
      console.error('Failed to load companies:', err);
    } finally {
      setLoadingCompanies(false);
    }
  }, [api]);

  // Initial load
  useEffect(() => {
    if (profile && profile.status === 'approved') {
      void loadCompanies();
    } else {
      setCompanies([]);
    }
  }, [profile, loadCompanies]);

  // Realtime updates listener
  useEffect(() => {
    if (!profile || profile.status !== 'approved') return;

    const onCompanyUpdate = (event: {
      eventType: 'INSERT' | 'UPDATE' | 'DELETE';
      new: any;
      old: any;
    }) => {
      const { eventType, new: newRow, old: oldRow } = event;

      setCompanies((prev) => {
        if (eventType === 'INSERT') {
          // Add if not exists
          if (prev.some((c) => c.id === newRow.id)) return prev;
          const updated = [...prev, newRow as Company];
          return updated.sort((a, b) => a.name.localeCompare(b.name));
        } else if (eventType === 'UPDATE') {
          const idx = prev.findIndex((c) => c.id === newRow.id);
          if (idx === -1) {
             const updated = [...prev, newRow as Company];
             return updated.sort((a, b) => a.name.localeCompare(b.name));
          }
          const updated = [...prev];
          updated[idx] = newRow as Company;
          return updated.sort((a, b) => a.name.localeCompare(b.name));
        } else if (eventType === 'DELETE') {
          return prev.filter((c) => c.id !== oldRow.id);
        }
        return prev;
      });
    };

    socket.on('companies_update', onCompanyUpdate);

    return () => {
      socket.off('companies_update', onCompanyUpdate);
    };
  }, [profile]);

  return (
    <CompanyDataContext.Provider
      value={{
        companies,
        loadingCompanies,
        refreshCompanies: loadCompanies,
      }}
    >
      {children}
    </CompanyDataContext.Provider>
  );
}

export function useCompanyData() {
  const context = useContext(CompanyDataContext);
  if (!context) {
    throw new Error('useCompanyData must be used within a CompanyDataProvider');
  }
  return context;
}
