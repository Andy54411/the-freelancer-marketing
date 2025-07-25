'use client';
import React, { useState, useEffect } from 'react';
import { FliesenlegerData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';

interface FliesenlegerFormProps {
  data: FliesenlegerData;
  onDataChange: (data: FliesenlegerData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const FliesenlegerForm: React.FC<FliesenlegerFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<FliesenlegerData>(data);

  const serviceTypeOptions = [
    { value: 'fliesen_verlegen', label: 'Fliesen verlegen' },
    { value: 'fliesen_reparieren', label: 'Fliesen reparieren' },
    { value: 'fugenerneuerung', label: 'Fugenerneuerung' },
    { value: 'naturstein', label: 'Naturstein verlegen' },
    { value: 'mosaik', label: 'Mosaik verlegen' },
    { value: 'abdichtung', label: 'Abdichtungsarbeiten' },
    { value: 'beratung', label: 'Beratung/Planung' },
  ];

  const roomTypeOptions = [
    { value: 'badezimmer', label: 'Badezimmer' },
    { value: 'küche', label: 'Küche' },
    { value: 'wohnzimmer', label: 'Wohnzimmer' },
    { value: 'terrasse', label: 'Terrasse/Balkon' },
    { value: 'flur', label: 'Flur/Eingang' },
    { value: 'keller', label: 'Keller' },
    { value: 'arbeitszimmer', label: 'Arbeitszimmer' },
  ];

  const areaSizeOptions = [
    { value: 'bis_10', label: 'Bis 10 m²' },
    { value: '10_25', label: '10-25 m²' },
    { value: '25_50', label: '25-50 m²' },
    { value: '50_100', label: '50-100 m²' },
    { value: 'über_100', label: 'Über 100 m²' },
  ];

  const tileTypeOptions = [
    { value: 'keramik', label: 'Keramikfliesen' },
    { value: 'feinsteinzeug', label: 'Feinsteinzeug' },
    { value: 'naturstein', label: 'Naturstein' },
    { value: 'mosaik', label: 'Mosaik' },
    { value: 'terrakotta', label: 'Terrakotta' },
    { value: 'noch_unbekannt', label: 'Noch nicht entschieden' },
  ];

  const urgencyOptions = [
    { value: 'sofort', label: 'Sofort' },
    { value: 'diese_woche', label: 'Diese Woche' },
    { value: 'nächste_woche', label: 'Nächste Woche' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const handleInputChange = (field: keyof FliesenlegerData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.roomType &&
      formData.areaSize &&
      formData.urgency &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.roomType &&
      formData.areaSize &&
      formData.urgency &&
      formData.projectDescription
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Fliesenleger Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Dienstleistung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Was soll gemacht werden?"
            />
          </FormField>

          <FormField label="Raum/Bereich" required>
            <FormSelect
              value={formData.roomType || ''}
              onChange={value => handleInputChange('roomType', value)}
              options={roomTypeOptions}
              placeholder="Welcher Raum soll gefliest werden?"
            />
          </FormField>

          <FormField label="Flächengröße" required>
            <FormSelect
              value={formData.areaSize || ''}
              onChange={value => handleInputChange('areaSize', value)}
              options={areaSizeOptions}
              placeholder="Wie groß ist die Fläche?"
            />
          </FormField>

          <FormField label="Fliesentyp">
            <FormSelect
              value={formData.tileType || ''}
              onChange={value => handleInputChange('tileType', value)}
              options={tileTypeOptions}
              placeholder="Welche Fliesen sollen verwendet werden?"
            />
          </FormField>

          <FormField label="Zeitrahmen" required>
            <FormSelect
              value={formData.urgency || ''}
              onChange={value => handleInputChange('urgency', value)}
              options={urgencyOptions}
              placeholder="Wann soll das Projekt stattfinden?"
            />
          </FormField>

          <FormField label="Budget-Rahmen">
            <FormInput
              type="text"
              value={formData.budgetRange || ''}
              onChange={value => handleInputChange('budgetRange', value)}
              placeholder="z.B. 2.000-5.000 EUR"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Projektbeschreibung" required>
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie Ihr Fliesenprojekt detailliert..."
              rows={4}
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
                { value: 'handwerker', label: 'Handwerker beschafft Material' },
                { value: 'kunde', label: 'Kunde beschafft Material' },
                { value: 'gemeinsam', label: 'Gemeinsame Beschaffung' },
              ]}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Fliesenleger" formData={formData} />
    </div>
  );
};

export default FliesenlegerForm;
