import React, { useState, useEffect } from 'react';
import { BodenlegerData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
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
    </div>
  );
};

export default BodenlegerForm;
