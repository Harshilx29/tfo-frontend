import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Search } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { usePermission } from '../../hooks/usePermission';
import { useCompanyData } from '../../context/CompanyDataContext';
import CompanyDrawer from './CompanyDrawer';
import './Company.css';

interface Company {
  id: string;
  name: string;
  gst_number: string | null;
  address: string | null;
}
export default function CompanyDirectory() {
  const { companies, loadingCompanies: loading, refreshCompanies } = useCompanyData();
  const [search, setSearch] = useState(() => sessionStorage.getItem('tfo_company_search') || '');
  const [showModal, setShowModal] = useState(false);
  const pageBodyRef = useRef<HTMLDivElement>(null);
  
  const { profile } = useAuth();
  const canManage = profile?.role === 'admin' || usePermission('company.manage');
  const navigate = useNavigate();

  // Persist search state
  useEffect(() => {
    try {
      sessionStorage.setItem('tfo_company_search', search);
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
        sessionStorage.setItem('tfo_company_scroll', String(el.scrollTop || window.scrollY || 0));
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
      const savedScroll = sessionStorage.getItem('tfo_company_scroll');
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

  const filtered = companies.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.gst_number && c.gst_number.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAddClick = () => {
    if (window.innerWidth <= 768) {
      navigate('/company/new');
    } else {
      setShowModal(true);
    }
  };

  return (
    <div className="company-page">
      <header className="page-header" style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building2 size={20} />
          Companies
        </h1>
        {canManage && (
          <button className="btn btn-primary btn-sm" onClick={handleAddClick}>
            <Plus size={16} /> Add Company
          </button>
        )}
      </header>

      <div className="page-body" ref={pageBodyRef}>
        <div className="search-bar-container" style={{ margin: '16px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="search-input"
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            No companies found.
          </div>
        ) : (
          <ul className="company-list">
            {filtered.map(c => (
              <li key={c.id} className="company-item" onClick={() => navigate(`/company/${c.id}`)}>
                <div className="company-item-main">
                  <div className="company-name">{c.name}</div>
                  {c.gst_number && <div className="company-gst">GST: {c.gst_number}</div>}
                </div>
                <div className="company-chevron">›</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showModal && (
        <CompanyDrawer 
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            void refreshCompanies();
          }}
        />
      )}
    </div>
  );
}
