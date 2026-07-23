import { useState, useEffect } from 'react';
import { Plus, Copy, Trash2, RefreshCw, Link2 } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';

interface TempLink {
  id: string;
  token: string;
  label: string | null;
  allowed_pages: string[];
  expires_at: string;
  max_uses: number | null;
  use_count: number;
  is_active: boolean;
  created_at: string;
}

const BASE_URL = window.location.origin;

export default function TempLinksManager() {
  const api = useApi();
  const { addToast } = useToast();

  const [links, setLinks]       = useState<TempLink[]>([]);
  const [loading, setLoading]   = useState(true);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  // Form state
  const [label, setLabel]       = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [maxUses, setMaxUses]   = useState('');

  const load = () => {
    api.get<TempLink[]>('/temp-links')
      .then((data) => setLinks(data.filter((l) => l.is_active)))
      .catch((e) => addToast(e.message, 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expiresAt) { addToast('Expiry date is required', 'error'); return; }

    setCreating(true);
    try {
      await api.post('/temp-links', {
        label:    label.trim() || null,
        expires_at: expiresAt,
        max_uses: maxUses ? parseInt(maxUses) : null,
        allowed_pages: ['dashboard', 'track'],
      });
      addToast('Temp link created', 'success');
      setLabel(''); setExpiresAt(''); setMaxUses('');
      load();
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Failed', 'error');
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: string) => {
    setRevoking(id);
    try {
      await api.delete(`/temp-links/${id}`);
      addToast('Link revoked', 'success');
      setLinks((prev) => prev.filter((l) => l.id !== id));
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Failed', 'error');
    } finally {
      setRevoking(null);
    }
  };

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${BASE_URL}/access/${token}`);
    addToast('Link copied to clipboard', 'success');
  };

  const isExpired = (l: TempLink) =>
    new Date(l.expires_at) < new Date() ||
    (l.max_uses !== null && l.use_count >= l.max_uses);

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <Link2 size={16} />
          <h2>Temporary Access Links</h2>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}>
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Create form */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <form onSubmit={handleCreate}>
          <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <div className="form-group">
              <label className="form-label">Label (optional)</label>
              <input
                className="form-input"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Client demo"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Expires At *</label>
              <input
                className="form-input"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Max Uses (optional)</label>
              <input
                className="form-input"
                type="number"
                min="1"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Unlimited"
              />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <button className="btn btn-primary btn-sm" type="submit" disabled={creating}>
              {creating ? <span className="spinner" /> : <Plus size={13} />}
              {creating ? 'Creating…' : 'Generate Link'}
            </button>
          </div>
        </form>
      </div>

      {/* Links list */}
      <div>
        {loading && (
          <div className="flex-center" style={{ padding: 24 }}>
            <span className="spinner" />
          </div>
        )}

        {!loading && links.length === 0 && (
          <div className="empty-state" style={{ padding: '32px 24px' }}>
            <Link2 size={32} />
            <div className="empty-title">No active links</div>
            <div className="empty-desc">Generated links will appear here</div>
          </div>
        )}

        {links.map((link) => {
          const expired = isExpired(link);
          return (
            <div key={link.id} className="link-item">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium" style={{ fontSize: 13.5 }}>
                    {link.label ?? 'Untitled link'}
                  </span>
                  {expired && (
                    <span className="badge badge-danger" style={{ fontSize: 10.5 }}>Expired</span>
                  )}
                </div>
                <div className="link-token">{link.token}</div>
                <div className="flex gap-3 mt-1" style={{ flexWrap: 'wrap' }}>
                  <span className="text-xs text-muted">
                    Pages: {link.allowed_pages.join(', ')}
                  </span>
                  <span className="text-xs text-muted">
                    Expires: {new Date(link.expires_at).toLocaleString()}
                  </span>
                  <span className="text-xs text-muted">
                    Uses: {link.use_count}{link.max_uses ? ` / ${link.max_uses}` : ''}
                  </span>
                </div>
              </div>

              <div className="btn-group">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => copyLink(link.token)}
                  title="Copy link"
                >
                  <Copy size={12} />
                  Copy
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => revoke(link.id)}
                  disabled={revoking === link.id}
                  title="Revoke"
                >
                  <Trash2 size={12} />
                  {revoking === link.id ? '…' : 'Revoke'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
