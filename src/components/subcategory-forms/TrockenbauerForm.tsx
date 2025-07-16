import React, { useState, useEffect } from 'react';
import { TrockenbauData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface TrockenbauerFormProps {
  data: TrockenbauData;
  onDataChange: (data: TrockenbauData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const TrockenbauerForm: React.FC<TrockenbauerFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<TrockenbauData>(data);

  const serviceTypeOptions = [
    { value: 'neubau', label: 'Neubau' },
    { value: 'renovierung', label: 'Renovierung' },
    { value: 'reparatur', label: 'Reparatur' },
    { value: 'umbau', label: 'Umbau' },
  ];

  const workTypeOptions = [
    { value: 'trennwand', label: 'Trennwand' },
    { value: 'abgehängte_decke', label: 'Abgehängte Decke' },
    { value: 'verkleidung', label: 'Verkleidung' },
    { value: 'dämmung', label: 'Dämmung' },
    { value: 'vorsatzschale', label: 'Vorsatzschale' },
  ];

  const materialOptions = [
    { value: 'gipskarton', label: 'Gipskarton' },
    { value: 'gipsfaser', label: 'Gipsfaser' },
    { value: 'fermacell', label: 'Fermacell' },
    { value: 'osb', label: 'OSB-Platten' },
    { value: 'spanplatte', label: 'Spanplatte' },
    { value: 'nach_absprache', label: 'Nach Absprache' },
  ];

  const wallThicknessOptions = [
    { value: '75', label: '75 mm' },
    { value: '100', label: '100 mm' },
    { value: '125', label: '125 mm' },
    { value: '150', label: '150 mm' },
    { value: '175', label: '175 mm' },
    { value: 'nach_absprache', label: 'Nach Absprache' },
  ];

  const profileTypeOptions = [
    { value: 'cw', label: 'CW-Profil' },
    { value: 'uw', label: 'UW-Profil' },
    { value: 'cd', label: 'CD-Profil' },
    { value: 'ud', label: 'UD-Profil' },
    { value: 'nach_absprache', label: 'Nach Absprache' },
  ];

  const soundInsulationOptions = [
    { value: 'benötigt', label: 'Schallschutz erforderlich' },
    { value: 'nicht_nötig', label: 'Nicht erforderlich' },
  ];

  const fireProtectionOptions = [
    { value: 'benötigt', label: 'Brandschutz erforderlich' },
    { value: 'nicht_nötig', label: 'Nicht erforderlich' },
  ];

  const handleInputChange = (field: keyof TrockenbauData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  // Validierung
  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.workType &&
      formData.material &&
      formData.wallThickness &&
      formData.profileType &&
      formData.soundInsulation &&
      formData.fireProtection &&
      typeof formData.insulationNeeded === 'boolean'
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Trockenbauer-Projektdetails
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

          <FormField label="Art der Trockenbauarbeit" required>
            <FormSelect
              value={formData.workType || ''}
              onChange={value => handleInputChange('workType', value)}
              options={workTypeOptions}
              placeholder="Wählen Sie die Art der Arbeit"
            />
          </FormField>

          <FormField label="Fläche (m²)">
            <FormInput
              type="number"
              value={formData.area?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'area',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Fläche in m²"
            />
          </FormField>

          <FormField label="Wandhöhe (m)">
            <FormInput
              type="number"
              value={formData.wallHeight?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'wallHeight',
                  typeof value === 'string' ? (value ? parseFloat(value) : undefined) : value
                )
              }
              placeholder="Wandhöhe in Metern"
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

          <FormField label="Wandstärke" required>
            <FormSelect
              value={formData.wallThickness || ''}
              onChange={value => handleInputChange('wallThickness', value)}
              options={wallThicknessOptions}
              placeholder="Wählen Sie die Wandstärke"
            />
          </FormField>

          <FormField label="Profiltyp" required>
            <FormSelect
              value={formData.profileType || ''}
              onChange={value => handleInputChange('profileType', value)}
              options={profileTypeOptions}
              placeholder="Wählen Sie den Profiltyp"
            />
          </FormField>

          <FormField label="Schallschutz" required>
            <FormSelect
              value={formData.soundInsulation || ''}
              onChange={value => handleInputChange('soundInsulation', value)}
              options={soundInsulationOptions}
              placeholder="Schallschutz erforderlich?"
            />
          </FormField>

          <FormField label="Brandschutz" required>
            <FormSelect
              value={formData.fireProtection || ''}
              onChange={value => handleInputChange('fireProtection', value)}
              options={fireProtectionOptions}
              placeholder="Brandschutz erforderlich?"
            />
          </FormField>

          <FormField label="Anzahl Öffnungen">
            <FormInput
              type="number"
              value={formData.openings?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'openings',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl Türen/Fenster"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Dämmung erforderlich">
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="insulationNeeded"
                  checked={formData.insulationNeeded === true}
                  onChange={() => handleInputChange('insulationNeeded', true)}
                  className="mr-2"
                />
                Ja, Dämmung erforderlich
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="insulationNeeded"
                  checked={formData.insulationNeeded === false}
                  onChange={() => handleInputChange('insulationNeeded', false)}
                  className="mr-2"
                />
                Nein, keine Dämmung erforderlich
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

export default TrockenbauerForm;
