import React, { useState, useEffect } from 'react';
import { MaurerData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface MaurerFormProps {
  data: MaurerData;
  onDataChange: (data: MaurerData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const MaurerForm: React.FC<MaurerFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<MaurerData>(data);

  const serviceTypeOptions = [
    { value: 'neubau', label: 'Neubau' },
    { value: 'renovierung', label: 'Renovierung' },
    { value: 'reparatur', label: 'Reparatur' },
    { value: 'sanierung', label: 'Sanierung' },
    { value: 'anbau', label: 'Anbau' },
  ];

  const workTypeOptions = [
    { value: 'außenmauerwerk', label: 'Außenmauerwerk' },
    { value: 'innenmauerwerk', label: 'Innenmauerwerk' },
    { value: 'fundament', label: 'Fundament' },
    { value: 'kellermauerwerk', label: 'Kellermauerwerk' },
    { value: 'trennwand', label: 'Trennwand' },
    { value: 'verputz', label: 'Verputz' },
  ];

  const materialOptions = [
    { value: 'ziegel', label: 'Ziegel' },
    { value: 'kalksandstein', label: 'Kalksandstein' },
    { value: 'porenbeton', label: 'Porenbeton' },
    { value: 'beton', label: 'Beton' },
    { value: 'naturstein', label: 'Naturstein' },
    { value: 'nach_absprache', label: 'Nach Absprache' },
  ];

  const buildingTypeOptions = [
    { value: 'einfamilienhaus', label: 'Einfamilienhaus' },
    { value: 'mehrfamilienhaus', label: 'Mehrfamilienhaus' },
    { value: 'gewerbe', label: 'Gewerbegebäude' },
    { value: 'industrie', label: 'Industriegebäude' },
    { value: 'landwirtschaft', label: 'Landwirtschaftsgebäude' },
  ];

  const wallThicknessOptions = [
    { value: '11.5', label: '11,5 cm' },
    { value: '17.5', label: '17,5 cm' },
    { value: '24', label: '24 cm' },
    { value: '30', label: '30 cm' },
    { value: '36.5', label: '36,5 cm' },
    { value: 'nach_absprache', label: 'Nach Absprache' },
  ];

  const foundationOptions = [
    { value: 'benötigt', label: 'Fundament erforderlich' },
    { value: 'vorhanden', label: 'Fundament vorhanden' },
    { value: 'nicht_nötig', label: 'Nicht erforderlich' },
  ];

  const insulationOptions = [
    { value: 'benötigt', label: 'Dämmung erforderlich' },
    { value: 'vorhanden', label: 'Dämmung vorhanden' },
    { value: 'nicht_nötig', label: 'Nicht erforderlich' },
  ];

  const handleInputChange = (field: keyof MaurerData, value: any) => {
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
      formData.buildingType &&
      formData.wallThickness &&
      formData.foundation &&
      formData.insulation &&
      typeof formData.reinforcement === 'boolean'
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Maurer-Projektdetails
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

          <FormField label="Art der Maurerarbeit" required>
            <FormSelect
              value={formData.workType || ''}
              onChange={value => handleInputChange('workType', value)}
              options={workTypeOptions}
              placeholder="Wählen Sie die Art der Maurerarbeit"
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

          <FormField label="Gebäudetyp" required>
            <FormSelect
              value={formData.buildingType || ''}
              onChange={value => handleInputChange('buildingType', value)}
              options={buildingTypeOptions}
              placeholder="Wählen Sie den Gebäudetyp"
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

          <FormField label="Fundament" required>
            <FormSelect
              value={formData.foundation || ''}
              onChange={value => handleInputChange('foundation', value)}
              options={foundationOptions}
              placeholder="Fundament-Status"
            />
          </FormField>

          <FormField label="Dämmung" required>
            <FormSelect
              value={formData.insulation || ''}
              onChange={value => handleInputChange('insulation', value)}
              options={insulationOptions}
              placeholder="Dämmung-Status"
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
          <FormField label="Bewehrung erforderlich">
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="reinforcement"
                  checked={formData.reinforcement === true}
                  onChange={() => handleInputChange('reinforcement', true)}
                  className="mr-2"
                />
                Ja, Bewehrung erforderlich
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="reinforcement"
                  checked={formData.reinforcement === false}
                  onChange={() => handleInputChange('reinforcement', false)}
                  className="mr-2"
                />
                Nein, keine Bewehrung erforderlich
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

export default MaurerForm;
