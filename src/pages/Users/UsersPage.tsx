import { useState, useEffect, Fragment } from 'react';
import { ChevronDown, ChevronUp, Check, X, MinusCircle, RefreshCw } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import PermissionMatrix from './PermissionMatrix';
import TempLinksManager from './TempLinksManager';
import { useAuth } from '../../context/AuthContext';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  status: 'pending' | 'approved' | 'suspended' | 'rejected';
  role: 'admin' | 'user';
  created_at: string;
  permissions: Record<string, boolean>;
}

const STATUS_BADGE: Record<string, string> = {
  approved:  'badge-success',
  pending:   'badge-warning',
  suspended: 'badge-danger',
  rejected:  'badge-danger',
};

export default function UsersPage() {
  const api = useApi();
  const { addToast } = useToast();
  const { profile: myProfile } = useAuth();

  const [users, setUsers]       = useState<UserProfile[]>([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = (showSpinner: any = true) => {
    const shouldSpinner = showSpinner === true;
    if (shouldSpinner) setLoading(true);
    api.get<UserProfile[]>('/users')
      .then(setUsers)
      .catch((e) => addToast(e.message, 'error'))
      .finally(() => {
        if (shouldSpinner) setLoading(false);
      });
  };

  useEffect(() => {
    load(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setStatus = async (id: string, status: string) => {
    setUpdating(id);
    try {
      await api.patch(`/users/${id}/status`, { status });
      addToast(`Status updated to "${status}"`, 'success');
      load();
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Failed', 'error');
    } finally {
      setUpdating(null);
    }
  };

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => (prev === id ? null : id));

  if (loading) {
    return (
      <>
        <div className="page-header"><h1 className="page-title">Users</h1></div>
        <div className="page-body flex-center" style={{ paddingTop: 60 }}>
          <span className="spinner" />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Users</h1>
        <button className="btn btn-ghost btn-sm" onClick={load} title="Refresh">
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      <div className="page-body">
        {/* ── Users table ───────────────────────────────── */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h2>All Users</h2>
            <span className="text-xs text-muted">{users.length} total</span>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf    = u.id === myProfile?.id;
                  const isExpanded = expanded === u.id;
                  const initials  = u.full_name
                    ? u.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
                    : u.email[0]?.toUpperCase() ?? '?';

                  return (
                    <Fragment key={u.id}>
                      <tr>
                        {/* User cell */}
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="user-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                              {u.avatar_url
                                ? <img src={u.avatar_url} alt={u.full_name ?? ''} />
                                : initials}
                            </div>
                            <div>
                              <div className="font-medium" style={{ fontSize: 13.5 }}>
                                {u.full_name ?? '—'}
                                {isSelf && (
                                  <span className="text-xs text-muted" style={{ marginLeft: 6 }}>(you)</span>
                                )}
                              </div>
                              <div className="text-xs text-muted">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td>
                          <span className={`badge ${u.role === 'admin' ? 'badge-info' : 'badge-neutral'}`}>
                            {u.role}
                          </span>
                        </td>

                        {/* Status */}
                        <td>
                          <span className={`badge ${STATUS_BADGE[u.status] ?? 'badge-neutral'}`}>
                            <span className="badge-dot" />
                            {u.status}
                          </span>
                        </td>

                        {/* Joined */}
                        <td className="text-muted text-sm">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>

                        {/* Actions */}
                        <td>
                          {!isSelf && (
                            <div className="btn-group">
                              {u.status !== 'approved' && (
                                <button
                                  className="btn btn-success btn-sm"
                                  disabled={updating === u.id}
                                  onClick={() => setStatus(u.id, 'approved')}
                                  title="Approve"
                                >
                                  <Check size={12} /> Approve
                                </button>
                              )}
                              {u.status === 'approved' && (
                                <button
                                  className="btn btn-danger btn-sm"
                                  disabled={updating === u.id}
                                  onClick={() => setStatus(u.id, 'suspended')}
                                  title="Suspend"
                                >
                                  <MinusCircle size={12} /> Suspend
                                </button>
                              )}
                              {u.status !== 'rejected' && u.status !== 'approved' && (
                                <button
                                  className="btn btn-ghost btn-sm"
                                  disabled={updating === u.id}
                                  onClick={() => setStatus(u.id, 'rejected')}
                                  title="Reject"
                                >
                                  <X size={12} /> Reject
                                </button>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Expand toggle */}
                        <td>
                          {u.role !== 'admin' && (
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              onClick={() => toggleExpanded(u.id)}
                              title="Permissions"
                            >
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Expanded permission matrix */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} style={{ padding: 0 }}>
                            <div style={{
                              background: 'var(--surface-2)',
                              borderBottom: '1px solid var(--border)',
                              padding: '20px 24px',
                            }}>
                              <PermissionMatrix
                                userId={u.id}
                                currentPerms={u.permissions}
                                onChanged={() => load(false)}
                              />
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Temp links ────────────────────────────────── */}
        <TempLinksManager />
      </div>
    </>
  );
}
