'use client';
import React, { useState, useEffect } from 'react';
import { FensterTürenbauData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';

interface FensterTürenbauFormProps {
  data: FensterTürenbauData;
  onDataChange: (data: FensterTürenbauData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const FensterTürenbauForm: React.FC<FensterTürenbauFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<FensterTürenbauData>(data);

  const serviceTypeOptions = [
    { value: 'fenster_einbau', label: 'Fenster-Einbau' },
    { value: 'tür_einbau', label: 'Tür-Einbau' },
    { value: 'fenster_austausch', label: 'Fenster-Austausch' },
    { value: 'tür_austausch', label: 'Tür-Austausch' },
    { value: 'reparatur', label: 'Reparatur' },
    { value: 'wartung', label: 'Wartung' },
    { value: 'sicherheit', label: 'Sicherheitstechnik' },
    { value: 'beratung', label: 'Beratung/Vermessung' },
  ];

  const productTypeOptions = [
    { value: 'kunststofffenster', label: 'Kunststofffenster' },
    { value: 'holzfenster', label: 'Holzfenster' },
    { value: 'alufenster', label: 'Aluminiumfenster' },
    { value: 'holz_alu', label: 'Holz-Alu-Fenster' },
    { value: 'haustür', label: 'Haustür' },
    { value: 'innentür', label: 'Innentür' },
    { value: 'balkontür', label: 'Balkontür' },
    { value: 'schiebetür', label: 'Schiebetür' },
    { value: 'dachfenster', label: 'Dachfenster' },
  ];

  const glasTypeOptions = [
    { value: 'einfachglas', label: 'Einfachglas' },
    { value: 'doppelglas', label: 'Doppelglas' },
    { value: 'dreifachglas', label: 'Dreifachglas' },
    { value: 'sicherheitsglas', label: 'Sicherheitsglas' },
    { value: 'schallschutzglas', label: 'Schallschutzglas' },
    { value: 'wärmeschutzglas', label: 'Wärmeschutzglas' },
  ];

  const buildingTypeOptions = [
    { value: 'einfamilienhaus', label: 'Einfamilienhaus' },
    { value: 'mehrfamilienhaus', label: 'Mehrfamilienhaus' },
    { value: 'wohnung', label: 'Wohnung' },
    { value: 'gewerbe', label: 'Gewerbegebäude' },
    { value: 'büro', label: 'Bürogebäude' },
  ];

  const urgencyOptions = [
    { value: 'sofort', label: 'Sofort (Notfall)' },
    { value: 'dringend', label: 'Dringend (1-2 Wochen)' },
    { value: 'normal', label: 'Normal (1-2 Monate)' },
    { value: 'geplant', label: 'Geplant (flexibel)' },
  ];

  const handleInputChange = (field: keyof FensterTürenbauData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.productType &&
      formData.glasType &&
      formData.buildingType &&
      formData.urgency &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.productType &&
      formData.glasType &&
      formData.buildingType &&
      formData.urgency &&
      formData.projectDescription
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Fenster- und Türenbau Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Dienstleistung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art der Arbeit"
            />
          </FormField>

          <FormField label="Produkttyp" required>
            <FormSelect
              value={formData.productType || ''}
              onChange={value => handleInputChange('productType', value)}
              options={productTypeOptions}
              placeholder="Was soll eingebaut werden?"
            />
          </FormField>

          <FormField label="Glastyp" required>
            <FormSelect
              value={formData.glasType || ''}
              onChange={value => handleInputChange('glasType', value)}
              options={glasTypeOptions}
              placeholder="Welcher Glastyp wird benötigt?"
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

          <FormField label="Anzahl Einheiten">
            <FormInput
              type="number"
              value={formData.numberOfUnits || ''}
              onChange={value => handleInputChange('numberOfUnits', value)}
              placeholder="Wie viele Fenster/Türen?"
            />
          </FormField>

          <FormField label="Maße (falls bekannt)">
            <FormInput
              type="text"
              value={formData.dimensions || ''}
              onChange={value => handleInputChange('dimensions', value)}
              placeholder="z.B. 120x150 cm"
            />
          </FormField>

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
          <FormField label="Projektbeschreibung" required>
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie Ihr Fenster-/Türenprojekt detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Energieeffizienz, Schallschutz, Sicherheit etc."
              rows={3}
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

        <div className="mt-4">
          <FormField label="Demontage alter Fenster/Türen">
            <FormRadioGroup
              name="demolition"
              value={formData.demolition || ''}
              onChange={value => handleInputChange('demolition', value)}
              options={[
                { value: 'ja', label: 'Ja, alte Fenster/Türen müssen entfernt werden' },
                { value: 'nein', label: 'Nein, Neubau ohne Demontage' },
                { value: 'teilweise', label: 'Nur teilweise' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Budget-Rahmen">
            <FormInput
              type="text"
              value={formData.budgetRange || ''}
              onChange={value => handleInputChange('budgetRange', value)}
              placeholder="z.B. 5.000-10.000 EUR"
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton
        isValid={isFormValid()}
        subcategory="Fenster- und Türenbau"
        formData={formData}
      />
    </div>
  );
};

export default FensterTürenbauForm;
