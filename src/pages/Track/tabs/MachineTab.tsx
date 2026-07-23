import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, ChevronDown } from 'lucide-react';
import { useApi } from '../../../hooks/useApi';
import { useToast } from '../../../context/ToastContext';
import { PermissionGate } from '../../../components/PermissionGate';
import { SaveButton } from '../../../components/SaveButton';

interface Props {
  uid: string;
  rows: Record<string, unknown>[];
  onSaved: () => void;
  onDirtyChange: (dirty: boolean) => void;
}

export interface MachineRow {
  _key: string; // local unique key for React
  id?: number;
  sr_no: number;
  date: string;
  time: string;
  company: string; // comma-separated "APPLE-1, APPLE-2"
  cops: string;
  name: string;
}

const COMPANY_OPTIONS = ['APPLE-1', 'APPLE-2', 'APPLE-3'] as const;
const MAX_ROWS = 10;

function fromRaw(rows: Record<string, unknown>[]): MachineRow[] {
  return rows.map((r, i) => ({
    _key:    crypto.randomUUID(),
    id:      r.id as number | undefined,
    sr_no:   (r.sr_no as number) ?? i + 1,
    date:    (r.date  as string) ?? '',
    time:    (r.time  as string) ?? '',
    company: (r.company as string) ?? '',
    cops:    String(r.cops ?? ''),
    name:    (r.name  as string) ?? '',
  }));
}

function cleanForCompare(rowsList: MachineRow[]) {
  return rowsList.map((r) => ({
    sr_no: r.sr_no,
    date: r.date || '',
    time: r.time || '',
    company: r.company || '',
    cops: String(r.cops ?? ''),
    name: r.name || '',
  }));
}

// ── Company multi-select popover ───────────────────────
function CompanyCell({
  value,
  onChange,
  disabled,
}: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = value ? value.split(',').map((s) => s.trim()).filter(Boolean) : [];

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const toggle = (opt: string) => {
    const next = selected.includes(opt)
      ? selected.filter((s) => s !== opt)
      : [...selected, opt];
    onChange(next.join(', '));
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="machine-cell-input"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', cursor: disabled ? 'not-allowed' : 'pointer',
          background: 'transparent',
        }}
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
      >
        <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected.length ? selected.join(', ') : <span style={{ color: 'var(--text-subtle)' }}>Select…</span>}
        </span>
        <ChevronDown size={12} style={{ flexShrink: 0, opacity: 0.5 }} />
      </button>

      {open && (
        <div className="company-pop">
          {COMPANY_OPTIONS.map((opt) => (
            <label key={opt} className="company-option">
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
              />
              <span style={{ fontSize: 12.5 }}>{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ── MachineTab ─────────────────────────────────────────
export default function MachineTab({ uid, rows: rawRows, onSaved, onDirtyChange }: Props) {
  const api = useApi();
  const { addToast } = useToast();

  const [rows, setRows] = useState<MachineRow[]>(fromRaw(rawRows));
  const [lastLoadedData, setLastLoadedData] = useState<Record<string, unknown>[]>(rawRows);
  const [showConflictBanner, setShowConflictBanner] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync parent changes
  useEffect(() => {
    if (JSON.stringify(rawRows) === JSON.stringify(lastLoadedData)) {
      return;
    }

    const currentIsDirty = JSON.stringify(cleanForCompare(rows)) !== JSON.stringify(cleanForCompare(fromRaw(lastLoadedData)));

    if (!currentIsDirty) {
      setRows(fromRaw(rawRows));
      setLastLoadedData(rawRows);
      setShowConflictBanner(false);
    } else {
      setShowConflictBanner(true);
    }
  }, [rawRows]);

  const handleDiscard = () => {
    setRows(fromRaw(rawRows));
    setLastLoadedData(rawRows);
    setShowConflictBanner(false);
  };

  const isDirty = JSON.stringify(cleanForCompare(rows)) !== JSON.stringify(cleanForCompare(fromRaw(lastLoadedData)));

  // Notify parent of dirty edits
  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const addRow = () => {
    if (rows.length >= MAX_ROWS) return;
    setRows((prev) => [
      ...prev,
      { _key: crypto.randomUUID(), sr_no: prev.length + 1, date: '', time: '', company: '', cops: '', name: '' },
    ]);
  };

  const removeRow = (key: string) =>
    setRows((prev) => prev.filter((r) => r._key !== key).map((r, i) => ({ ...r, sr_no: i + 1 })));

  const updateRow = (key: string, field: keyof MachineRow, value: string) =>
    setRows((prev) => prev.map((r) => r._key === key ? { ...r, [field]: value } : r));

  const handleSave = async () => {
    setSaving(true);
    try {
      const nonEmpty = rows.filter(
        (r) => r.date || r.time || r.company || r.cops || r.name
      );
      const cleanRows = nonEmpty.map((r, idx) => ({
        sr_no: r.sr_no ?? idx + 1,
        date: r.date || null,
        time: r.time || null,
        company: r.company || null,
        cops: r.cops !== '' && r.cops != null ? Number(r.cops) : null,
        name: r.name || null,
      }));

      await api.put(`/track/${uid}/machine`, { rows: nonEmpty });
      addToast('Machine log saved', 'success');
      setLastLoadedData(cleanRows);
      setShowConflictBanner(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {showConflictBanner && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          padding: '10px 14px', borderRadius: 'var(--radius)', background: 'var(--warning-bg)',
          border: '1px solid var(--warning)', color: 'var(--warning)', marginBottom: 16, fontSize: 13
        }}>
          <span>This record was updated by someone else — save now to overwrite, or refresh to discard your changes and load theirs.</span>
          <button className="btn btn-secondary btn-sm" onClick={handleDiscard} style={{ border: '1px solid var(--border-strong)' }}>
            Refresh
          </button>
        </div>
      )}

      <div className="table-wrap" style={{ marginBottom: 12 }}>
        <table className="machine-table">
          <thead>
            <tr>
              <th style={{ width: 44 }}>#</th>
              <th>Date</th>
              <th>Time</th>
              <th>Company</th>
              <th style={{ width: 80 }}>COPs</th>
              <th>Name</th>
              <th style={{ width: 44 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>
                  No rows yet — click "Add Row" to start
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row._key}>
                {/* Sr No */}
                <td style={{ textAlign: 'center', color: 'var(--text-subtle)', fontSize: 12 }}>
                  {row.sr_no}
                </td>

                {/* Date */}
                <td>
                  <input
                    className="machine-cell-input"
                    type="date"
                    value={row.date}
                    onChange={(e) => updateRow(row._key, 'date', e.target.value)}
                    disabled={saving}
                  />
                </td>

                {/* Time */}
                <td>
                  <input
                    className="machine-cell-input"
                    type="time"
                    value={row.time}
                    onChange={(e) => updateRow(row._key, 'time', e.target.value)}
                    disabled={saving}
                  />
                </td>

                {/* Company multi-select */}
                <td style={{ position: 'relative' }}>
                  <CompanyCell
                    value={row.company}
                    onChange={(v) => updateRow(row._key, 'company', v)}
                    disabled={saving}
                  />
                </td>

                {/* COPs */}
                <td>
                  <input
                    className="machine-cell-input"
                    type="number"
                    value={row.cops}
                    onChange={(e) => updateRow(row._key, 'cops', e.target.value)}
                    placeholder="0"
                    disabled={saving}
                  />
                </td>

                {/* Name */}
                <td>
                  <input
                    className="machine-cell-input"
                    type="text"
                    value={row.name}
                    onChange={(e) => updateRow(row._key, 'name', e.target.value)}
                    placeholder="Operator"
                    disabled={saving}
                  />
                </td>

                {/* Delete */}
                <td style={{ textAlign: 'center' }}>
                  <PermissionGate permissionKey="track.machine.delete_row">
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => removeRow(row._key)}
                      title="Remove row"
                      style={{ color: 'var(--danger)' }}
                      disabled={saving}
                    >
                      <Trash2 size={13} />
                    </button>
                  </PermissionGate>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={addRow}
          disabled={saving || rows.length >= MAX_ROWS}
        >
          <Plus size={13} />
          Add Row
          {rows.length >= MAX_ROWS && ` (max ${MAX_ROWS})`}
        </button>

        <div className="tab-footer" style={{ paddingTop: 0, borderTop: 'none', marginTop: 0 }}>
          <SaveButton
            onSave={handleSave}
            label="Save Machine Log"
            permissionKey="track.machine.save"
            disabled={saving}
          />
        </div>
      </div>
    </div>
  );
}
