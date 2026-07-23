const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3001';

async function request<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
    ...(options.headers as Record<string, string> | undefined),
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include', // always send httpOnly session cookies
    cache: 'no-store', // explicitly tell browser not to cache
  });

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`;
    try {
      const json = await response.json();
      errorMsg = json.error || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}

/**
 * API client factory.
 *
 * @param tempToken Optional X-Temp-Token for anonymous read-only access link sessions.
 *                  Cookie auth is always included via `credentials: 'include'`.
 */
export function createApiClient(tempToken?: string) {
  const extraHeaders: Record<string, string> = tempToken
    ? { 'X-Temp-Token': tempToken }
    : {};

  return {
    get: <T = unknown>(path: string) =>
      request<T>(path, { method: 'GET', headers: extraHeaders }),

    post: <T = unknown>(path: string, body: unknown) =>
      request<T>(path, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: extraHeaders,
      }),

    put: <T = unknown>(path: string, body: unknown) =>
      request<T>(path, {
        method: 'PUT',
        body: JSON.stringify(body),
        headers: extraHeaders,
      }),

    patch: <T = unknown>(path: string, body: unknown) =>
      request<T>(path, {
        method: 'PATCH',
        body: JSON.stringify(body),
        headers: extraHeaders,
      }),

    delete: <T = unknown>(path: string) =>
      request<T>(path, { method: 'DELETE', headers: extraHeaders }),
  };
}
