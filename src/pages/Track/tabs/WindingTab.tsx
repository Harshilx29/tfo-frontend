import { useState, useEffect } from 'react';
import { useApi } from '../../../hooks/useApi';
import { useToast } from '../../../context/ToastContext';
import { SaveButton } from '../../../components/SaveButton';
import CompanyAutocomplete from '../../../components/CompanyAutocomplete';
import YarnAutocomplete from '../../../components/YarnAutocomplete';

interface Props {
  uid: string;
  data: Record<string, unknown> | null;
  onSaved: () => void;
  onDirtyChange: (dirty: boolean) => void;
}

interface FormState {
  date: string;
  company: string;
  company_id: string | null;
  yarn_type: string;
  yarn_id: string | null;
  lot_number: string;
  winding_number: string;
}

const EMPTY: FormState = {
  date: '',
  company: '',
  company_id: null,
  yarn_type: '',
  yarn_id: null,
  lot_number: '',
  winding_number: '',
};

function toForm(data: Record<string, unknown> | null): FormState {
  if (!data) return EMPTY;
  return {
    date:           (data.date as string)           ?? '',
    company:        (data.company as string)        ?? '',
    company_id:     (data.company_id as string)     ?? null,
    yarn_type:      (data.yarn_type as string)      ?? '',
    yarn_id:        (data.yarn_id as string)        ?? null,
    lot_number:     (data.lot_number as string)     ?? '',
    winding_number: (data.winding_number as string) ?? '',
  };
}

export default function WindingTab({ uid, data, onSaved, onDirtyChange }: Props) {
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

  const set = (field: keyof FormState) => (value: any) =>
    setForm((f) => ({ ...f, [field]: value }));

  const [isCompanyValid, setIsCompanyValid] = useState(true);
  const [isYarnValid, setIsYarnValid] = useState(true);

  const handleSave = async () => {
    if (!isCompanyValid) {
      addToast('No matching company found — please select from the list or add it in the Company page', 'error');
      throw new Error('Invalid company');
    }
    if (!isYarnValid) {
      addToast('No matching yarn found — please select from the list or add it in the Yarn page', 'error');
      throw new Error('Invalid yarn');
    }
    await api.put(`/track/${uid}/winding`, form);
    addToast('Winding saved', 'success');
    setLastLoadedData({ ...data, ...form });
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
          <input className="form-input" type="date" value={form.date} onChange={(e) => set('date')(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Company</label>
          <CompanyAutocomplete
            value={form.company}
            onChange={(name, id) => {
              setForm(f => ({ ...f, company: name, company_id: id }));
            }}
            onValidationChange={setIsCompanyValid}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Yarn Type</label>
          <YarnAutocomplete
            value={form.yarn_type}
            onChange={(name, id) => {
              setForm(f => ({ ...f, yarn_type: name, yarn_id: id }));
            }}
            onValidationChange={setIsYarnValid}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Lot Number</label>
          <input className="form-input" type="text" value={form.lot_number} onChange={(e) => set('lot_number')(e.target.value)} placeholder="e.g. LOT-001" />
        </div>
        <div className="form-group">
          <label className="form-label">Winding Number</label>
          <input className="form-input" type="text" value={form.winding_number} onChange={(e) => set('winding_number')(e.target.value)} placeholder="e.g. W-042" />
        </div>
      </div>

      <div className="tab-footer">
        <SaveButton
          onSave={handleSave}
          label="Save Winding"
          permissionKey="track.winding.save"
          disabled={!isCompanyValid || !isYarnValid}
        />
      </div>
    </div>
  );
}
