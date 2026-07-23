import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from './AuthContext';
import { useTempAccess } from './TempAccessContext';
import socket from '../lib/socket';

export interface OpenBatchItem {
  uid: string;
  created_at: string;
  file_number: string | null;
  winding: {
    yarn_type: string | null;
    company: string | null;
  } | null;
}

export interface BatchData {
  main: Record<string, any> | null;
  winding: Record<string, any> | null;
  tfo: Record<string, any> | null;
  boiler: Record<string, any> | null;
  warping: Record<string, any> | null;
  machine: Record<string, any>[];
}

export type Tab = 'Winding' | 'TFO' | 'Boiler' | 'Warping' | 'Machine';

interface TrackDataContextValue {
  openBatches: OpenBatchItem[];
  batches: Record<string, BatchData>;
  activeUid: string;
  activeTab: Tab;
  loadingOpenBatches: boolean;
  loadingData: boolean;
  isDirty: boolean;
  dirtyTabs: Record<Tab, boolean>;
  selectUid: (uid: string) => Promise<void>;
  clearUid: () => void;
  setActiveTab: (tab: Tab) => void;
  setTabDirty: (tab: Tab, dirty: boolean) => void;
  refreshAll: () => Promise<void>;
  fetchBatch: (uid: string, force?: boolean) => Promise<void>;
}

const TrackDataContext = createContext<TrackDataContextValue | null>(null);

export function TrackDataProvider({ children }: { children: React.ReactNode }) {
  const api = useApi();
  const { profile } = useAuth();
  const { tempAccess } = useTempAccess();

  const [openBatches, setOpenBatches] = useState<OpenBatchItem[]>(() => {
    try {
      const saved = localStorage.getItem('tfo_open_batches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [batches, setBatches] = useState<Record<string, BatchData>>(() => {
    try {
      const saved = localStorage.getItem('tfo_batches');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [activeUid, setActiveUid] = useState<string>(() => {
    try {
      const match = window.location.pathname.match(/^\/track\/([^/]+)/);
      if (match) return decodeURIComponent(match[1]);
      return '';
    } catch {
      return '';
    }
  });
  const [activeTab, setActiveTabState] = useState<Tab>('Winding');
  const [loadingOpenBatches, setLoadingOpenBatches] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // Unsaved changes tracking (per tab)
  const [dirtyTabs, setDirtyTabs] = useState<Record<Tab, boolean>>({
    Winding: false,
    TFO: false,
    Boiler: false,
    Warping: false,
    Machine: false,
  });

  const isDirty = Object.values(dirtyTabs).some(Boolean);

  // Ref to batches to avoid re-creating fetchBatch dependency
  const batchesRef = useRef(batches);
  useEffect(() => {
    batchesRef.current = batches;
  }, [batches]);

  // Sync to localStorage
  useEffect(() => {
    if (openBatches.length > 0) {
      localStorage.setItem('tfo_open_batches', JSON.stringify(openBatches));
    } else {
      localStorage.removeItem('tfo_open_batches');
    }
  }, [openBatches]);

  useEffect(() => {
    if (Object.keys(batches).length > 0) {
      localStorage.setItem('tfo_batches', JSON.stringify(batches));
    } else {
      localStorage.removeItem('tfo_batches');
    }
  }, [batches]);

  // Load Open Batches List
  const fetchOpenBatches = useCallback(async () => {
    setLoadingOpenBatches(true);
    try {
      const data = await api.get<OpenBatchItem[]>('/track/open-batches');
      setOpenBatches(data || []);
    } catch (err) {
      console.error('Failed to load open batches:', err);
    } finally {
      setLoadingOpenBatches(false);
    }
  }, [api]);

  // Load Batch Details
  const fetchBatch = useCallback(async (batchUid: string, force = false) => {
    if (!batchUid) return;
    if (batchesRef.current[batchUid] && !force) return;

    setLoadingData(true);
    try {
      const result = await api.get<BatchData>(`/track/${encodeURIComponent(batchUid)}`);
      setBatches((prev) => ({
        ...prev,
        [batchUid]: result,
      }));
    } catch (err) {
      console.error(`Failed to load batch ${batchUid}:`, err);
      setBatches((prev) => ({
        ...prev,
        [batchUid]: { main: null, winding: null, tfo: null, boiler: null, warping: null, machine: [] },
      }));
    } finally {
      setLoadingData(false);
    }
  }, [api]);

  // Trigger manual refresh
  const refreshAll = useCallback(async () => {
    const promises: Promise<any>[] = [fetchOpenBatches()];
    if (activeUid) {
      promises.push(fetchBatch(activeUid, true));
    }
    await Promise.all(promises);
  }, [activeUid, fetchOpenBatches, fetchBatch]);

  // Select UID (interception is done in component using isDirty)
  const selectUid = useCallback(async (u: string) => {
    setActiveUid(u);
    setDirtyTabs({
      Winding: false,
      TFO: false,
      Boiler: false,
      Warping: false,
      Machine: false,
    });
    if (u) {
      await fetchBatch(u);
    }
  }, [fetchBatch]);

  const clearUid = useCallback(() => {
    setActiveUid('');
    setDirtyTabs({
      Winding: false,
      TFO: false,
      Boiler: false,
      Warping: false,
      Machine: false,
    });
  }, []);

  const setActiveTab = useCallback((tab: Tab) => {
    setActiveTabState(tab);
  }, []);

  const setTabDirty = useCallback((tab: Tab, dirty: boolean) => {
    setDirtyTabs((prev) => {
      if (prev[tab] === dirty) return prev;
      return { ...prev, [tab]: dirty };
    });
  }, []);

  // Sync socket connection params
  useEffect(() => {
    if (!profile && !tempAccess) {
      socket.disconnect();
      return;
    }

    // Set handshake auth token
    socket.auth = {
      tempToken: tempAccess?.token ?? null,
    };

    if (!socket.connected) {
      socket.connect();
    }
  }, [profile, tempAccess]);

  // Bootstrapping on auth change
  useEffect(() => {
    if (profile || tempAccess) {
      void fetchOpenBatches();
      try {
        const match = window.location.pathname.match(/^\/track\/([^/]+)/);
        if (match) {
          const initialUid = decodeURIComponent(match[1]);
          void fetchBatch(initialUid);
        }
      } catch {
        // ignore
      }
    } else {
      // Clear cache on logout
      setOpenBatches([]);
      setBatches({});
      setActiveUid('');
      setActiveTabState('Winding');
      setDirtyTabs({
        Winding: false,
        TFO: false,
        Boiler: false,
        Warping: false,
        Machine: false,
      });
      localStorage.removeItem('tfo_open_batches');
      localStorage.removeItem('tfo_batches');
    }
  }, [profile, tempAccess, fetchOpenBatches, fetchBatch]);

  // Realtime updates listener
  useEffect(() => {
    if (!profile && !tempAccess) return;

    const onRtTrackChange = (event: {
      table: string;
      eventType: 'INSERT' | 'UPDATE' | 'DELETE';
      new: any;
      old: any;
      uid: string;
    }) => {
      const { table, eventType, new: newRow, old: oldRow, uid } = event;

      // 1. Update openBatches list
      if (table === 'main') {
        if (eventType === 'INSERT') {
          const isFileEmpty = !newRow.file_number;
          if (isFileEmpty) {
            setOpenBatches((prev) => {
              if (prev.some((b) => b.uid === newRow.uid)) return prev;
              return [{
                uid: newRow.uid,
                created_at: newRow.created_at,
                file_number: newRow.file_number || null,
                winding: null
              }, ...prev];
            });
          }
        } else if (eventType === 'UPDATE') {
          const isFileEmpty = !newRow.file_number;
          if (isFileEmpty) {
            setOpenBatches((prev) => {
              const idx = prev.findIndex((b) => b.uid === newRow.uid);
              if (idx === -1) {
                return [{
                  uid: newRow.uid,
                  created_at: newRow.created_at,
                  file_number: newRow.file_number || null,
                  winding: null
                }, ...prev];
              }
              const next = [...prev];
              next[idx] = {
                ...next[idx],
                created_at: newRow.created_at,
                file_number: newRow.file_number || null,
              };
              return next;
            });
          } else {
            // Drops off list
            setOpenBatches((prev) => prev.filter((b) => b.uid !== newRow.uid));
          }
        } else if (eventType === 'DELETE') {
          setOpenBatches((prev) => prev.filter((b) => b.uid !== oldRow.uid));
        }
      } else if (table === 'winding_details') {
        if (eventType === 'INSERT' || eventType === 'UPDATE') {
          const hasWinding = newRow.yarn_type !== null && newRow.company !== null;
          setOpenBatches((prev) =>
            prev.map((b) => {
              if (b.uid === newRow.uid) {
                return {
                  ...b,
                  winding: hasWinding
                    ? { yarn_type: newRow.yarn_type, company: newRow.company }
                    : null,
                };
              }
              return b;
            })
          );
        } else if (eventType === 'DELETE') {
          setOpenBatches((prev) =>
            prev.map((b) => {
              if (b.uid === oldRow.uid) {
                return { ...b, winding: null };
              }
              return b;
            })
          );
        }
      }

      // 2. Patch batch form cache
      setBatches((prev) => {
        const cached = prev[uid];
        if (!cached) return prev; // Not in cache, don't patch it

        const updated = { ...cached };

        if (table === 'main') {
          updated.main = eventType === 'DELETE' ? null : newRow;
        } else if (table === 'winding_details') {
          updated.winding = eventType === 'DELETE' ? null : newRow;
        } else if (table === 'tfo_details') {
          updated.tfo = eventType === 'DELETE' ? null : newRow;
        } else if (table === 'boiler_details') {
          updated.boiler = eventType === 'DELETE' ? null : newRow;
        } else if (table === 'warping') {
          updated.warping = eventType === 'DELETE' ? null : newRow;
        } else if (table === 'machine_log') {
          const currentMachine = updated.machine ? [...updated.machine] : [];
          if (eventType === 'INSERT') {
            if (!currentMachine.some((m) => m.id === newRow.id)) {
              currentMachine.push(newRow);
            }
          } else if (eventType === 'UPDATE') {
            const idx = currentMachine.findIndex((m) => m.id === newRow.id);
            if (idx !== -1) {
              currentMachine[idx] = newRow;
            } else {
              currentMachine.push(newRow);
            }
          } else if (eventType === 'DELETE') {
            updated.machine = currentMachine.filter((m) => m.id !== oldRow.id);
            return { ...prev, [uid]: updated };
          }
          // Sort by sr_no ascending
          currentMachine.sort((a: any, b: any) => (a.sr_no || 0) - (b.sr_no || 0));
          updated.machine = currentMachine;
        }

        return { ...prev, [uid]: updated };
      });
    };

    const onAccessRevoked = () => {
      // Clear all cache immediately if access is revoked
      setOpenBatches([]);
      setBatches({});
      setActiveUid('');
      localStorage.removeItem('tfo_open_batches');
      localStorage.removeItem('tfo_batches');
    };

    socket.on('rt_track_change', onRtTrackChange);
    socket.on('track_access_revoked', onAccessRevoked);

    return () => {
      socket.off('rt_track_change', onRtTrackChange);
      socket.off('track_access_revoked', onAccessRevoked);
    };
  }, [profile, tempAccess]);

  // Handle warm resume data sync
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && (profile || tempAccess)) {
        void refreshAll();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [profile, tempAccess, refreshAll]);

  return (
    <TrackDataContext.Provider
      value={{
        openBatches,
        batches,
        activeUid,
        activeTab,
        loadingOpenBatches,
        loadingData,
        isDirty,
        dirtyTabs,
        selectUid,
        clearUid,
        setActiveTab,
        setTabDirty,
        refreshAll,
        fetchBatch,
      }}
    >
      {children}
    </TrackDataContext.Provider>
  );
}

export function useTrackData() {
  const ctx = useContext(TrackDataContext);
  if (!ctx) {
    throw new Error('useTrackData must be used within TrackDataProvider');
  }
  return ctx;
}
