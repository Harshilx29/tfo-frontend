import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Plus, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePermission } from '../../hooks/usePermission';
import { useYarnData } from '../../context/YarnDataContext';
import YarnDrawer from './YarnDrawer';
import './Yarn.css';

export default function YarnDirectory() {
  const { yarns, loadingYarns: loading, refreshYarns } = useYarnData();
  const [search, setSearch] = useState(() => sessionStorage.getItem('tfo_yarn_search') || '');
  const [showModal, setShowModal] = useState(false);
  const pageBodyRef = useRef<HTMLDivElement>(null);

  const { profile } = useAuth();
  const canManage = profile?.role === 'admin' || usePermission('yarn.manage');
  const navigate = useNavigate();

  // Persist search state
  useEffect(() => {
    try {
      sessionStorage.setItem('tfo_yarn_search', search);
    } catch {
      // ignore
    }
  }, [search]);

  // Track scroll position
  useEffect(() => {
    const el = pageBodyRef.current;
    if (!el) return;

    const handleScroll = () => {
      try {
        sessionStorage.setItem('tfo_yarn_scroll', String(el.scrollTop || window.scrollY || 0));
      } catch {
        // ignore
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Restore scroll position when loading completes
  useEffect(() => {
    if (loading) return;
    try {
      const savedScroll = sessionStorage.getItem('tfo_yarn_scroll');
      if (savedScroll !== null) {
        const top = parseFloat(savedScroll);
        if (!isNaN(top) && top > 0) {
          requestAnimationFrame(() => {
            if (pageBodyRef.current) {
              pageBodyRef.current.scrollTop = top;
            }
            window.scrollTo(0, top);
          });
        }
      }
    } catch {
      // ignore
    }
  }, [loading]);

  const filtered = yarns.filter(y =>
    (y.whole_name || '').toLowerCase().includes(search.toLowerCase()) ||
    y.type.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddClick = () => {
    if (window.innerWidth <= 768) {
      navigate('/yarn/new');
    } else {
      setShowModal(true);
    }
  };

  return (
    <div className="yarn-page">
      <header className="page-header" style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={20} />
          Yarns
        </h1>
        {canManage && (
          <button className="btn btn-primary btn-sm" onClick={handleAddClick}>
            <Plus size={16} /> Add Yarn
          </button>
        )}
      </header>

      <div className="page-body" ref={pageBodyRef}>
        <div className="search-bar-container" style={{ margin: '16px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="search-input"
            placeholder="Search yarns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            No yarns found.
          </div>
        ) : (
          <ul className="yarn-list">
            {filtered.map(y => (
              <li key={y.id} className="yarn-item" onClick={() => navigate(`/yarn/${y.id}`)}>
                <div className="yarn-item-main">
                  <div className="yarn-name">{y.whole_name}</div>
                  <div className="yarn-type-badge">{y.type}</div>
                </div>
                <div className="yarn-chevron">›</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showModal && (
        <YarnDrawer
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            void refreshYarns();
          }}
        />
      )}
    </div>
  );
}
