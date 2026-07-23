import { useAuth } from '../context/AuthContext';

/**
 * usePermission(key) — generic permission checker.
 *
 * Returns true if:
 *  - The user is an admin (bypasses all permission checks), OR
 *  - The user's permissions Set contains the given key with granted=true.
 *
 * Returns false for:
 *  - Unauthenticated users
 *  - Pending/suspended/rejected users
 *  - Users missing the specific permission
 *
 * Usage:
 *   const canSave = usePermission('track.winding.save');
 */
export function usePermission(key: string): boolean {
  const { profile, permissions } = useAuth();

  if (!profile) return false;
  if (profile.role === 'admin') return true;
  if (profile.status !== 'approved') return false;

  return permissions.has(key);
}
