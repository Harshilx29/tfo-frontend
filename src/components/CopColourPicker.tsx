import React, { useState, useEffect, useRef, useId } from 'react';
import { useApi } from '../hooks/useApi';
import socket from '../lib/socket';
import './CopColourPicker.css';

export interface CopColorOption {
  id: string;
  name: string;
  hex_code: string;
}

export function CopSVGIcon({ colorHex, uniqueSuffix }: { colorHex: string; uniqueSuffix: string }) {
  const safeHex = (colorHex || '#888888').trim();
  const cleanId = safeHex.replace(/[^a-zA-Z0-9]/g, '') + '-' + uniqueSuffix;

  return (
    <svg className="cop-icon" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <mask id={`hole-mask-${cleanId}`}>
          <rect x="0" y="0" width="100" height="120" fill="white" />
          {/* Top Row Holes */}
          <rect x="32" y="35" width="8" height="12" rx="2" fill="black" />
          <rect x="46" y="35" width="8" height="12" rx="2" fill="black" />
          <rect x="60" y="35" width="8" height="12" rx="2" fill="black" />
          {/* Bottom Row Holes */}
          <rect x="32" y="65" width="8" height="12" rx="2" fill="black" />
          <rect x="46" y="65" width="8" height="12" rx="2" fill="black" />
          <rect x="60" y="65" width="8" height="12" rx="2" fill="black" />
          {/* Top hollow tube hole */}
          <ellipse cx="50" cy="20" rx="16" ry="6" fill="black" />
        </mask>
      </defs>
      <g stroke="#404040" strokeWidth="1.2">
        {/* Bottom Flange */}
        <ellipse cx="50" cy="100" rx="45" ry="12" fill={safeHex} />
        {/* Main Barrel (Masked) */}
        <rect x="25" y="20" width="50" height="80" fill={safeHex} mask={`url(#hole-mask-${cleanId})`} />
        {/* Top Flange (Masked) */}
        <ellipse cx="50" cy="20" rx="45" ry="12" fill={safeHex} mask={`url(#hole-mask-${cleanId})`} />
      </g>
    </svg>
  );
}

interface Props {
  value?: string;
  valueId?: string | null;
  onChange: (option: CopColorOption | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function CopColourPicker({
  value = '',
  valueId = null,
  onChange,
  placeholder = 'Select a cop colour...',
  disabled = false,
}: Props) {
  const [options, setOptions] = useState<CopColorOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const instanceId = useId().replace(/[^a-zA-Z0-9]/g, '');

  const api = useApi();

  const fetchDropdown = () => {
    api
      .get<CopColorOption[]>('/cop-colors/dropdown')
      .then((data) => {
        setOptions(data || []);
      })
      .catch((err) => {
        console.error('Failed to load cop colors dropdown:', err);
      });
  };

  useEffect(() => {
    fetchDropdown();

    const handleUpdate = () => {
      fetchDropdown();
    };

    socket.on('cop_colors_update', handleUpdate);
    return () => {
      socket.off('cop_colors_update', handleUpdate);
    };
  }, [api]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Find currently selected item by ID or by name
  const selectedOption =
    options.find((opt) => (valueId && opt.id === valueId) || opt.name.toLowerCase() === value.trim().toLowerCase()) || null;

  return (
    <div className={`cop-picker-wrapper ${isOpen ? 'open' : ''}`} ref={wrapperRef}>
      <div
        className={`cop-picker-select ${disabled ? 'disabled' : ''} ${isOpen ? 'open' : ''}`}
        onClick={() => {
          if (!disabled) setIsOpen((prev) => !prev);
        }}
      >
        <div className="select-selected">
          {selectedOption ? (
            <>
              <CopSVGIcon colorHex={selectedOption.hex_code} uniqueSuffix={`${instanceId}-selected`} />
              <span className="cop-selected-name">{selectedOption.name}</span>
            </>
          ) : (
            <span className="placeholder-text">{value ? value : placeholder}</span>
          )}
        </div>
        <span className="cop-picker-chevron" />
      </div>

      {isOpen && !disabled && (
        <div className="cop-picker-options">
          {options.length > 0 ? (
            options.map((opt) => {
              const isSelected = selectedOption?.id === opt.id;
              return (
                <div
                  key={opt.id}
                  className={`cop-picker-option ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                  }}
                >
                  <CopSVGIcon colorHex={opt.hex_code} uniqueSuffix={`${instanceId}-opt-${opt.id}`} />
                  <span className="cop-option-name">{opt.name}</span>
                </div>
              );
            })
          ) : (
            <div className="cop-picker-no-options">No cop colors available</div>
          )}
        </div>
      )}
    </div>
  );
}
