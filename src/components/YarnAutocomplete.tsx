import React, { useState, useEffect, useRef } from 'react';
import { useApi } from '../hooks/useApi';
import socket from '../lib/socket';
import './CompanyAutocomplete.css';

interface Yarn {
  id: string;
  whole_name: string;
}

interface Props {
  value: string;
  onChange: (value: string, id: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  onValidationChange?: (isValid: boolean) => void;
}

export default function YarnAutocomplete({ value, onChange, placeholder = 'e.g. 40/18 Bright Nylon', disabled, onValidationChange }: Props) {
  const [yarns, setYarns] = useState<Yarn[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const api = useApi();

  const fetchDropdown = () => {
    api.get<Yarn[]>('/yarns/dropdown').then((data) => {
      setYarns(data || []);
    }).catch(err => {
      console.error('Failed to load yarns dropdown:', err);
    });
  };

  useEffect(() => {
    fetchDropdown();

    const handleUpdate = () => {
      fetchDropdown();
    };

    socket.on('yarns_update', handleUpdate);
    return () => {
      socket.off('yarns_update', handleUpdate);
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

  const trimmedValue = value.trim();
  const exactMatch = yarns.find(y => (y.whole_name || '').toLowerCase() === trimmedValue.toLowerCase());
  const filtered = yarns.filter(y => (y.whole_name || '').toLowerCase().includes(trimmedValue.toLowerCase()));

  // Error is shown only if text is non-empty, not an exact match, AND either:
  // (a) dropdown is open with 0 matching results, OR
  // (b) field is closed/blurred without selecting a valid option.
  const isInvalid = trimmedValue !== '' && !exactMatch && (!isOpen || filtered.length === 0);

  useEffect(() => {
    if (exactMatch) {
      onChange(exactMatch.whole_name, exactMatch.id);
    }
  }, [trimmedValue]);

  useEffect(() => {
    if (onValidationChange) {
      const isFormValid = trimmedValue === '' || !!exactMatch || (isOpen && filtered.length > 0);
      onValidationChange(isFormValid);
    }
  }, [trimmedValue, exactMatch, isOpen, filtered.length, onValidationChange]);

  return (
    <div className="company-autocomplete" ref={wrapperRef}>
      <input
        type="text"
        className={`form-input ${isInvalid ? 'input-error' : ''}`}
        value={value}
        onChange={(e) => {
          const val = e.target.value;
          const match = yarns.find(y => (y.whole_name || '').toLowerCase() === val.trim().toLowerCase());
          onChange(val, match ? match.id : null);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={(e) => {
          if (!wrapperRef.current?.contains(e.relatedTarget as Node)) {
            setIsOpen(false);
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
      />
      {isOpen && !disabled && (
        <ul className="autocomplete-list">
          {filtered.length > 0 ? (
            filtered.map(y => (
              <li 
                key={y.id} 
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(y.whole_name, y.id);
                  setIsOpen(false);
                }}
              >
                {y.whole_name}
              </li>
            ))
          ) : (
            <li className="autocomplete-no-match">
              No matching yarn found — please select from the list or add it in the Yarn page
            </li>
          )}
        </ul>
      )}
      {isInvalid && (
        <div className="autocomplete-error-text">
          No matching yarn found — please select from the list or add it in the Yarn page
        </div>
      )}
    </div>
  );
}
