import React, { useEffect, useState } from 'react';
import YarnForm, { YarnFormData } from './YarnForm';
import '../Company/Company.css';

interface Props {
  yarn?: YarnFormData | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function YarnDrawer({ yarn, onClose, onSaved }: Props) {
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
          <h2>{yarn ? 'Edit Yarn' : 'Add Yarn'}</h2>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={handleClose}>✕</button>
        </header>
        <div className="drawer-body">
          <YarnForm
            yarn={yarn}
            onCancel={handleClose}
            onSaved={onSaved}
          />
        </div>
      </div>
    </div>
  );
}
