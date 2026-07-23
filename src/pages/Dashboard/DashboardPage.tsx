import { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { GitBranch, Package, Layers, Flame, Scissors, Settings } from 'lucide-react';

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
