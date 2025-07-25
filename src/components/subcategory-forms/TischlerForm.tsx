'use client';
import React, { useState, useEffect } from 'react';
import { TischlerData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';
import { useRouter } from 'next/navigation';

interface TischlerFormProps {
  data: TischlerData;
  onDataChange: (data: TischlerData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const TischlerForm: React.FC<TischlerFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<TischlerData>(data);
  const router = useRouter();
    return (
      <div className="space-y-6 mt-8">
        {!isValid && (
          <div className="text-center">
            <div className="inline-flex items-center py-3 px-5 bg-gradient-to-r from-teal-50 to-cyan-50 border border-[#14ad9f]/20 rounded-xl shadow-sm">
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
        {isValid && (
          <div className="text-center">
            <button
              className="bg-[#14ad9f] hover:bg-teal-700 text-white font-medium py-3 px-6 rounded-lg shadow transition-colors duration-200"
              onClick={handleNextClick}
            >
              Weiter zur Adresseingabe
            </button>
          </div>
        )}
      </div>
    );
  };

  const serviceTypeOptions = [
    { value: 'reparatur', label: 'Reparatur' },
    { value: 'anfertigung', label: 'Anfertigung' },
    { value: 'restauration', label: 'Restauration' },
    { value: 'beratung', label: 'Beratung' },
  ];

  const furnitureTypeOptions = [
    { value: 'küche', label: 'Küche' },
    { value: 'schrank', label: 'Schrank' },
    { value: 'tisch', label: 'Tisch' },
    { value: 'stuhl', label: 'Stuhl' },
    { value: 'türen', label: 'Türen' },
    { value: 'fenster', label: 'Fenster' },
    { value: 'parkett', label: 'Parkett' },
    { value: 'sonstiges', label: 'Sonstiges' },
  ];

  const materialOptions = [
    { value: 'holz', label: 'Holz (allgemein)' },
    { value: 'mdf', label: 'MDF' },
    { value: 'spanplatte', label: 'Spanplatte' },
    { value: 'massivholz', label: 'Massivholz' },
    { value: 'nach_absprache', label: 'Nach Absprache' },
  ];

  const complexityOptions = [
    { value: 'einfach', label: 'Einfach' },
    { value: 'mittel', label: 'Mittel' },
    { value: 'komplex', label: 'Komplex' },
  ];

  const materialProvidedOptions = [
    { value: 'kunde', label: 'Kunde stellt Material' },
    { value: 'handwerker', label: 'Handwerker bringt Material mit' },
    { value: 'gemeinsam', label: 'Gemeinsame Beschaffung' },
  ];

  const timeframeOptions = [
    { value: 'sofort', label: 'Sofort' },
    { value: 'innerhalb_woche', label: 'Innerhalb einer Woche' },
    { value: 'innerhalb_monat', label: 'Innerhalb eines Monats' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const handleInputChange = (field: keyof TischlerData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  // Validierung
  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.furnitureType &&
      formData.material &&
      formData.complexity &&
      formData.materialProvided &&
      formData.timeframe
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.furnitureType &&
      formData.material &&
      formData.complexity &&
      formData.materialProvided &&
      formData.timeframe
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Tischler-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Dienstleistung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art der Dienstleistung"
            />
          </FormField>

          <FormField label="Möbeltyp" required>
            <FormSelect
              value={formData.furnitureType || ''}
              onChange={value => handleInputChange('furnitureType', value)}
              options={furnitureTypeOptions}
              placeholder="Wählen Sie den Möbeltyp"
            />
          </FormField>

          <FormField label="Material" required>
            <FormSelect
              value={formData.material || ''}
              onChange={value => handleInputChange('material', value)}
              options={materialOptions}
              placeholder="Wählen Sie das Material"
            />
          </FormField>

          <FormField label="Holzart (falls spezifisch)">
            <FormInput
              value={formData.woodType || ''}
              onChange={value => handleInputChange('woodType', value)}
              placeholder="z.B. Eiche, Buche, Kiefer"
            />
          </FormField>

          <FormField label="Komplexität" required>
            <FormSelect
              value={formData.complexity || ''}
              onChange={value => handleInputChange('complexity', value)}
              options={complexityOptions}
              placeholder="Wählen Sie die Komplexität"
            />
          </FormField>

          <FormField label="Materialbereitstellung" required>
            <FormSelect
              value={formData.materialProvided || ''}
              onChange={value => handleInputChange('materialProvided', value)}
              options={materialProvidedOptions}
              placeholder="Wer stellt das Material?"
            />
          </FormField>

          <FormField label="Zeitrahmen" required>
            <FormSelect
              value={formData.timeframe || ''}
              onChange={value => handleInputChange('timeframe', value)}
              options={timeframeOptions}
              placeholder="Wählen Sie den Zeitrahmen"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Abmessungen">
            <FormTextarea
              value={formData.dimensions || ''}
              onChange={value => handleInputChange('dimensions', value)}
              placeholder="Geben Sie die gewünschten Abmessungen an (z.B. 200x80x75 cm)"
              rows={2}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Beschreiben Sie besondere Wünsche, Anforderungen oder Besonderheiten"
              rows={3}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Tischler" />
    </div>
  );
}

export default TischlerForm;
