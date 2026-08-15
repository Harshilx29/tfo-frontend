import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, FileText, History } from 'lucide-react';
import { useMachineData, Machine } from '../../context/MachineDataContext';

// ── Helpers ───────────────────────────────────────────────────────────────────
function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function formatCompactDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  } catch {
    return dateStr;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function TFOStatusPage() {
  const navigate = useNavigate();
  const { machines, loadingMachines } = useMachineData();

  const [filter, setFilter] = useState<'All' | 'Running' | 'Idle'>('All');
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Sticky Header Hysteresis Scroll ──────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const y = el.scrollTop;
          setIsScrolled((prev) => {
            if (!prev && y > 150) return true;
            if (prev && y < 20) return false;
            return prev;
          });
          ticking = false;
        });
        ticking = true;
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  // ── Lock container/body scroll when drawer open ──────────────────────────────
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.overflowY = selectedMachine ? 'hidden' : 'auto';
    }
    document.body.style.overflow = selectedMachine ? 'hidden' : '';
    return () => {
      if (containerRef.current) containerRef.current.style.overflowY = 'auto';
      document.body.style.overflow = '';
    };
  }, [selectedMachine]);

  // ── Stats calculation ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = machines.length;
    const running = machines.filter((m) => m.occupancy_status === 'loaded').length;
    const idle = total - running;
    const runningPct = total === 0 ? 0 : Math.round((running / total) * 100);
    return { total, running, idle, runningPct };
  }, [machines]);

  // ── Filtering and sorting ───────────────────────────────────────────────────
  const filteredAndSortedMachines = useMemo(() => {
    let result = [...machines];
    if (filter === 'Running') {
      result = result.filter((m) => m.occupancy_status === 'loaded');
    } else if (filter === 'Idle') {
      result = result.filter((m) => m.occupancy_status === 'free');
    }
    result.sort((a, b) => a.machine_number - b.machine_number);
    return result;
  }, [machines, filter]);

  return (
    <div ref={containerRef} className="tfo-status-root">
      {/* ── Sticky Header ──────────────────────────────────────────────────────── */}
      <header className={`tfo-status-header${isScrolled ? ' scrolled' : ''}`}>
        <div className="tfo-status-header-inner">
          {/* Top row: Title, mini stats & filter buttons */}
          <div className="tfo-status-toprow">
            <div className="tfo-status-title-wrap">
              <h1 className="tfo-status-title">TFO Monitor</h1>

              {/* Mini stats (appear on scroll) */}
              <div className={`tfo-status-mini-stats${isScrolled ? ' visible' : ''}`}>
                <div className="w-divider" />
                <span className="tfo-mini-dot running" />
                <span className="tfo-mini-count running">{stats.running}</span>
                <span className="tfo-mini-dot idle" />
                <span className="tfo-mini-count idle">{stats.idle}</span>
              </div>
            </div>

            {/* Filter buttons */}
            <div className="tfo-status-filters">
              {(['All', 'Running', 'Idle'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`tfo-filter-btn${filter === f ? ' active' : ''}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Collapsible big-stats */}
          <div
            className="tfo-status-bigstats-wrap"
            style={{
              gridTemplateRows: isScrolled ? '0fr' : '1fr',
              opacity: isScrolled ? 0 : 1,
              transform: isScrolled ? 'translateY(-10px)' : 'translateY(0px)',
            }}
          >
            <div className="tfo-status-bigstats-overflow">
              <div className="tfo-status-bigstats">
                <div className="tfo-bigstat-item">
                  <span className="tfo-bigstat-label">Total M/C</span>
                  <span className="tfo-bigstat-value">{stats.total}</span>
                </div>
                <div className="tfo-bigstat-divider" />
                <div className="tfo-bigstat-item">
                  <span className="tfo-bigstat-label">
                    <span className="tfo-mini-dot running" style={{ marginRight: '6px' }} />
                    Running
                  </span>
                  <span className="tfo-bigstat-value running">{stats.running}</span>
                </div>
                <div className="tfo-bigstat-divider" />
                <div className="tfo-bigstat-item">
                  <span className="tfo-bigstat-label">
                    <span className="tfo-mini-dot idle" style={{ marginRight: '6px' }} />
                    Idle
                  </span>
                  <span className="tfo-bigstat-value idle">{stats.idle}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="tfo-progress-track">
            <div className="tfo-progress-bar" style={{ width: `${stats.runningPct}%` }} />
          </div>
        </div>
      </header>

      {/* ── Machine Grid ──────────────────────────────────────────────────── */}
      <main className="tfo-status-grid">
        {loadingMachines ? (
          <div className="tfo-status-empty">Loading machines…</div>
        ) : filteredAndSortedMachines.length === 0 ? (
          <div className="tfo-status-empty">No machines found.</div>
        ) : (
          filteredAndSortedMachines.map((machine) => {
            const isRunning = machine.occupancy_status === 'loaded';
            const activeBatch = machine.active_batch;
            const uidDisplay = activeBatch?.uid ? (activeBatch.uid.length > 8 ? `${activeBatch.uid.substring(0, 8)}…` : activeBatch.uid) : '—';
            const loadingDateDisplay = formatCompactDate(activeBatch?.loading_date);

            return (
              <div
                key={machine.id}
                className={`tfo-machine-card${isRunning ? ' running' : ' idle'}`}
                onClick={() => setSelectedMachine(machine)}
              >
                {/* Top: number + status dot */}
                <div className="tfo-card-top">
                  <div>
                    <div className={`tfo-card-num${isRunning ? ' running' : ' idle'}`}>
                      {pad2(machine.machine_number)}
                    </div>
                    <div className="tfo-card-sub" style={{ fontFamily: 'monospace', marginTop: '4px' }}>
                      {isRunning ? uidDisplay : '—'}
                    </div>
                  </div>
                  <span className={`tfo-status-dot${isRunning ? ' running' : ' idle'}`} />
                </div>

                {/* S/Z Twist Color Badges */}
                {isRunning && activeBatch && (activeBatch.color_s || activeBatch.color_z) ? (
                  <div style={{ display: 'flex', gap: '4px', margin: '4px 0 8px' }}>
                    {activeBatch.color_s && (
                      <span
                        title={`S-Twist: ${activeBatch.color_s.name}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '15px',
                          height: '15px',
                          borderRadius: '3px',
                          fontSize: '9px',
                          fontWeight: 900,
                          color: '#ffffff',
                          backgroundColor: activeBatch.color_s.hex_code ? `${activeBatch.color_s.hex_code}33` : 'rgba(234, 179, 8, 0.25)',
                          border: `1px solid ${activeBatch.color_s.hex_code || '#eab308'}`,
                          boxShadow: activeBatch.color_s.hex_code ? `0 0 4px ${activeBatch.color_s.hex_code}66` : undefined,
                        }}
                      >
                        S
                      </span>
                    )}
                    {activeBatch.color_z && (
                      <span
                        title={`Z-Twist: ${activeBatch.color_z.name}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '15px',
                          height: '15px',
                          borderRadius: '3px',
                          fontSize: '9px',
                          fontWeight: 900,
                          color: '#ffffff',
                          backgroundColor: activeBatch.color_z.hex_code ? `${activeBatch.color_z.hex_code}33` : 'rgba(37, 99, 235, 0.25)',
                          border: `1px solid ${activeBatch.color_z.hex_code || '#2563eb'}`,
                          boxShadow: activeBatch.color_z.hex_code ? `0 0 4px ${activeBatch.color_z.hex_code}66` : undefined,
                        }}
                      >
                        Z
                      </span>
                    )}
                  </div>
                ) : null}

                {/* Bottom data row */}
                <div className="tfo-card-bottom">
                  <div className={`tfo-card-vendor${isRunning ? '' : ' muted'}`}>
                    {machine.vendor_name || '—'}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '9px', color: '#52525b' }}>
                    <span>{activeBatch?.tpm ? `${activeBatch.tpm} TPM` : '-'}</span>
                    <span>{loadingDateDisplay || '-'}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* ── Drawer Overlay & Sheet ────────────────────────────────────────── */}
      <div
        className={`tfo-drawer-overlay${selectedMachine ? ' open' : ''}`}
        onClick={() => setSelectedMachine(null)}
      />
      <div className={`tfo-drawer-sheet${selectedMachine ? ' open' : ''}`}>
        {selectedMachine && (
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <span className="tfo-bigstat-label" style={{ marginBottom: '4px' }}>
                  <span className={`tfo-mini-dot ${selectedMachine.occupancy_status === 'loaded' ? 'running' : 'idle'}`} style={{ marginRight: '6px' }} />
                  Machine Status
                </span>
                <h2 style={{ fontSize: '28px', fontWeight: 300, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                  Machine {pad2(selectedMachine.machine_number)}
                  <span style={{ fontSize: '13px', fontFamily: 'monospace', color: '#71717a' }}>
                    {selectedMachine.active_batch?.uid ? `UID: ${selectedMachine.active_batch.uid}` : `Vendor: ${selectedMachine.vendor_name || '—'}`}
                  </span>
                </h2>
              </div>
              <button
                onClick={() => setSelectedMachine(null)}
                style={{
                  background: '#16161a',
                  border: '1px solid #27272a',
                  color: '#a1a1aa',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                onClick={() => {
                  if (selectedMachine.active_batch?.uid) {
                    navigate(`/track/${selectedMachine.active_batch.uid}`);
                  } else {
                    navigate('/track');
                  }
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  padding: '24px 16px',
                  borderRadius: '12px',
                  background: '#111116',
                  border: '1px solid #27272a',
                  color: '#f4f4f5',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <FileText size={28} color="#30d158" />
                <span>Current Batch Details</span>
              </button>
              <button
                onClick={() => navigate('/batch-log')}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  padding: '24px 16px',
                  borderRadius: '12px',
                  background: '#111116',
                  border: '1px solid #27272a',
                  color: '#a1a1aa',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <History size={28} color="#71717a" />
                <span>Preview Batch List</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
