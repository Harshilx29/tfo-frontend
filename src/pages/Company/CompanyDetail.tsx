import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Package } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { usePermission } from '../../hooks/usePermission';
import { useCompanyData } from '../../context/CompanyDataContext';
import CompanyDrawer from './CompanyDrawer';
import './Company.css';

interface Company {
  id: string;
  name: string;
  address: string | null;
  gst_number: string | null;
  phone_number: string | null;
  show_in_dropdown: boolean;
}

interface Batch {
  uid: string;
  date: string;
  yarn_type: string | null;
  lot_number: string | null;
}

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const canManage = profile?.role === 'admin' || usePermission('company.manage');
  const api = useApi();
  const { companies, loadingCompanies, refreshCompanies } = useCompanyData();

  const company = companies.find(c => c.id === id) || null;
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);

  const loadBatches = async () => {
    if (!id) return;
    try {
      setLoadingBatches(true);
      const bts = await api.get<Batch[]>(`/companies/${id}/batches`);
      setBatches(bts);
    } catch (err) {
      console.error('Failed to load company batches', err);
    } finally {
      setLoadingBatches(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, [id]);

  const isLoading = loadingCompanies || loadingBatches;

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
  }

  if (!company) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        <h2>Company not found</h2>
        <button className="btn btn-secondary mt-4" onClick={() => navigate('/company')}>
          Back to Directory
        </button>
      </div>
    );
  }

  const handleEditClick = () => {
    if (window.innerWidth <= 768) {
      navigate(`/company/edit/${id}`);
    } else {
      setShowEditModal(true);
    }
  };

  return (
    <div className="company-page">
      <header className="page-header" style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => navigate('/company')}>
          <ArrowLeft size={18} />
        </button>
        <h1 style={{ flex: 1, margin: 0, fontSize: 16 }}>{company.name}</h1>
        {canManage && (
          <button className="btn btn-ghost btn-sm btn-icon" onClick={handleEditClick}>
            <Edit2 size={16} />
          </button>
        )}
      </header>

      <div className="page-body" style={{ padding: '20px' }}>
        <div className="detail-card">
          <div className="detail-row">
            <span className="detail-label">GST Number</span>
            <span className="detail-value">{company.gst_number || '—'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Phone</span>
            <span className="detail-value">{company.phone_number || '—'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Address</span>
            <span className="detail-value">{company.address || '—'}</span>
          </div>
        </div>

        <h2 style={{ marginTop: 32, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <Package size={16} />
          Associated Batches ({batches.length})
        </h2>

        {batches.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No batches associated with this company yet.</div>
        ) : (
          <ul className="batch-list">
            {batches.map(b => (
              <li key={b.uid} className="batch-item" onClick={() => navigate(`/track/${b.uid}`)}>
                <div className="batch-header">
                  <span className="batch-uid">{b.uid}</span>
                  <span className="batch-date">{new Date(b.date).toLocaleDateString()}</span>
                </div>
                <div className="batch-details">
                  {b.yarn_type && <span>{b.yarn_type}</span>}
                  {b.lot_number && <span> • Lot: {b.lot_number}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showEditModal && (
        <CompanyDrawer
          company={company}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            setShowEditModal(false);
            void refreshCompanies();
          }}
        />
      )}
    </div>
  );
}
