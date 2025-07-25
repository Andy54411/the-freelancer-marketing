'use client';
import React, { useState, useEffect } from 'react';
import { DachdeckerData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';

interface DachdeckerFormProps {
  data: DachdeckerData;
  onDataChange: (data: DachdeckerData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const DachdeckerForm: React.FC<DachdeckerFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<DachdeckerData>(data);

  const serviceTypeOptions = [
    { value: 'reparatur', label: 'Dachreparatur' },
    { value: 'neueindeckung', label: 'Neueindeckung' },
    { value: 'sanierung', label: 'Dachsanierung' },
    { value: 'dachausbau', label: 'Dachausbau' },
    { value: 'isolierung', label: 'Dachisolierung' },
    { value: 'reinigung', label: 'Dachreinigung' },
    { value: 'wartung', label: 'Dachwartung' },
    { value: 'gutachten', label: 'Dachgutachten' },
  ];

  const roofTypeOptions = [
    { value: 'steildach', label: 'Steildach' },
    { value: 'flachdach', label: 'Flachdach' },
    { value: 'pultdach', label: 'Pultdach' },
    { value: 'satteldach', label: 'Satteldach' },
    { value: 'walmdach', label: 'Walmdach' },
  ];

  const materialOptions = [
    { value: 'ziegel', label: 'Ziegel' },
    { value: 'schiefer', label: 'Schiefer' },
    { value: 'bitumen', label: 'Bitumen' },
    { value: 'metall', label: 'Metall' },
    { value: 'reet', label: 'Reet' },
    { value: 'andere', label: 'Andere' },
  ];

  const buildingTypeOptions = [
    { value: 'einfamilienhaus', label: 'Einfamilienhaus' },
    { value: 'mehrfamilienhaus', label: 'Mehrfamilienhaus' },
    { value: 'gewerbe', label: 'Gewerbegebäude' },
    { value: 'garage', label: 'Garage/Carport' },
  ];

  const urgencyOptions = [
    { value: 'notfall', label: 'Notfall (sofort)' },
    { value: 'dringend', label: 'Dringend (1-7 Tage)' },
    { value: 'normal', label: 'Normal (1-4 Wochen)' },
    { value: 'geplant', label: 'Geplant (flexibel)' },
  ];

  const handleInputChange = (field: keyof DachdeckerData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.roofType &&
      formData.material &&
      formData.buildingType &&
      formData.urgency &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.roofType &&
      formData.material &&
      formData.buildingType &&
      formData.urgency &&
      formData.projectDescription
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Dachdecker-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Dienstleistung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art der Dacharbeit"
            />
          </FormField>

          <FormField label="Dachtyp" required>
            <FormSelect
              value={formData.roofType || ''}
              onChange={value => handleInputChange('roofType', value)}
              options={roofTypeOptions}
              placeholder="Wählen Sie den Dachtyp"
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

          <FormField label="Dringlichkeit" required>
            <FormSelect
              value={formData.urgency || ''}
              onChange={value => handleInputChange('urgency', value)}
              options={urgencyOptions}
              placeholder="Wie dringend ist das Projekt?"
            />
          </FormField>

          <FormField label="Dachfläche (ca.)">
            <FormInput
              type="text"
              value={formData.roofArea || ''}
              onChange={value => handleInputChange('roofArea', value)}
              placeholder="z.B. 100 m²"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Projektbeschreibung" required>
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie Ihr Dachprojekt detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Besondere Anforderungen oder Wünsche"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Baujahr des Gebäudes">
            <FormInput
              type="text"
              value={formData.buildingAge || ''}
              onChange={value => handleInputChange('buildingAge', value)}
              placeholder="z.B. 1980"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Materiallieferung">
            <FormRadioGroup
              name="materialSupply"
              value={formData.materialSupply || ''}
              onChange={value => handleInputChange('materialSupply', value)}
              options={[
                { value: 'dachdecker', label: 'Dachdecker beschafft Material' },
                { value: 'kunde', label: 'Kunde beschafft Material' },
                { value: 'gemeinsam', label: 'Gemeinsame Beschaffung' },
              ]}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Dachdecker" formData={formData} />
    </div>
  );
};

export default DachdeckerForm;
