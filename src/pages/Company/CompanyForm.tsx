import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';

export interface Company {
  id: string;
  name: string;
  address: string | null;
  gst_number: string | null;
  phone_number: string | null;
  show_in_dropdown: boolean;
}

interface Props {
  company?: Company | null;
  onCancel: () => void;
  onSaved: () => void;
}

export default function CompanyForm({ company, onCancel, onSaved }: Props) {
  const { addToast } = useToast();
  const api = useApi();
  const [name, setName] = useState(company?.name || '');
  const [address, setAddress] = useState(company?.address || '');
  const [gstNumber, setGstNumber] = useState(company?.gst_number || '');
  const [phoneNumber, setPhoneNumber] = useState(company?.phone_number || '');
  const [showInDropdown, setShowInDropdown] = useState(company?.show_in_dropdown ?? true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (company) {
      setName(company.name);
      setAddress(company.address || '');
      setGstNumber(company.gst_number || '');
      setPhoneNumber(company.phone_number || '');
      setShowInDropdown(company.show_in_dropdown);
    }
  }, [company]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('Name is required', 'error');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        address: address.trim() || null,
        gst_number: gstNumber.trim() || null,
        phone_number: phoneNumber.trim() || null,
        show_in_dropdown: showInDropdown,
      };

      if (company?.id) {
        await api.put(`/companies/${company.id}`, payload);
        addToast('Company updated', 'success');
      } else {
        await api.post('/companies', payload);
        addToast('Company created', 'success');
      }
      onSaved();
    } catch (err: any) {
      addToast(err?.error || 'Failed to save company', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="company-form" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="company-form-fields" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="form-group">
          <label className="form-label">Name *</label>
          <input 
            type="text" 
            className="form-input"
            value={name} 
            onChange={e => setName(e.target.value)} 
            placeholder="Company Name" 
            autoFocus 
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">GST Number</label>
          <input 
            type="text" 
            className="form-input"
            value={gstNumber} 
            onChange={e => setGstNumber(e.target.value)} 
            placeholder="e.g. 22AAAAA0000A1Z5" 
          />
        </div>

        <div className="form-group">
          <label className="form-label">Address</label>
          <textarea 
            className="form-textarea"
            value={address} 
            onChange={e => setAddress(e.target.value)} 
            placeholder="Full address" 
            rows={3}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Phone Number</label>
          <input 
            type="text" 
            className="form-input"
            value={phoneNumber} 
            onChange={e => setPhoneNumber(e.target.value)} 
            placeholder="Phone number" 
          />
        </div>

        <div className="form-group checkbox-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
          <input 
            type="checkbox" 
            className="form-checkbox"
            id="showDropdownCheck"
            checked={showInDropdown} 
            onChange={e => setShowInDropdown(e.target.checked)} 
          />
          <label htmlFor="showDropdownCheck">Show in Winding dropdown</label>
        </div>
      </div>

      <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '0 20px 24px 20px' }}>
        <button type="button" className="btn btn-secondary" style={{ color: 'var(--text-muted)' }} onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary btn-lg" disabled={loading || !name.trim()}>
          {loading ? 'Saving...' : 'Save Company'}
        </button>
      </div>
    </form>
  );
}
