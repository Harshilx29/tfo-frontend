import { useState, useEffect } from 'react';
import { useApi } from '../../../hooks/useApi';
import { useToast } from '../../../context/ToastContext';
import { SaveButton } from '../../../components/SaveButton';

interface Props {
  uid: string;
  data: Record<string, unknown> | null;
  onSaved: () => void;
  onDirtyChange: (dirty: boolean) => void;
}

interface FormState {
  date: string;
  time: string;
  cops: string;
  temperature: string;
  boiler_time: string;
  location: string;
  name: string;
}

const EMPTY: FormState = {
  date: '', time: '', cops: '', temperature: '', boiler_time: '', location: '', name: '',
};

function toForm(data: Record<string, unknown> | null): FormState {
  if (!data) return EMPTY;

  // The actual DB column is "date and time" (with a space).
  // Use bracket notation to read it; fall back to date_and_time (underscore)
  // in case the column is ever renamed to the normalised form.
  const rawDt = (data['date and time'] ?? data['date_and_time']) as string | null;

  let dateStr = '';
  let timeStr = '';
  if (rawDt) {
    const d = new Date(rawDt);
    if (!isNaN(d.getTime())) {
      const offset = d.getTimezoneOffset();
      const local  = new Date(d.getTime() - offset * 60000);
      dateStr = local.toISOString().slice(0, 10);  // YYYY-MM-DD
      timeStr = local.toISOString().slice(11, 16); // HH:mm
    }
  }

  return {
    date:        dateStr,
    time:        timeStr,
    cops:        String(data.cops        ?? ''),
    temperature: String(data.temperature ?? ''),
    boiler_time: (data.boiler_time as string) ?? '',
    location:    (data.location    as string) ?? '',
    name:        (data.name        as string) ?? '',
  };
}

export default function BoilerTab({ uid, data, onSaved, onDirtyChange }: Props) {
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
      cops:        form.cops        ? parseInt(form.cops)        : null,
      temperature: form.temperature ? parseInt(form.temperature) : null,
      date:        form.date  || null,
      time:        form.time  || null,
    };
    await api.put(`/track/${uid}/boiler`, payload);
    addToast('Boiler saved', 'success');
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
          <label className="form-label">Date</label>
          <input className="form-input" type="date" value={form.date} onChange={set('date')} />
        </div>
        <div className="form-group">
          <label className="form-label">Time</label>
          <input className="form-input" type="time" value={form.time} onChange={set('time')} />
        </div>
        <div className="form-group">
          <label className="form-label">COPs</label>
          <input className="form-input" type="number" value={form.cops} onChange={set('cops')} placeholder="e.g. 24" />
        </div>
        <div className="form-group">
          <label className="form-label">Temperature (°C)</label>
          <input className="form-input" type="number" value={form.temperature} onChange={set('temperature')} placeholder="e.g. 130" />
        </div>
        <div className="form-group">
          <label className="form-label">Boiler Time</label>
          <input className="form-input" type="text" value={form.boiler_time} onChange={set('boiler_time')} placeholder="e.g. 2h 30m" />
        </div>
        <div className="form-group">
          <label className="form-label">Location</label>
          <input className="form-input" type="text" value={form.location} onChange={set('location')} placeholder="e.g. Bay 2" />
        </div>
        <div className="form-group">
          <label className="form-label">Name</label>
          <input className="form-input" type="text" value={form.name} onChange={set('name')} placeholder="Operator name" />
        </div>
      </div>

      <div className="tab-footer">
        <SaveButton
          onSave={handleSave}
          label="Save Boiler"
          permissionKey={['track.section1.write', 'track.section1.update', 'track.boiler.save']}
        />
      </div>
    </div>
  );
}
