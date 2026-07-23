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
  warping_1: boolean;
  warping_2: boolean;
}

const EMPTY: FormState = { date: '', warping_1: false, warping_2: false };

function toForm(data: Record<string, unknown> | null): FormState {
  if (!data) return EMPTY;
  return {
    date:      (data.date      as string)  ?? '',
    warping_1: Boolean(data.warping_1),
    warping_2: Boolean(data.warping_2),
  };
}

export default function WarpingTab({ uid, data, onSaved, onDirtyChange }: Props) {
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

  const handleSave = async () => {
    const payload = {
      ...form,
      date: form.date || null,
    };
    await api.put(`/track/${uid}/warping`, payload);
    addToast('Warping saved', 'success');
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

      <div className="form-grid" style={{ maxWidth: 480 }}>
        <div className="form-group">
          <label className="form-label">Date</label>
          <input
            className="form-input"
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          />
        </div>
      </div>

      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label className="form-label" style={{ marginBottom: 4 }}>Warping Options</label>

        <label className="toggle">
          <input
            type="checkbox"
            checked={form.warping_1}
            onChange={(e) => setForm((f) => ({ ...f, warping_1: e.target.checked }))}
          />
          <span className="toggle-track" />
          <span className="toggle-label">Warping 1</span>
        </label>

        <label className="toggle">
          <input
            type="checkbox"
            checked={form.warping_2}
            onChange={(e) => setForm((f) => ({ ...f, warping_2: e.target.checked }))}
          />
          <span className="toggle-track" />
          <span className="toggle-label">Warping 2</span>
        </label>
      </div>

      <div className="tab-footer">
        <SaveButton
          onSave={handleSave}
          label="Save Warping"
          permissionKey="track.warping.save"
        />
      </div>
    </div>
  );
}
