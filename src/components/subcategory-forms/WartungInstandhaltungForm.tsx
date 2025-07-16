import React, { useState, useEffect } from 'react';
import { WartungInstandhaltungData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface WartungInstandhaltungFormProps {
  data: WartungInstandhaltungData;
  onDataChange: (data: WartungInstandhaltungData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const WartungInstandhaltungForm: React.FC<WartungInstandhaltungFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<WartungInstandhaltungData>(data);

  const serviceTypeOptions = [
    { value: 'reparatur', label: 'Reparatur' },
    { value: 'wartung', label: 'Wartung' },
    { value: 'instandhaltung', label: 'Instandhaltung' },
    { value: 'inspektion', label: 'Inspektion' },
    { value: 'notfall', label: 'Notfall-Service' },
  ];

  const workTypeOptions = [
    { value: 'elektrisch', label: 'Elektrische Arbeiten' },
    { value: 'sanitär', label: 'Sanitäre Arbeiten' },
    { value: 'heizung', label: 'Heizung' },
    { value: 'klima', label: 'Klimaanlage' },
    { value: 'türen_fenster', label: 'Türen & Fenster' },
    { value: 'dächer', label: 'Dächer' },
    { value: 'fassaden', label: 'Fassaden' },
    { value: 'böden', label: 'Böden' },
    { value: 'wände', label: 'Wände' },
    { value: 'keller', label: 'Keller' },
    { value: 'dachboden', label: 'Dachboden' },
    { value: 'außenanlagen', label: 'Außenanlagen' },
  ];

  const buildingTypeOptions = [
    { value: 'einfamilienhaus', label: 'Einfamilienhaus' },
    { value: 'mehrfamilienhaus', label: 'Mehrfamilienhaus' },
    { value: 'wohnung', label: 'Wohnung' },
    { value: 'büro', label: 'Büro' },
    { value: 'gewerbe', label: 'Gewerbe' },
    { value: 'industrie', label: 'Industrie' },
    { value: 'öffentlich', label: 'Öffentliches Gebäude' },
  ];

  const urgencyOptions = [
    { value: 'sofort', label: 'Sofort' },
    { value: 'heute', label: 'Heute' },
    { value: 'morgen', label: 'Morgen' },
    { value: 'diese_woche', label: 'Diese Woche' },
    { value: 'nächste_woche', label: 'Nächste Woche' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const budgetRangeOptions = [
    { value: 'bis_100', label: 'Bis 100 €' },
    { value: '100_300', label: '100 - 300 €' },
    { value: '300_500', label: '300 - 500 €' },
    { value: '500_1000', label: '500 - 1.000 €' },
    { value: '1000_2000', label: '1.000 - 2.000 €' },
    { value: 'über_2000', label: 'Über 2.000 €' },
  ];

  const frequencyOptions = [
    { value: 'einmalig', label: 'Einmalig' },
    { value: 'monatlich', label: 'Monatlich' },
    { value: 'vierteljährlich', label: 'Vierteljährlich' },
    { value: 'halbjährlich', label: 'Halbjährlich' },
    { value: 'jährlich', label: 'Jährlich' },
    { value: 'nach_bedarf', label: 'Nach Bedarf' },
  ];

  const handleInputChange = (field: keyof WartungInstandhaltungData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.workType &&
      formData.buildingType &&
      formData.urgency
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Wartung & Instandhaltung - Projektdetails
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

          <FormField label="Arbeitsbereich" required>
            <FormSelect
              value={formData.workType || ''}
              onChange={value => handleInputChange('workType', value)}
              options={workTypeOptions}
              placeholder="Wählen Sie den Arbeitsbereich"
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
              placeholder="Wählen Sie die Dringlichkeit"
            />
          </FormField>

          <FormField label="Budget-Rahmen">
            <FormSelect
              value={formData.budgetRange || ''}
              onChange={value => handleInputChange('budgetRange', value)}
              options={budgetRangeOptions}
              placeholder="Wählen Sie den Budget-Rahmen"
            />
          </FormField>

          <FormField label="Häufigkeit">
            <FormSelect
              value={formData.frequency || ''}
              onChange={value => handleInputChange('frequency', value)}
              options={frequencyOptions}
              placeholder="Wählen Sie die Häufigkeit"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Problembeschreibung" required>
            <FormTextarea
              value={formData.problemDescription || ''}
              onChange={value => handleInputChange('problemDescription', value)}
              placeholder="Beschreiben Sie das Problem oder die gewünschte Wartung"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Weitere Informationen">
            <FormTextarea
              value={formData.additionalInfo || ''}
              onChange={value => handleInputChange('additionalInfo', value)}
              placeholder="Weitere wichtige Informationen"
              rows={3}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default WartungInstandhaltungForm;
