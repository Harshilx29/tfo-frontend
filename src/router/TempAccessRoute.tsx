import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useTempAccess } from '../context/TempAccessContext';

const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3001';

type Status = 'loading' | 'valid' | 'invalid';

/**
 * TempAccessRoute — validates a temp access token and stores it in context.
 * Route: /access/:token
 *
 * On success: redirects to the first allowed page (dashboard or track).
 * On failure: shows an error message.
 */
export default function TempAccessRoute() {
  const { token } = useParams<{ token: string }>();
  const { setTempAccess } = useTempAccess();
  const [status, setStatus]       = useState<Status>('loading');
  const [firstPage, setFirstPage] = useState('dashboard');
  const [errorMsg, setErrorMsg]   = useState('');

  useEffect(() => {
    if (!token) { setStatus('invalid'); setErrorMsg('No token provided.'); return; }

    fetch(`${API_URL}/temp-links/validate/${token}`)
      .then(async (r) => {
        const data = await r.json();
        if (r.ok && data.valid) {
          setTempAccess({
            token,
            allowed_pages: data.allowed_pages ?? ['dashboard'],
            label: data.label ?? null,
            expires_at: data.expires_at,
          });
          setFirstPage(data.allowed_pages?.[0] ?? 'dashboard');
          setStatus('valid');
        } else {
          setErrorMsg(data.error || 'Invalid or expired link.');
          setStatus('invalid');
        }
      })
      .catch(() => {
        setErrorMsg('Could not connect to the server.');
        setStatus('invalid');
      });
  }, [token, setTempAccess]);

  if (status === 'loading') {
    return (
      <div className="loading-screen">
        <span className="spinner" />
        Validating access link…
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="auth-title">Link Invalid</h1>
          <p className="auth-subtitle">{errorMsg}</p>
          <a href="/login" className="btn btn-secondary w-full" style={{ marginTop: 8 }}>
            Sign in instead
          </a>
        </div>
      </div>
    );
  }

  return <Navigate to={`/${firstPage}`} replace />;
}
