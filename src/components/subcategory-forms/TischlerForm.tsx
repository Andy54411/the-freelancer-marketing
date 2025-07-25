'use client';
import React, { useState, useEffect } from 'react';
import { TischlerData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';

interface TischlerFormProps {
  data: TischlerData;
  onDataChange: (data: TischlerData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const TischlerForm: React.FC<TischlerFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<TischlerData>(data);

  const serviceTypeOptions = [
    { value: 'möbelbau', label: 'Möbelbau' },
    { value: 'küchenbau', label: 'Küchenbau' },
    { value: 'innenausbau', label: 'Innenausbau' },
    { value: 'fenster_türen', label: 'Fenster und Türen' },
    { value: 'treppen', label: 'Treppenbau' },
    { value: 'parkett', label: 'Parkett/Böden' },
    { value: 'wintergarten', label: 'Wintergarten' },
    { value: 'carport', label: 'Carport/Überdachung' },
    { value: 'reparatur', label: 'Reparatur/Restaurierung' },
    { value: 'einbauschränke', label: 'Einbauschränke' },
  ];

  const materialOptions = [
    { value: 'massivholz', label: 'Massivholz' },
    { value: 'furnier', label: 'Furnier' },
    { value: 'mdf', label: 'MDF' },
    { value: 'spanplatte', label: 'Spanplatte' },
    { value: 'sperrholz', label: 'Sperrholz' },
    { value: 'holzwerkstoffe', label: 'Holzwerkstoffe' },
    { value: 'exotische_hölzer', label: 'Exotische Hölzer' },
    { value: 'beratung_gewünscht', label: 'Beratung gewünscht' },
  ];

  const projectSizeOptions = [
    { value: 'klein', label: 'Klein (1-3 Tage)' },
    { value: 'mittel', label: 'Mittel (1-2 Wochen)' },
    { value: 'groß', label: 'Groß (mehrere Wochen)' },
    { value: 'sehr_groß', label: 'Sehr groß (mehrere Monate)' },
  ];

  const urgencyOptions = [
    { value: 'sofort', label: 'Sofort' },
    { value: 'diese_woche', label: 'Diese Woche' },
    { value: 'nächste_woche', label: 'Nächste Woche' },
    { value: 'diesen_monat', label: 'Diesen Monat' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const handleInputChange = (field: keyof TischlerData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.projectSize &&
      formData.urgency &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.projectSize &&
      formData.urgency &&
      formData.projectDescription
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Tischler Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Dienstleistung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Welcher Service wird benötigt?"
            />
          </FormField>

          <FormField label="Projektgröße" required>
            <FormSelect
              value={formData.projectSize || ''}
              onChange={value => handleInputChange('projectSize', value)}
              options={projectSizeOptions}
              placeholder="Wie groß ist das Projekt?"
            />
          </FormField>

          <FormField label="Zeitrahmen" required>
            <FormSelect
              value={formData.urgency || ''}
              onChange={value => handleInputChange('urgency', value)}
              options={urgencyOptions}
              placeholder="Wann soll das Projekt starten?"
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

          <FormField label="Projektort">
            <FormInput
              type="text"
              value={formData.location || ''}
              onChange={value => handleInputChange('location', value)}
              placeholder="z.B. Berlin, 10115"
            />
          </FormField>

          <FormField label="Maße/Größe">
            <FormInput
              type="text"
              value={formData.dimensions || ''}
              onChange={value => handleInputChange('dimensions', value)}
              placeholder="z.B. 3m x 2m x 0.8m"
            />
          </FormField>

          <FormField label="Gewünschter Stil">
            <FormInput
              type="text"
              value={formData.style || ''}
              onChange={value => handleInputChange('style', value)}
              placeholder="z.B. Modern, Rustikal, Klassisch"
            />
          </FormField>

          <FormField label="Anzahl Stücke">
            <FormInput
              type="number"
              value={formData.quantity || ''}
              onChange={value => handleInputChange('quantity', Number(value))}
              placeholder="Wie viele Stücke?"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Material-Präferenzen">
            <FormCheckboxGroup
              value={formData.materials || []}
              onChange={value => handleInputChange('materials', value)}
              options={materialOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zusätzliche Services">
            <FormCheckboxGroup
              value={formData.additionalServices || []}
              onChange={value => handleInputChange('additionalServices', value)}
              options={[
                { value: 'planung', label: 'Planung/Design' },
                { value: 'beratung', label: 'Materialberatung' },
                { value: 'lieferung', label: 'Lieferung' },
                { value: 'montage', label: 'Montage vor Ort' },
                { value: 'oberflächenbehandlung', label: 'Oberflächenbehandlung' },
                { value: 'maßanfertigung', label: 'Maßanfertigung' },
                { value: 'reparatur', label: 'Reparatur/Restaurierung' },
                { value: 'wartung', label: 'Wartung/Pflege' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Projektbeschreibung" required>
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie Ihr Tischler-Projekt im Detail..."
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Besondere Wünsche, Anforderungen oder Herausforderungen..."
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Qualität">
            <FormRadioGroup
              name="quality"
              value={formData.quality || ''}
              onChange={value => handleInputChange('quality', value)}
              options={[
                { value: 'standard', label: 'Standard-Qualität' },
                { value: 'premium', label: 'Premium-Qualität' },
                { value: 'luxus', label: 'Luxus-Ausführung' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Erfahrung mit Handwerk">
            <FormRadioGroup
              name="experience"
              value={formData.experience || ''}
              onChange={value => handleInputChange('experience', value)}
              options={[
                { value: 'keine', label: 'Keine Erfahrung' },
                { value: 'wenig', label: 'Wenig Erfahrung' },
                { value: 'gut', label: 'Gute Erfahrung' },
                { value: 'experte', label: 'Sehr erfahren' },
              ]}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Tischler" formData={formData} />
    </div>
  );
};

export default TischlerForm;
