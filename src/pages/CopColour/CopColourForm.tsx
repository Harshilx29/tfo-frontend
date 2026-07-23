import React, { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { CopColour } from '../../context/CopColourDataContext';
import { CopSVGIcon } from '../../components/CopColourPicker';

interface Props {
  copColour?: CopColour | null;
  onSaved: () => void;
  onCancel: () => void;
}

export default function CopColourForm({ copColour, onSaved, onCancel }: Props) {
  const api = useApi();
  const { addToast } = useToast();

  const [name, setName] = useState(copColour?.name || '');
  const [hexCode, setHexCode] = useState(copColour?.hex_code || '#FF3333');
  const [showInDropdown, setShowInDropdown] = useState(copColour?.show_in_dropdown !== false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      addToast('Colour name is required', 'error');
      return;
    }

    if (!hexCode.trim()) {
      addToast('Hex code is required', 'error');
      return;
    }

    let formattedHex = hexCode.trim();
    if (!formattedHex.startsWith('#')) {
      formattedHex = `#${formattedHex}`;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        hex_code: formattedHex,
        show_in_dropdown: showInDropdown,
      };

      if (copColour?.id) {
        await api.put(`/cop-colors/${copColour.id}`, payload);
        addToast('Cop colour updated successfully', 'success');
      } else {
        await api.post('/cop-colors', payload);
        addToast('Cop colour created successfully', 'success');
      }

      onSaved();
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed to save cop colour', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="cop-form">
      <div className="form-group" style={{ marginBottom: 16 }}>
        <label className="form-label">Colour Preview</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <CopSVGIcon colorHex={hexCode} uniqueSuffix="preview" />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text)' }}>{name || 'Sample Colour'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{hexCode}</div>
          </div>
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: 16 }}>
        <label className="form-label">Colour Name</label>
        <input
          type="text"
          className="form-input"
          placeholder="e.g. Red Cop, Royal Blue"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="form-group" style={{ marginBottom: 16 }}>
        <label className="form-label">Hex Code</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="color"
            value={hexCode.startsWith('#') ? hexCode : `#${hexCode}`}
            onChange={(e) => setHexCode(e.target.value.toUpperCase())}
            style={{ width: 42, height: 38, border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 4 }}
          />
          <input
            type="text"
            className="form-input"
            placeholder="e.g. #FF3333"
            value={hexCode}
            onChange={(e) => setHexCode(e.target.value)}
            style={{ flex: 1 }}
            required
          />
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: 24 }}>
        <label className="toggle-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
          <div>
            <div style={{ fontWeight: 500, fontSize: 14 }}>Show in TFO dropdown</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Controls whether this colour appears in the TFO Loading picker</div>
          </div>
          <input
            type="checkbox"
            checked={showInDropdown}
            onChange={(e) => setShowInDropdown(e.target.checked)}
            style={{ width: 18, height: 18, cursor: 'pointer' }}
          />
        </label>
      </div>

      <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving && <span className="spinner" />}
          {copColour ? 'Update Colour' : 'Add Colour'}
        </button>
      </div>
    </form>
  );
}
