import { useState, useEffect } from 'react';
import { useApi } from '../../../hooks/useApi';
import { useToast } from '../../../context/ToastContext';
import { SaveButton } from '../../../components/SaveButton';
import CopColourPicker from '../../../components/CopColourPicker';

interface Props {
  uid: string;
  data: Record<string, unknown> | null;
  onSaved: () => void;
  onDirtyChange: (dirty: boolean) => void;
}

interface FormState {
  tfo_no: string;
  loading_date: string;
  unloading_date: string;
  tpm: string;
  cops: string;
  color_s: string;
  color_s_id: string | null;
  color_z: string;
  color_z_id: string | null;
  location: string;
}

const EMPTY: FormState = {
  tfo_no: '', loading_date: '', unloading_date: '',
  tpm: '', cops: '', color_s: '', color_s_id: null, color_z: '', color_z_id: null, location: '',
};

function toForm(data: Record<string, unknown> | null): FormState {
  if (!data) return EMPTY;
  const toDatetimeLocal = (v: unknown) => {
    if (!v) return '';
    const d = new Date(v as string);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"
  };
  return {
    tfo_no:         String(data.tfo_no ?? ''),
    loading_date:   toDatetimeLocal(data.loading_date),
    unloading_date: toDatetimeLocal(data.unloading_date),
    tpm:            String(data.tpm  ?? ''),
    cops:           String(data.cops ?? ''),
    color_s:        (data.color_s    as string) ?? '',
    color_s_id:     (data.color_s_id as string) ?? null,
    color_z:        (data.color_z    as string) ?? '',
    color_z_id:     (data.color_z_id as string) ?? null,
    location:       (data.location   as string) ?? '',
  };
}

export default function TfoTab({ uid, data, onSaved, onDirtyChange }: Props) {
  const api = useApi();
  const { addToast } = useToast();

  const [form, setForm] = useState<FormState>(toForm(data));
  const [lastLoadedData, setLastLoadedData] = useState(data);
  const [showConflictBanner, setShowConflictBanner] = useState(false);

  // Sync parent data changes with conflict checking
  useEffect(() => {
    if (JSON.stringify(data) === JSON.stringify(lastLoadedData)) {
      return;
    }

    const currentIsDirty = JSON.stringify(form) !== JSON.stringify(toForm(lastLoadedData));

    if (!currentIsDirty) {
      setForm(toForm(data));
      setLastLoadedData(data);
      setShowConflictBanner(false);
    } else {
      setShowConflictBanner(true);
    }
  }, [data]);

  const handleDiscard = () => {
    setForm(toForm(data));
    setLastLoadedData(data);
    setShowConflictBanner(false);
  };

  const isDirty = JSON.stringify(form) !== JSON.stringify(toForm(lastLoadedData));

  // Notify parent of dirty edits
  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    const payload = {
      ...form,
      tfo_no:         form.tfo_no   ? parseInt(form.tfo_no)   : null,
      tpm:            form.tpm      ? parseInt(form.tpm)      : null,
      cops:           form.cops     ? parseInt(form.cops)     : null,
      loading_date:   form.loading_date   || null,
      unloading_date: form.unloading_date || null,
    };
    await api.put(`/track/${uid}/tfo`, payload);
    addToast('TFO saved', 'success');
    setLastLoadedData({ ...data, ...payload });
    setShowConflictBanner(false);
    onSaved();
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

      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">TFO No</label>
          <input className="form-input" type="number" value={form.tfo_no} onChange={set('tfo_no')} placeholder="e.g. 12" />
        </div>
        <div className="form-group">
          <label className="form-label">Loading Date & Time</label>
          <input className="form-input" type="datetime-local" value={form.loading_date} onChange={set('loading_date')} />
        </div>
        <div className="form-group">
          <label className="form-label">Unloading Date & Time</label>
          <input className="form-input" type="datetime-local" value={form.unloading_date} onChange={set('unloading_date')} />
        </div>
        <div className="form-group">
          <label className="form-label">TPM</label>
          <input className="form-input" type="number" value={form.tpm} onChange={set('tpm')} placeholder="Twists per metre" />
        </div>
        <div className="form-group">
          <label className="form-label">COPs</label>
          <input className="form-input" type="number" value={form.cops} onChange={set('cops')} placeholder="e.g. 24" />
        </div>
        <div className="form-group">
          <label className="form-label">S-Twist Cops — Colour Used</label>
          <CopColourPicker
            value={form.color_s}
            valueId={form.color_s_id}
            onChange={(opt) => {
              setForm((f) => ({
                ...f,
                color_s: opt ? opt.name : '',
                color_s_id: opt ? opt.id : null,
              }));
            }}
            placeholder="Select S-Twist cop colour..."
          />
        </div>
        <div className="form-group">
          <label className="form-label">Z-Twist Cops — Colour Used</label>
          <CopColourPicker
            value={form.color_z}
            valueId={form.color_z_id}
            onChange={(opt) => {
              setForm((f) => ({
                ...f,
                color_z: opt ? opt.name : '',
                color_z_id: opt ? opt.id : null,
              }));
            }}
            placeholder="Select Z-Twist cop colour..."
          />
        </div>
        <div className="form-group">
          <label className="form-label">Location</label>
          <input className="form-input" type="text" value={form.location} onChange={set('location')} placeholder="e.g. Bay 3" />
        </div>
      </div>

      <div className="tab-footer">
        <SaveButton
          onSave={handleSave}
          label="Save TFO"
          permissionKey="track.tfo.save"
        />
      </div>
    </div>
  );
}
