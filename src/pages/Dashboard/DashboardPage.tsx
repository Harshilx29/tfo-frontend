import { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { GitBranch, Package, Layers, Flame, Scissors, Settings, Cpu } from 'lucide-react';

interface MachineOccupancyItem {
  machine_number: number;
  occupancy_status: 'free' | 'loaded';
  enabled: boolean;
}

interface Summary {
  totalBatches: number;
  stages: {
    winding: number;
    tfo: number;
    boiler: number;
    warping: number;
    machine: number;
  };
  recentBatches: { uid: string; file_number: string | null; created_at: string }[];
  machineOccupancy: {
    total: number;
    loaded: number;
    free: number;
    machines: MachineOccupancyItem[];
  };
}

const STAGE_ICONS = {
  winding: <Scissors size={16} />,
  tfo:     <Settings size={16} />,
  boiler:  <Flame size={16} />,
  warping: <Layers size={16} />,
  machine: <GitBranch size={16} />,
};

export default function DashboardPage() {
  const api = useApi();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    api.get<Summary>('/dashboard/summary')
      .then(setSummary)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
      </div>

      <div className="page-body">
        {loading && (
          <div className="flex-center" style={{ paddingTop: 60 }}>
            <span className="spinner" />
          </div>
        )}

        {error && (
          <div className="card card-body" style={{ color: 'var(--danger)', maxWidth: 480 }}>
            {error}
          </div>
        )}

        {summary && (
          <>
            {/* Total batches hero */}
            <div className="stat-card" style={{ marginBottom: 24, maxWidth: 280 }}>
              <div className="stat-label flex gap-2 items-center">
                <Package size={13} /> Total Batches
              </div>
              <div className="stat-value">{summary.totalBatches}</div>
              <div className="stat-desc">all UIDs in the system</div>
            </div>

            {/* Per-stage grid */}
            <h2 style={{ marginBottom: 12, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Stage Counts
            </h2>
            <div className="stat-grid" style={{ marginBottom: 32 }}>
              {(Object.entries(summary.stages) as [string, number][]).map(([stage, count]) => (
                <div className="stat-card" key={stage}>
                  <div className="stat-label flex gap-2 items-center">
                    {STAGE_ICONS[stage as keyof typeof STAGE_ICONS]}
                    {stage.charAt(0).toUpperCase() + stage.slice(1)}
                  </div>
                  <div className="stat-value">{count}</div>
                  <div className="stat-desc">records saved</div>
                </div>
              ))}
            </div>

            {/* Machine Occupancy Grid */}
            {summary.machineOccupancy && summary.machineOccupancy.machines.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h2 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>
                    Machine Occupancy
                  </h2>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
                      Free: <strong style={{ color: 'var(--text)' }}>{summary.machineOccupancy.free}</strong>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warning)', display: 'inline-block' }} />
                      Loaded: <strong style={{ color: 'var(--text)' }}>{summary.machineOccupancy.loaded}</strong>
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      of {summary.machineOccupancy.total} active
                    </span>
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))',
                  gap: 8,
                  marginBottom: 32,
                }}>
                  {summary.machineOccupancy.machines.map((m) => {
                    const isLoaded  = m.occupancy_status === 'loaded';
                    const isRetired = !m.enabled;
                    return (
                      <div
                        key={m.machine_number}
                        title={`Machine ${m.machine_number} — ${isRetired ? 'Retired' : isLoaded ? 'Loaded' : 'Free'}`}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 5,
                          padding: '10px 6px',
                          borderRadius: 'var(--radius-md)',
                          border: `1.5px solid ${isRetired ? 'var(--border)' : isLoaded ? 'var(--warning)' : 'var(--success)'}`,
                          background: isRetired
                            ? 'var(--surface-2)'
                            : isLoaded
                            ? 'rgba(var(--warning-rgb, 234, 179, 8), 0.08)'
                            : 'rgba(var(--success-rgb, 16, 185, 129), 0.06)',
                          opacity: isRetired ? 0.45 : 1,
                          transition: 'transform 0.1s',
                          cursor: 'default',
                        }}
                      >
                        <Cpu
                          size={16}
                          style={{
                            color: isRetired ? 'var(--text-muted)' : isLoaded ? 'var(--warning)' : 'var(--success)',
                          }}
                        />
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                          {m.machine_number}
                        </span>
                        <span style={{
                          fontSize: 9,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.03em',
                          color: isRetired ? 'var(--text-muted)' : isLoaded ? 'var(--warning)' : 'var(--success)',
                        }}>
                          {isRetired ? 'OFF' : isLoaded ? 'ON' : 'FREE'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Recent batches */}
            {summary.recentBatches.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <h2>Recent Batches</h2>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>UID</th>
                        <th>File Number</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.recentBatches.map((b) => (
                        <tr key={b.uid}>
                          <td className="font-mono" style={{ fontSize: 12.5 }}>{b.uid}</td>
                          <td className="text-muted">{b.file_number ?? '—'}</td>
                          <td className="text-muted text-sm">
                            {new Date(b.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
