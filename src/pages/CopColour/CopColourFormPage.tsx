import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import CopColourForm from './CopColourForm';
import { CopColour, useCopColourData } from '../../context/CopColourDataContext';

export default function CopColourFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const api = useApi();
  const { refreshCopColours } = useCopColourData();
  const [copColour, setCopColour] = useState<CopColour | null>(null);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (id) {
      setLoading(true);
      api
        .get<CopColour>(`/cop-colors/${id}`)
        .then(setCopColour)
        .catch((err) => {
          console.error(err);
          navigate('/cop-colors');
        })
        .finally(() => setLoading(false));
    }
  }, [id, api, navigate]);

  const handleSaved = () => {
    void refreshCopColours();
    navigate('/cop-colors');
  };

  return (
    <div className="page-container" style={{ padding: 20, maxWidth: 600, margin: '0 auto' }}>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/cop-colors')} style={{ marginBottom: 16 }}>
        <ArrowLeft size={16} /> Back to Cop Colours
      </button>

      <div className="card" style={{ padding: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>
          {id ? 'Edit Cop Colour' : 'Add Cop Colour'}
        </h1>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div>
        ) : (
          <CopColourForm
            copColour={copColour}
            onSaved={handleSaved}
            onCancel={() => navigate('/cop-colors')}
          />
        )}
      </div>
    </div>
  );
}
