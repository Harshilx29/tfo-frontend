import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import { useTempAccess } from '../../context/TempAccessContext';

/**
 * AppShell — the outer frame: sidebar + main content area.
 */
export default function AppShell() {
  const { isReadOnly, tempAccess } = useTempAccess();
  const location = useLocation();

  // Hide mobile bottom nav when viewing a batch detail page (track/:uid)
  const isBatchDetail = /^\/track\/[^/]+/.test(location.pathname);

  // Holds the pending restore-timer ID so focusin can cancel it before it fires,
  // preventing the nav from flickering visible when moving between inputs quickly.
  const restoreTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Bug fix: On iOS Safari the fixed bottom nav floats above the virtual
    // keyboard. Hiding it while any input/textarea is focused is the simplest
    // reliable solution — the nav isn't useful behind a keyboard anyway.
    const MOBILE_BP = 768;
    const isFormField = (el: HTMLElement) =>
      el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT';

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (window.innerWidth <= MOBILE_BP && isFormField(target)) {
        // Cancel any pending restore so the nav doesn't flicker when moving
        // directly from one field to another (blur → focus in quick succession).
        if (restoreTimer.current !== null) {
          clearTimeout(restoreTimer.current);
          restoreTimer.current = null;
        }
        const nav = document.querySelector('.sidebar-container') as HTMLElement | null;
        if (nav) nav.style.display = 'none';
      }
    };

    const handleBlur = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (window.innerWidth <= MOBILE_BP && isFormField(target)) {
        // Delay the restore so the keyboard finishes closing before we reshow
        // the nav, and so a rapid focus on the next field can cancel this timer.
        restoreTimer.current = setTimeout(() => {
          restoreTimer.current = null;
          const nav = document.querySelector('.sidebar-container') as HTMLElement | null;
          if (nav) nav.style.display = '';
        }, 150);
      }
    };

    document.addEventListener('focusin', handleFocus, true);
    document.addEventListener('focusout', handleBlur, true);
    return () => {
      document.removeEventListener('focusin', handleFocus, true);
      document.removeEventListener('focusout', handleBlur, true);
      if (restoreTimer.current !== null) clearTimeout(restoreTimer.current);
    };
  }, []);

  return (
    <div className="app-shell" style={isReadOnly ? { paddingTop: 32 } : undefined}>
      <div className={`sidebar-container${isBatchDetail ? ' hide-mobile-nav' : ''}`}>
        <Sidebar />
      </div>

      {isReadOnly && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1050,
            background: '#111', color: '#fff', textAlign: 'center',
            padding: '6px 16px', fontSize: 12, fontWeight: 500, letterSpacing: '0.02em',
            height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          🔒 Read-only access
          {tempAccess?.label ? ` — ${tempAccess.label}` : ''}
          {' · '}
          Expires {new Date(tempAccess?.expires_at ?? '').toLocaleString()}
        </div>
      )}

      <div className="main-area">
        <Outlet />
      </div>
    </div>
  );
}
