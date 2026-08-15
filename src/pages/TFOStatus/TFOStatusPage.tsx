import { useState, useMemo, useEffect, useRef } from 'react';
import { X, FileText, History } from 'lucide-react';
import { useMachineData, Machine } from '../../context/MachineDataContext';

// ── Helpers ───────────────────────────────────────────────────────────────────
function pad2(n: number) {
  return String(n).padStart(2, '0');
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function TFOStatusPage() {
  const { machines, loadingMachines } = useMachineData();

  const [filter, setFilter] = useState<'All' | 'Running' | 'Idle'>('All');
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Sticky header scroll effect (hysteresis to avoid jitter) ─────────────
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

  // ── Lock container/body scroll when drawer open ──────────────────────────
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

  // ── Derived stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const enabled = machines.filter((m) => m.enabled);
    const running = enabled.filter((m) => m.occupancy_status === 'loaded').length;
    const idle    = enabled.filter((m) => m.occupancy_status === 'free').length;
    const total   = enabled.length;
    return { total, running, idle, runningPct: total === 0 ? 0 : Math.round((running / total) * 100) };
  }, [machines]);

  // ── Filtered + sorted list ────────────────────────────────────────────────
  const visible = useMemo(() => {
    let list = machines.filter((m) => m.enabled);
    if (filter === 'Running') list = list.filter((m) => m.occupancy_status === 'loaded');
    if (filter === 'Idle')    list = list.filter((m) => m.occupancy_status === 'free');
    return [...list].sort((a, b) => a.machine_number - b.machine_number);
  }, [machines, filter]);

  const isRunning = (m: Machine) => m.occupancy_status === 'loaded';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="tfo-status-root" ref={containerRef}>

      {/* ── Sticky Header ────────────────────────────────────────────────── */}
      <header className={`tfo-status-header${isScrolled ? ' scrolled' : ''}`}>
        <div className="tfo-status-header-inner">

          {/* Top row */}
          <div className="tfo-status-toprow">

            {/* Title + mini stats on scroll */}
            <div className="tfo-status-title-wrap">
              <h1 className="tfo-status-title">TFO Monitor</h1>
              <div className={`tfo-status-mini-stats${isScrolled ? ' visible' : ''}`}>
                <div className="w-divider" />
                <span className="tfo-mini-dot running" />
                <span className="tfo-mini-count running">{stats.running}</span>
                <span className="tfo-mini-dot idle" />
                <span className="tfo-mini-count idle">{stats.idle}</span>
              </div>
            </div>

            {/* Filter pills */}
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

          {/* Collapsible big-stats row */}
          <div
            className="tfo-status-bigstats-wrap"
            style={{
              gridTemplateRows: isScrolled ? '0fr' : '1fr',
              opacity: isScrolled ? 0 : 1,
              transform: isScrolled ? 'translateY(-10px)' : 'translateY(0)',
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
                    <span className="tfo-mini-dot running" style={{ marginRight: 6 }} />
                    Running
                  </span>
                  <span className="tfo-bigstat-value running">{stats.running}</span>
                </div>
                <div className="tfo-bigstat-divider" />
                <div className="tfo-bigstat-item">
                  <span className="tfo-bigstat-label">
                    <span className="tfo-mini-dot idle" style={{ marginRight: 6 }} />
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
        ) : visible.length === 0 ? (
          <div className="tfo-status-empty">No machines found.</div>
        ) : (
          visible.map((machine) => {
            const running = isRunning(machine);
            return (
              <div
                key={machine.id}
                className={`tfo-machine-card${running ? ' running' : ' idle'}`}
                onClick={() => setSelectedMachine(machine)}
              >
                {/* Top: number + status dot */}
                <div className="tfo-card-top">
                  <div>
                    <div className={`tfo-card-num${running ? ' running' : ' idle'}`}>
                      {pad2(machine.machine_number)}
                    </div>
                    <div className="tfo-card-sub">
                      {machine.active_batch?.tpm ? `${machine.active_batch.tpm} TPM` : (machine.max_capacity != null ? `Cap: ${machine.max_capacity}` : '—')}
                    </div>
                  </div>
                  <span className={`tfo-status-dot${running ? ' running' : ' idle'}`} />
                </div>

                {/* S/Z Twist Color Chips */}
                {running && machine.active_batch && (machine.active_batch.color_s || machine.active_batch.color_z) && (
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', margin: '4px 0 8px' }}>
                    {machine.active_batch.color_s && (
                      <span
                        title={`S-Twist: ${machine.active_batch.color_s.name}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '9px',
                          fontWeight: 600,
                          padding: '1px 5px',
                          borderRadius: '4px',
                          background: '#16161c',
                          border: '1px solid #262630',
                          color: '#d4d4d8',
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: machine.active_batch.color_s.hex_code || '#a1a1aa',
                            boxShadow: machine.active_batch.color_s.hex_code ? `0 0 4px ${machine.active_batch.color_s.hex_code}` : undefined,
                          }}
                        />
                        S
                      </span>
                    )}
                    {machine.active_batch.color_z && (
                      <span
                        title={`Z-Twist: ${machine.active_batch.color_z.name}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '9px',
                          fontWeight: 600,
                          padding: '1px 5px',
                          borderRadius: '4px',
                          background: '#16161c',
                          border: '1px solid #262630',
                          color: '#d4d4d8',
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: machine.active_batch.color_z.hex_code || '#a1a1aa',
                            boxShadow: machine.active_batch.color_z.hex_code ? `0 0 4px ${machine.active_batch.color_z.hex_code}` : undefined,
                          }}
                        />
                        Z
                      </span>
                    )}
                  </div>
                )}

                {/* Bottom data row */}
                <div className="tfo-card-bottom">
                  <div className={`tfo-card-vendor${running ? '' : ' muted'}`}>
                    {machine.vendor_name || '—'}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* ── Drawer Overlay ────────────────────────────────────────────────── */}
      <div
        className={`tfo-drawer-overlay${selectedMachine ? ' visible' : ''}`}
        onClick={() => setSelectedMachine(null)}
      />

      {/* ── Bottom Drawer ─────────────────────────────────────────────────── */}
      <div className={`tfo-drawer${selectedMachine ? ' open' : ''}`}>
        {selectedMachine && (
          <div className="tfo-drawer-inner">

            {/* Drawer header */}
            <div className="tfo-drawer-header">
              <div>
                <p className="tfo-drawer-sub">
                  <span
                    className={`tfo-status-dot${isRunning(selectedMachine) ? ' running' : ' idle'}`}
                    style={{ marginRight: 8 }}
                  />
                  Machine Status
                </p>
                <div className="tfo-drawer-title">
                  {pad2(selectedMachine.machine_number)}
                  <span className="tfo-drawer-title-meta">
                    M-{selectedMachine.machine_number}
                    {selectedMachine.vendor_name ? ` · ${selectedMachine.vendor_name}` : ''}
                  </span>
                </div>
              </div>
              <button
                className="tfo-drawer-close"
                onClick={() => setSelectedMachine(null)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick info strip */}
            <div className="tfo-drawer-info-strip">
              <div className="tfo-drawer-info-cell">
                <span className="tfo-drawer-info-label">Occupancy</span>
                <span className={`tfo-drawer-info-val${isRunning(selectedMachine) ? ' running' : ' idle'}`}>
                  {isRunning(selectedMachine) ? 'Loaded' : 'Free'}
                </span>
              </div>
              <div className="tfo-drawer-info-cell">
                <span className="tfo-drawer-info-label">Max Capacity</span>
                <span className="tfo-drawer-info-val">
                  {selectedMachine.max_capacity ?? '—'}
                </span>
              </div>
              <div className="tfo-drawer-info-cell">
                <span className="tfo-drawer-info-label">Vendor Phone</span>
                <span className="tfo-drawer-info-val">
                  {selectedMachine.vendor_phone ?? '—'}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="tfo-drawer-actions">
              <button className="tfo-drawer-action-btn">
                <FileText className="tfo-drawer-action-icon primary" size={30} />
                <span className="tfo-drawer-action-label">Current Batch Details</span>
              </button>
              <button className="tfo-drawer-action-btn">
                <History className="tfo-drawer-action-icon muted" size={30} />
                <span className="tfo-drawer-action-label">Preview Batch List</span>
              </button>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
