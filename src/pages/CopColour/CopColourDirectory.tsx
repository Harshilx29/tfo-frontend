import { useState, useEffect } from 'react';
import { Palette, Plus, Search, Edit2, Trash2, MonitorOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePermission } from '../../hooks/usePermission';
import { useCopColourData, CopColour } from '../../context/CopColourDataContext';
import CopColourDrawer from './CopColourDrawer';
import { CopSVGIcon } from '../../components/CopColourPicker';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';

export default function CopColourDirectory() {
  const { copColours, loadingCopColours: loading, refreshCopColours } = useCopColourData();
  const [search, setSearch] = useState('');
  const [editingColor, setEditingColor] = useState<CopColour | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const api = useApi();
  const { addToast } = useToast();
  const { profile } = useAuth();
  const canManage = profile?.role === 'admin' || usePermission('cop.manage');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const filtered = copColours.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.hex_code.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddClick = () => {
    setEditingColor(null);
    setShowDrawer(true);
  };

  const handleEditClick = (col: CopColour) => {
    setEditingColor(col);
    setShowDrawer(true);
  };

  const handleDeleteClick = async (col: CopColour) => {
    if (!window.confirm(`Are you sure you want to delete "${col.name}"?`)) return;

    try {
      await api.delete(`/cop-colors/${col.id}`);
      addToast(`Deleted "${col.name}"`, 'success');
      void refreshCopColours();
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed to delete colour', 'error');
    }
  };

  if (isMobile) {
    return (
      <div className="page-container" style={{ padding: 24, textAlign: 'center' }}>
        <div className="card" style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <MonitorOff size={48} style={{ color: 'var(--text-muted)' }} />
          <h2>Desktop Only Feature</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 400, margin: 0 }}>
            Cop Colours management is designed for desktop and PC screens. Please access this page from a larger screen.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="cop-directory-page">
      <header className="page-header" style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: 20, margin: 0 }}>
          <Palette size={22} />
          Cop Colours
        </h1>
        {canManage && (
          <button className="btn btn-primary btn-sm" onClick={handleAddClick} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} /> Add Cop Colour
          </button>
        )}
      </header>

      <div className="page-body" style={{ padding: 24 }}>
        <div className="search-bar-container" style={{ marginBottom: 20, position: 'relative', maxWidth: 400 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="search-input"
            placeholder="Search cop colours..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading cop colours...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            No cop colours found.
          </div>
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', textAlign: 'left', fontSize: 12, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px' }}>Icon</th>
                  <th style={{ padding: '12px 16px' }}>Colour Name</th>
                  <th style={{ padding: '12px 16px' }}>Hex Code</th>
                  <th style={{ padding: '12px 16px' }}>Show in Dropdown</th>
                  {canManage && <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((col) => (
                  <tr key={col.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.15s' }}>
                    <td style={{ padding: '12px 16px', width: 60 }}>
                      <CopSVGIcon colorHex={col.hex_code} uniqueSuffix={col.id} />
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text)' }}>
                      {col.name}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 14, height: 14, borderRadius: '50%', background: col.hex_code, border: '1px solid rgba(255,255,255,0.2)' }} />
                        <code style={{ fontSize: 13, background: 'var(--surface-2)', padding: '2px 6px', borderRadius: 4 }}>{col.hex_code}</code>
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge ${col.show_in_dropdown ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: 12 }}>
                        {col.show_in_dropdown ? 'Yes' : 'No'}
                      </span>
                    </td>
                    {canManage && (
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            onClick={() => handleEditClick(col)}
                            title="Edit"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            onClick={() => handleDeleteClick(col)}
                            title="Delete"
                            style={{ color: 'var(--danger)' }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showDrawer && (
        <CopColourDrawer
          copColour={editingColor}
          onClose={() => setShowDrawer(false)}
          onSaved={() => {
            setShowDrawer(false);
            void refreshCopColours();
          }}
        />
      )}
    </div>
  );
}
