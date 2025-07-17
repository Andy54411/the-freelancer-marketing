// Basis-Komponente für alle Unterkategorie-Formulare
import React from 'react';
import { BaseSubcategoryData } from '@/types/subcategory-forms';

export interface SubcategoryFormProps<T extends BaseSubcategoryData> {
  data: T;
  onChange: (data: T) => void;
  errors: string[];
}

export interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  description?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  required,
  children,
  description,
}) => (
  <div className="space-y-2">
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {description && <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>}
    {children}
    {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
  </div>
);

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

export const FormSelect: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, options, placeholder, className = '' }) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${className}`}
  >
    {placeholder && <option value="">{placeholder}</option>}
    {options.map(option => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);

export const FormInput: React.FC<{
  type?: 'text' | 'number' | 'email' | 'tel';
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  className?: string;
  min?: number;
  max?: number;
}> = ({ type = 'text', value, onChange, placeholder, className = '', min, max }) => (
  <input
    type={type}
    value={value}
    onChange={e => {
      // Wenn der Typ 'number' ist, aber der Wert einen Bindestrich enthält (z.B. '20-50'),
      // behandeln wir den Wert als String, um Fehler zu vermeiden
      if (type === 'number' && !e.target.value.includes('-')) {
        onChange(e.target.value ? parseFloat(e.target.value) || 0 : e.target.value);
      } else {
        onChange(e.target.value);
      }
    }}
    placeholder={placeholder}
    min={min}
    max={max}
    className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${className}`}
  />
);

export const FormTextarea: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}> = ({ value, onChange, placeholder, rows = 3, className = '' }) => (
  <textarea
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    rows={rows}
    className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-vertical ${className}`}
  />
);

export const FormCheckboxGroup: React.FC<{
  value: string[];
  onChange: (value: string[]) => void;
  options: SelectOption[];
  maxSelections?: number;
}> = ({ value, onChange, options, maxSelections }) => {
  const handleChange = (optionValue: string, checked: boolean) => {
    if (checked) {
      if (maxSelections && value.length >= maxSelections) return;
      onChange([...value, optionValue]);
    } else {
      onChange(value.filter(v => v !== optionValue));
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {options.map(option => (
        <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value.includes(option.value)}
            onChange={e => handleChange(option.value, e.target.checked)}
            className="w-4 h-4 text-[#14ad9f] bg-gray-100 border-gray-300 rounded focus:ring-[#14ad9f] focus:ring-2"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
        </label>
      ))}
    </div>
  );
};

export const FormRadioGroup: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  name: string;
}> = ({ value, onChange, options, name }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    {options.map(option => (
      <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
        <input
          type="radio"
          name={name}
          value={option.value}
          checked={value === option.value}
          onChange={e => onChange(e.target.value)}
          className="w-4 h-4 text-[#14ad9f] bg-gray-100 border-gray-300 focus:ring-[#14ad9f] focus:ring-2"
        />
        <div>
          <span className="text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
          {option.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{option.description}</p>
          )}
        </div>
      </label>
    ))}
  </div>
);
