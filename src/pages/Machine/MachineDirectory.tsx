import { useState, useEffect } from 'react';
import { Cpu, Plus, Search, Edit2, MonitorOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePermission } from '../../hooks/usePermission';
import { useMachineData, Machine } from '../../context/MachineDataContext';
import MachineDrawer from './MachineDrawer';

export default function MachineDirectory() {
  const { machines, loadingMachines: loading, refreshMachines } = useMachineData();
  const [search, setSearch]           = useState('');
  const [editingMachine, setEditing]  = useState<Machine | null>(null);
  const [showDrawer, setShowDrawer]   = useState(false);
  const [isMobile, setIsMobile]       = useState(window.innerWidth <= 768);

  const { profile } = useAuth();
  const canManage = profile?.role === 'admin' || usePermission('machine.manage');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const filtered = machines.filter((m) => {
    const q = search.toLowerCase();
    return (
      String(m.machine_number).includes(q) ||
      (m.vendor_name ?? '').toLowerCase().includes(q)
    );
  });

  const handleAddClick = () => {
    setEditing(null);
    setShowDrawer(true);
  };

  const handleEditClick = (m: Machine) => {
    setEditing(m);
    setShowDrawer(true);
  };

  // ── Mobile guard ──────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="page-container" style={{ padding: 24, textAlign: 'center' }}>
        <div className="card" style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <MonitorOff size={48} style={{ color: 'var(--text-muted)' }} />
          <h2>Desktop Only Feature</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 400, margin: 0 }}>
            Machine Management is designed for desktop and PC screens. Please access this page from a larger screen.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="cop-directory-page">
      <header className="page-header" style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: 20, margin: 0 }}>
          <Cpu size={22} />
          Machine Management
        </h1>
        {canManage && (
          <button className="btn btn-primary btn-sm" onClick={handleAddClick} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} /> Add Machine
          </button>
        )}
      </header>

      <div className="page-body" style={{ padding: 24 }}>
        {/* Summary bar */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
          {[
            { label: 'Total',  value: machines.filter(m => m.enabled).length,                              color: 'var(--primary)' },
            { label: 'Free',   value: machines.filter(m => m.enabled && m.occupancy_status === 'free').length,   color: 'var(--success)' },
            { label: 'Loaded', value: machines.filter(m => m.enabled && m.occupancy_status === 'loaded').length, color: 'var(--warning)' },
            { label: 'Retired', value: machines.filter(m => !m.enabled).length,                            color: 'var(--text-muted)' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card" style={{ padding: '10px 18px', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 90 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="search-bar-container" style={{ marginBottom: 20, position: 'relative', maxWidth: 400 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="search-input"
            placeholder="Search by machine number or vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading machines...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            No machines found.{machines.length === 0 && ' Run the migration SQL to seed initial machines.'}
          </div>
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', textAlign: 'left', fontSize: 12, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px' }}>#</th>
                  <th style={{ padding: '12px 16px' }}>Machine No</th>
                  <th style={{ padding: '12px 16px' }}>Max Capacity</th>
                  <th style={{ padding: '12px 16px' }}>Vendor</th>
                  <th style={{ padding: '12px 16px' }}>Vendor Phone</th>
                  <th style={{ padding: '12px 16px' }}>Occupancy</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  {canManage && <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, idx) => (
                  <tr
                    key={m.id}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      transition: 'background-color 0.15s',
                      opacity: m.enabled ? 1 : 0.55,
                    }}
                  >
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12 }}>{idx + 1}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 15 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Cpu size={14} style={{ color: 'var(--primary)' }} />
                        M-{m.machine_number}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {m.max_capacity ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {m.vendor_name ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {m.vendor_phone ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge ${m.occupancy_status === 'free' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: 12 }}>
                        {m.occupancy_status === 'free' ? 'Free' : 'Loaded'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge ${m.enabled ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: 11 }}>
                        {m.enabled ? 'Active' : 'Retired'}
                      </span>
                    </td>
                    {canManage && (
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => handleEditClick(m)}
                          title="Edit machine"
                        >
                          <Edit2 size={15} />
                        </button>
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
        <MachineDrawer
          machine={editingMachine}
          onClose={() => setShowDrawer(false)}
          onSaved={() => {
            setShowDrawer(false);
            void refreshMachines();
          }}
        />
      )}
    </div>
  );
}
