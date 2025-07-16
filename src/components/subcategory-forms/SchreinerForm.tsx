import React, { useState, useEffect } from 'react';
import { SchreinerData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface SchreinerFormProps {
  data: SchreinerData;
  onDataChange: (data: SchreinerData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const SchreinerForm: React.FC<SchreinerFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<SchreinerData>(data);

  const serviceTypeOptions = [
    { value: 'neubau', label: 'Neubau' },
    { value: 'renovierung', label: 'Renovierung' },
    { value: 'reparatur', label: 'Reparatur' },
    { value: 'restaurierung', label: 'Restaurierung' },
  ];

  const workTypeOptions = [
    { value: 'möbelbau', label: 'Möbelbau' },
    { value: 'innenausbau', label: 'Innenausbau' },
    { value: 'treppen', label: 'Treppenbau' },
    { value: 'türen', label: 'Türen' },
    { value: 'fenster', label: 'Fenster' },
    { value: 'dachstuhl', label: 'Dachstuhl' },
    { value: 'verkleidung', label: 'Verkleidung' },
  ];

  const woodTypeOptions = [
    { value: 'eiche', label: 'Eiche' },
    { value: 'buche', label: 'Buche' },
    { value: 'kiefer', label: 'Kiefer' },
    { value: 'fichte', label: 'Fichte' },
    { value: 'lärche', label: 'Lärche' },
    { value: 'mahagoni', label: 'Mahagoni' },
    { value: 'nach_absprache', label: 'Nach Absprache' },
  ];

  const finishOptions = [
    { value: 'lackiert', label: 'Lackiert' },
    { value: 'gebeizt', label: 'Gebeizt' },
    { value: 'geölt', label: 'Geölt' },
    { value: 'gewachst', label: 'Gewachst' },
    { value: 'unbehandelt', label: 'Unbehandelt' },
    { value: 'nach_absprache', label: 'Nach Absprache' },
  ];

  const jointTypeOptions = [
    { value: 'mortise_tenon', label: 'Zapfenverbindung' },
    { value: 'dovetail', label: 'Schwalbenschwanz' },
    { value: 'finger_joint', label: 'Fingerverbindung' },
    { value: 'biscuit', label: 'Flachdübelverbindung' },
    { value: 'screw', label: 'Schraubverbindung' },
    { value: 'nach_absprache', label: 'Nach Absprache' },
  ];

  const complexityOptions = [
    { value: 'einfach', label: 'Einfach' },
    { value: 'mittel', label: 'Mittel' },
    { value: 'komplex', label: 'Komplex' },
    { value: 'sehr_komplex', label: 'Sehr komplex' },
  ];

  const handleInputChange = (field: keyof SchreinerData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  // Validierung
  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.workType &&
      formData.woodType &&
      formData.finish &&
      formData.jointType &&
      formData.complexity &&
      typeof formData.customDesign === 'boolean'
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Schreiner-Projektdetails
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

          <FormField label="Art der Schreinerarbeit" required>
            <FormSelect
              value={formData.workType || ''}
              onChange={value => handleInputChange('workType', value)}
              options={workTypeOptions}
              placeholder="Wählen Sie die Art der Schreinerarbeit"
            />
          </FormField>

          <FormField label="Holzart" required>
            <FormSelect
              value={formData.woodType || ''}
              onChange={value => handleInputChange('woodType', value)}
              options={woodTypeOptions}
              placeholder="Wählen Sie die Holzart"
            />
          </FormField>

          <FormField label="Oberflächenbehandlung" required>
            <FormSelect
              value={formData.finish || ''}
              onChange={value => handleInputChange('finish', value)}
              options={finishOptions}
              placeholder="Wählen Sie die Oberflächenbehandlung"
            />
          </FormField>

          <FormField label="Verbindungsart" required>
            <FormSelect
              value={formData.jointType || ''}
              onChange={value => handleInputChange('jointType', value)}
              options={jointTypeOptions}
              placeholder="Wählen Sie die Verbindungsart"
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

          <FormField label="Maße (L x B x H in cm)">
            <FormInput
              type="text"
              value={formData.dimensions || ''}
              onChange={value => handleInputChange('dimensions', value)}
              placeholder="z.B. 200 x 80 x 40"
            />
          </FormField>

          <FormField label="Anzahl Stücke">
            <FormInput
              type="number"
              value={formData.quantity?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'quantity',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl der Stücke"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Individuelles Design">
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="customDesign"
                  checked={formData.customDesign === true}
                  onChange={() => handleInputChange('customDesign', true)}
                  className="mr-2"
                />
                Ja, individuelles Design gewünscht
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="customDesign"
                  checked={formData.customDesign === false}
                  onChange={() => handleInputChange('customDesign', false)}
                  className="mr-2"
                />
                Nein, Standarddesign ausreichend
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

export default SchreinerForm;
