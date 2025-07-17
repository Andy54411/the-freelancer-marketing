import React, { useState, useEffect } from 'react';
import { HeizungSanitärData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface HeizungSanitärFormProps {
  data: HeizungSanitärData;
  onDataChange: (data: HeizungSanitärData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const HeizungSanitärForm: React.FC<HeizungSanitärFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<HeizungSanitärData>(data);

  const serviceTypeOptions = [
    { value: 'reparatur', label: 'Reparatur' },
    { value: 'installation', label: 'Installation' },
    { value: 'wartung', label: 'Wartung' },
    { value: 'notfall', label: 'Notfall' },
    { value: 'modernisierung', label: 'Modernisierung' },
  ];

  const systemTypeOptions = [
    { value: 'heizung', label: 'Heizung' },
    { value: 'sanitär', label: 'Sanitär' },
    { value: 'lüftung', label: 'Lüftung' },
    { value: 'komplettsystem', label: 'Komplettsystem' },
  ];

  const buildingTypeOptions = [
    { value: 'einfamilienhaus', label: 'Einfamilienhaus' },
    { value: 'wohnung', label: 'Wohnung' },
    { value: 'gewerbe', label: 'Gewerbe' },
    { value: 'neubau', label: 'Neubau' },
  ];

  const heatingTypeOptions = [
    { value: 'gas', label: 'Gas' },
    { value: 'öl', label: 'Öl' },
    { value: 'wärmepumpe', label: 'Wärmepumpe' },
    { value: 'fernwärme', label: 'Fernwärme' },
    { value: 'solar', label: 'Solar' },
    { value: 'holz', label: 'Holz' },
  ];

  const materialProvidedOptions = [
    { value: 'kunde', label: 'Kunde stellt Material' },
    { value: 'handwerker', label: 'Handwerker bringt Material mit' },
    { value: 'gemeinsam', label: 'Gemeinsame Beschaffung' },
  ];

  const handleInputChange = (field: keyof HeizungSanitärData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  // Validierung
  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.systemType &&
      formData.buildingType &&
      formData.materialProvided &&
      typeof formData.certificationNeeded === 'boolean'
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Heizungsbau & Sanitär-Projektdetails
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

          <FormField label="Systemtyp" required>
            <FormSelect
              value={formData.systemType || ''}
              onChange={value => handleInputChange('systemType', value)}
              options={systemTypeOptions}
              placeholder="Wählen Sie den Systemtyp"
            />
          </FormField>

          <FormField label="Gebäudeart" required>
            <FormSelect
              value={formData.buildingType || ''}
              onChange={value => handleInputChange('buildingType', value)}
              options={buildingTypeOptions}
              placeholder="Wählen Sie die Gebäudeart"
            />
          </FormField>

          <FormField label="Anzahl Räume">
            <FormInput
              type="number"
              value={formData.roomCount?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'roomCount',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl der betroffenen Räume"
            />
          </FormField>

          <FormField label="Heizungsart">
            <FormSelect
              value={formData.heatingType || ''}
              onChange={value => handleInputChange('heatingType', value)}
              options={heatingTypeOptions}
              placeholder="Wählen Sie die Heizungsart"
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
        </div>

        <div className="mt-4">
          <FormField label="Zertifizierung erforderlich">
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="certificationNeeded"
                  checked={formData.certificationNeeded === true}
                  onChange={() => handleInputChange('certificationNeeded', true)}
                  className="mr-2"
                />
                Ja, Zertifizierung erforderlich
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="certificationNeeded"
                  checked={formData.certificationNeeded === false}
                  onChange={() => handleInputChange('certificationNeeded', false)}
                  className="mr-2"
                />
                Nein, keine Zertifizierung erforderlich
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

export default HeizungSanitärForm;
