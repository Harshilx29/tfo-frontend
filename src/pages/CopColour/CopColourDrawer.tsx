import React from 'react';
import { X } from 'lucide-react';
import CopColourForm from './CopColourForm';
import { CopColour } from '../../context/CopColourDataContext';

interface Props {
  copColour?: CopColour | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function CopColourDrawer({ copColour, onClose, onSaved }: Props) {
  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="drawer-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
            {copColour ? 'Edit Cop Colour' : 'Add Cop Colour'}
          </h2>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="drawer-body" style={{ padding: 20 }}>
          <CopColourForm
            copColour={copColour}
            onSaved={onSaved}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}
