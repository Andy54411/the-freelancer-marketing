'use client';
import React, { useState, useEffect } from 'react';
import { MetallbauerData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';

interface MetallbauerFormProps {
  data: MetallbauerData;
  onDataChange: (data: MetallbauerData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const MetallbauerForm: React.FC<MetallbauerFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<MetallbauerData>(data);

  const serviceTypeOptions = [
    { value: 'geländer', label: 'Geländer/Treppen' },
    { value: 'zäune', label: 'Zäune/Tore' },
    { value: 'balkone', label: 'Balkone/Terrassen' },
    { value: 'vordächer', label: 'Vordächer/Überdachungen' },
    { value: 'reparatur', label: 'Reparatur/Schweißarbeiten' },
    { value: 'edelstahl', label: 'Edelstahl-Arbeiten' },
    { value: 'stahlbau', label: 'Stahlbau/Konstruktion' },
    { value: 'sicherheit', label: 'Sicherheitstechnik' },
  ];

  const materialOptions = [
    { value: 'stahl', label: 'Stahl' },
    { value: 'edelstahl', label: 'Edelstahl' },
    { value: 'aluminium', label: 'Aluminium' },
    { value: 'messing', label: 'Messing' },
    { value: 'eisen', label: 'Eisen' },
    { value: 'verzinkt', label: 'Verzinkter Stahl' },
  ];

  const urgencyOptions = [
    { value: 'sofort', label: 'Sofort' },
    { value: 'diese_woche', label: 'Diese Woche' },
    { value: 'nächste_woche', label: 'Nächste Woche' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const handleInputChange = (field: keyof MetallbauerData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.material &&
      formData.urgency &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.material &&
      formData.urgency &&
      formData.projectDescription
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Metallbauer Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Dienstleistung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Was soll hergestellt/repariert werden?"
            />
          </FormField>

          <FormField label="Material" required>
            <FormSelect
              value={formData.material || ''}
              onChange={value => handleInputChange('material', value)}
              options={materialOptions}
              placeholder="Welches Material soll verwendet werden?"
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
              placeholder="z.B. 1.000-3.000 EUR"
            />
          </FormField>

          <FormField label="Maße (LxBxH in cm)">
            <FormInput
              type="text"
              value={formData.dimensions || ''}
              onChange={value => handleInputChange('dimensions', value)}
              placeholder="z.B. 200x100x150"
            />
          </FormField>

          <FormField label="Anzahl Stücke">
            <FormInput
              type="number"
              value={formData.quantity || ''}
              onChange={value => handleInputChange('quantity', value)}
              placeholder="z.B. 1"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Projektbeschreibung" required>
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie Ihr Metallbau-Projekt detailliert..."
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Benötigte Arbeiten">
            <FormCheckboxGroup
              value={formData.requiredWork || []}
              onChange={value => handleInputChange('requiredWork', value)}
              options={[
                { value: 'planung', label: 'Planung/Design' },
                { value: 'fertigung', label: 'Fertigung in Werkstatt' },
                { value: 'montage', label: 'Montage vor Ort' },
                { value: 'schweißen', label: 'Schweißarbeiten' },
                { value: 'lackierung', label: 'Lackierung/Beschichtung' },
                { value: 'korrosionsschutz', label: 'Korrosionsschutz' },
                { value: 'demontage', label: 'Demontage alter Teile' },
                { value: 'entsorgung', label: 'Entsorgung' },
              ]}
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
                { value: 'metallbauer', label: 'Metallbauer beschafft Material' },
                { value: 'kunde', label: 'Kunde beschafft Material' },
                { value: 'gemeinsam', label: 'Gemeinsame Beschaffung' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Standort der Arbeiten">
            <FormRadioGroup
              name="workLocation"
              value={formData.workLocation || ''}
              onChange={value => handleInputChange('workLocation', value)}
              options={[
                { value: 'werkstatt', label: 'Nur in der Werkstatt' },
                { value: 'vor_ort', label: 'Nur vor Ort beim Kunden' },
                { value: 'beides', label: 'Werkstatt und vor Ort' },
              ]}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Metallbauer" formData={formData} />
    </div>
  );
};

export default MetallbauerForm;
