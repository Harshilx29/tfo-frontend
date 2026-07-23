import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import CompanyForm, { Company } from './CompanyForm';
import './Company.css';

export default function CompanyFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const api = useApi();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (id) {
      api.get<Company>(`/companies/${id}`)
        .then(setCompany)
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [id, api]);

  const handleSaved = () => {
    navigate(-1); // Go back
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className="company-page mobile-form-page">
      <header className="page-header" style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={handleCancel}>
          <ArrowLeft size={18} />
        </button>
        <h1 style={{ flex: 1, margin: 0, fontSize: 16 }}>{id ? 'Edit Company' : 'Add Company'}</h1>
      </header>

      <div className="page-body" style={{ flex: 1, padding: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
        ) : (
          <CompanyForm 
            company={company}
            onCancel={handleCancel}
            onSaved={handleSaved}
          />
        )}
      </div>
    </div>
  );
}
