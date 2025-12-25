'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { 
  ArrowLeft, Star, User, Building2, Mail, Phone, Plus, ChevronDown,
  MapPin, Cake, Link2, Users, FileText, StickyNote, X, Tag, Pencil, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useWebmailAuth } from '@/hooks/useWebmailAuth';

interface CreateContactPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (contact: ContactFormData) => void;
  editMode?: boolean;
  initialData?: Partial<ContactFormData> & { uid?: string };
  contactUid?: string;
}

export interface ContactFormData {
  prefix?: string;
  firstName: string;
  middleName?: string;
  lastName?: string;
  suffix?: string;
  phoneticFirstName?: string;
  phoneticMiddleName?: string;
  phoneticLastName?: string;
  nickname?: string;
  fileAs?: string;
  company?: string;
  jobTitle?: string;
  department?: string;
  emails: { value: string; label: string }[];
  phones: { value: string; label: string; countryCode: string }[];
  addresses: { street: string; city: string; postalCode: string; country: string; label: string }[];
  birthday?: { day: string; month: string; year: string };
  websites: { value: string; label: string }[];
  relationships: { name: string; type: string }[];
  customFields: { label: string; value: string }[];
  notes?: string;
  photo?: string;
  labels?: string[];
}

// Floating Label Input Component - exakt wie Google
function FloatingInput({
  label,
  value,
  onChange,
  type = 'text',
  className,
  autoFocus,
  onRemove,
  inputClassName,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  className?: string;
  autoFocus?: boolean;
  onRemove?: () => void;
  inputClassName?: string;
}) {
  const [focused, setFocused] = useState(false);
  const hasValue = value.length > 0;
  const isActive = focused || hasValue;

  return (
    <div className={cn('relative flex items-center gap-1', className)}>
      <div className="relative flex-1">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoFocus={autoFocus}
          className={cn(
            'w-full h-[52px] px-3 pt-5 pb-1 text-sm text-gray-900 bg-transparent',
            'border border-gray-300 rounded outline-none transition-all',
            'peer',
            focused && 'border-2 border-teal-600',
            inputClassName
          )}
        />
        <label
          className={cn(
            'absolute left-3 transition-all pointer-events-none',
            isActive
              ? 'top-1.5 text-[11px]'
              : 'top-1/2 -translate-y-1/2 text-sm',
            focused ? 'text-teal-600' : 'text-gray-500'
          )}
        >
          {label}
        </label>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="h-8 w-8 rounded-full hover:bg-gray-100 flex items-center justify-center shrink-0"
        >
          <X className="h-4 w-4 text-gray-500" />
        </button>
      )}
    </div>
  );
}

// Phone Input mit Flagge (ohne Label, wie Google Contacts)
function PhoneInput({
  value,
  onChange,
  countryCode,
  onCountryChange,
  onRemove,
}: {
  value: string;
  onChange: (value: string) => void;
  countryCode: string;
  onCountryChange: (code: string) => void;
  onRemove?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const hasValue = value.length > 0;
  const isActive = focused || hasValue;

  const countries = [
    { code: '+49', name: 'Deutschland', flag: 'DE' },
    { code: '+43', name: 'Oesterreich', flag: 'AT' },
    { code: '+41', name: 'Schweiz', flag: 'CH' },
    { code: '+1', name: 'USA', flag: 'US' },
    { code: '+44', name: 'Vereinigtes Koenigreich', flag: 'GB' },
  ];

  const getFlag = (code: string) => {
    const flagEmojis: Record<string, string> = {
      'DE': String.fromCodePoint(0x1F1E9, 0x1F1EA),
      'AT': String.fromCodePoint(0x1F1E6, 0x1F1F9),
      'CH': String.fromCodePoint(0x1F1E8, 0x1F1ED),
      'US': String.fromCodePoint(0x1F1FA, 0x1F1F8),
      'GB': String.fromCodePoint(0x1F1EC, 0x1F1E7),
    };
    const country = countries.find(c => c.code === code);
    return country ? flagEmojis[country.flag] : flagEmojis['DE'];
  };

  return (
    <div className="flex gap-2">
      {/* Country Code Selector */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowCountryDropdown(!showCountryDropdown)}
          className={cn(
            'flex items-center gap-1.5 px-3 h-[52px] border border-gray-300 rounded hover:bg-gray-50 min-w-20',
            showCountryDropdown && 'border-2 border-teal-600'
          )}
        >
          <span className="text-xl">{getFlag(countryCode)}</span>
          <ChevronDown className="h-3 w-3 text-gray-500" />
        </button>
        {showCountryDropdown && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
            {countries.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => {
                  onCountryChange(country.code);
                  setShowCountryDropdown(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left',
                  countryCode === country.code && 'bg-teal-50'
                )}
              >
                <span className="text-xl">{getFlag(country.code)}</span>
                <span className="text-sm text-gray-900">{country.name} ({country.code})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Phone Number Input */}
      <div className="relative flex-1">
        <input
          type="tel"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={cn(
            'w-full h-[52px] px-3 pt-5 pb-1 text-sm text-gray-900 bg-transparent',
            'border border-gray-300 rounded outline-none transition-all',
            focused && 'border-2 border-teal-600'
          )}
        />
        <label
          className={cn(
            'absolute left-3 transition-all pointer-events-none',
            isActive
              ? 'top-1.5 text-[11px]'
              : 'top-1/2 -translate-y-1/2 text-sm',
            focused ? 'text-teal-600' : 'text-gray-500'
          )}
        >
          Telefon
        </label>
      </div>

      {/* Remove Button */}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="h-[52px] w-8 rounded-full hover:bg-gray-100 flex items-center justify-center shrink-0"
        >
          <X className="h-4 w-4 text-gray-500" />
        </button>
      )}
    </div>
  );
}

// Add Button Component - zentriert mit Teal-Hintergrund und runden Ecken
function AddFieldButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-2 w-full h-[52px] text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-full transition-colors"
    >
      <Icon className="h-5 w-5" />
      <span className="text-sm">{label}</span>
    </button>
  );
}

// Transforming Add Button - morpht von Button zu Input
function TransformingAddField({
  icon: Icon,
  label,
  inputLabel,
  onAdd,
}: {
  icon: React.ElementType;
  label: string;
  inputLabel: string;
  onAdd: (value: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const hasValue = value.length > 0;
  const isActive = focused || hasValue;

  const handleButtonClick = () => {
    setIsEditing(true);
  };

  // Focus setzen wenn isEditing true wird
  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setFocused(false);
    // Wenn Wert vorhanden, zur Liste hinzufügen
    if (value.trim()) {
      onAdd(value.trim());
      setValue('');
    }
    // Zurück zum Button
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) {
      e.preventDefault();
      onAdd(value.trim());
      setValue('');
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setValue('');
      setIsEditing(false);
    }
  };

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={handleButtonClick}
        className="flex items-center justify-center gap-2 w-full h-[52px] text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-full transition-all duration-200"
      >
        <Icon className="h-5 w-5" />
        <span className="text-sm">{label}</span>
      </button>
    );
  }

  return (
    <div className="relative flex-1 animate-in fade-in duration-200">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn(
          'w-full h-[52px] px-3 pt-5 pb-1 text-sm text-gray-900 bg-white',
          'border border-gray-300 rounded outline-none transition-all',
          focused && 'border-2 border-teal-600'
        )}
      />
      <label
        className={cn(
          'absolute left-3 transition-all pointer-events-none',
          isActive
            ? 'top-1.5 text-[11px]'
            : 'top-1/2 -translate-y-1/2 text-sm',
          focused ? 'text-teal-600' : 'text-gray-500'
        )}
      >
        {inputLabel}
      </label>
    </div>
  );
}

// Transforming Phone Field - morpht von Button zu PhoneInput
function TransformingPhoneField({
  icon: Icon,
  label,
  onAdd,
}: {
  icon: React.ElementType;
  label: string;
  onAdd: (value: string, countryCode: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState('');
  const [countryCode, setCountryCode] = useState('+49');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasValue = value.length > 0;
  const isActive = focused || hasValue;

  const countries = [
    { code: '+49', name: 'Deutschland', flag: 'DE' },
    { code: '+43', name: 'Oesterreich', flag: 'AT' },
    { code: '+41', name: 'Schweiz', flag: 'CH' },
    { code: '+1', name: 'USA', flag: 'US' },
    { code: '+44', name: 'Vereinigtes Koenigreich', flag: 'GB' },
  ];

  const getFlag = (code: string) => {
    const flagEmojis: Record<string, string> = {
      'DE': String.fromCodePoint(0x1F1E9, 0x1F1EA),
      'AT': String.fromCodePoint(0x1F1E6, 0x1F1F9),
      'CH': String.fromCodePoint(0x1F1E8, 0x1F1ED),
      'US': String.fromCodePoint(0x1F1FA, 0x1F1F8),
      'GB': String.fromCodePoint(0x1F1EC, 0x1F1E7),
    };
    const country = countries.find(c => c.code === code);
    return country ? flagEmojis[country.flag] : flagEmojis['DE'];
  };

  const handleButtonClick = () => {
    setIsEditing(true);
  };

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setFocused(false);
    if (value.trim()) {
      onAdd(value.trim(), countryCode);
      setValue('');
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) {
      e.preventDefault();
      onAdd(value.trim(), countryCode);
      setValue('');
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setValue('');
      setIsEditing(false);
    }
  };

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={handleButtonClick}
        className="flex items-center justify-center gap-2 w-full h-[52px] text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-full transition-all duration-200"
      >
        <Icon className="h-5 w-5" />
        <span className="text-sm">{label}</span>
      </button>
    );
  }

  return (
    <div className="flex gap-2 animate-in fade-in duration-200">
      {/* Country Code Selector */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowCountryDropdown(!showCountryDropdown)}
          className={cn(
            'flex items-center gap-1.5 px-3 h-[52px] border border-gray-300 rounded hover:bg-gray-50 min-w-20',
            showCountryDropdown && 'border-2 border-teal-600'
          )}
        >
          <span className="text-xl">{getFlag(countryCode)}</span>
          <ChevronDown className="h-3 w-3 text-gray-500" />
        </button>
        {showCountryDropdown && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
            {countries.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => {
                  setCountryCode(country.code);
                  setShowCountryDropdown(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left',
                  countryCode === country.code && 'bg-teal-50'
                )}
              >
                <span className="text-xl">{getFlag(country.code)}</span>
                <span className="text-sm text-gray-900">{country.name} ({country.code})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Phone Number Input */}
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="tel"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={cn(
            'w-full h-[52px] px-3 pt-5 pb-1 text-sm text-gray-900 bg-white',
            'border border-gray-300 rounded outline-none transition-all',
            focused && 'border-2 border-teal-600'
          )}
        />
        <label
          className={cn(
            'absolute left-3 transition-all pointer-events-none',
            isActive
              ? 'top-1.5 text-[11px]'
              : 'top-1/2 -translate-y-1/2 text-sm',
            focused ? 'text-teal-600' : 'text-gray-500'
          )}
        >
          Telefon
        </label>
      </div>
    </div>
  );
}

// Transforming Textarea - morpht von Button zu Textarea (für Notizen)
function TransformingTextareaField({
  icon: Icon,
  label,
  inputLabel,
  value,
  onChange,
}: {
  icon: React.ElementType;
  label: string;
  inputLabel: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasValue = value.length > 0;

  const handleButtonClick = () => {
    setIsEditing(true);
  };

  React.useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  // Wenn ein Wert vorhanden ist, immer Textarea anzeigen
  if (!isEditing && !hasValue) {
    return (
      <button
        type="button"
        onClick={handleButtonClick}
        className="flex items-center justify-center gap-2 w-full h-[52px] text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-full transition-all duration-200"
      >
        <Icon className="h-5 w-5" />
        <span className="text-sm">{label}</span>
      </button>
    );
  }

  return (
    <div className="relative flex-1 animate-in fade-in duration-200">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        rows={3}
        className={cn(
          'w-full px-3 pt-6 pb-2 text-sm text-gray-900 bg-white resize-none',
          'border border-gray-300 rounded outline-none transition-all',
          focused && 'border-2 border-teal-600'
        )}
      />
      <label
        className={cn(
          'absolute left-3 top-2 text-[11px] transition-all pointer-events-none',
          focused ? 'text-teal-600' : 'text-gray-500'
        )}
      >
        {inputLabel}
      </label>
    </div>
  );
}

// Transforming Address Field - morpht von Button zu Adress-Formular
function TransformingAddressField({
  icon: Icon,
  label,
  address,
  onStreetChange,
  onCityChange,
  onPostalCodeChange,
  onCountryChange,
}: {
  icon: React.ElementType;
  label: string;
  address: { street: string; city: string; postalCode: string; country: string };
  onStreetChange: (v: string) => void;
  onCityChange: (v: string) => void;
  onPostalCodeChange: (v: string) => void;
  onCountryChange: (v: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const hasValue = address.street.length > 0 || address.city.length > 0 || address.postalCode.length > 0;

  const handleButtonClick = () => {
    setIsEditing(true);
  };

  // Wenn Werte vorhanden sind, immer Eingabefelder anzeigen
  if (!isEditing && !hasValue) {
    return (
      <button
        type="button"
        onClick={handleButtonClick}
        className="flex items-center justify-center gap-2 w-full h-[52px] text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-full transition-all duration-200"
      >
        <Icon className="h-5 w-5" />
        <span className="text-sm">{label}</span>
      </button>
    );
  }

  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      <FloatingInput
        label="Strasse"
        value={address.street}
        onChange={onStreetChange}
        autoFocus
      />
      <div className="flex gap-3">
        <FloatingInput
          label="PLZ"
          value={address.postalCode}
          onChange={onPostalCodeChange}
          className="w-28"
        />
        <FloatingInput
          label="Stadt"
          value={address.city}
          onChange={onCityChange}
          className="flex-1"
        />
      </div>
      <FloatingInput
        label="Land"
        value={address.country}
        onChange={onCountryChange}
      />
    </div>
  );
}

// Transforming Birthday Field - morpht von Button zu Birthday-Eingabe
function TransformingBirthdayField({
  icon: Icon,
  label,
  day,
  month,
  year,
  onDayChange,
  onMonthChange,
  onYearChange,
}: {
  icon: React.ElementType;
  label: string;
  day: string;
  month: string;
  year: string;
  onDayChange: (v: string) => void;
  onMonthChange: (v: string) => void;
  onYearChange: (v: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const hasValue = day.length > 0 || month.length > 0 || year.length > 0;

  const handleButtonClick = () => {
    setIsEditing(true);
  };

  // Wenn Werte vorhanden sind, immer Eingabefelder anzeigen
  if (!isEditing && !hasValue) {
    return (
      <button
        type="button"
        onClick={handleButtonClick}
        className="flex items-center justify-center gap-2 w-full h-[52px] text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-full transition-all duration-200"
      >
        <Icon className="h-5 w-5" />
        <span className="text-sm">{label}</span>
      </button>
    );
  }

  return (
    <div className="animate-in fade-in duration-200">
      <BirthdayInput
        day={day}
        month={month}
        year={year}
        onDayChange={onDayChange}
        onMonthChange={onMonthChange}
        onYearChange={onYearChange}
      />
    </div>
  );
}

// Birthday Input Component
function BirthdayInput({
  day,
  month,
  year,
  onDayChange,
  onMonthChange,
  onYearChange,
  onRemove,
}: {
  day: string;
  month: string;
  year: string;
  onDayChange: (v: string) => void;
  onMonthChange: (v: string) => void;
  onYearChange: (v: string) => void;
  onRemove?: () => void;
}) {
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const months = [
    'Januar', 'Februar', 'Maerz', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];

  return (
    <div className="flex items-center gap-1.5">
      {/* Day */}
      <div className="w-16">
        <FloatingInput
          label="Tag"
          value={day}
          onChange={onDayChange}
        />
      </div>

      {/* Month Dropdown */}
      <div className="relative flex-1">
        <button
          type="button"
          onClick={() => setShowMonthDropdown(!showMonthDropdown)}
          className={cn(
            'w-full h-[52px] px-3 text-left text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-between',
            showMonthDropdown && 'border-2 border-teal-600'
          )}
        >
          <span className={month ? 'text-gray-900' : 'text-gray-500'}>
            {month ? months[parseInt(month) - 1] : 'Monat'}
          </span>
          <ChevronDown className="h-3 w-3 text-gray-500" />
        </button>
        {showMonthDropdown && (
          <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg z-50 max-h-48 overflow-y-auto">
            {months.map((m, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  onMonthChange(String(i + 1));
                  setShowMonthDropdown(false);
                }}
                className={cn(
                  'w-full px-3 py-2 text-left text-sm hover:bg-gray-50',
                  month === String(i + 1) && 'bg-teal-50'
                )}
              >
                {m}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Year */}
      <div className="w-20">
        <FloatingInput
          label="Jahr"
          value={year}
          onChange={onYearChange}
        />
      </div>

      {/* Remove Button */}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="h-8 w-8 rounded-full hover:bg-gray-100 flex items-center justify-center shrink-0"
        >
          <X className="h-4 w-4 text-gray-500" />
        </button>
      )}
    </div>
  );
}

export function CreateContactPanel({ isOpen, onClose, onSave, editMode = false, initialData, contactUid }: CreateContactPanelProps) {
  const { email: authEmail, password: authPassword, isAuthenticated } = useWebmailAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [showMoreFields, setShowMoreFields] = useState(false);
  const [showCompanyDetails, setShowCompanyDetails] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  const [availableLabels, setAvailableLabels] = useState<string[]>([]);
  const [_isLoadingLabels, setIsLoadingLabels] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const labelDropdownRef = useRef<HTMLDivElement>(null);
  
  // Labels vom Server laden
  useEffect(() => {
    async function loadLabels() {
      if (!isOpen || !isAuthenticated || !authEmail || !authPassword) return;
      
      setIsLoadingLabels(true);
      try {
        const response = await fetch('/api/webmail/contacts/labels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail, password: authPassword }),
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.labels) {
            setAvailableLabels(data.labels.map((l: { name: string }) => l.name));
          }
        }
      } catch {
        // Silently handle label loading errors
      } finally {
        setIsLoadingLabels(false);
      }
    }
    
    loadLabels();
  }, [isOpen, isAuthenticated, authEmail, authPassword]);
  
  // Click-Away Handler für Label Dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (labelDropdownRef.current && !labelDropdownRef.current.contains(event.target as Node)) {
        setShowLabelDropdown(false);
        setIsCreatingLabel(false);
        setNewLabelName('');
      }
    }
    
    if (showLabelDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    return undefined;
  }, [showLabelDropdown]);
  
  // All form sections - show/hide states
  const [showAddresses, setShowAddresses] = useState(false);
  const [showWebsites, setShowWebsites] = useState(false);
  const [showRelationships, setShowRelationships] = useState(false);
  const [showCustomFields, setShowCustomFields] = useState(false);
  
  // Default form data
  const defaultFormData: ContactFormData = {
    prefix: '',
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    phoneticFirstName: '',
    phoneticMiddleName: '',
    phoneticLastName: '',
    nickname: '',
    fileAs: '',
    company: '',
    jobTitle: '',
    department: '',
    emails: [{ value: '', label: 'Privat' }],
    phones: [{ value: '', label: 'Mobil', countryCode: '+49' }],
    addresses: [],
    birthday: undefined,
    websites: [],
    relationships: [],
    customFields: [],
    notes: '',
    labels: [],
  };
  
  const [formData, setFormData] = useState<ContactFormData>(defaultFormData);

  // Initialize form with initial data when in edit mode
  useEffect(() => {
    if (isOpen && editMode && initialData) {
      setFormData({
        ...defaultFormData,
        prefix: initialData.prefix || '',
        firstName: initialData.firstName || '',
        middleName: initialData.middleName || '',
        lastName: initialData.lastName || '',
        suffix: initialData.suffix || '',
        phoneticFirstName: initialData.phoneticFirstName || '',
        phoneticMiddleName: initialData.phoneticMiddleName || '',
        phoneticLastName: initialData.phoneticLastName || '',
        nickname: initialData.nickname || '',
        fileAs: initialData.fileAs || '',
        company: initialData.company || '',
        jobTitle: initialData.jobTitle || '',
        department: initialData.department || '',
        emails: initialData.emails?.length ? initialData.emails : [{ value: '', label: 'Privat' }],
        phones: initialData.phones?.length ? initialData.phones : [{ value: '', label: 'Mobil', countryCode: '+49' }],
        addresses: initialData.addresses || [],
        birthday: initialData.birthday,
        websites: initialData.websites || [],
        relationships: initialData.relationships || [],
        customFields: initialData.customFields || [],
        notes: initialData.notes || '',
        labels: initialData.labels || [],
        photo: initialData.photo,
      });
      
      // Show sections if they have data
      if (initialData.addresses?.length) setShowAddresses(true);
      if (initialData.websites?.length) setShowWebsites(true);
      if (initialData.company || initialData.jobTitle || initialData.department) setShowCompanyDetails(true);
    } else if (isOpen && !editMode) {
      // Reset form when opening in create mode
      setFormData(defaultFormData);
      setShowAddresses(false);
      setShowWebsites(false);
      setShowCompanyDetails(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editMode, initialData]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (!isAuthenticated || !authEmail || !authPassword) {
        throw new Error('Nicht angemeldet');
      }

      // Filter empty emails and phones
      const contactData = {
        uid: editMode && contactUid ? contactUid : undefined,
        firstName: formData.firstName,
        lastName: formData.lastName,
        displayName: formData.firstName && formData.lastName 
          ? `${formData.firstName} ${formData.lastName}`.trim() 
          : formData.firstName || formData.lastName,
        nickname: formData.nickname,
        company: formData.company,
        jobTitle: formData.jobTitle,
        department: formData.department,
        emails: formData.emails.filter(e => e.value.trim()),
        phones: formData.phones
          .filter(p => p.value.trim())
          .map(p => ({ value: `${p.countryCode}${p.value}`, label: p.label })),
        addresses: formData.addresses.filter(a => a.street || a.city || a.postalCode),
        websites: formData.websites.filter(w => w.value.trim()),
        birthday: formData.birthday 
          ? `${formData.birthday.year}-${formData.birthday.month.padStart(2, '0')}-${formData.birthday.day.padStart(2, '0')}`
          : undefined,
        notes: formData.notes,
        photo: formData.photo,
        labels: formData.labels,
      };

      // Use update endpoint if in edit mode, create endpoint otherwise
      const endpoint = editMode && contactUid 
        ? '/api/webmail/contacts/update' 
        : '/api/webmail/contacts/create';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword, contact: contactData }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Fehler beim Speichern');
      }

      onSave(formData);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Failed to save contact:', error);
      alert(error instanceof Error ? error.message : 'Fehler beim Speichern des Kontakts');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      prefix: '',
      firstName: '',
      middleName: '',
      lastName: '',
      suffix: '',
      phoneticFirstName: '',
      phoneticMiddleName: '',
      phoneticLastName: '',
      nickname: '',
      fileAs: '',
      company: '',
      jobTitle: '',
      department: '',
      emails: [{ value: '', label: 'Privat' }],
      phones: [{ value: '', label: 'Mobil', countryCode: '+49' }],
      addresses: [],
      birthday: undefined,
      websites: [],
      relationships: [],
      customFields: [],
      notes: '',
      labels: [],
    });
    setIsFavorite(false);
    setShowMoreFields(false);
    setShowAddresses(false);
    setShowWebsites(false);
    setShowRelationships(false);
    setShowCustomFields(false);
  };

  const removeEmail = (index: number) => {
    if (formData.emails.length > 1) {
      setFormData(prev => ({
        ...prev,
        emails: prev.emails.filter((_, i) => i !== index)
      }));
    }
  };

  const removePhone = (index: number) => {
    if (formData.phones.length > 1) {
      setFormData(prev => ({
        ...prev,
        phones: prev.phones.filter((_, i) => i !== index)
      }));
    }
  };

  const addAddress = () => {
    setFormData(prev => ({
      ...prev,
      addresses: [...prev.addresses, { street: '', city: '', postalCode: '', country: 'Deutschland', label: 'Privat' }]
    }));
    setShowAddresses(true);
  };

  const removeAddress = (index: number) => {
    setFormData(prev => ({
      ...prev,
      addresses: prev.addresses.filter((_, i) => i !== index)
    }));
  };

  const removeWebsite = (index: number) => {
    setFormData(prev => ({
      ...prev,
      websites: prev.websites.filter((_, i) => i !== index)
    }));
  };

  const addRelationship = () => {
    setFormData(prev => ({
      ...prev,
      relationships: [...prev.relationships, { name: '', type: 'Partner' }]
    }));
    setShowRelationships(true);
  };

  const removeRelationship = (index: number) => {
    setFormData(prev => ({
      ...prev,
      relationships: prev.relationships.filter((_, i) => i !== index)
    }));
  };

  const addCustomField = () => {
    setFormData(prev => ({
      ...prev,
      customFields: [...prev.customFields, { label: '', value: '' }]
    }));
    setShowCustomFields(true);
  };

  const removeCustomField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      customFields: prev.customFields.filter((_, i) => i !== index)
    }));
  };

  const getInitial = () => {
    if (formData.firstName) return formData.firstName.charAt(0).toUpperCase();
    if (formData.lastName) return formData.lastName.charAt(0).toUpperCase();
    return '';
  };

  const canSave = formData.firstName.trim() !== '' || (formData.lastName?.trim() ?? '') !== '' || formData.emails.some(e => e.value.trim() !== '');

  if (!isOpen) return null;

  return (
    <div className="flex-1 flex flex-col bg-white min-w-0">
      <ScrollArea className="flex-1">
        <div className="max-w-[540px] px-4 py-4">
          {/* Header - wie Google Contacts: Pfeil links, Stern + Speichern rechts, ÜBER dem Avatar */}
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { resetForm(); onClose(); }}
              className="h-10 w-10 rounded-full hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Button>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFavorite(!isFavorite)}
                className="h-10 w-10 rounded-full hover:bg-gray-100"
              >
                <Star className={cn(
                  "h-5 w-5",
                  isFavorite ? "fill-yellow-400 text-yellow-400" : "text-gray-400"
                )} />
              </Button>
              <Button
                onClick={handleSave}
                disabled={!canSave || isSaving}
                className={cn(
                  "h-9 px-6 rounded text-sm font-medium",
                  canSave && !isSaving
                    ? "bg-teal-600 hover:bg-teal-700 text-white" 
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                )}
              >
                {isSaving ? 'Speichert...' : 'Speichern'}
              </Button>
            </div>
          </div>

          {/* Avatar Section - links ausgerichtet wie bei Google */}
          <div className="flex flex-col items-start mb-4">
            <div className="relative">
              <Avatar className="h-32 w-32 bg-[#dfe1e5]">
                {formData.photo ? (
                  <Image src={formData.photo} alt="Kontaktfoto" width={128} height={128} className="h-full w-full object-cover rounded-full" />
                ) : (
                  <AvatarFallback className="text-5xl text-gray-500 bg-[#dfe1e5]">
                    {getInitial() || <User className="h-12 w-12 text-gray-400" />}
                  </AvatarFallback>
                )}
              </Avatar>
              {/* Plus Button on Avatar - Bild-Upload */}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setFormData(prev => ({ ...prev, photo: reader.result as string }));
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <button 
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="absolute bottom-0 right-0 h-9 w-9 bg-teal-600 rounded-full flex items-center justify-center shadow-lg hover:bg-teal-700 transition-colors"
              >
                <Plus className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>

          {/* Labels als Badges + Stift-Icon */}
          <div className="flex items-center gap-2 mb-5 flex-wrap relative" ref={labelDropdownRef}>
            {/* Ausgewählte Labels als Badges */}
            {formData.labels && formData.labels.length > 0 && (
              <>
                {formData.labels.map((label) => (
                  <div
                    key={label}
                    className="flex items-center gap-1.5 h-7 px-3 rounded-full bg-gray-100 text-gray-700 text-xs"
                  >
                    <Tag className="h-3.5 w-3.5" />
                    <span>{label}</span>
                  </div>
                ))}
                <button
                  onClick={() => setShowLabelDropdown(!showLabelDropdown)}
                  className="h-7 w-7 rounded-full hover:bg-gray-100 flex items-center justify-center"
                >
                  <Pencil className="h-4 w-4 text-teal-600" />
                </button>
              </>
            )}
            
            {/* + Label Button nur wenn keine Labels */}
            {(!formData.labels || formData.labels.length === 0) && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3 rounded-full border-gray-300 text-gray-700 hover:bg-gray-50 gap-1.5 text-xs"
                onClick={() => setShowLabelDropdown(!showLabelDropdown)}
              >
                <Plus className="h-3 w-3" />
                Label
              </Button>
            )}
            
            {/* Label Dropdown Modal */}
            {showLabelDropdown && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="p-3 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-900">Labels verwalten</span>
                </div>
                <div className="py-1 max-h-48 overflow-y-auto">
                  {availableLabels.map((label) => {
                    const isSelected = formData.labels?.includes(label);
                    return (
                      <button
                        key={label}
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            labels: prev.labels?.includes(label)
                              ? prev.labels.filter(l => l !== label)
                              : [...(prev.labels || []), label]
                          }));
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-2.5 text-left",
                          isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Tag className="h-5 w-5 text-gray-400" />
                          <span className="text-sm text-gray-900">{label}</span>
                        </div>
                        {isSelected && (
                          <Check className="h-5 w-5 text-teal-600" />
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="border-t border-gray-100">
                  <button
                    onClick={() => {
                      setIsCreatingLabel(true);
                      setShowLabelDropdown(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 text-left"
                  >
                    <Plus className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-700">Label erstellen</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Label erstellen Modal - außerhalb des Dropdowns */}
          {isCreatingLabel && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-200">
              <div className="bg-white rounded-2xl shadow-xl w-[340px] p-6">
                <h2 className="text-2xl font-normal text-gray-900 mb-6">Label erstellen</h2>
                
                <div className="relative mb-8">
                  <input
                    type="text"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    autoFocus
                    className="w-full h-14 px-3 pt-5 pb-1 text-base text-gray-900 bg-transparent border-2 border-teal-600 rounded outline-none peer"
                  />
                  <label className="absolute left-3 -top-2.5 px-1 bg-white text-xs text-teal-600 pointer-events-none">
                    Neues Label
                  </label>
                </div>
                
                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => {
                      setIsCreatingLabel(false);
                      setNewLabelName('');
                    }}
                    className="px-4 py-2 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={() => {
                      if (newLabelName.trim()) {
                        setAvailableLabels(prev => [...prev, newLabelName.trim()]);
                        setFormData(prev => ({
                          ...prev,
                          labels: [...(prev.labels || []), newLabelName.trim()]
                        }));
                        setNewLabelName('');
                        setIsCreatingLabel(false);
                      }
                    }}
                    className="px-4 py-2 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded"
                  >
                    Speichern
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Name Section */}
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-gray-500 mt-3.5 shrink-0" />
              <div className="flex-1 space-y-3">
                {/* Vorname mit Dropdown-Pfeil im Input wie Google */}
                <div className="relative">
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    autoFocus
                    className="w-full h-[52px] px-3 pr-10 pt-5 pb-1 text-sm text-gray-900 bg-transparent border border-gray-300 rounded outline-none transition-all focus:border-2 focus:border-teal-600 peer"
                  />
                  <label className="absolute left-3 top-1.5 text-[11px] text-gray-500 peer-focus:text-teal-600 pointer-events-none transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm">Vorname</label>
                  <button
                    type="button"
                    onClick={() => setShowMoreFields(!showMoreFields)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                  >
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </button>
                </div>
                
                {/* Extended Name Fields */}
                {showMoreFields && (
                  <>
                    <FloatingInput
                      label="Praefix"
                      value={formData.prefix || ''}
                      onChange={(v) => setFormData(prev => ({ ...prev, prefix: v }))}
                    />
                    <FloatingInput
                      label="Zweitname"
                      value={formData.middleName || ''}
                      onChange={(v) => setFormData(prev => ({ ...prev, middleName: v }))}
                    />
                  </>
                )}
                
                <FloatingInput
                  label="Nachname"
                  value={formData.lastName || ''}
                  onChange={(v) => setFormData(prev => ({ ...prev, lastName: v }))}
                />
                
                {showMoreFields && (
                  <>
                    <FloatingInput
                      label="Suffix"
                      value={formData.suffix || ''}
                      onChange={(v) => setFormData(prev => ({ ...prev, suffix: v }))}
                    />
                    <FloatingInput
                      label="Phonetischer Vorname"
                      value={formData.phoneticFirstName || ''}
                      onChange={(v) => setFormData(prev => ({ ...prev, phoneticFirstName: v }))}
                    />
                    <FloatingInput
                      label="Phonetischer Zweitname"
                      value={formData.phoneticMiddleName || ''}
                      onChange={(v) => setFormData(prev => ({ ...prev, phoneticMiddleName: v }))}
                    />
                    <FloatingInput
                      label="Phonetischer Nachname"
                      value={formData.phoneticLastName || ''}
                      onChange={(v) => setFormData(prev => ({ ...prev, phoneticLastName: v }))}
                    />
                    <FloatingInput
                      label="Spitzname"
                      value={formData.nickname || ''}
                      onChange={(v) => setFormData(prev => ({ ...prev, nickname: v }))}
                    />
                    <FloatingInput
                      label="Speichern unter"
                      value={formData.fileAs || ''}
                      onChange={(v) => setFormData(prev => ({ ...prev, fileAs: v }))}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Company Section */}
            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-gray-500 mt-3.5 shrink-0" />
              <div className="flex-1 space-y-3">
                {/* Unternehmen mit Dropdown-Pfeil im Input wie Google */}
                <div className="relative">
                  <input
                    type="text"
                    value={formData.company || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                    className="w-full h-[52px] px-3 pr-10 pt-5 pb-1 text-sm text-gray-900 bg-transparent border border-gray-300 rounded outline-none transition-all focus:border-2 focus:border-teal-600 peer"
                  />
                  <label className="absolute left-3 top-1.5 text-[11px] text-gray-500 peer-focus:text-teal-600 pointer-events-none">Unternehmen</label>
                  <button
                    type="button"
                    onClick={() => setShowCompanyDetails(!showCompanyDetails)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                  >
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </button>
                </div>
                <FloatingInput
                  label="Position"
                  value={formData.jobTitle || ''}
                  onChange={(v) => setFormData(prev => ({ ...prev, jobTitle: v }))}
                />
                {showCompanyDetails && (
                  <FloatingInput
                    label="Abteilung"
                    value={formData.department || ''}
                    onChange={(v) => setFormData(prev => ({ ...prev, department: v }))}
                  />
                )}
              </div>
            </div>

            {/* Email Section */}
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-gray-500 mt-3.5 shrink-0" />
              <div className="flex-1 space-y-3">
                {formData.emails.map((email, index) => (
                  <FloatingInput
                    key={index}
                    label="E-Mail"
                    type="email"
                    value={email.value}
                    onChange={(v) => {
                      const newEmails = [...formData.emails];
                      newEmails[index] = { ...newEmails[index], value: v };
                      setFormData(prev => ({ ...prev, emails: newEmails }));
                    }}
                    onRemove={formData.emails.length > 1 ? () => removeEmail(index) : undefined}
                  />
                ))}
                <TransformingAddField
                  icon={Plus}
                  label="E-Mail-Adresse hinzufügen"
                  inputLabel="E-Mail"
                  onAdd={(v) => {
                    setFormData(prev => ({
                      ...prev,
                      emails: [...prev.emails, { value: v, label: 'Privat' }]
                    }));
                  }}
                />
              </div>
            </div>

            {/* Phone Section */}
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-gray-500 mt-3.5 shrink-0" />
              <div className="flex-1 space-y-3">
                {formData.phones.map((phone, index) => (
                  <PhoneInput
                    key={index}
                    value={phone.value}
                    onChange={(v) => {
                      const newPhones = [...formData.phones];
                      newPhones[index] = { ...newPhones[index], value: v };
                      setFormData(prev => ({ ...prev, phones: newPhones }));
                    }}
                    countryCode={phone.countryCode}
                    onCountryChange={(code) => {
                      const newPhones = [...formData.phones];
                      newPhones[index] = { ...newPhones[index], countryCode: code };
                      setFormData(prev => ({ ...prev, phones: newPhones }));
                    }}
                    onRemove={formData.phones.length > 1 ? () => removePhone(index) : undefined}
                  />
                ))}
                <TransformingPhoneField
                  icon={Plus}
                  label="Telefonnummer hinzufügen"
                  onAdd={(v, code) => {
                    setFormData(prev => ({
                      ...prev,
                      phones: [...prev.phones, { value: v, label: 'Mobil', countryCode: code }]
                    }));
                  }}
                />
              </div>
            </div>

            {/* Adresse hinzufügen - TransformingAddressField */}
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-gray-500 mt-3.5 shrink-0" />
              <div className="flex-1">
                {formData.addresses.length === 0 ? (
                  <TransformingAddressField
                    icon={MapPin}
                    label="Adresse hinzufügen"
                    address={{ street: '', city: '', postalCode: '', country: 'Deutschland' }}
                    onStreetChange={(v) => {
                      setFormData(prev => ({
                        ...prev,
                        addresses: [{ street: v, city: '', postalCode: '', country: 'Deutschland', label: 'Privat' }]
                      }));
                    }}
                    onCityChange={(v) => {
                      setFormData(prev => ({
                        ...prev,
                        addresses: [{ ...prev.addresses[0] || { street: '', postalCode: '', country: 'Deutschland', label: 'Privat' }, city: v }]
                      }));
                    }}
                    onPostalCodeChange={(v) => {
                      setFormData(prev => ({
                        ...prev,
                        addresses: [{ ...prev.addresses[0] || { street: '', city: '', country: 'Deutschland', label: 'Privat' }, postalCode: v }]
                      }));
                    }}
                    onCountryChange={(v) => {
                      setFormData(prev => ({
                        ...prev,
                        addresses: [{ ...prev.addresses[0] || { street: '', city: '', postalCode: '', label: 'Privat' }, country: v }]
                      }));
                    }}
                  />
                ) : (
                  <div className="space-y-3">
                    {formData.addresses.map((address, index) => (
                      <div key={index} className="space-y-3">
                        <FloatingInput
                          label="Strasse"
                          value={address.street}
                          onChange={(v) => {
                            const newAddresses = [...formData.addresses];
                            newAddresses[index] = { ...newAddresses[index], street: v };
                            setFormData(prev => ({ ...prev, addresses: newAddresses }));
                          }}
                          onRemove={formData.addresses.length > 0 ? () => removeAddress(index) : undefined}
                        />
                        <div className="flex gap-3">
                          <FloatingInput
                            label="PLZ"
                            value={address.postalCode}
                            onChange={(v) => {
                              const newAddresses = [...formData.addresses];
                              newAddresses[index] = { ...newAddresses[index], postalCode: v };
                              setFormData(prev => ({ ...prev, addresses: newAddresses }));
                            }}
                            className="w-28"
                          />
                          <FloatingInput
                            label="Stadt"
                            value={address.city}
                            onChange={(v) => {
                              const newAddresses = [...formData.addresses];
                              newAddresses[index] = { ...newAddresses[index], city: v };
                              setFormData(prev => ({ ...prev, addresses: newAddresses }));
                            }}
                            className="flex-1"
                          />
                        </div>
                        <FloatingInput
                          label="Land"
                          value={address.country}
                          onChange={(v) => {
                            const newAddresses = [...formData.addresses];
                            newAddresses[index] = { ...newAddresses[index], country: v };
                            setFormData(prev => ({ ...prev, addresses: newAddresses }));
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Geburtstag - IMMER sichtbar wie bei Google */}
            <div className="flex items-start gap-3">
              <Cake className="h-5 w-5 text-gray-500 mt-3.5 shrink-0" />
              <div className="flex-1">
                <BirthdayInput
                  day={formData.birthday?.day || ''}
                  month={formData.birthday?.month || ''}
                  year={formData.birthday?.year || ''}
                  onDayChange={(v) => setFormData(prev => ({
                    ...prev,
                    birthday: { ...(prev.birthday || { day: '', month: '', year: '' }), day: v }
                  }))}
                  onMonthChange={(v) => setFormData(prev => ({
                    ...prev,
                    birthday: { ...(prev.birthday || { day: '', month: '', year: '' }), month: v }
                  }))}
                  onYearChange={(v) => setFormData(prev => ({
                    ...prev,
                    birthday: { ...(prev.birthday || { day: '', month: '', year: '' }), year: v }
                  }))}
                />
              </div>
            </div>

            {/* Notizen - TransformingTextarea */}
            <div className="flex items-start gap-3">
              <StickyNote className="h-5 w-5 text-gray-500 mt-3.5 shrink-0" />
              <div className="flex-1">
                <TransformingTextareaField
                  icon={StickyNote}
                  label="Notizen hinzufügen"
                  inputLabel="Notizen"
                  value={formData.notes || ''}
                  onChange={(v) => setFormData(prev => ({ ...prev, notes: v }))}
                />
              </div>
            </div>

            {/* Address Section */}
            {(showAddresses || formData.addresses.length > 0) && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-500 mt-3.5 shrink-0" />
                <div className="flex-1 space-y-3">
                  {formData.addresses.map((address, index) => (
                    <div key={index} className="space-y-3 p-3 border border-gray-200 rounded">
                      <FloatingInput
                        label="Strasse"
                        value={address.street}
                        onChange={(v) => {
                          const newAddresses = [...formData.addresses];
                          newAddresses[index] = { ...newAddresses[index], street: v };
                          setFormData(prev => ({ ...prev, addresses: newAddresses }));
                        }}
                        onRemove={() => removeAddress(index)}
                      />
                      <div className="flex gap-4">
                        <FloatingInput
                          label="PLZ"
                          value={address.postalCode}
                          onChange={(v) => {
                            const newAddresses = [...formData.addresses];
                            newAddresses[index] = { ...newAddresses[index], postalCode: v };
                            setFormData(prev => ({ ...prev, addresses: newAddresses }));
                          }}
                          className="w-28"
                        />
                        <FloatingInput
                          label="Stadt"
                          value={address.city}
                          onChange={(v) => {
                            const newAddresses = [...formData.addresses];
                            newAddresses[index] = { ...newAddresses[index], city: v };
                            setFormData(prev => ({ ...prev, addresses: newAddresses }));
                          }}
                          className="flex-1"
                        />
                      </div>
                      <FloatingInput
                        label="Land"
                        value={address.country}
                        onChange={(v) => {
                          const newAddresses = [...formData.addresses];
                          newAddresses[index] = { ...newAddresses[index], country: v };
                          setFormData(prev => ({ ...prev, addresses: newAddresses }));
                        }}
                      />
                    </div>
                  ))}
                  <AddFieldButton
                    icon={Plus}
                    label="Adresse hinzufügen"
                    onClick={addAddress}
                  />
                </div>
              </div>
            )}

            {/* Websites Section - nur wenn bereits Websites vorhanden */}
            {formData.websites.length > 0 && (
              <div className="flex items-start gap-3">
                <Link2 className="h-5 w-5 text-gray-500 mt-3.5 shrink-0" />
                <div className="flex-1 space-y-3">
                  {formData.websites.map((website, index) => (
                    <FloatingInput
                      key={index}
                      label="Website"
                      value={website.value}
                      onChange={(v) => {
                        const newWebsites = [...formData.websites];
                        newWebsites[index] = { ...newWebsites[index], value: v };
                        setFormData(prev => ({ ...prev, websites: newWebsites }));
                      }}
                      onRemove={() => removeWebsite(index)}
                    />
                  ))}
                  <TransformingAddField
                    icon={Plus}
                    label="Website hinzufügen"
                    inputLabel="Website"
                    onAdd={(v) => {
                      setFormData(prev => ({
                        ...prev,
                        websites: [...prev.websites, { value: v, label: 'Website' }]
                      }));
                    }}
                  />
                </div>
              </div>
            )}

            {/* Relationships Section - nur wenn bereits Relationships vorhanden */}
            {formData.relationships.length > 0 && (
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-gray-500 mt-3.5 shrink-0" />
                <div className="flex-1 space-y-3">
                  {formData.relationships.map((rel, index) => (
                    <div key={index} className="flex gap-2">
                      <FloatingInput
                        label="Name"
                        value={rel.name}
                        onChange={(v) => {
                          const newRels = [...formData.relationships];
                          newRels[index] = { ...newRels[index], name: v };
                          setFormData(prev => ({ ...prev, relationships: newRels }));
                        }}
                        className="flex-1"
                      />
                      <FloatingInput
                        label="Beziehung"
                        value={rel.type}
                        onChange={(v) => {
                          const newRels = [...formData.relationships];
                          newRels[index] = { ...newRels[index], type: v };
                          setFormData(prev => ({ ...prev, relationships: newRels }));
                        }}
                        className="w-40"
                        onRemove={() => removeRelationship(index)}
                      />
                    </div>
                  ))}
                  <AddFieldButton
                    icon={Plus}
                    label="Zugehörige Person hinzufügen"
                    onClick={addRelationship}
                  />
                </div>
              </div>
            )}

            {/* Custom Fields Section */}
            {(showCustomFields || formData.customFields.length > 0) && (
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-gray-500 mt-3.5 shrink-0" />
                <div className="flex-1 space-y-3">
                  {formData.customFields.map((field, index) => (
                    <div key={index} className="flex gap-2">
                      <FloatingInput
                        label="Bezeichnung"
                        value={field.label}
                        onChange={(v) => {
                          const newFields = [...formData.customFields];
                          newFields[index] = { ...newFields[index], label: v };
                          setFormData(prev => ({ ...prev, customFields: newFields }));
                        }}
                        className="w-40"
                      />
                      <FloatingInput
                        label="Wert"
                        value={field.value}
                        onChange={(v) => {
                          const newFields = [...formData.customFields];
                          newFields[index] = { ...newFields[index], value: v };
                          setFormData(prev => ({ ...prev, customFields: newFields }));
                        }}
                        className="flex-1"
                        onRemove={() => removeCustomField(index)}
                      />
                    </div>
                  ))}
                  <AddFieldButton
                    icon={Plus}
                    label="Benutzerdefinierte Daten hinzufügen"
                    onClick={addCustomField}
                  />
                </div>
              </div>
            )}

            {/* Mehr anzeigen Button und erweiterte Optionen */}
            {!showMoreOptions ? (
              <div className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMoreOptions(true)}
                  className="text-teal-600 border-teal-600 hover:bg-teal-50 rounded-full px-4"
                >
                  Mehr anzeigen
                </Button>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                {/* Wichtiges Datum hinzufügen - TransformingBirthdayField */}
                <div className="flex items-start gap-3">
                  <Cake className="h-5 w-5 text-gray-500 mt-3.5 shrink-0" />
                  <div className="flex-1">
                    <TransformingBirthdayField
                      icon={Cake}
                      label="Wichtiges Datum hinzufügen"
                      day={formData.birthday?.day || ''}
                      month={formData.birthday?.month || ''}
                      year={formData.birthday?.year || ''}
                      onDayChange={(v) => setFormData(prev => ({
                        ...prev,
                        birthday: { ...(prev.birthday || { day: '', month: '', year: '' }), day: v }
                      }))}
                      onMonthChange={(v) => setFormData(prev => ({
                        ...prev,
                        birthday: { ...(prev.birthday || { day: '', month: '', year: '' }), month: v }
                      }))}
                      onYearChange={(v) => setFormData(prev => ({
                        ...prev,
                        birthday: { ...(prev.birthday || { day: '', month: '', year: '' }), year: v }
                      }))}
                    />
                  </div>
                </div>

                {/* Website hinzufügen */}
                {!showWebsites && formData.websites.length === 0 && (
                  <AddFieldButton
                    icon={Link2}
                    label="Website hinzufügen"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        websites: [...prev.websites, { value: '', label: 'Privat' }]
                      }));
                      setShowWebsites(true);
                    }}
                  />
                )}

                {/* Zugehörige Person hinzufügen */}
                {!showRelationships && formData.relationships.length === 0 && (
                  <AddFieldButton
                    icon={Users}
                    label="Zugehörige Person hinzufügen"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        relationships: [...prev.relationships, { name: '', type: '' }]
                      }));
                      setShowRelationships(true);
                    }}
                  />
                )}

                {/* Benutzerdefinierte Daten hinzufügen */}
                {!showCustomFields && formData.customFields.length === 0 && (
                  <AddFieldButton
                    icon={FileText}
                    label="Benutzerdefinierte Daten hinzufügen"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        customFields: [...prev.customFields, { label: '', value: '' }]
                      }));
                      setShowCustomFields(true);
                    }}
                  />
                )}

                {/* Weniger anzeigen Button */}
                <div className="pt-2 pb-16">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMoreOptions(false)}
                    className="text-teal-600 border-teal-600 hover:bg-teal-50 rounded-full px-4"
                  >
                    Weniger anzeigen
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
