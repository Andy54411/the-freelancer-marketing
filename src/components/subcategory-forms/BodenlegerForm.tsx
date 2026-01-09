'use client';
import React, { useState, useEffect } from 'react';
import { BodenlegerData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormSubmitButton,
} from './FormComponents';

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

  const handleInputChange = (field: keyof BodenlegerData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.floorType &&
      formData.roomType &&
      formData.subfloorType &&
      formData.pattern &&
      formData.materialProvided
    );
  };

  useEffect(() => {
    onValidationChange(isFormValid());
  }, [formData, onValidationChange]);

  const serviceTypeOptions = [
    { value: 'verlegung', label: 'Bodenverlegung' },
    { value: 'renovierung', label: 'Bodenrenovierung' },
    { value: 'reparatur', label: 'Bodenreparatur' },
    { value: 'beratung', label: 'Beratung und Planung' },
  ];

  const floorTypeOptions = [
    { value: 'laminat', label: 'Laminat' },
    { value: 'parkett', label: 'Parkett' },
    { value: 'vinylboden', label: 'Vinylboden/LVT' },
    { value: 'fliesen', label: 'Fliesen' },
    { value: 'teppich', label: 'Teppich' },
    { value: 'kork', label: 'Korkboden' },
    { value: 'linoleum', label: 'Linoleum' },
    { value: 'estrich', label: 'Estrich' },
  ];

  const roomTypeOptions = [
    { value: 'wohnzimmer', label: 'Wohnzimmer' },
    { value: 'schlafzimmer', label: 'Schlafzimmer' },
    { value: 'kueche', label: 'Küche' },
    { value: 'bad', label: 'Badezimmer' },
    { value: 'flur', label: 'Flur/Diele' },
    { value: 'keller', label: 'Keller' },
    { value: 'dachboden', label: 'Dachboden' },
    { value: 'buero', label: 'Büro/Gewerbe' },
  ];

  const subfloorTypeOptions = [
    { value: 'beton', label: 'Beton' },
    { value: 'estrich', label: 'Estrich' },
    { value: 'holz', label: 'Holz/Dielen' },
    { value: 'fliesen', label: 'Alte Fliesen' },
    { value: 'teppich', label: 'Alter Teppich' },
    { value: 'unknown', label: 'Unbekannt' },
  ];

  const patternOptions = [
    { value: 'gerade', label: 'Gerade Verlegung' },
    { value: 'diagonal', label: 'Diagonale Verlegung' },
    { value: 'fischgraet', label: 'Fischgrätmuster' },
    { value: 'wilder-verband', label: 'Wilder Verband' },
    { value: 'parallel', label: 'Parallel zur längsten Wand' },
  ];

  const materialProvidedOptions = [
    { value: 'kunde', label: 'Kunde stellt Material' },
    { value: 'anbieter', label: 'Dienstleister beschafft Material' },
    { value: 'gemeinsam', label: 'Gemeinsame Beschaffung' },
  ];

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

      <FormSubmitButton isValid={isFormValid()} subcategory="Bodenleger" formData={formData} />
    </div>
  );
};

export default BodenlegerForm;
