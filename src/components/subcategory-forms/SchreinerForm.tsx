'use client';
import React, { useState, useEffect } from 'react';
import { SchreinerData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
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
    { value: 'möbel_anfertigung', label: 'Möbel anfertigen' },
    { value: 'küche', label: 'Küche/Kücheneinbau' },
    { value: 'schrank_einbau', label: 'Schrank/Einbauschrank' },
    { value: 'reparatur', label: 'Möbel reparieren' },
    { value: 'restaurierung', label: 'Möbel restaurieren' },
    { value: 'fenster_türen', label: 'Fenster/Türen' },
    { value: 'treppe', label: 'Treppe' },
    { value: 'parkett', label: 'Parkett/Holzboden' },
  ];

  const materialOptions = [
    { value: 'massivholz', label: 'Massivholz' },
    { value: 'spanplatte', label: 'Spanplatte' },
    { value: 'mdf', label: 'MDF' },
    { value: 'sperrholz', label: 'Sperrholz' },
    { value: 'furnier', label: 'Furnier' },
    { value: 'laminat', label: 'Laminat' },
  ];

  const urgencyOptions = [
    { value: 'sofort', label: 'Sofort' },
    { value: 'diese_woche', label: 'Diese Woche' },
    { value: 'nächste_woche', label: 'Nächste Woche' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const handleInputChange = (field: keyof SchreinerData, value: any) => {
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
          Schreiner Projektdetails
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
              placeholder="z.B. 200x60x180"
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
              placeholder="Beschreiben Sie Ihr Schreinerprojekt detailliert..."
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
                { value: 'aufmaß', label: 'Aufmaß vor Ort' },
                { value: 'fertigung', label: 'Fertigung in Werkstatt' },
                { value: 'lieferung', label: 'Lieferung' },
                { value: 'montage', label: 'Montage vor Ort' },
                { value: 'lackierung', label: 'Lackierung/Oberflächenbehandlung' },
                { value: 'demontage', label: 'Demontage alter Möbel' },
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
                { value: 'schreiner', label: 'Schreiner beschafft Material' },
                { value: 'kunde', label: 'Kunde beschafft Material' },
                { value: 'gemeinsam', label: 'Gemeinsame Beschaffung' },
              ]}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Schreiner" formData={formData} />
    </div>
  );
};

export default SchreinerForm;
