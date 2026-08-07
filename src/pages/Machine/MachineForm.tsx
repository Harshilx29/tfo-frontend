import React, { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Machine } from '../../context/MachineDataContext';

interface Props {
  machine?: Machine | null;
  onSaved: () => void;
  onCancel: () => void;
}

export default function MachineForm({ machine, onSaved, onCancel }: Props) {
  const api = useApi();
  const { addToast } = useToast();

  const [machineNumber, setMachineNumber] = useState(machine?.machine_number ? String(machine.machine_number) : '');
  const [maxCapacity,   setMaxCapacity]   = useState(machine?.max_capacity   ? String(machine.max_capacity)   : '');
  const [vendorName,    setVendorName]    = useState(machine?.vendor_name    ?? '');
  const [vendorPhone,   setVendorPhone]   = useState(machine?.vendor_phone   ?? '');
  const [purchaseDate,  setPurchaseDate]  = useState(machine?.purchase_date  ?? '');
  const [enabled,       setEnabled]       = useState(machine?.enabled !== false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!machineNumber.trim()) {
      addToast('Machine number is required', 'error');
      return;
    }

    const num = parseInt(machineNumber, 10);
    if (isNaN(num) || num <= 0) {
      addToast('Machine number must be a positive integer', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        machine_number: num,
        max_capacity:   maxCapacity  ? parseInt(maxCapacity, 10) : null,
        vendor_name:    vendorName.trim()  || null,
        vendor_phone:   vendorPhone.trim() || null,
        purchase_date:  purchaseDate || null,
        enabled,
      };

      if (machine?.id) {
        await api.put(`/machines/${machine.id}`, payload);
        addToast('Machine updated successfully', 'success');
      } else {
        await api.post('/machines', payload);
        addToast('Machine added successfully', 'success');
      }

      onSaved();
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed to save machine', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Read-only occupancy badge when editing */}
      {machine && (
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label className="form-label">Current Occupancy</label>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', background: 'var(--surface-2)',
            borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
          }}>
            <span className={`badge ${machine.occupancy_status === 'free' ? 'badge-success' : 'badge-warning'}`}>
              {machine.occupancy_status === 'free' ? 'Free' : 'Loaded'}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Managed automatically by TFO load/unload events — not editable here.
            </span>
          </div>
        </div>
      )}

      <div className="form-group" style={{ marginBottom: 16 }}>
        <label className="form-label">Machine Number <span style={{ color: 'var(--danger)' }}>*</span></label>
        <input
          type="number"
          className="form-input"
          placeholder="e.g. 27"
          value={machineNumber}
          onChange={(e) => setMachineNumber(e.target.value)}
          min={1}
          required
          disabled={!!machine}
        />
        {machine && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Machine number cannot be changed after creation.
          </div>
        )}
      </div>

      <div className="form-group" style={{ marginBottom: 16 }}>
        <label className="form-label">Max Capacity</label>
        <input
          type="number"
          className="form-input"
          placeholder="e.g. 200"
          value={maxCapacity}
          onChange={(e) => setMaxCapacity(e.target.value)}
          min={1}
        />
      </div>

      <div className="form-group" style={{ marginBottom: 16 }}>
        <label className="form-label">Vendor Name</label>
        <input
          type="text"
          className="form-input"
          placeholder="e.g. Textile Machines Ltd."
          value={vendorName}
          onChange={(e) => setVendorName(e.target.value)}
        />
      </div>

      <div className="form-group" style={{ marginBottom: 16 }}>
        <label className="form-label">Vendor Phone</label>
        <input
          type="text"
          className="form-input"
          placeholder="e.g. +91 98765 43210"
          value={vendorPhone}
          onChange={(e) => setVendorPhone(e.target.value)}
        />
      </div>

      <div className="form-group" style={{ marginBottom: 16 }}>
        <label className="form-label">Purchase Date</label>
        <input
          type="date"
          className="form-input"
          value={purchaseDate}
          onChange={(e) => setPurchaseDate(e.target.value)}
        />
      </div>

      <div className="form-group" style={{ marginBottom: 24 }}>
        <label className="toggle-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
          <div>
            <div style={{ fontWeight: 500, fontSize: 14 }}>Enabled</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Disabled machines are hidden from the TFO machine picker and won't appear in the occupancy grid.
            </div>
          </div>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
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
          {machine ? 'Update Machine' : 'Add Machine'}
        </button>
      </div>
    </form>
  );
}
