import React, { useState, useEffect, useRef } from 'react';
import { Save, Check, AlertCircle } from 'lucide-react';
import { PermissionGate } from './PermissionGate';

interface SaveButtonProps {
  onSave: () => Promise<void>;
  label: string;
  savingLabel?: string;
  permissionKey: string;
  className?: string;
  disabled?: boolean;
}

export function SaveButton({
  onSave,
  label,
  savingLabel = 'Saving…',
  permissionKey,
  className = 'btn btn-primary',
  disabled = false,
}: SaveButtonProps) {
  const [saving, setSaving] = useState(false);
  const [slowSave, setSlowSave] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (saving) return; // double-click guard

    setSaving(true);
    setSlowSave(false);
    setStatus('idle');

    // Timer for slow saving past 3 seconds
    timerRef.current = setTimeout(() => {
      setSlowSave(true);
    }, 3000);

    try {
      await onSave();
      setStatus('success');
      
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setSlowSave(false);
      setSaving(false);

      // Reset success checkmark after a delay
      setTimeout(() => {
        setStatus('idle');
      }, 2000);
    } catch (err: unknown) {
      setStatus('error');
      
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setSlowSave(false);
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
      <PermissionGate permissionKey={permissionKey}>
        <button
          className={className}
          onClick={handleClick}
          disabled={disabled || saving}
          type="button"
        >
          {saving ? (
            <span className="spinner" />
          ) : status === 'success' ? (
            <Check size={14} style={{ color: 'var(--success)' }} />
          ) : (
            <Save size={14} />
          )}
          {saving
            ? slowSave
              ? 'Saving… (still saving, hang tight)'
              : savingLabel
            : status === 'success'
            ? 'Saved!'
            : label}
        </button>
      </PermissionGate>
      
      {status === 'error' && (
        <span className="flex items-center gap-1" style={{ color: 'var(--danger)', fontSize: 12.5, fontWeight: 500 }}>
          <AlertCircle size={14} />
          Save failed — check your connection and try again
        </span>
      )}
    </div>
  );
}
