'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Calendar } from 'lucide-react';
import { isoToDMY, dmyToISO } from '@/lib/utils';

interface DatePickerInputProps {
  value: string; // ISO format (YYYY-MM-DD) or empty
  onChange: (isoValue: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
}

export function DatePickerInput({
  value,
  onChange,
  placeholder = 'dd/mm/yyyy',
  className = '',
  disabled = false,
  required = false,
  id,
  name,
}: DatePickerInputProps) {
  const datePickerRef = useRef<HTMLInputElement>(null);
  const [displayValue, setDisplayValue] = useState<string>(isoToDMY(value));

  useEffect(() => {
    setDisplayValue(isoToDMY(value));
  }, [value]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setDisplayValue(text);
    const iso = dmyToISO(text);
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      onChange(iso);
    } else if (!text.trim()) {
      onChange('');
    }
  };

  const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const iso = e.target.value;
    setDisplayValue(isoToDMY(iso));
    onChange(iso);
  };

  return (
    <div className="relative w-full">
      {/* Visual text input displaying DD/MM/YYYY */}
      <Input
        id={id}
        name={name}
        type="text"
        placeholder={placeholder}
        value={displayValue}
        onChange={handleTextChange}
        disabled={disabled}
        required={required}
        className={`pr-11 font-medium ${className}`}
      />

      {/* Visual Calendar Icon */}
      <div
        className="absolute right-0 top-0 bottom-0 w-11 flex items-center justify-center text-slate-400 pointer-events-none"
        aria-hidden="true"
      >
        <Calendar className="w-4 h-4 text-slate-500" />
      </div>

      {/* Real Native Date Input:
          - On mobile (< 640px), covers the full input so tapping anywhere (especially the calendar icon) immediately opens the phone's native date picker (iOS wheel / Android dialog).
          - On desktop (>= 640px), covers the right 44px (sm:w-11) over the calendar icon so clicking the calendar icon opens the picker while allowing keyboard typing in the text field.
          - fontSize: 16px prevents iOS Safari from automatically zooming in when tapped.
      */}
      <input
        ref={datePickerRef}
        type="date"
        value={value ? value.split('T')[0] : ''}
        onChange={handleNativeChange}
        onClick={(e) => {
          try {
            e.currentTarget.showPicker?.();
          } catch {}
        }}
        disabled={disabled}
        tabIndex={-1}
        aria-label="Choose date"
        style={{ fontSize: '16px' }}
        className="absolute inset-y-0 right-0 w-full sm:w-11 opacity-0 cursor-pointer z-10 m-0 p-0"
      />
    </div>
  );
}
