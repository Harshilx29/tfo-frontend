import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, X, Cpu } from 'lucide-react';
import { useApi } from '../hooks/useApi';

interface MachineOption {
  id: string;
  machine_number: number;
  occupancy_status: 'free' | 'loaded';
}

interface Props {
  /** Currently selected machine number (integer), or empty string */
  value: string;
  /** UUID of the currently selected machine */
  valueId?: string | null;
  onChange: (option: { id: string; machine_number: number } | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function MachineDropdown({ value, valueId, onChange, placeholder = 'Select machine...', disabled }: Props) {
  const api = useApi();

  const [open, setOpen]       = useState(false);
  const [options, setOptions] = useState<MachineOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch]   = useState('');
  const containerRef          = useRef<HTMLDivElement>(null);

  // Load free machines (+ current machine if it's loaded, so edit mode still shows the value)
  const loadOptions = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all enabled machines (not filtered — we filter client-side to also include current)
      const data = await api.get<MachineOption[]>('/machines/dropdown');
      setOptions(data || []);
    } catch (err) {
      console.error('Failed to load machines dropdown:', err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (open) {
      void loadOptions();
    }
  }, [open, loadOptions]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = (opt: MachineOption) => {
    onChange({ id: opt.id, machine_number: opt.machine_number });
    setOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setSearch('');
  };

  // Filter: show free machines + the currently selected machine (even if loaded)
  const filtered = options.filter((opt) => {
    const matchesCurrent = valueId ? opt.id === valueId : false;
    const isFree = opt.occupancy_status === 'free';
    const matchesSearch = String(opt.machine_number).includes(search);
    return (isFree || matchesCurrent) && matchesSearch;
  });

  const displayLabel = value ? `Machine ${value}` : '';

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%' }}
    >
      {/* Trigger */}
      <div
        className="form-input"
        onClick={() => !disabled && setOpen((o) => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          userSelect: 'none',
          opacity: disabled ? 0.6 : 1,
          gap: 8,
        }}
      >
        <span style={{
          display: 'flex', alignItems: 'center', gap: 8,
          color: displayLabel ? 'var(--text)' : 'var(--text-muted)',
          fontSize: 14,
        }}>
          {displayLabel ? (
            <>
              <Cpu size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              {displayLabel}
            </>
          ) : placeholder}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {value && (
            <button
              type="button"
              onClick={handleClear}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)', display: 'flex' }}
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown size={14} style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
        </span>
      </div>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--surface-1)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          zIndex: 9999, overflow: 'hidden', maxHeight: 280,
        }}>
          {/* Search */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
            <input
              autoFocus
              type="text"
              className="form-input"
              placeholder="Search machine..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ fontSize: 13, padding: '6px 10px' }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Options */}
          <div style={{ overflowY: 'auto', maxHeight: 200 }}>
            {loading ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Loading...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No free machines available
              </div>
            ) : (
              filtered.map((opt) => {
                const isCurrent = valueId ? opt.id === valueId : false;
                return (
                  <div
                    key={opt.id}
                    onClick={() => handleSelect(opt)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', cursor: 'pointer', fontSize: 14,
                      background: isCurrent ? 'var(--primary-subtle)' : 'transparent',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => { if (!isCurrent) (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)'; }}
                    onMouseLeave={(e) => { if (!isCurrent) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Cpu size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                      <span style={{ fontWeight: isCurrent ? 600 : 400 }}>Machine {opt.machine_number}</span>
                    </span>
                    <span className={`badge ${opt.occupancy_status === 'free' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: 11 }}>
                      {opt.occupancy_status === 'free' ? 'Free' : 'In Use'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
