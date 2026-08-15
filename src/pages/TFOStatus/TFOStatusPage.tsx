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

  // ── HYSTERESIS SCROLL FIX: Prevents jittery scroll-loop ──────────────────────
  useEffect(() => {
    const el = containerRef.current;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScroll = window.scrollY || el?.scrollTop || 0;
          setIsScrolled((prevScrolled) => {
            if (!prevScrolled && currentScroll > 150) return true;
            if (prevScrolled && currentScroll < 20) return false;
            return prevScrolled;
          });
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    if (el) el.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (el) el.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // ── Lock background scroll when drawer is open ──────────────────────────────
  useEffect(() => {
    if (selectedMachine) {
      document.body.style.overflow = 'hidden';
      if (containerRef.current) containerRef.current.style.overflowY = 'hidden';
    } else {
      document.body.style.overflow = '';
      if (containerRef.current) containerRef.current.style.overflowY = 'auto';
    }
    
    return () => {
      document.body.style.overflow = '';
      if (containerRef.current) containerRef.current.style.overflowY = 'auto';
    };
  }, [selectedMachine]);

  // ── Stats calculation ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = machines.length;
    const running = machines.filter(m => m.occupancy_status === 'loaded').length;
    const idle = total - running;
    const runningPct = total === 0 ? 0 : Math.round((running / total) * 100);
    return { total, running, idle, runningPct };
  }, [machines]);

  // ── Filtering and sorting ───────────────────────────────────────────────────
  const filteredAndSortedMachines = useMemo(() => {
    let result = [...machines];
    if (filter === 'Running') {
      result = result.filter(m => m.occupancy_status === 'loaded');
    } else if (filter === 'Idle') {
      result = result.filter(m => m.occupancy_status === 'free');
    }

    result.sort((a, b) => a.machine_number - b.machine_number);
    return result;
  }, [machines, filter]);

  return (
    <div ref={containerRef} className="tfo-status-root min-h-screen bg-[#050505] text-neutral-300 font-sans selection:bg-neutral-800 flex-1 overflow-y-auto">
      
      {/* ── Sticky Header ──────────────────────────────────────────────────────── */}
      <header className={`sticky top-0 z-50 backdrop-blur-xl transition-colors duration-300 border-b ${
        isScrolled 
          ? 'bg-[#050505]/90 border-neutral-900 shadow-2xl' 
          : 'bg-[#050505] border-transparent'
      }`}>
        <div className="max-w-[1600px] mx-auto px-3 md:px-8 pt-3 pb-2 md:pt-5 md:pb-3">
          
          {/* TOP ROW - Title, Mini Stats & Filter Controls */}
          <div className="flex items-center justify-between w-full h-[36px] md:h-[40px]">
            
            {/* Title & Scrolled Mini Stats */}
            <div className="flex items-center relative">
              <h1 className="text-lg md:text-xl font-medium tracking-tight text-white whitespace-nowrap">
                TFO Monitor
              </h1>
              
              {/* Mini Stats (Positioned absolute to avoid layout shift) */}
              <div className={`absolute left-full flex items-center gap-2 md:gap-2.5 whitespace-nowrap transition-all duration-300 ease-out ${
                isScrolled 
                  ? 'opacity-100 translate-x-3 md:translate-x-5 pointer-events-auto' 
                  : 'opacity-0 -translate-x-2 pointer-events-none'
              }`}>
                <div className="w-[1px] h-3 bg-neutral-800 hidden md:block"></div>
                <div className="flex items-center gap-1 md:gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.6)]"></div> 
                  <span className="text-[10px] md:text-xs font-medium text-emerald-400">{stats.running}</span>
                </div>
                <div className="flex items-center gap-1 md:gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-neutral-600"></div> 
                  <span className="text-[10px] md:text-xs font-medium text-neutral-500">{stats.idle}</span>
                </div>
              </div>
            </div>

            {/* Filter Controls */}
            <div className="flex items-center gap-2 md:gap-5 relative z-10 mr-1 md:mr-2">
              {(['All', 'Running', 'Idle'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`relative px-1 py-1 text-[11px] md:text-xs tracking-wide transition-all duration-300 whitespace-nowrap cursor-pointer ${
                    filter === f 
                      ? 'text-white font-medium [text-shadow:0_0_10px_rgba(255,255,255,0.7)]' 
                      : 'text-neutral-500 hover:text-neutral-300 font-light'
                  }`}
                >
                  <span className="sm:hidden">{f === 'Running' ? 'Run' : f}</span>
                  <span className="hidden sm:inline">{f}</span>
                </button>
              ))}
            </div>
          </div>

          {/* COLLAPSIBLE ROW - Big Stats */}
          <div 
            className="grid transition-all duration-300 ease-out"
            style={{ 
              gridTemplateRows: isScrolled ? '0fr' : '1fr',
              opacity: isScrolled ? 0 : 1,
              transform: isScrolled ? 'translateY(-10px)' : 'translateY(0px)'
            }}
          >
            <div className="overflow-hidden">
              <div className="pt-6 md:pt-8 pb-3 md:pb-4">
                <div className="flex items-center gap-6 md:gap-12 w-max">
                  <div className="flex flex-col">
                    <span className="text-[9px] md:text-[10px] uppercase tracking-widest text-neutral-600 mb-1.5">Total M/C</span>
                    <span className="text-3xl md:text-5xl text-white font-light leading-none tracking-tight">{stats.total}</span>
                  </div>
                  <div className="w-[1px] h-10 md:h-12 bg-neutral-900"></div>
                  <div className="flex flex-col">
                    <span className="text-[9px] md:text-[10px] uppercase tracking-widest text-neutral-600 mb-1.5 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div> Running
                    </span>
                    <span className="text-3xl md:text-5xl font-light text-emerald-400 leading-none tracking-tight">{stats.running}</span>
                  </div>
                  <div className="w-[1px] h-10 md:h-12 bg-neutral-900"></div>
                  <div className="flex flex-col">
                    <span className="text-[9px] md:text-[10px] uppercase tracking-widest text-neutral-600 mb-1.5 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-neutral-600"></div> Idle
                    </span>
                    <span className="text-3xl md:text-5xl font-light text-neutral-500 leading-none tracking-tight">{stats.idle}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Minimal Progress Bar */}
          <div className="w-full h-[2px] bg-neutral-900/50 overflow-hidden mt-2 md:mt-3 rounded-full">
            <div 
              className="h-full bg-emerald-500/80 transition-all duration-1000 ease-out rounded-full"
              style={{ width: `${stats.runningPct}%` }}
            ></div>
          </div>
        </div>
      </header>

      {/* ── Main Content Grid ──────────────────────────────────────────────────── */}
      <main className="px-3 md:px-8 pt-4 md:pt-6 grid grid-cols-3 min-[480px]:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 md:gap-3 max-w-[1600px] mx-auto pb-20">
        {loadingMachines ? (
          <div className="col-span-full flex justify-center text-neutral-600 py-20 font-light text-sm">
            Loading machines…
          </div>
        ) : filteredAndSortedMachines.length === 0 ? (
          <div className="col-span-full flex justify-center text-neutral-600 py-20 font-light text-sm">
            No machines found.
          </div>
        ) : (
          filteredAndSortedMachines.map((machine) => {
            const isRunning = machine.occupancy_status === 'loaded';
            const activeBatch = machine.active_batch;
            const uidDisplay = activeBatch?.uid ? (activeBatch.uid.length > 8 ? `${activeBatch.uid.substring(0, 8)}…` : activeBatch.uid) : '—';
            const loadingDateDisplay = formatCompactDate(activeBatch?.loading_date);

            return (
              <div 
                key={machine.id} 
                onClick={() => setSelectedMachine(machine)}
                className={`flex flex-col p-2.5 md:p-3 rounded-lg border bg-[#0a0a0a] transition-all duration-300 cursor-pointer ${
                  isRunning 
                    ? 'border-neutral-800 hover:border-neutral-700 hover:bg-[#111]' 
                    : 'border-neutral-900/50 opacity-60 hover:opacity-100 hover:border-neutral-800 hover:bg-[#111]'
                }`}
              >
                {/* Top: No, UID, Dot */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className={`text-xl md:text-2xl font-light leading-none tracking-tight ${isRunning ? 'text-white' : 'text-neutral-500'}`}>
                      {pad2(machine.machine_number)}
                    </div>
                    <div className="text-[9px] md:text-[10px] text-neutral-600 font-mono tracking-wider mt-1.5">
                      {isRunning ? uidDisplay : '—'}
                    </div>
                  </div>
                  <div className={`w-1.5 h-1.5 rounded-full mt-1 ${
                    isRunning ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]' : 'bg-neutral-700'
                  }`}></div>
                </div>

                {/* Bottom: Dense Data */}
                <div className="mt-auto flex flex-col gap-1.5">
                  <div className={`text-[10px] md:text-[11px] truncate font-medium ${isRunning ? 'text-neutral-300' : 'text-neutral-600'}`}>
                    {machine.vendor_name || '—'}
                  </div>
                  
                  <div className="flex justify-between items-end border-t border-neutral-900 pt-1.5">
                    <div className="flex flex-col">
                      <span className={`text-[9px] ${isRunning ? 'text-neutral-400' : 'text-neutral-600'}`}>
                        {activeBatch?.tpm ? `${activeBatch.tpm} TPM` : '-'}
                      </span>
                      <span className="text-[8px] text-neutral-600">
                        {loadingDateDisplay || '-'}
                      </span>
                    </div>
                    
                    {isRunning && activeBatch && (activeBatch.color_s || activeBatch.color_z) ? (
                      <div className="flex gap-0.5">
                        {activeBatch.color_s && (
                          <span 
                            title={`S-Twist: ${activeBatch.color_s.name}`}
                            className="flex items-center justify-center w-[14px] h-[14px] rounded-[2px] border text-white text-[9px] font-black shadow-sm"
                            style={{
                              backgroundColor: activeBatch.color_s.hex_code ? `${activeBatch.color_s.hex_code}33` : 'rgba(234, 179, 8, 0.2)',
                              borderColor: activeBatch.color_s.hex_code || '#eab308',
                            }}
                          >
                            S
                          </span>
                        )}
                        {activeBatch.color_z && (
                          <span 
                            title={`Z-Twist: ${activeBatch.color_z.name}`}
                            className="flex items-center justify-center w-[14px] h-[14px] rounded-[2px] border text-white text-[9px] font-black shadow-sm"
                            style={{
                              backgroundColor: activeBatch.color_z.hex_code ? `${activeBatch.color_z.hex_code}33` : 'rgba(37, 99, 235, 0.2)',
                              borderColor: activeBatch.color_z.hex_code || '#2563eb',
                            }}
                          >
                            Z
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-neutral-700 text-[9px]">-</span>
                    )}
                  </div>
                </div>

              </div>
            );
          })
        )}
      </main>

      {/* ── Bottom Drawer & Overlay ────────────────────────────────────────── */}
      <div 
        className={`fixed inset-0 z-[60] bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ${
          selectedMachine ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSelectedMachine(null)}
      />

      <div 
        className={`fixed bottom-0 left-0 right-0 z-[70] bg-[#0a0a0a] border-t border-neutral-800 rounded-t-3xl p-6 pb-10 md:pb-12 transition-transform duration-500 ease-out transform ${
          selectedMachine ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {selectedMachine && (
          <div className="max-w-3xl mx-auto">
            {/* Drawer Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-neutral-500 text-[10px] uppercase tracking-widest mb-1.5 flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${selectedMachine.occupancy_status === 'loaded' ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-neutral-600'}`}></div>
                  Machine Status
                </h3>
                <div className="text-3xl md:text-4xl font-light text-white flex items-baseline gap-3">
                  {pad2(selectedMachine.machine_number)}
                  <span className="text-sm font-mono text-neutral-500">
                    {selectedMachine.active_batch?.uid ? `UID: ${selectedMachine.active_batch.uid}` : `Vendor: ${selectedMachine.vendor_name || '—'}`}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedMachine(null)} 
                className="p-2.5 bg-[#151515] rounded-full text-neutral-400 hover:text-white hover:bg-[#222] transition-colors border border-neutral-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <button 
                onClick={() => {
                  if (selectedMachine.active_batch?.uid) {
                    navigate(`/track/${selectedMachine.active_batch.uid}`);
                  } else {
                    navigate('/track');
                  }
                }}
                className="flex flex-col items-center justify-center gap-3 p-6 md:p-8 rounded-xl border border-neutral-800 bg-[#111] hover:bg-[#161616] hover:border-neutral-700 transition-all group cursor-pointer"
              >
                <FileText className="text-emerald-500/80 group-hover:text-emerald-400 group-hover:scale-110 transition-all duration-300" size={32} />
                <span className="text-sm md:text-base font-medium text-neutral-300 group-hover:text-white transition-colors">
                  Current Batch Details
                </span>
              </button>
              <button 
                onClick={() => navigate('/batch-log')}
                className="flex flex-col items-center justify-center gap-3 p-6 md:p-8 rounded-xl border border-neutral-800 bg-[#111] hover:bg-[#161616] hover:border-neutral-700 transition-all group cursor-pointer"
              >
                <History className="text-neutral-500 group-hover:text-neutral-300 group-hover:scale-110 transition-all duration-300" size={32} />
                <span className="text-sm md:text-base font-medium text-neutral-400 group-hover:text-white transition-colors">
                  Preview Batch List
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
