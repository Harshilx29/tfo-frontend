import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Package } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { usePermission } from '../../hooks/usePermission';
import { useYarnData } from '../../context/YarnDataContext';
import YarnDrawer from './YarnDrawer';
import './Yarn.css';
import '../Company/Company.css';

interface Batch {
  uid: string;
  date: string;
  company: string | null;
  lot_number: string | null;
}

export default function YarnDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const canManage = profile?.role === 'admin' || usePermission('yarn.manage');
  const api = useApi();
  const { yarns, loadingYarns, refreshYarns } = useYarnData();

  const yarn = yarns.find(y => y.id === id) || null;
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);

  const loadBatches = async () => {
    if (!id) return;
    try {
      setLoadingBatches(true);
      const bts = await api.get<Batch[]>(`/yarns/${id}/batches`);
      setBatches(bts);
    } catch (err) {
      console.error('Failed to load yarn batches', err);
    } finally {
      setLoadingBatches(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, [id]);

  const isLoading = loadingYarns || loadingBatches;

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
  }

  if (!yarn) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        <h2>Yarn not found</h2>
        <button className="btn btn-secondary mt-4" onClick={() => navigate('/yarn')}>
          Back to Directory
        </button>
      </div>
    );
  }

  const handleEditClick = () => {
    if (window.innerWidth <= 768) {
      navigate(`/yarn/edit/${id}`);
    } else {
      setShowEditModal(true);
    }
  };

  return (
    <div className="yarn-page">
      <header className="page-header" style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => navigate('/yarn')}>
          <ArrowLeft size={18} />
        </button>
        <h1 style={{ flex: 1, margin: 0, fontSize: 16 }}>{yarn.whole_name}</h1>
        {canManage && (
          <button className="btn btn-secondary btn-sm" onClick={handleEditClick}>
            <Edit2 size={14} /> Edit
          </button>
        )}
      </header>

      <div className="page-body" style={{ padding: '16px', overflowY: 'auto' }}>
        <div className="detail-card">
          <div className="detail-row">
            <span className="detail-label">Whole Name</span>
            <span className="detail-value">{yarn.whole_name}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Denier</span>
            <span className="detail-value">{yarn.denier}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Filament</span>
            <span className="detail-value">{yarn.filament}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Colour</span>
            <span className="detail-value">{yarn.colour || '—'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Type</span>
            <span className="detail-value">{yarn.type}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Show in Winding Dropdown</span>
            <span className="detail-value">{yarn.show_in_dropdown ? 'Yes' : 'No'}</span>
          </div>
        </div>

        <h2 style={{ marginTop: 24, marginBottom: 12, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
          <Package size={14} /> Associated Batches ({batches.length})
        </h2>

        {batches.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-subtle)', fontSize: 13 }}>
            No batches found for this yarn.
          </div>
        ) : (
          <ul className="batch-list">
            {batches.map(b => (
              <li key={b.uid} className="batch-item" onClick={() => navigate(`/track/${b.uid}`)}>
                <div className="batch-header">
                  <span className="batch-uid">{b.uid}</span>
                  <span className="batch-date">{b.date}</span>
                </div>
                <div className="batch-details">
                  {b.company && <span>{b.company}</span>}
                  {b.lot_number && <span> · Lot: {b.lot_number}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showEditModal && (
        <YarnDrawer
          yarn={yarn}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            setShowEditModal(false);
            void refreshYarns();
          }}
        />
      )}
    </div>
  );
}
