'use client';
import React, { useState, useEffect } from 'react';
import { FensterputzerData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';

interface FensterputzerFormProps {
  data: FensterputzerData;
  onDataChange: (data: FensterputzerData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const FensterputzerForm: React.FC<FensterputzerFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<FensterputzerData>(data);

  const serviceTypeOptions = [
    { value: 'fensterreinigung_innen', label: 'Fensterreinigung innen' },
    { value: 'fensterreinigung_außen', label: 'Fensterreinigung außen' },
    { value: 'fensterreinigung_komplett', label: 'Komplette Fensterreinigung' },
    { value: 'rahmenreinigung', label: 'Rahmenreinigung' },
    { value: 'jalousien_reinigung', label: 'Jalousien-/Rolladenreinigung' },
    { value: 'glasfassade', label: 'Glasfassaden-Reinigung' },
    { value: 'dachfenster', label: 'Dachfenster-Reinigung' },
    { value: 'wintergarten', label: 'Wintergarten-Reinigung' },
    { value: 'schaufenster', label: 'Schaufenster-Reinigung' },
    { value: 'notdienst', label: 'Notdienst' },
  ];

  const buildingTypeOptions = [
    { value: 'wohnung', label: 'Privatwohnung' },
    { value: 'haus', label: 'Einfamilienhaus' },
    { value: 'mehrfamilienhaus', label: 'Mehrfamilienhaus' },
    { value: 'bürogebäude', label: 'Bürogebäude' },
    { value: 'geschäft', label: 'Geschäft/Laden' },
    { value: 'restaurant', label: 'Restaurant/Café' },
    { value: 'praxis', label: 'Praxis/Klinik' },
    { value: 'schule', label: 'Schule/Kindergarten' },
    { value: 'hotel', label: 'Hotel' },
    { value: 'industriegebäude', label: 'Industriegebäude' },
  ];

  const frequencyOptions = [
    { value: 'einmalig', label: 'Einmalige Reinigung' },
    { value: 'wöchentlich', label: 'Wöchentlich' },
    { value: '14_tägig', label: '14-tägig' },
    { value: 'monatlich', label: 'Monatlich' },
    { value: 'quartalsweise', label: 'Quartalsweise' },
    { value: 'halbjährlich', label: 'Halbjährlich' },
    { value: 'nach_bedarf', label: 'Nach Bedarf' },
  ];

  const windowCountOptions = [
    { value: '1_5', label: '1-5 Fenster' },
    { value: '6_10', label: '6-10 Fenster' },
    { value: '11_20', label: '11-20 Fenster' },
    { value: '21_50', label: '21-50 Fenster' },
    { value: 'über_50', label: 'Über 50 Fenster' },
  ];

  const floorLevelOptions = [
    { value: 'erdgeschoss', label: 'Erdgeschoss' },
    { value: '1_2_stock', label: '1.-2. Stock' },
    { value: '3_5_stock', label: '3.-5. Stock' },
    { value: 'über_5_stock', label: 'Über 5. Stock' },
    { value: 'hochhaus', label: 'Hochhaus (über 10 Stockwerke)' },
  ];

  const urgencyOptions = [
    { value: 'sofort', label: 'Sofort' },
    { value: 'heute', label: 'Heute' },
    { value: 'morgen', label: 'Morgen' },
    { value: 'diese_woche', label: 'Diese Woche' },
    { value: 'nächste_woche', label: 'Nächste Woche' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const handleInputChange = (field: keyof FensterputzerData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.buildingType &&
      formData.frequency &&
      formData.windowCount &&
      formData.urgency
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.buildingType &&
      formData.frequency &&
      formData.windowCount &&
      formData.urgency
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Fensterputzer Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Dienstleistung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Was soll gereinigt werden?"
            />
          </FormField>

          <FormField label="Gebäudetyp" required>
            <FormSelect
              value={formData.buildingType || ''}
              onChange={value => handleInputChange('buildingType', value)}
              options={buildingTypeOptions}
              placeholder="Was für ein Gebäude ist es?"
            />
          </FormField>

          <FormField label="Reinigungsfrequenz" required>
            <FormSelect
              value={formData.frequency || ''}
              onChange={value => handleInputChange('frequency', value)}
              options={frequencyOptions}
              placeholder="Wie oft soll gereinigt werden?"
            />
          </FormField>

          <FormField label="Anzahl Fenster" required>
            <FormSelect
              value={formData.windowCount?.toString() || ''}
              onChange={value => handleInputChange('windowCount', Number(value))}
              options={windowCountOptions}
              placeholder="Wie viele Fenster sind zu reinigen?"
            />
          </FormField>

          <FormField label="Stockwerk/Höhe">
            <FormSelect
              value={formData.floorLevel || ''}
              onChange={value => handleInputChange('floorLevel', value)}
              options={floorLevelOptions}
              placeholder="In welchem Stockwerk?"
            />
          </FormField>

          <FormField label="Zeitwunsch" required>
            <FormSelect
              value={formData.urgency || ''}
              onChange={value => handleInputChange('urgency', value)}
              options={urgencyOptions}
              placeholder="Wann soll gereinigt werden?"
            />
          </FormField>

          <FormField label="Budget-Rahmen">
            <FormInput
              type="text"
              value={formData.budgetRange || ''}
              onChange={value => handleInputChange('budgetRange', value)}
              placeholder="z.B. 100-200 EUR"
            />
          </FormField>

          <FormField label="Wunschtermin">
            <FormInput
              type="text"
              value={formData.preferredDate || ''}
              onChange={value => handleInputChange('preferredDate', value)}
              placeholder="z.B. 15.08.2025 oder nächste Woche"
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
          <FormField label="Projektbeschreibung">
            <FormTextarea
              value={formData.serviceDescription || ''}
              onChange={value => handleInputChange('serviceDescription', value)}
              placeholder="Beschreiben Sie detailliert, was gereinigt werden soll..."
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zugang zu den Fenstern">
            <FormRadioGroup
              name="windowAccess"
              value={formData.windowAccess || ''}
              onChange={value => handleInputChange('windowAccess', value)}
              options={[
                { value: 'ebenerdig', label: 'Ebenerdig erreichbar' },
                { value: 'leiter', label: 'Mit Leiter erreichbar' },
                { value: 'hebebühne', label: 'Hebebühne erforderlich' },
                { value: 'klettertechnik', label: 'Klettertechnik erforderlich' },
                { value: 'von_innen', label: 'Nur von innen zugänglich' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Reinigungsmittel">
            <FormRadioGroup
              name="cleaningSupplies"
              value={formData.cleaningSupplies || ''}
              onChange={value => handleInputChange('cleaningSupplies', value)}
              options={[
                { value: 'fensterputzer', label: 'Fensterputzer bringt alles mit' },
                { value: 'auftraggeber', label: 'Auftraggeber stellt Mittel bereit' },
                { value: 'umweltfreundlich', label: 'Umweltfreundliche Mittel gewünscht' },
                { value: 'spezial', label: 'Spezielle Reinigungsmittel erforderlich' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Versicherung">
            <FormRadioGroup
              name="insurance"
              value={formData.insurance || ''}
              onChange={value => handleInputChange('insurance', value)}
              options={[
                { value: 'erforderlich', label: 'Haftpflichtversicherung erforderlich' },
                { value: 'gewünscht', label: 'Versicherungsnachweis gewünscht' },
                { value: 'nicht_nötig', label: 'Nicht erforderlich' },
              ]}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Fensterputzer" formData={formData} />
    </div>
  );
};

export default FensterputzerForm;
