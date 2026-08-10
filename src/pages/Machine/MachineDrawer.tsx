import { X } from 'lucide-react';
import MachineForm from './MachineForm';
import { Machine } from '../../context/MachineDataContext';

interface Props {
  machine?: Machine | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function MachineDrawer({ machine, onClose, onSaved }: Props) {
  return (
    <div className="drawer-overlay open" onClick={onClose}>
      <div className="drawer-container open" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="drawer-header" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
            {machine ? `Edit Machine ${machine.machine_number}` : 'Add Machine'}
          </h2>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="drawer-body" style={{ padding: 20 }}>
          <MachineForm
            machine={machine}
            onSaved={onSaved}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}
