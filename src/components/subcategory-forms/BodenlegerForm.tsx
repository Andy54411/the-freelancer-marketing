'use client';
import React, { useState, useEffect } from 'react';
import { BodenlegerData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';
import { useRouter } from 'next/navigation';

interface BodenlegerFormProps {
  data: BodenlegerData;
  onDataChange: (data: BodenlegerData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const BodenlegerForm: React.FC<BodenlegerFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<BodenlegerData>(data);
  const router = useRouter();

  // Lokale FormSubmitButton Komponente
  const FormSubmitButton = ({
    isValid,
    subcategory,
  }: {
    isValid: boolean;
    subcategory: string;
  }) => {
    const handleNextClick = () => {
      if (!isValid) {
        return;
      }

      const encodedSubcategory = encodeURIComponent(subcategory);
      router.push(`/auftrag/get-started/${encodedSubcategory}/adresse`);
    };

    return (
      <div className="space-y-6 mt-8">
        {/* Validierungsanzeige */}
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

        {/* Submit Button - wird NUR angezeigt wenn das Formular vollständig ausgefüllt ist */}
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
    { value: 'neubau', label: 'Neubau' },
    { value: 'renovierung', label: 'Renovierung' },
    { value: 'reparatur', label: 'Reparatur' },
    { value: 'austausch', label: 'Austausch' },
  ];

  const floorTypeOptions = [
    { value: 'parkett', label: 'Parkett' },
    { value: 'laminat', label: 'Laminat' },
    { value: 'vinyl', label: 'Vinyl/PVC' },
    { value: 'teppich', label: 'Teppich' },
    { value: 'fliesen', label: 'Fliesen' },
    { value: 'linoleum', label: 'Linoleum' },
    { value: 'kork', label: 'Kork' },
  ];

  const roomTypeOptions = [
    { value: 'wohnzimmer', label: 'Wohnzimmer' },
    { value: 'schlafzimmer', label: 'Schlafzimmer' },
    { value: 'küche', label: 'Küche' },
    { value: 'bad', label: 'Bad' },
    { value: 'flur', label: 'Flur' },
    { value: 'büro', label: 'Büro' },
    { value: 'gewerbe', label: 'Gewerbebereich' },
  ];

  const subfloorTypeOptions = [
    { value: 'estrich', label: 'Estrich' },
    { value: 'holz', label: 'Holzunterboden' },
    { value: 'beton', label: 'Beton' },
    { value: 'trockenestrich', label: 'Trockenestrich' },
    { value: 'fußbodenheizung', label: 'Fußbodenheizung' },
  ];

  const patternOptions = [
    { value: 'parallel', label: 'Parallel zur Wand' },
    { value: 'diagonal', label: 'Diagonal' },
    { value: 'fischgrät', label: 'Fischgrätmuster' },
    { value: 'wiener_würfel', label: 'Wiener Würfel' },
    { value: 'englisch', label: 'Englischer Verband' },
  ];

  const materialProvidedOptions = [
    { value: 'kunde', label: 'Kunde stellt Material' },
    { value: 'handwerker', label: 'Handwerker bringt Material mit' },
    { value: 'gemeinsam', label: 'Gemeinsame Beschaffung' },
  ];

  const handleInputChange = (field: keyof BodenlegerData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  // Validierung
  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.floorType &&
      formData.roomType &&
      formData.subfloorType &&
      formData.pattern &&
      formData.materialProvided &&
      typeof formData.moistureBarrier === 'boolean'
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.floorType &&
      formData.roomType &&
      formData.subfloorType &&
      formData.pattern &&
      formData.materialProvided &&
      typeof formData.moistureBarrier === 'boolean'
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Bodenleger-Projektdetails
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

          <FormField label="Bodenbelag" required>
            <FormSelect
              value={formData.floorType || ''}
              onChange={value => handleInputChange('floorType', value)}
              options={floorTypeOptions}
              placeholder="Wählen Sie den Bodenbelag"
            />
          </FormField>

          <FormField label="Raumtyp" required>
            <FormSelect
              value={formData.roomType || ''}
              onChange={value => handleInputChange('roomType', value)}
              options={roomTypeOptions}
              placeholder="Wählen Sie den Raumtyp"
            />
          </FormField>

          <FormField label="Untergrund" required>
            <FormSelect
              value={formData.subfloorType || ''}
              onChange={value => handleInputChange('subfloorType', value)}
              options={subfloorTypeOptions}
              placeholder="Wählen Sie den Untergrund"
            />
          </FormField>

          <FormField label="Verlegemuster" required>
            <FormSelect
              value={formData.pattern || ''}
              onChange={value => handleInputChange('pattern', value)}
              options={patternOptions}
              placeholder="Wählen Sie das Verlegemuster"
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

          <FormField label="Quadratmeter">
            <FormInput
              type="number"
              value={formData.squareMeters?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'squareMeters',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Fläche in m²"
            />
          </FormField>

          <FormField label="Anzahl Räume">
            <FormInput
              type="number"
              value={formData.numberOfRooms?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'numberOfRooms',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl der Räume"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Feuchtigkeitssperre erforderlich">
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="moistureBarrier"
                  checked={formData.moistureBarrier === true}
                  onChange={() => handleInputChange('moistureBarrier', true)}
                  className="mr-2"
                />
                Ja, Feuchtigkeitssperre erforderlich
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="moistureBarrier"
                  checked={formData.moistureBarrier === false}
                  onChange={() => handleInputChange('moistureBarrier', false)}
                  className="mr-2"
                />
                Nein, keine Feuchtigkeitssperre erforderlich
              </label>
            </div>
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Beschreiben Sie besondere Wünsche, Anforderungen oder Besonderheiten des Auftrags"
              rows={3}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Bodenleger" />
    </div>
  );
};

export default BodenlegerForm;
