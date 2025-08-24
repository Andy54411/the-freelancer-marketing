'use client';
import React, { useState, useEffect } from 'react';
import { ReinigungskraftData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';

interface GebäudereinigerFormProps {
  data: ReinigungskraftData;
  onDataChange: (data: ReinigungskraftData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const GebäudereinigerForm: React.FC<GebäudereinigerFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<ReinigungskraftData>(data);

  const serviceTypeOptions = [
    { value: 'gebäudereinigung', label: 'Gebäudereinigung' },
    { value: 'büroreinigung', label: 'Büroreinigung' },
    { value: 'praxisreinigung', label: 'Praxisreinigung' },
    { value: 'glasreinigung', label: 'Glasreinigung' },
    { value: 'grundreinigung', label: 'Grundreinigung' },
    { value: 'unterhaltsreinigung', label: 'Unterhaltsreinigung' },
    { value: 'endreinigung', label: 'Endreinigung' },
    { value: 'sonderreinigung', label: 'Sonderreinigung' },
  ];

  const cleaningTypeOptions = [
    { value: 'grundreinigung', label: 'Grundreinigung' },
    { value: 'unterhaltsreinigung', label: 'Unterhaltsreinigung' },
    { value: 'endreinigung', label: 'Endreinigung' },
    { value: 'büroreinigung', label: 'Büroreinigung' },
  ];

  const propertyTypeOptions = [
    { value: 'bürogebäude', label: 'Bürogebäude' },
    { value: 'praxis', label: 'Arztpraxis/Klinik' },
    { value: 'einzelhandel', label: 'Einzelhandel' },
    { value: 'gastronomie', label: 'Gastronomie' },
    { value: 'industriehalle', label: 'Industriehalle' },
    { value: 'wohngebäude', label: 'Wohngebäude' },
    { value: 'schule', label: 'Schule/Kita' },
    { value: 'andere', label: 'Andere' },
  ];

  const urgencyOptions = [
    { value: 'sofort', label: 'Sofort' },
    { value: 'diese_woche', label: 'Diese Woche' },
    { value: 'nächste_woche', label: 'Nächste Woche' },
    { value: 'diesen_monat', label: 'Diesen Monat' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const handleInputChange = (field: keyof ReinigungskraftData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.cleaningType &&
      formData.propertyType &&
      formData.urgency
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.cleaningType &&
      formData.propertyType &&
      formData.urgency
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Gebäudereiniger Projektdetails
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

          <FormField label="Art der Reinigung" required>
            <FormSelect
              value={formData.cleaningType || ''}
              onChange={value => handleInputChange('cleaningType', value)}
              options={cleaningTypeOptions}
              placeholder="Welche Art von Reinigung?"
            />
          </FormField>

          <FormField label="Gebäudetyp" required>
            <FormSelect
              value={formData.propertyType || ''}
              onChange={value => handleInputChange('propertyType', value)}
              options={propertyTypeOptions}
              placeholder="Was für ein Gebäude?"
            />
          </FormField>

          <FormField label="Zeitrahmen" required>
            <FormSelect
              value={formData.urgency || ''}
              onChange={value => handleInputChange('urgency', value)}
              options={urgencyOptions}
              placeholder="Wann soll gereinigt werden?"
            />
          </FormField>

          <FormField label="Quadratmeter">
            <FormInput
              type="number"
              value={formData.squareMeters || ''}
              onChange={value => handleInputChange('squareMeters', Number(value))}
              placeholder="z.B. 150"
            />
          </FormField>

          <FormField label="Anzahl Räume">
            <FormInput
              type="number"
              value={formData.roomCount || ''}
              onChange={value => handleInputChange('roomCount', Number(value))}
              placeholder="Anzahl der Räume"
            />
          </FormField>

          <FormField label="Budget-Rahmen">
            <FormInput
              type="text"
              value={formData.budgetRange || ''}
              onChange={value => handleInputChange('budgetRange', value)}
              placeholder="z.B. 200-500 EUR"
            />
          </FormField>

          <FormField label="Häufigkeit der Reinigung">
            <FormSelect
              value={formData.frequency || ''}
              onChange={value => handleInputChange('frequency', value)}
              options={[
                { value: 'einmalig', label: 'Einmalig' },
                { value: 'wöchentlich', label: 'Wöchentlich' },
                { value: 'zweiwöchentlich', label: 'Alle 2 Wochen' },
                { value: 'monatlich', label: 'Monatlich' },
                { value: 'nach_bedarf', label: 'Nach Bedarf' },
              ]}
              placeholder="Wie oft soll gereinigt werden?"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zu reinigende Bereiche">
            <FormCheckboxGroup
              value={formData.cleaningAreas || []}
              onChange={value => handleInputChange('cleaningAreas', value)}
              options={[
                { value: 'büroräume', label: 'Büroräume' },
                { value: 'sanitäranlagen', label: 'Sanitäranlagen' },
                { value: 'küche', label: 'Küche/Teeküche' },
                { value: 'fenster', label: 'Fenster' },
                { value: 'flure', label: 'Flure/Eingangsbereiche' },
                { value: 'treppenhäuser', label: 'Treppenhäuser' },
                { value: 'keller', label: 'Keller/Untergeschoss' },
                { value: 'außenbereich', label: 'Außenbereich' },
                { value: 'aufzug', label: 'Aufzug' },
                { value: 'parkplatz', label: 'Parkplatz/Tiefgarage' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zusätzliche Services">
            <FormCheckboxGroup
              value={formData.additionalServices || []}
              onChange={value => handleInputChange('additionalServices', value)}
              options={[
                { value: 'müllentsorgung', label: 'Müllentsorgung' },
                { value: 'desinfektion', label: 'Desinfektion' },
                { value: 'teppichreinigung', label: 'Teppichreinigung' },
                { value: 'polsterreinigung', label: 'Polsterreinigung' },
                { value: 'winterdienst', label: 'Winterdienst' },
                { value: 'gartenpflege', label: 'Gartenpflege' },
                { value: 'hausmeisterservice', label: 'Hausmeisterservice' },
                { value: 'schädlingsbekämpfung', label: 'Schädlingsbekämpfung' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Projektbeschreibung">
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie Ihre Reinigungsanforderungen..."
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Besondere Anforderungen oder Hinweise..."
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Arbeitszeiten">
            <FormRadioGroup
              name="workingHours"
              value={formData.workingHours || ''}
              onChange={value => handleInputChange('workingHours', value)}
              options={[
                { value: 'geschäftszeiten', label: 'Während Geschäftszeiten' },
                { value: 'nach_feierabend', label: 'Nach Feierabend' },
                { value: 'wochenende', label: 'Am Wochenende' },
                { value: 'flexibel', label: 'Flexibel' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Eigene Reinigungsmittel">
            <FormRadioGroup
              name="ownSupplies"
              value={formData.ownSupplies || ''}
              onChange={value => handleInputChange('ownSupplies', value)}
              options={[
                { value: 'dienstleister', label: 'Dienstleister bringt mit' },
                { value: 'kunde', label: 'Kunde stellt bereit' },
                { value: 'gemeinsam', label: 'Geteilte Kosten' },
              ]}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Gebäudereiniger" formData={formData} />
    </div>
  );
};

export default GebäudereinigerForm;
