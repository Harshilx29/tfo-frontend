import React, { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';

export interface YarnFormData {
  id: string;
  denier: number;
  filament: number;
  colour: string;
  type: string;
  whole_name: string;
  show_in_dropdown: boolean;
}

interface Props {
  yarn?: YarnFormData | null;
  onCancel: () => void;
  onSaved: () => void;
}

const YARN_TYPES = ['Nylon', 'Cat', 'Poly'] as const;

export default function YarnForm({ yarn, onCancel, onSaved }: Props) {
  const { addToast } = useToast();
  const api = useApi();
  const [denier, setDenier] = useState(yarn?.denier?.toString() || '');
  const [filament, setFilament] = useState(yarn?.filament?.toString() || '');
  const [colour, setColour] = useState(yarn?.colour || '');
  const [type, setType] = useState(yarn?.type || 'Nylon');
  const [showInDropdown, setShowInDropdown] = useState(yarn?.show_in_dropdown ?? true);
  const [loading, setLoading] = useState(false);

  // Live whole name preview
  const wholeName = denier && filament && type
    ? `${denier}/${filament} ${colour} ${type}`.replace(/\s+/g, ' ').trim()
    : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const denierNum = parseInt(denier, 10);
    const filamentNum = parseInt(filament, 10);

    if (!denierNum || denierNum <= 0) {
      addToast('Denier must be a positive number', 'error');
      return;
    }
    if (!filamentNum || filamentNum <= 0) {
      addToast('Filament must be a positive number', 'error');
      return;
    }
    if (!type) {
      addToast('Type is required', 'error');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        denier: denierNum,
        filament: filamentNum,
        colour: colour.trim(),
        type,
        show_in_dropdown: showInDropdown,
      };

      if (yarn?.id) {
        await api.put(`/yarns/${yarn.id}`, payload);
        addToast('Yarn updated', 'success');
      } else {
        await api.post('/yarns', payload);
        addToast('Yarn created', 'success');
      }
      onSaved();
    } catch (err: any) {
      addToast(err?.error || 'Failed to save yarn', 'error');
    } finally {
      setLoading(false);
    }
  };

  const isValid = denier && filament && type && parseInt(denier) > 0 && parseInt(filament) > 0;

  return (
    <form onSubmit={handleSubmit} className="company-form" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="company-form-fields" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="form-group">
          <label className="form-label">Denier *</label>
          <input
            type="number"
            className="form-input"
            value={denier}
            onChange={e => setDenier(e.target.value)}
            placeholder="e.g. 40"
            min="1"
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label">Filament *</label>
          <input
            type="number"
            className="form-input"
            value={filament}
            onChange={e => setFilament(e.target.value)}
            placeholder="e.g. 18"
            min="1"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Colour</label>
          <input
            type="text"
            className="form-input"
            value={colour}
            onChange={e => setColour(e.target.value)}
            placeholder="e.g. Bright"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Type *</label>
          <select
            className="form-input"
            value={type}
            onChange={e => setType(e.target.value)}
          >
            {YARN_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Whole Name (auto-generated)</label>
          <div className={`whole-name-preview${wholeName ? '' : ' empty'}`}>
            {wholeName || 'Fill in the fields above to see the name'}
          </div>
        </div>

        <div className="form-group checkbox-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
          <input
            type="checkbox"
            className="form-checkbox"
            id="yarnShowDropdownCheck"
            checked={showInDropdown}
            onChange={e => setShowInDropdown(e.target.checked)}
          />
          <label htmlFor="yarnShowDropdownCheck">Show in Winding dropdown</label>
        </div>
      </div>

      <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '0 20px 24px 20px' }}>
        <button type="button" className="btn btn-secondary" style={{ color: 'var(--text-muted)' }} onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary btn-lg" disabled={loading || !isValid}>
          {loading ? 'Saving...' : 'Save Yarn'}
        </button>
      </div>
    </form>
  );
}
