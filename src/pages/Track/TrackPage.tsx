import { useState, useEffect, useRef } from 'react';
import { Search, X, QrCode, ArrowLeft } from 'lucide-react';
import { useTrackData } from '../../context/TrackDataContext';
import { useBlocker, useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { SaveButton } from '../../components/SaveButton';
import DateTimePicker from '../../components/DateTimePicker';
import QrScannerModal from '../../components/QrScannerModal';
import CompanyAutocomplete from '../../components/CompanyAutocomplete';
import YarnAutocomplete from '../../components/YarnAutocomplete';
import CopColourPicker from '../../components/CopColourPicker';


function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatDateTimeLocal(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
}

// Helper to scan batch data and jump to furthest incomplete stage
function getActiveStage(data: any): string {
  if (!data) return '1';
  
  // 1. Winding check
  const winding = data.winding;
  if (!winding || !winding.date || !winding.company || !winding.yarn_type || !winding.lot_number) {
    return '1';
  }
  
  // 2. TFO Loading check
  const tfo = data.tfo;
  if (!tfo || !tfo.loading_date || !tfo.tfo_no || !tfo.tpm || !tfo.cops || !tfo.color_s || !tfo.color_z) {
    return 'tfo_load';
  }
  
  // 3. TFO Unloading check
  if (!tfo.unloading_date) {
    return 'tfo_unload';
  }
  
  // 4. Boiler check
  const boiler = data.boiler;
  if (!boiler || !boiler.date_and_time || !boiler.cops || !boiler.temperature || !boiler.boiler_time || !boiler.name) {
    return '3';
  }
  
  // 5. Routing check
  const warping = data.warping;
  const hasWarping = warping && (warping.date || warping.warping_1 || warping.warping_2);
  
  const machine = data.machine;
  const hasMachine = machine && machine.length > 0;
  
  if (!hasWarping && !hasMachine) {
    return 'route';
  }
  
  if (hasWarping) {
    if (!warping.date || (!warping.warping_1 && !warping.warping_2)) {
      return 'warping';
    }
    return 'complete';
  }
  
  if (hasMachine) {
    return 'machine';
  }
  
  return 'route';
}

export default function TrackPage() {
  const api = useApi();
  const { addToast } = useToast();

  const {
    openBatches,
    batches,
    activeUid: uid,
    loadingOpenBatches,
    loadingData,
    selectUid,
    clearUid,
    setTabDirty,
    refreshAll,
  } = useTrackData();

  const navigate = useNavigate();
  const { uid: routeUid } = useParams();
  const urlUid = routeUid || '';

  const [search, setSearch] = useState(() => {
    if (uid) return uid;
    try {
      return sessionStorage.getItem('tfo_track_search') || '';
    } catch {
      return '';
    }
  });
  const pageBodyRef = useRef<HTMLDivElement>(null);

  // 1. URL -> Context: When urlUid changes (e.g., browser Back/Forward or direct load)
  useEffect(() => {
    if (urlUid !== uid) {
      if (urlUid) {
        void selectUid(urlUid);
      } else {
        clearUid();
      }
    }
  }, [urlUid]);

  // 2. Context -> URL: When uid changes programmatically
  useEffect(() => {
    if (uid !== urlUid) {
      if (uid) {
        navigate(`/track/${encodeURIComponent(uid)}`);
      } else {
        navigate('/track');
      }
    }
  }, [uid]);

  // QR Code Scanner State
  const [qrOpen, setQrOpen] = useState(false);
  const [activeScanField, setActiveScanField] = useState<'tfo' | 'boiler' | 'boilerOp' | 'search' | null>(null);



  // Stages: '1', 'tfo_load', 'tfo_unload', '3', 'route', 'warping', 'machine', 'complete'
  const [stage, setStage] = useState('1');
  const [destination, setDestination] = useState<'warping' | 'machine' | null>(null);

  // ── Form States ───────────────────────────────────────
  const [winDate, setWinDate]       = useState('');
  const [winCompany, setWinCompany] = useState('');
  const [winCompanyId, setWinCompanyId] = useState<string | null>(null);
  const [winMachine, setWinMachine] = useState('');
  const [winYarn, setWinYarn]       = useState('');
  const [winYarnId, setWinYarnId]   = useState<string | null>(null);
  const [winLot, setWinLot]         = useState('');
  const [isWinCompanyValid, setIsWinCompanyValid] = useState(true);
  const [isWinYarnValid, setIsWinYarnValid] = useState(true);

  const [tfoLoadTime, setTfoLoadTime] = useState('');
  const [tfoMachine, setTfoMachine]   = useState('');
  const [tfoTpm, setTfoTpm]           = useState('');
  const [tfoCops, setTfoCops]         = useState('');
  const [tfoSCol, setTfoSCol]         = useState('');
  const [tfoSColId, setTfoSColId]     = useState<string | null>(null);
  const [tfoZCol, setTfoZCol]         = useState('');
  const [tfoZColId, setTfoZColId]     = useState<string | null>(null);

  const [tfoUnloadTime, setTfoUnloadTime] = useState('');
  const [tfoLocation, setTfoLocation]     = useState('');

  const [boilerTime, setBoilerTime]   = useState('');
  const [boilerCops, setBoilerCops]   = useState('');
  const [boilerTemp, setBoilerTemp]   = useState('');
  const [boilerDur, setBoilerDur]     = useState('');
  const [boilerLoc, setBoilerLoc]     = useState('');
  const [boilerOp, setBoilerOp]       = useState('');

  const [warpDate, setWarpDate]       = useState('');
  const [warpMachine, setWarpMachine] = useState(''); // 'Warping 1' or 'Warping 2'

  const [matTime, setMatTime]         = useState('');
  const [matCompany, setMatCompany]   = useState('');
  const [matCops, setMatCops]         = useState('');
  const [matOp, setMatOp]             = useState('');

  // Bottom Sheet Allocations (Client-side view)
  const [sheetOpen, setSheetOpen]           = useState(false);
  const [sheetMach, setSheetMach]           = useState('');
  const [sheetRpm, setSheetRpm]             = useState('');
  const [sheetSpindles, setSheetSpindles]   = useState('');
  const [sheetShift, setSheetShift]         = useState('A');
  const [matrixAllocations, setMatrixAllocations] = useState<{ machineNo: string; rpm: string; spindles: string; shift: string }[]>([]);

  // Sync Search state when uid changes
  useEffect(() => {
    if (uid) {
      setSearch(uid);
    } else {
      try {
        setSearch(sessionStorage.getItem('tfo_track_search') || '');
      } catch {
        setSearch('');
      }
    }
  }, [uid]);

  // Persist search state to sessionStorage when on open batches list (!uid)
  useEffect(() => {
    if (!uid) {
      try {
        sessionStorage.setItem('tfo_track_search', search);
      } catch {
        // ignore
      }
    }
  }, [search, uid]);

  // Track scroll position when on open batches list (!uid)
  useEffect(() => {
    if (uid) return;
    const el = pageBodyRef.current;
    if (!el) return;

    const handleScroll = () => {
      try {
        sessionStorage.setItem('tfo_track_scroll', String(el.scrollTop || window.scrollY || 0));
      } catch {
        // ignore
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [uid]);

  // Restore scroll position when returning to open batches list (!uid)
  useEffect(() => {
    if (uid || loadingOpenBatches) return;
    try {
      const savedScroll = sessionStorage.getItem('tfo_track_scroll');
      if (savedScroll !== null) {
        const top = parseFloat(savedScroll);
        if (!isNaN(top) && top > 0) {
          requestAnimationFrame(() => {
            if (pageBodyRef.current) {
              pageBodyRef.current.scrollTop = top;
            }
            window.scrollTo(0, top);
          });
        }
      }
    } catch {
      // ignore
    }
  }, [uid, loadingOpenBatches]);



  const currentBatchData = uid ? batches[uid] : null;

  // Initialize Forms from loaded data
  useEffect(() => {
    if (!uid) return;

    if (!currentBatchData) {
      setWinDate(new Date().toISOString().split('T')[0]);
      setWinCompany('');
      setWinCompanyId(null);
      setWinMachine('');
      setWinYarn('');
      setWinYarnId(null);
      setWinLot('');

      setTfoLoadTime('');
      setTfoMachine('');
      setTfoTpm('');
      setTfoCops('');
      setTfoSCol('');
      setTfoSColId(null);
      setTfoZCol('');
      setTfoZColId(null);
      setTfoUnloadTime('');
      setTfoLocation('');
      setBoilerTime('');
      setBoilerCops('');
      setBoilerTemp('');
      setBoilerDur('');
      setBoilerLoc('');
      setBoilerOp('');
      setWarpDate(new Date().toISOString().split('T')[0]);
      setWarpMachine('');
      setMatTime('');
      setMatCompany('');
      setMatCops('');
      setMatOp('');
      setMatrixAllocations([]);
      setStage('1');
      return;
    }

    const w = currentBatchData.winding;
    setWinDate(w?.date ? String(w.date).split('T')[0] : new Date().toISOString().split('T')[0]);
    setWinCompany(w?.company || '');
    setWinCompanyId(w?.company_id || null);
    setWinMachine(w?.winding_number || '');
    setWinYarn(w?.yarn_type || '');
    setWinYarnId(w?.yarn_id || null);
    setWinLot(w?.lot_number || '');

    const t = currentBatchData.tfo;
    setTfoLoadTime(t?.loading_date ? formatDateTimeLocal(t.loading_date) : '');
    setTfoMachine(t?.tfo_no ? String(t.tfo_no) : '');
    setTfoTpm(t?.tpm ? String(t.tpm) : '');
    setTfoCops(t?.cops ? String(t.cops) : '');
    setTfoSCol(t?.color_s || '');
    setTfoSColId(t?.color_s_id || null);
    setTfoZCol(t?.color_z || '');
    setTfoZColId(t?.color_z_id || null);
    setTfoUnloadTime(t?.unloading_date ? formatDateTimeLocal(t.unloading_date) : '');
    setTfoLocation(t?.location || '');

    const b = currentBatchData.boiler;
    setBoilerTime(b?.date_and_time ? formatDateTimeLocal(b.date_and_time) : '');
    setBoilerCops(b?.cops ? String(b.cops) : '');
    setBoilerTemp(b?.temperature ? String(b.temperature) : '');
    setBoilerDur(b?.boiler_time || '');
    setBoilerLoc(b?.location || '');
    setBoilerOp(b?.name || '');

    const wr = currentBatchData.warping;
    setWarpDate(wr?.date ? String(wr.date).split('T')[0] : new Date().toISOString().split('T')[0]);
    setWarpMachine(wr?.warping_1 ? 'Warping 1' : wr?.warping_2 ? 'Warping 2' : '');

    const m = currentBatchData.machine;
    if (m && m.length > 0) {
      const header = m[0];
      setMatTime(header.date_and_time ? formatDateTimeLocal(header.date_and_time) : '');
      setMatCompany(header.company || '');
      setMatCops(header.cops ? String(header.cops) : '');
      setMatOp(header.name || '');
    } else {
      setMatTime('');
      setMatCompany('');
      setMatCops('');
      setMatOp('');
    }

    const detected = getActiveStage(currentBatchData);
    setStage(detected);
  }, [currentBatchData, uid]);

  // Compute Dirty state
  const isDirty = (() => {
    if (!uid) return false;
    const today = new Date().toISOString().split('T')[0];
    
    if (stage === '1') {
      const db = currentBatchData?.winding;
      const dbDate = db?.date ? String(db.date).split('T')[0] : '';
      const cleanDate = dbDate || today;
      return winDate !== cleanDate ||
             winCompany !== (db?.company ?? '') ||
             winMachine !== String(db?.winding_number ?? '') ||
             winYarn !== (db?.yarn_type ?? '') ||
             winLot !== (db?.lot_number ?? '');
    }
    if (stage === 'tfo_load') {
      const db = currentBatchData?.tfo;
      const dbTime = db?.loading_date ? formatDateTimeLocal(db.loading_date) : '';
      return tfoLoadTime !== dbTime ||
             tfoMachine !== String(db?.tfo_no ?? '') ||
             tfoTpm !== String(db?.tpm ?? '') ||
             tfoCops !== String(db?.cops ?? '') ||
             tfoSCol !== (db?.color_s ?? '') ||
             tfoZCol !== (db?.color_z ?? '');
    }
    if (stage === 'tfo_unload') {
      const db = currentBatchData?.tfo;
      const dbTime = db?.unloading_date ? formatDateTimeLocal(db.unloading_date) : '';
      return tfoUnloadTime !== dbTime ||
             tfoLocation !== (db?.location ?? '');
    }
    if (stage === '3') {
      const db = currentBatchData?.boiler;
      const dbTime = db?.date_and_time ? formatDateTimeLocal(db.date_and_time) : '';
      return boilerTime !== dbTime ||
             boilerCops !== String(db?.cops ?? '') ||
             boilerTemp !== String(db?.temperature ?? '') ||
             boilerDur !== String(db?.boiler_time ?? '') ||
             boilerLoc !== (db?.location ?? '') ||
             boilerOp !== (db?.name ?? '');
    }
    if (stage === 'warping') {
      const db = currentBatchData?.warping;
      const dbDate = db?.date ? String(db.date).split('T')[0] : '';
      const cleanDate = dbDate || today;
      const dbMachine = db?.warping_1 ? 'Warping 1' : db?.warping_2 ? 'Warping 2' : '';
      return warpDate !== cleanDate || warpMachine !== dbMachine;
    }
    if (stage === 'machine') {
      const db = currentBatchData?.machine?.[0];
      const dbTime = db?.date_and_time ? formatDateTimeLocal(db.date_and_time) : '';
      return matTime !== dbTime ||
             matCompany !== (db?.company ?? '') ||
             matCops !== String(db?.cops ?? '') ||
             matOp !== (db?.name ?? '');
    }
    return false;
  })();

  // Sync dirty flag with TrackDataContext for blockers
  useEffect(() => {
    setTabDirty('Winding', isDirty);
  }, [isDirty, setTabDirty]);

  // Block router transition if dirty
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      const confirm = window.confirm('You have unsaved changes. Leave without saving?');
      if (confirm) {
        setTabDirty('Winding', false);
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker, setTabDirty]);

  // Warn on browser close/reload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Leave without saving?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);



  const handleSelectUid = (u: string) => {
    if (isDirty) {
      const confirm = window.confirm('You have unsaved changes. Leave without saving?');
      if (!confirm) return;
    }
    setTabDirty('Winding', false);
    selectUid(u);
    setSearch(u);
  };

  const handleClearUid = () => {
    if (isDirty) {
      const confirm = window.confirm('You have unsaved changes. Leave without saving?');
      if (!confirm) return;
    }
    setTabDirty('Winding', false);
    clearUid();
    const restoredSearch = sessionStorage.getItem('tfo_track_search') || '';
    setSearch(restoredSearch);
    setStage('1');
  };

  // Submit Winding details
  const submitWinding = async () => {
    if (!winDate || !winCompany || !winMachine || !winYarn || !winLot.trim()) {
      addToast('Fill every field before submitting', 'error');
      throw new Error('Incomplete Winding details');
    }
    if (!isWinCompanyValid) {
      addToast('No matching company found — please select from the list or add it in the Company page', 'error');
      throw new Error('Invalid company');
    }
    if (!isWinYarnValid) {
      addToast('No matching yarn found — please select from the list or add it in the Yarn page', 'error');
      throw new Error('Invalid yarn');
    }
    await api.put(`/track/${encodeURIComponent(uid)}/winding`, {
      date: winDate,
      company: winCompany,
      company_id: winCompanyId,
      winding_number: winMachine,
      yarn_type: winYarn,
      yarn_id: winYarnId,
      lot_number: winLot.trim()
    });
    addToast('Winding data locked', 'success');
    await refreshAll();
  };

  // Submit TFO Loading Details
  const submitTFOLoading = async () => {
    if (!tfoLoadTime || !tfoMachine || !tfoTpm || !tfoCops || !tfoSCol || !tfoZCol) {
      addToast('Fill all loading fields', 'error');
      throw new Error('Incomplete loading details');
    }
    await api.put(`/track/${uid}/tfo`, {
      loading_date: tfoLoadTime || null,
      tfo_no: parseInt(tfoMachine, 10),
      tpm: parseInt(tfoTpm, 10),
      cops: parseInt(tfoCops, 10),
      color_s: tfoSCol,
      color_s_id: tfoSColId,
      color_z: tfoZCol,
      color_z_id: tfoZColId,
    });
    addToast('TFO Loading parameters locked', 'success');
    await refreshAll();
  };

  // Submit TFO Unloading Details
  const submitTFOUnloading = async () => {
    if (!tfoUnloadTime) {
      addToast('Fill unloading date/time', 'error');
      throw new Error('Incomplete unloading details');
    }
    await api.put(`/track/${uid}/tfo`, {
      loading_date: currentBatchData?.tfo?.loading_date || null,
      tfo_no: currentBatchData?.tfo?.tfo_no || null,
      tpm: currentBatchData?.tfo?.tpm || null,
      cops: currentBatchData?.tfo?.cops || null,
      color_s: currentBatchData?.tfo?.color_s || null,
      color_z: currentBatchData?.tfo?.color_z || null,
      unloading_date: tfoUnloadTime || null,
      location: tfoLocation.trim() || null
    });
    addToast('TFO Unloading parameters locked', 'success');
    await refreshAll();
  };

  // Submit Boiler details
  const submitBoiler = async () => {
    if (!boilerTime || !boilerCops || !boilerTemp || !boilerDur || !boilerOp) {
      addToast('Fill every required field before submitting', 'error');
      throw new Error('Incomplete boiler details');
    }
    await api.put(`/track/${uid}/boiler`, {
      date_and_time: boilerTime || null,
      cops: parseInt(boilerCops, 10),
      temperature: parseInt(boilerTemp, 10),
      boiler_time: boilerDur,
      location: boilerLoc || null,
      name: boilerOp
    });
    addToast('Boiler data locked', 'success');
    await refreshAll();
  };

  // Submit Warping details
  const submitWarping = async () => {
    if (!warpDate || !warpMachine) {
      addToast('Fill every field', 'error');
      throw new Error('Incomplete warping details');
    }
    await api.put(`/track/${uid}/warping`, {
      date: warpDate || null,
      warping_1: warpMachine === 'Warping 1',
      warping_2: warpMachine === 'Warping 2'
    });
    addToast('Batch complete', 'success');
    await refreshAll();
  };

  // Submit Machine Matrix details
  const submitMachineMatrix = async () => {
    if (!matTime || !matCompany || !matCops || !matOp) {
      addToast('Fill in all run parameters first', 'error');
      throw new Error('Incomplete matrix details');
    }
    await api.put(`/track/${uid}/machine`, {
      rows: [
        {
          sr_no: 1,
          date_and_time: matTime || null,
          company: matCompany,
          cops: parseInt(matCops, 10),
          name: matOp
        }
      ]
    });
    addToast('Batch complete', 'success');
    await refreshAll();
  };

  function getStageProgressIndex(s: string): number {
    if (s === '1') return 1;
    if (s === 'tfo_load' || s === 'tfo_unload') return 2;
    if (s === '3') return 3;
    if (s === 'route') return 4;
    if (s === 'warping' || s === 'machine' || s === 'complete') return 5;
    return 1;
  }

  const activeProgressIndex = getStageProgressIndex(stage);

  const getStageHeaderLabel = () => {
    if (stage === '1') return 'Stage 1 / Winding';
    if (stage === 'tfo_load') return 'Stage 2 / TFO Loading';
    if (stage === 'tfo_unload') return 'Stage 2 / TFO Unloading';
    if (stage === '3') return 'Stage 3 / Boiler';
    if (stage === 'route') return 'Routing';
    if (stage === 'warping') return 'Stage 4 / Warping';
    if (stage === 'machine') return 'Stage 5 / Machine Matrix';
    if (stage === 'complete') return 'Batch Complete';
    return '';
  };

  const filteredBatches = openBatches.filter(b => b.uid.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {uid && (
            <button
              onClick={handleClearUid}
              className="btn btn-ghost btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 8px', marginRight: 4 }}
              title="Back to open batches"
            >
              <ArrowLeft size={14} style={{ marginRight: 6 }} />
              Back
            </button>
          )}
          <h1 className="page-title">Track</h1>
        </div>
      </div>

      <div className={`page-body${uid ? ' page-body--flush' : ''}`} ref={pageBodyRef}>
        <div className="track-layout">
          {/* Left Column: Flow & Forms */}
          <div style={{ minWidth: 0, width: '100%', display: uid ? 'flex' : 'block', flex: uid ? '1' : undefined, minHeight: uid ? 0 : undefined }}>
            {!uid ? (
              <div className="track-dashboard">
                <div className="search-section">
                  <div className="search-row">
                    <div className="search-wrap search-wrap--grow">
                      <Search size={16} className="search-icon" />
                      <input
                        className="search-input"
                        placeholder="Search or enter a UID…"
                        value={search}
                        autoComplete="off"
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && search.trim()) handleSelectUid(search.trim());
                        }}
                      />
                      {search.trim() && (
                        <button 
                          className="search-clear-btn" 
                          type="button" 
                          onClick={() => setSearch('')}
                          title="Clear search"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      className="search-qr-btn"
                      title="Scan Batch QR Code"
                      onClick={() => { setActiveScanField('search'); setQrOpen(true); }}
                    >
                      <QrCode size={18} />
                    </button>
                  </div>
                </div>

                <div className="open-batches-section">
                  <h2 className="section-title">Open Batches</h2>

                  {loadingOpenBatches && openBatches.length === 0 ? (
                    <div className="loading-state">
                      <span className="spinner" />
                      <p>Loading open batches...</p>
                    </div>
                  ) : openBatches.length === 0 ? (
                    <div className="empty-state">
                      <Search size={40} />
                      <div className="empty-title">No open batches found</div>
                      <div className="empty-desc">
                        All batches currently have a file number assigned, or none exist yet.
                      </div>
                    </div>
                  ) : filteredBatches.length === 0 ? (
                    <div className="empty-state">
                      <Search size={40} />
                      <div className="empty-title">No matches found</div>
                      <div className="empty-desc">
                        No open batches match "{search}".
                      </div>
                    </div>
                  ) : (
                    <div className="open-batches-grid">
                      {filteredBatches.map((item) => {
                        const windingCompany = item.winding?.company || '—';
                        const windingYarn = item.winding?.yarn_type || '—';
                        return (
                          <div
                            key={item.uid}
                            className="open-batch-card"
                            onClick={() => handleSelectUid(item.uid)}
                          >
                            <div className="open-batch-header">
                              <span className="open-batch-uid">{item.uid}</span>
                              <span className="open-batch-date">{formatDate(item.created_at)}</span>
                            </div>
                            <div className="open-batch-details">
                              <div className="detail-row">
                                <span className="detail-label">Company</span>
                                <span className="detail-value">{windingCompany}</span>
                              </div>
                              <div className="detail-row">
                                <span className="detail-label">Yarn Type</span>
                                <span className="detail-value">{windingYarn}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="batch-routing-view">
                {/* ── PC Left Rail (Info + Stage Progress) ── */}
                <div className="rail">
                  <div className="rail-eyebrow">Active Batch</div>
                  <h1>{uid}</h1>
                  <div className="rail-meta">
                    {currentBatchData?.winding?.company && (
                      <>{currentBatchData.winding.company}<br /></>
                    )}
                    {currentBatchData?.winding?.yarn_type && (
                      <>{currentBatchData.winding.yarn_type}<br /></>
                    )}
                    {currentBatchData?.winding?.date && (
                      <>{formatDate(currentBatchData.winding.date)}<br /></>
                    )}
                  </div>

                  <div className="rail-divider" />
                  <div className="rail-label">Stage Progress</div>

                  <div className="rail-steps">
                    {[
                      { key: '1', label: 'Stage 1', desc: 'Winding intake' },
                      { key: 'tfo_load', label: 'Stage 2', desc: 'TFO Loading' },
                      { key: 'tfo_unload', label: 'Stage 2b', desc: 'TFO Unloading' },
                      { key: '3', label: 'Stage 3', desc: 'Boiler' },
                      { key: 'route', label: 'Routing', desc: 'Next station' },
                      { key: 'warping', label: 'Stage 4', desc: 'Warping' },
                      { key: 'machine', label: 'Stage 5', desc: 'Machine Matrix' },
                    ].map(({ key, label, desc }) => {
                      const stageOrder = ['1', 'tfo_load', 'tfo_unload', '3', 'route', 'warping', 'machine', 'complete'];
                      const currentIdx = stageOrder.indexOf(stage);
                      const stepIdx = stageOrder.indexOf(key);
                      let cls = '';
                      if (stage === 'complete' || stepIdx < currentIdx) cls = 'done';
                      else if (key === stage) cls = 'active';
                      return (
                        <div key={key} className={`rail-step ${cls}`}>
                          <b>{label}</b>
                          {desc}
                        </div>
                      );
                    })}
                  </div>

                  <button className="rail-close-btn" onClick={handleClearUid}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                    Close Batch
                  </button>
                </div>

                {/* ── Main content panel ── */}
                <div className="app-container">
                  <div className="topbar">
                    <div className="topbar-row">
                      <span className="batch-chip">{uid}</span>
                      <span className="stage-tag">{getStageHeaderLabel()}</span>
                    </div>
                    <div className="progress-dots">
                      {[1, 2, 3, 4, 5].map((n) => {
                        let cName = '';
                        if (n < activeProgressIndex) cName = 'past';
                        else if (n === activeProgressIndex) cName = 'on';
                        return <i key={n} className={cName} />;
                      })}
                    </div>
                  </div>

                  <div className="app-body">
                    <div className="app-body-inner">
                    {loadingData && !currentBatchData ? (
                      <div className="flex-center" style={{ paddingTop: 48 }}>
                        <span className="spinner" />
                      </div>
                    ) : (
                      <>
                        {/* ── STAGE 1: WINDING ── */}
                        {stage === '1' && (
                          <div>
                            <h2 className="section-title">Winding intake</h2>
                            <p className="section-sub">Enter winding details — date, company, machine, yarn type, and lot.</p>

                            <div className="field">
                              <label>Date</label>
                              <div className="date-field-wrapper">
                                <input type="date" value={winDate} onChange={(e) => setWinDate(e.target.value)} />
                              </div>
                            </div>

                            <div className="field">
                              <label>Company Name</label>
                              <CompanyAutocomplete 
                                value={winCompany} 
                                onChange={(name, id) => {
                                  setWinCompany(name);
                                  setWinCompanyId(id);
                                }}
                                onValidationChange={setIsWinCompanyValid}
                              />
                            </div>

                            <div className="field">
                              <label>Winding Machine</label>
                              <select value={winMachine} onChange={(e) => setWinMachine(e.target.value)}>
                                <option value="">Select machine</option>
                                <option value="1">Machine 1</option>
                                <option value="2">Machine 2</option>
                                <option value="3">Machine 3</option>
                                <option value="4">Machine 4</option>
                              </select>
                            </div>

                            <div className="field">
                              <label>Yarn Type</label>
                              <YarnAutocomplete 
                                value={winYarn} 
                                onChange={(name, id) => {
                                  setWinYarn(name);
                                  setWinYarnId(id);
                                }}
                                onValidationChange={setIsWinYarnValid}
                              />
                            </div>

                            <div className="field">
                              <label>Lot Number</label>
                              <input type="text" placeholder="e.g. LOT-2231" value={winLot} onChange={(e) => setWinLot(e.target.value)} />
                            </div>

                            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', width: '100%' }}>
                              <SaveButton
                                onSave={submitWinding}
                                label="Submit → send to TFO Loading"
                                permissionKey="track.winding.save"
                                className="btn btn-primary"
                                disabled={!winDate || !winCompany.trim() || !winMachine || !winYarn.trim() || !winLot.trim() || !isWinCompanyValid || !isWinYarnValid}
                              />
                            </div>
                          </div>
                        )}

                        {/* ── STAGE 2a: TFO LOADING ── */}
                        {stage === 'tfo_load' && (
                          <div>
                            {currentBatchData?.winding && (
                              <div className="locked-card">
                                <div className="lh">
                                  <b>Winding · Locked</b>
                                  <svg className="lock-icon" viewBox="0 0 24 24" fill="none" stroke="#5c8f6c" strokeWidth="2">
                                    <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
                                  </svg>
                                </div>
                                <div className="locked-grid">
                                  <div className="locked-field"><span>Date</span><b>{formatDate(winDate)}</b></div>
                                  <div className="locked-field"><span>Company</span><b>{winCompany}</b></div>
                                  <div className="locked-field"><span>Machine</span><b>Winding {winMachine}</b></div>
                                  <div className="locked-field"><span>Yarn Type</span><b>{winYarn}</b></div>
                                  <div className="locked-field"><span>Lot</span><b>{winLot}</b></div>
                                </div>
                              </div>
                            )}

                            <h2 className="section-title">TFO — Loading</h2>
                            <p className="section-sub">Record when cops are loaded onto the TFO machine.</p>

                            <div className="tfo-section">
                              <div className="tfo-section-title">Loading Details</div>
                              
                              <div className="field">
                                <label>Load Date & Time</label>
                                <DateTimePicker
                                  value={tfoLoadTime}
                                  onChange={setTfoLoadTime}
                                  label="From"
                                />
                              </div>

                              <div className="field">
                                <label>TFO Machine Number</label>
                                <input type="number" placeholder="e.g. 3" value={tfoMachine} onChange={(e) => setTfoMachine(e.target.value)} />
                              </div>

                              <div className="field">
                                <label>TPM (Twists Per Minute)</label>
                                <input type="number" placeholder="e.g. 820" value={tfoTpm} onChange={(e) => setTfoTpm(e.target.value)} />
                              </div>

                              <div className="field">
                                <label>Total Cops</label>
                                <input type="number" placeholder="e.g. 240" value={tfoCops} onChange={(e) => setTfoCops(e.target.value)} />
                              </div>

                              <div className="field" style={{ marginBottom: 0 }}>
                                <label>S-Twist Cops — Colour Used</label>
                                <CopColourPicker
                                  value={tfoSCol}
                                  valueId={tfoSColId}
                                  onChange={(opt) => {
                                    setTfoSCol(opt ? opt.name : '');
                                    setTfoSColId(opt ? opt.id : null);
                                  }}
                                  placeholder="Select S-Twist cop colour..."
                                />
                              </div>
                            </div>

                            <div className="tfo-section">
                              <div className="tfo-section-title">Z-Twist Cops — Colour Used</div>
                              <div className="field" style={{ marginBottom: 0 }}>
                                <CopColourPicker
                                  value={tfoZCol}
                                  valueId={tfoZColId}
                                  onChange={(opt) => {
                                    setTfoZCol(opt ? opt.name : '');
                                    setTfoZColId(opt ? opt.id : null);
                                  }}
                                  placeholder="Select Z-Twist cop colour..."
                                />
                              </div>
                            </div>

                            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', width: '100%' }}>
                              <SaveButton
                                onSave={submitTFOLoading}
                                label="Save Loading → Proceed to Unloading"
                                permissionKey="track.tfo.save"
                                className="btn btn-primary"
                                disabled={!tfoLoadTime || !tfoMachine || !tfoTpm || !tfoCops || !tfoSCol.trim() || !tfoZCol.trim()}
                              />
                            </div>
                          </div>
                        )}

                        {/* ── STAGE 2b: TFO UNLOADING ── */}
                        {stage === 'tfo_unload' && (
                          <div>
                            {currentBatchData?.winding && (
                              <div className="locked-card">
                                <div className="lh">
                                  <b>Winding · Locked</b>
                                  <svg className="lock-icon" viewBox="0 0 24 24" fill="none" stroke="#5c8f6c" strokeWidth="2">
                                    <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
                                  </svg>
                                </div>
                                <div className="locked-grid">
                                  <div className="locked-field"><span>Date</span><b>{formatDate(winDate)}</b></div>
                                  <div className="locked-field"><span>Company</span><b>{winCompany}</b></div>
                                  <div className="locked-field"><span>Machine</span><b>Winding {winMachine}</b></div>
                                </div>
                              </div>
                            )}
                            {currentBatchData?.tfo && (
                              <div className="locked-card">
                                <div className="lh">
                                  <b>TFO Loading · Locked</b>
                                  <svg className="lock-icon" viewBox="0 0 24 24" fill="none" stroke="#5c8f6c" strokeWidth="2">
                                    <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
                                  </svg>
                                </div>
                                <div className="locked-grid">
                                  <div className="locked-field"><span>Load Time</span><b>{tfoLoadTime.replace('T', ' ')}</b></div>
                                  <div className="locked-field"><span>Machine</span><b>TFO {tfoMachine}</b></div>
                                  <div className="locked-field"><span>TPM</span><b>{tfoTpm}</b></div>
                                  <div className="locked-field"><span>Total Cops</span><b>{tfoCops}</b></div>
                                </div>
                              </div>
                            )}

                            <h2 className="section-title">TFO — Unloading</h2>
                            <p className="section-sub">Record when cops are unloaded from the TFO machine.</p>

                            <div className="tfo-section">
                              <div className="tfo-section-title">Unloading Details</div>
                              
                              <div className="field">
                                <label>Unload Date & Time</label>
                                <DateTimePicker
                                  value={tfoUnloadTime}
                                  onChange={setTfoUnloadTime}
                                  label="To"
                                  startDateVal={tfoLoadTime}
                                />
                              </div>

                              <div className="field" style={{ marginBottom: 0 }}>
                                <label>Location</label>
                                <div className="location-input-wrapper">
                                  <input type="text" placeholder="e.g. 01-06-34" value={tfoLocation} onChange={(e) => setTfoLocation(e.target.value)} />
                                  <button type="button" className="location-scan-btn" title="Scan QR Code" onClick={() => { setActiveScanField('tfo'); setQrOpen(true); }}>
                                    <QrCode size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', width: '100%' }}>
                              <SaveButton
                                onSave={submitTFOUnloading}
                                label="Submit Unloading → send to Boiler"
                                permissionKey="track.tfo.save"
                                className="btn btn-primary"
                                disabled={!tfoUnloadTime}
                              />
                            </div>
                          </div>
                        )}

                        {/* ── STAGE 3: BOILER ── */}
                        {stage === '3' && (
                          <div>
                            {currentBatchData?.winding && (
                              <div className="locked-card">
                                <div className="lh">
                                  <b>Winding · Locked</b>
                                  <svg className="lock-icon" viewBox="0 0 24 24" fill="none" stroke="#5c8f6c" strokeWidth="2">
                                    <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
                                  </svg>
                                </div>
                                <div className="locked-grid">
                                  <div className="locked-field"><span>Lot</span><b>{winLot}</b></div>
                                  <div className="locked-field"><span>Company</span><b>{winCompany}</b></div>
                                </div>
                              </div>
                            )}
                            {currentBatchData?.tfo && (
                              <div className="locked-card">
                                <div className="lh">
                                  <b>TFO Unloading · Locked</b>
                                  <svg className="lock-icon" viewBox="0 0 24 24" fill="none" stroke="#5c8f6c" strokeWidth="2">
                                    <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
                                  </svg>
                                </div>
                                <div className="locked-grid">
                                  <div className="locked-field"><span>Unload Time</span><b>{tfoUnloadTime.replace('T', ' ')}</b></div>
                                  <div className="locked-field"><span>Location</span><b>{tfoLocation}</b></div>
                                </div>
                              </div>
                            )}

                            <h2 className="section-title">Boiler details</h2>
                            <p className="section-sub">Log the boiler start, cops count, temperature, duration, location, and operator name.</p>

                            <div className="field">
                              <label>Start Date & Time</label>
                              <div className="date-field-wrapper">
                                <input type="datetime-local" value={boilerTime} onChange={(e) => setBoilerTime(e.target.value)} />
                              </div>
                            </div>

                            <div className="field">
                              <label>Cops</label>
                              <input type="number" placeholder="e.g. 240" value={boilerCops} onChange={(e) => setBoilerCops(e.target.value)} />
                            </div>

                            <div className="field-row">
                              <div className="field">
                                <label>Temperature (°C)</label>
                                <input type="number" placeholder="e.g. 98" value={boilerTemp} onChange={(e) => setBoilerTemp(e.target.value)} />
                              </div>
                              <div className="field">
                                <label>Duration (min)</label>
                                <input type="number" placeholder="e.g. 50" value={boilerDur} onChange={(e) => setBoilerDur(e.target.value)} />
                              </div>
                            </div>

                             <div className="field">
                               <label>Location</label>
                               <div className="location-input-wrapper">
                                 <input type="text" placeholder="e.g. 01-06-34" value={boilerLoc} onChange={(e) => setBoilerLoc(e.target.value)} />
                                 <button type="button" className="location-scan-btn" title="Scan QR Code" onClick={() => { setActiveScanField('boiler'); setQrOpen(true); }}>
                                   <QrCode size={16} />
                                 </button>
                               </div>
                             </div>

                            <div className="field">
                              <label>Operator Name</label>
                              <div className="location-input-wrapper">
                                <input type="text" placeholder="e.g. Ramesh Patel" value={boilerOp} onChange={(e) => setBoilerOp(e.target.value)} />
                                <button type="button" className="location-scan-btn" title="Scan QR Code" onClick={() => { setActiveScanField('boilerOp'); setQrOpen(true); }}>
                                  <QrCode size={16} />
                                </button>
                              </div>
                            </div>

                            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', width: '100%' }}>
                              <SaveButton
                                onSave={submitBoiler}
                                label="Submit → routing"
                                permissionKey="track.boiler.save"
                                className="btn btn-primary"
                                disabled={!boilerTime || !boilerCops || !boilerTemp || !boilerDur || !boilerOp.trim()}
                              />
                            </div>
                          </div>
                        )}

                        {/* ── STAGE: ROUTING DECISION ── */}
                        {stage === 'route' && (
                          <div>
                            {currentBatchData?.boiler && (
                              <div className="locked-card">
                                <div className="lh">
                                  <b>Boiler · Locked</b>
                                  <svg className="lock-icon" viewBox="0 0 24 24" fill="none" stroke="#5c8f6c" strokeWidth="2">
                                    <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
                                  </svg>
                                </div>
                                <div className="locked-grid">
                                  <div className="locked-field"><span>Start</span><b>{boilerTime.replace('T', ' ')}</b></div>
                                  <div className="locked-field"><span>Cops</span><b>{boilerCops}</b></div>
                                  <div className="locked-field"><span>Temp</span><b>{boilerTemp}°C</b></div>
                                  <div className="locked-field"><span>Duration</span><b>{boilerDur} min</b></div>
                                </div>
                              </div>
                            )}

                            <h2 className="section-title">Where does this batch go?</h2>
                            <p className="section-sub">Choose the next station.</p>

                            <div className="route-card" onClick={() => { setDestination('warping'); setStage('warping'); }}>
                              <div className="route-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.6"><path d="M4 6h16M4 12h16M4 18h10" /></svg>
                              </div>
                              <div>
                                <div className="route-title">Warping Section</div>
                                <div className="route-sub">Date and warping machine selection.</div>
                              </div>
                              <div className="route-arrow">›</div>
                            </div>

                            <div className="route-card" onClick={() => { setDestination('machine'); setStage('machine'); }}>
                              <div className="route-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.6"><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /></svg>
                              </div>
                              <div>
                                <div className="route-title">Machine Matrix</div>
                                <div className="route-sub">Allocate batch parameters.</div>
                              </div>
                              <div className="route-arrow">›</div>
                            </div>
                          </div>
                        )}

                        {/* ── STAGE 4a: WARPING ── */}
                        {stage === 'warping' && (
                          <div>
                            <div className="locked-card">
                              <div className="lh">
                                <b>Batch Chain · Locked</b>
                                <svg className="lock-icon" viewBox="0 0 24 24" fill="none" stroke="#5c8f6c" strokeWidth="2">
                                  <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
                                </svg>
                              </div>
                              <div className="locked-grid">
                                <div className="locked-field"><span>Lot</span><b>{winLot}</b></div>
                                <div className="locked-field"><span>Company</span><b>{winCompany}</b></div>
                                <div className="locked-field"><span>Yarn</span><b>{winYarn}</b></div>
                                <div className="locked-field"><span>Destination</span><b>Warping</b></div>
                              </div>
                            </div>

                            <h2 className="section-title">Warping details</h2>
                            <p className="section-sub">Select date and warping machine to close out this batch.</p>

                            <div className="field">
                              <label>Date</label>
                              <div className="date-field-wrapper">
                                <input type="date" value={warpDate} onChange={(e) => setWarpDate(e.target.value)} />
                              </div>
                            </div>

                            <div className="field">
                              <label>Warping Machine</label>
                              <select value={warpMachine} onChange={(e) => setWarpMachine(e.target.value)}>
                                <option value="">Select warping machine</option>
                                <option value="Warping 1">Warping 1</option>
                                <option value="Warping 2">Warping 2</option>
                              </select>
                            </div>

                            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', width: '100%' }}>
                              <SaveButton
                                onSave={submitWarping}
                                label="Complete batch"
                                permissionKey="track.warping.save"
                                className="btn btn-primary"
                                disabled={!warpDate || !warpMachine}
                              />
                            </div>
                          </div>
                        )}

                        {/* ── STAGE 4b/5: MACHINE MATRIX ── */}
                        {stage === 'machine' && (
                          <div>
                            <div className="locked-card">
                              <div className="lh">
                                <b>Batch Chain · Locked</b>
                                <svg className="lock-icon" viewBox="0 0 24 24" fill="none" stroke="#5c8f6c" strokeWidth="2">
                                  <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
                                </svg>
                              </div>
                              <div className="locked-grid">
                                <div className="locked-field"><span>Lot</span><b>{winLot}</b></div>
                                <div className="locked-field"><span>Company</span><b>{winCompany}</b></div>
                                <div className="locked-field"><span>Yarn</span><b>{winYarn}</b></div>
                                <div className="locked-field"><span>Destination</span><b>Machine Matrix</b></div>
                              </div>
                            </div>

                            <h2 className="section-title">Machine Matrix Details</h2>
                            <p className="section-sub">Specify the overall run settings and load requirements.</p>

                            <div className="field">
                              <label>Date & Time</label>
                              <div className="date-field-wrapper">
                                <input type="datetime-local" value={matTime} onChange={(e) => setMatTime(e.target.value)} />
                              </div>
                            </div>

                            <div className="field">
                              <label>Company</label>
                              <select value={matCompany} onChange={(e) => setMatCompany(e.target.value)}>
                                <option value="">Select company</option>
                                <option value="Apple-1">Apple-1</option>
                                <option value="Apple-2">Apple-2</option>
                                <option value="Apple-3">Apple-3</option>
                              </select>
                            </div>

                            <div className="field-row">
                              <div className="field">
                                <label>Total Cops</label>
                                <input type="number" placeholder="e.g. 240" value={matCops} onChange={(e) => setMatCops(e.target.value)} />
                              </div>
                              <div className="field">
                                <label>Operator Name</label>
                                <select value={matOp} onChange={(e) => setMatOp(e.target.value)}>
                                  <option value="">Select operator</option>
                                  <option value="B0CFC3D7-F0D0-44F0-B9FD-B80D2083111A">Vikki kumar</option>
                                  <option value="BD11677D-342B-4CF3-861D-825B4FB81F26">Subhash Kumar</option>
                                  <option value="6AE0CF3D-C748-4014-A0DC-10F0164901E2">Praphula nayak</option>
                                </select>
                              </div>
                            </div>

                            <div className="divider" />

                            <h2 className="section-title">Machine Allocations</h2>
                            <p className="section-sub">Insert individual matrix rows — up to 10 per batch.</p>

                            <div id="matrixRows">
                              {matrixAllocations.length === 0 ? (
                                <div className="matrix-empty">No machine rows yet. Add the first one below.</div>
                              ) : (
                                matrixAllocations.map((r, i) => (
                                  <div className="matrix-row" key={i}>
                                    <div className="matrix-idx">{i + 1}</div>
                                    <div className="matrix-info">
                                      <b>Machine {r.machineNo}</b> · {r.rpm} RPM
                                      <span>Spindles: {r.spindles} · Shift: {r.shift}</span>
                                    </div>
                                    <div
                                      className="matrix-del"
                                      onClick={() => {
                                        setMatrixAllocations((prev) => prev.filter((_, idx) => idx !== i));
                                      }}
                                    >
                                      ×
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>

                            {matrixAllocations.length < 10 ? (
                              <button className="add-row-btn" onClick={() => setSheetOpen(true)}>
                                + Add Machine Row ({matrixAllocations.length}/10)
                              </button>
                            ) : (
                              <p className="section-sub" style={{ textAlign: 'center' }}>Matrix full — 10 of 10 rows added.</p>
                            )}

                            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', width: '100%' }}>
                              <SaveButton
                                onSave={submitMachineMatrix}
                                label="Complete batch"
                                permissionKey="track.machine.save"
                                className="btn btn-primary"
                                disabled={!matTime || !matCompany || !matCops || !matOp.trim()}
                              />
                            </div>
                          </div>
                        )}

                        {/* ── STAGE: COMPLETE ── */}
                        {stage === 'complete' && (
                          <div className="final-check">
                            <div className="final-ring">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5c8f6c" strokeWidth="2.4"><path d="M20 6L9 17l-5-5" /></svg>
                            </div>
                            <h2 className="section-title">Batch complete</h2>
                            <p className="section-sub">Lot {winLot} has cleared all stations.</p>
                            <button className="btn btn-ghost" onClick={handleClearUid} style={{ marginTop: 8 }}>
                              Start a new batch
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                  {/* Allocations Bottom Sheet */}
                  <div className={`sheet-overlay${sheetOpen ? ' open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setSheetOpen(false); }}>
                    <div className="bottom-sheet">
                      <div className="sheet-handle" />
                      <div className="sheet-title">Add Machine Row {matrixAllocations.length + 1}</div>
                      <div className="sheet-sub">Quick entry — row {matrixAllocations.length + 1} of up to 10.</div>

                      <div className="field-row">
                        <div className="field">
                          <label>Machine No.</label>
                          <input type="text" placeholder="e.g. M-07" value={sheetMach} onChange={(e) => setSheetMach(e.target.value)} />
                        </div>
                        <div className="field">
                          <label>RPM</label>
                          <input type="number" placeholder="e.g. 12000" value={sheetRpm} onChange={(e) => setSheetRpm(e.target.value)} />
                        </div>
                      </div>
                      <div className="field-row">
                        <div className="field">
                          <label>Spindles</label>
                          <input type="number" placeholder="e.g. 240" value={sheetSpindles} onChange={(e) => setSheetSpindles(e.target.value)} />
                        </div>
                        <div className="field">
                          <label>Shift</label>
                          <select value={sheetShift} onChange={(e) => setSheetShift(e.target.value)}>
                            <option value="A">A · Morning</option>
                            <option value="B">B · Evening</option>
                            <option value="C">C · Night</option>
                          </select>
                        </div>
                      </div>

                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          if (!sheetMach || !sheetRpm || !sheetSpindles) {
                            addToast('Fill every field', 'error');
                            return;
                          }
                          setMatrixAllocations((prev) => [
                            ...prev,
                            { machineNo: sheetMach, rpm: sheetRpm, spindles: sheetSpindles, shift: sheetShift }
                          ]);
                          setSheetMach('');
                          setSheetRpm('');
                          setSheetSpindles('');
                          setSheetShift('A');
                          setSheetOpen(false);
                          addToast(`Row ${matrixAllocations.length + 1} inserted`, 'success');
                        }}
                      >
                        Insert Row {matrixAllocations.length + 1}
                      </button>
                      <button className="btn btn-ghost" onClick={() => setSheetOpen(false)} style={{ marginTop: 8 }}>Cancel</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>


        </div>
      </div>
      <QrScannerModal
        isOpen={qrOpen}
        onClose={() => { setQrOpen(false); setActiveScanField(null); }}
        title={
          activeScanField === 'search' ? "Scan Batch QR" : 
          activeScanField === 'boilerOp' ? "Scan Operator QR" : "Scan Location QR"
        }
        validationRegex={
          activeScanField === 'search' ? /^TFO=\d{2}-\d+$/i : 
          activeScanField === 'boilerOp' ? /.*/ : /^\d+-\d+-\d+$/
        }
        validationErrorMessage={
          activeScanField === 'search'
            ? 'Invalid QR format. Expected TFO=YY-Number (e.g. TFO=26-33)'
            : activeScanField === 'boilerOp'
              ? 'Invalid Operator QR.'
              : 'Invalid location format. Expected ##-##-## (e.g. 01-06-34)'
        }
        hintText={
          activeScanField === 'search'
            ? 'Scan a batch QR code starting with "TFO=" (e.g. TFO=26-33)'
            : activeScanField === 'boilerOp'
              ? 'Scan operator badge'
              : 'Format: Building - Floor - Location\ne.g., 01-02-14'
        }
        onScanSuccess={(scannedText) => {
          if (activeScanField === 'tfo') {
            setTfoLocation(scannedText);
          } else if (activeScanField === 'boiler') {
            setBoilerLoc(scannedText);
          } else if (activeScanField === 'boilerOp') {
            setBoilerOp(scannedText);
          } else if (activeScanField === 'search') {
            const text = scannedText.trim();
            const match = text.match(/^TFO=(\d{2}-\d+)$/i);
            if (match) {
              const code = match[1];
              setSearch(''); // Empty search bar first
              setTimeout(() => {
                setSearch(code);
                handleSelectUid(code);
              }, 50);
            }
          }
          setQrOpen(false);
          setActiveScanField(null);
        }}
      />
    </>
  );
}
