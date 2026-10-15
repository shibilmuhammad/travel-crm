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

  const openPicker = () => {
    if (disabled) return;
    try {
      datePickerRef.current?.showPicker();
    } catch {
      datePickerRef.current?.focus();
    }
  };

  return (
    <div className="relative w-full">
      <Input
        id={id}
        name={name}
        type="text"
        placeholder={placeholder}
        value={displayValue}
        onChange={handleTextChange}
        onClick={openPicker}
        disabled={disabled}
        required={required}
        className={`pr-8 cursor-pointer font-medium ${className}`}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={openPicker}
        disabled={disabled}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
        title="Open calendar"
      >
        <Calendar className="w-3.5 h-3.5 text-slate-500" />
      </button>
      <input
        ref={datePickerRef}
        type="date"
        value={value ? value.split('T')[0] : ''}
        onChange={(e) => {
          const iso = e.target.value;
          setDisplayValue(isoToDMY(iso));
          onChange(iso);
        }}
        disabled={disabled}
        className="sr-only"
        tabIndex={-1}
      />
    </div>
  );
}
