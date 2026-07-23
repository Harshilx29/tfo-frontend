import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';

interface PermCatalogItem {
  key: string;
  label: string;
  category: string;
  description: string | null;
  granted: boolean;
}

interface Props {
  userId: string;
  currentPerms: Record<string, boolean>;
  onChanged: () => void;
}

export default function PermissionMatrix({ userId, onChanged }: Props) {
  const api = useApi();
  const { addToast } = useToast();
  const [items, setItems]     = useState<PermCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [localGrants, setLocalGrants] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get<PermCatalogItem[]>(`/users/${userId}/permissions`)
      .then((data) => {
        setItems(data);
        const grants: Record<string, boolean> = {};
        data.forEach((item) => {
          grants[item.key] = item.granted;
        });
        setLocalGrants(grants);
      })
      .catch((e) => addToast(e.message, 'error'))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleToggleLocal = (key: string) => {
    setLocalGrants((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const hasChanges = items.some((item) => localGrants[item.key] !== item.granted);

  const handleSave = async () => {
    setSaving(true);
    try {
      const changedItems = items.filter((item) => localGrants[item.key] !== item.granted);
      const promises = changedItems.map((item) => {
        const nextVal = localGrants[item.key];
        return api.patch(`/users/${userId}/permissions/${item.key}`, { granted: nextVal });
      });

      await Promise.all(promises);
      addToast('Permissions updated successfully', 'success');

      // Update the base items list to match the saved localGrants
      setItems((prev) =>
        prev.map((item) => ({
          ...item,
          granted: localGrants[item.key] ?? item.granted,
        }))
      );
      onChanged();
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Failed to save permissions', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2" style={{ padding: '10px 0', color: 'var(--text-muted)', fontSize: 13 }}>
        <span className="spinner" /> Loading permissions…
      </div>
    );
  }

  // Group by category
  const grouped = items.reduce<Record<string, PermCatalogItem[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div>
      <div
        className="flex-between"
        style={{ marginBottom: 12 }}
      >
        <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          Permissions
        </h3>
        <span className="text-xs text-muted">
          {Object.values(localGrants).filter(Boolean).length} / {items.length} granted
        </span>
      </div>

      <div className="perm-grid">
        {Object.entries(grouped).map(([cat, perms]) => (
          <div key={cat} className="perm-group">
            <div className="perm-group-header">{cat}</div>
            {perms.map((p) => (
              <div key={p.key} className="perm-item">
                <div>
                  <div className="perm-item-label">{p.label}</div>
                  {p.description && (
                    <div className="perm-item-desc">{p.description}</div>
                  )}
                </div>
                <label className="toggle" title={p.key}>
                  <input
                    type="checkbox"
                    checked={localGrants[p.key] ?? false}
                    disabled={saving}
                    onChange={() => handleToggleLocal(p.key)}
                  />
                  <span className="toggle-track" />
                </label>
              </div>
            ))}
          </div>
        ))}
      </div>

      {hasChanges && (
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="btn btn-primary"
            disabled={saving}
            onClick={handleSave}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {saving && <span className="spinner" />}
            Save Permissions
          </button>
        </div>
      )}
    </div>
  );
}
