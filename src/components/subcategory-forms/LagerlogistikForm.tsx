'use client';
import React, { useState, useEffect } from 'react';
import { LagerlogistikData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';

interface LagerlogistikFormProps {
  data: LagerlogistikData;
  onDataChange: (data: LagerlogistikData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const LagerlogistikForm: React.FC<LagerlogistikFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<LagerlogistikData>(data);

  const serviceTypeOptions = [
    { value: 'lagerverwaltung', label: 'Lagerverwaltung' },
    { value: 'kommissionierung', label: 'Kommissionierung/Picking' },
    { value: 'verpackung', label: 'Verpackung/Konfektionierung' },
    { value: 'versand', label: 'Versand/Fulfillment' },
    { value: 'inventur', label: 'Inventur' },
    { value: 'umzug', label: 'Lagerumzug' },
    { value: 'beratung', label: 'Logistik-Beratung' },
    { value: 'transport', label: 'Transport/Kurierdienst' },
  ];

  const warehouseSizeOptions = [
    { value: 'klein', label: 'Klein (bis 100 m²)' },
    { value: 'mittel', label: 'Mittel (100-500 m²)' },
    { value: 'groß', label: 'Groß (500-2000 m²)' },
    { value: 'sehr_groß', label: 'Sehr groß (über 2000 m²)' },
  ];

  const productTypeOptions = [
    { value: 'kleinteile', label: 'Kleinteile/Elektronik' },
    { value: 'kleidung', label: 'Kleidung/Textilien' },
    { value: 'lebensmittel', label: 'Lebensmittel' },
    { value: 'möbel', label: 'Möbel/Großteile' },
    { value: 'chemikalien', label: 'Chemikalien/Gefahrgut' },
    { value: 'pharma', label: 'Pharma/Medizin' },
    { value: 'automotive', label: 'Automotive/KFZ-Teile' },
  ];

  const urgencyOptions = [
    { value: 'sofort', label: 'Sofort' },
    { value: 'diese_woche', label: 'Diese Woche' },
    { value: 'nächste_woche', label: 'Nächste Woche' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const handleInputChange = (field: keyof LagerlogistikData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.warehouseSize &&
      formData.productType &&
      formData.urgency
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.warehouseSize &&
      formData.productType &&
      formData.urgency
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Lager & Logistik Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Dienstleistung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Welche Logistik-Dienstleistung wird benötigt?"
            />
          </FormField>

          <FormField label="Lagergröße" required>
            <FormSelect
              value={formData.warehouseSize || ''}
              onChange={value => handleInputChange('warehouseSize', value)}
              options={warehouseSizeOptions}
              placeholder="Wie groß ist das Lager?"
            />
          </FormField>

          <FormField label="Produkttyp" required>
            <FormSelect
              value={formData.productType || ''}
              onChange={value => handleInputChange('productType', value)}
              options={productTypeOptions}
              placeholder="Welche Produkte werden gelagert?"
            />
          </FormField>

          <FormField label="Zeitrahmen" required>
            <FormSelect
              value={formData.urgency || ''}
              onChange={value => handleInputChange('urgency', value)}
              options={urgencyOptions}
              placeholder="Wann wird die Dienstleistung benötigt?"
            />
          </FormField>

          <FormField label="Anzahl Mitarbeiter benötigt">
            <FormInput
              type="number"
              value={formData.numberOfWorkers || ''}
              onChange={value => handleInputChange('numberOfWorkers', value)}
              placeholder="z.B. 3"
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
          <FormField label="Projektbeschreibung">
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie Ihr Lager- und Logistikprojekt..."
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Benötigte Services">
            <FormCheckboxGroup
              value={formData.requiredServices || []}
              onChange={value => handleInputChange('requiredServices', value)}
              options={[
                { value: 'wareneingangskontrolle', label: 'Wareneingangskontrolle' },
                { value: 'qualitätskontrolle', label: 'Qualitätskontrolle' },
                { value: 'barcode_scanning', label: 'Barcode-Scanning' },
                { value: 'software_bedienung', label: 'Software-Bedienung (WMS)' },
                { value: 'gabelstapler', label: 'Gabelstapler-Bedienung' },
                { value: 'palettierung', label: 'Palettierung' },
                { value: 'dokumentation', label: 'Dokumentation' },
                { value: 'reporting', label: 'Reporting/Statistiken' },
              ]}
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
                { value: 'vollzeit', label: 'Vollzeit (40h/Woche)' },
                { value: 'teilzeit', label: 'Teilzeit' },
                { value: 'schicht', label: 'Schichtarbeit' },
                { value: 'projektbasis', label: 'Projektbasis' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Erforderliche Qualifikationen">
            <FormCheckboxGroup
              value={formData.requiredQualifications || []}
              onChange={value => handleInputChange('requiredQualifications', value)}
              options={[
                { value: 'logistik_erfahrung', label: 'Logistik-Erfahrung' },
                { value: 'gabelstapler_schein', label: 'Gabelstapler-Führerschein' },
                { value: 'gefahrgut', label: 'Gefahrgut-Schulung' },
                { value: 'wms_kenntnisse', label: 'WMS-Kenntnisse' },
                { value: 'körperliche_fitness', label: 'Körperliche Fitness' },
                { value: 'deutschkenntnisse', label: 'Deutsche Sprachkenntnisse' },
              ]}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton
        isValid={isFormValid()}
        subcategory="Lager & Logistik"
        formData={formData}
      />
    </div>
  );
};

export default LagerlogistikForm;
