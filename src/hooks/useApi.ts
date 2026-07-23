import { useMemo } from 'react';
import { useTempAccess } from '../context/TempAccessContext';
import { createApiClient } from '../lib/api';

/**
 * useApi() — returns a pre-configured API client.
 *
 * - Cookie auth is always included automatically (credentials: 'include').
 * - For anonymous temp-link sessions, adds the X-Temp-Token header.
 */
export function useApi() {
  const { tempAccess } = useTempAccess();
  return useMemo(
    () => createApiClient(tempAccess?.token ?? undefined),
    [tempAccess?.token]
  );
}
