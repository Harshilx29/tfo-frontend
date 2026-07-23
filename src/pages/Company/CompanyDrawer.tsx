import React, { useEffect, useState } from 'react';
import CompanyForm, { Company } from './CompanyForm';
import './Company.css';

interface Props {
  company?: Company | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function CompanyDrawer({ company, onClose, onSaved }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Trigger slide in animation after mount
    requestAnimationFrame(() => setIsOpen(true));
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 250); // wait for animation
  };

  return (
    <div className={`drawer-overlay ${isOpen ? 'open' : ''}`} onClick={handleClose}>
      <div className={`drawer-content ${isOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
        <header className="drawer-header">
          <h2>{company ? 'Edit Company' : 'Add Company'}</h2>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={handleClose}>✕</button>
        </header>
        <div className="drawer-body">
          <CompanyForm 
            company={company}
            onCancel={handleClose}
            onSaved={onSaved}
          />
        </div>
      </div>
    </div>
  );
}
