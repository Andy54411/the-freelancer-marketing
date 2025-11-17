// Basis-Komponente für alle Unterkategorie-Formulare
import React from 'react';
import { BaseSubcategoryData } from '@/types/subcategory-forms';
import { useRouter } from 'next/navigation';
import { useRegistration } from '@/contexts/Registration-Context';

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
  // Sicherheitsüberprüfung: stelle sicher, dass value ein Array ist
  if (!Array.isArray(value)) {
  }
  const safeValue = Array.isArray(value) ? value : [];

  const handleChange = (optionValue: string, checked: boolean) => {
    if (checked) {
      if (maxSelections && safeValue.length >= maxSelections) return;
      onChange([...safeValue, optionValue]);
    } else {
      onChange(safeValue.filter(v => v !== optionValue));
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {options.map(option => (
        <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={safeValue.includes(option.value)}
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

export interface FormSubmitButtonProps {
  isValid: boolean;
  subcategory: string;
  loadingText?: string;
  buttonText?: string;
  formData?: any; // Optional: Formulardaten für Beschreibungsextraktion
  hideSubmitButton?: boolean; // Versteckt den Submit-Button für Dashboard-Verwendung
}

export const FormSubmitButton: React.FC<FormSubmitButtonProps> = ({
  isValid,
  subcategory,
  loadingText = 'Wird verarbeitet...',
  buttonText = 'Weiter zur Adresseingabe',
  formData,
  hideSubmitButton = false,
}) => {
  const router = useRouter();
  const { setDescription, setSubcategoryData } = useRegistration();

  const handleNextClick = () => {
    if (!isValid) {
      return;
    }

    // Speichere die Formulardaten im localStorage über setSubcategoryData
    if (formData && setSubcategoryData) {
      setSubcategoryData(formData);
    }

    // Extrahiere die Beschreibung aus den Formulardaten
    if (formData && setDescription) {
      let description = '';

      // Versuche verschiedene Felder, die als Beschreibung dienen könnten
      if (formData.specialRequirements) {
        description = formData.specialRequirements;
      } else if (formData.projectDescription) {
        description = formData.projectDescription;
      } else if (formData.description) {
        description = formData.description;
      } else if (formData.additionalInfo) {
        description = formData.additionalInfo;
      } else if (formData.notes) {
        description = formData.notes;
      } else if (formData.additionalRequirements) {
        description = formData.additionalRequirements;
      }

      // Setze die Beschreibung im Registration-Context
      if (description && description.trim()) {
        setDescription(description.trim());
      }
    }

    const encodedSubcategory = encodeURIComponent(subcategory);
    router.push(`/auftrag/get-started/${encodedSubcategory}/adresse`);
  };

  return (
    <div className="space-y-6 mt-8">
      {/* Wenn hideSubmitButton true ist, zeige nichts an */}
      {hideSubmitButton && <div />}

      {/* Validierungsanzeige */}
      {!hideSubmitButton && !isValid && (
        <div className="text-center">
          <div className="inline-flex items-center py-3 px-5 bg-linear-to-r from-teal-50 to-cyan-50 border border-[#14ad9f]/20 rounded-xl shadow-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-3 text-[#14ad9f]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-gray-700 font-medium">
              Bitte füllen Sie alle Pflichtfelder aus, um fortzufahren.
            </span>
          </div>
        </div>
      )}

      {/* Submit Button - wird NUR angezeigt wenn das Formular vollständig ausgefüllt ist */}
      {!hideSubmitButton && isValid && (
        <div className="text-center">
          <button
            className="bg-[#14ad9f] hover:bg-teal-700 text-white font-medium py-3 px-6 rounded-lg shadow transition-colors duration-200"
            onClick={handleNextClick}
          >
            {buttonText}
          </button>
        </div>
      )}
    </div>
  );
};
