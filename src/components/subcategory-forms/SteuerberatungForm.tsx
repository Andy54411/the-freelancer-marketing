'use client';
import React, { useState, useEffect } from 'react';
import { SteuerberatungData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';

interface SteuerberatungFormProps {
  data: SteuerberatungData;
  onDataChange: (data: SteuerberatungData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const SteuerberatungForm: React.FC<SteuerberatungFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<SteuerberatungData>(data);

  const serviceTypeOptions = [
    { value: 'steuererklärung', label: 'Steuererklärung erstellen' },
    { value: 'steuerberatung', label: 'Steuerberatung' },
    { value: 'buchführung', label: 'Buchführung/Buchhaltung' },
    { value: 'jahresabschluss', label: 'Jahresabschluss' },
    { value: 'gründungsberatung', label: 'Gründungsberatung' },
    { value: 'betriebsprüfung', label: 'Betriebsprüfung/Steuerprüfung' },
    { value: 'steueroptimierung', label: 'Steueroptimierung' },
    { value: 'lohnbuchhaltung', label: 'Lohnbuchhaltung' },
  ];

  const clientTypeOptions = [
    { value: 'privatperson', label: 'Privatperson' },
    { value: 'einzelunternehmer', label: 'Einzelunternehmer' },
    { value: 'freiberufler', label: 'Freiberufler' },
    { value: 'gmbh', label: 'GmbH' },
    { value: 'ug', label: 'UG (haftungsbeschränkt)' },
    { value: 'kg', label: 'KG/OHG' },
    { value: 'verein', label: 'Verein/Stiftung' },
  ];

  const taxYearOptions = [
    { value: '2024', label: '2024' },
    { value: '2023', label: '2023' },
    { value: '2022', label: '2022' },
    { value: '2021', label: '2021' },
    { value: 'mehrere', label: 'Mehrere Jahre' },
  ];

  const urgencyOptions = [
    { value: 'sofort', label: 'Sofort' },
    { value: 'diese_woche', label: 'Diese Woche' },
    { value: 'nächste_woche', label: 'Nächste Woche' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const handleInputChange = (field: keyof SteuerberatungData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.clientType &&
      formData.urgency
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.clientType &&
      formData.urgency
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Steuerberatung Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Dienstleistung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Welche Steuerdienstleistung wird benötigt?"
            />
          </FormField>

          <FormField label="Mandantentyp" required>
            <FormSelect
              value={formData.clientType || ''}
              onChange={value => handleInputChange('clientType', value)}
              options={clientTypeOptions}
              placeholder="Wer benötigt die Steuerberatung?"
            />
          </FormField>

          <FormField label="Steuerjahr">
            <FormSelect
              value={formData.taxYear || ''}
              onChange={value => handleInputChange('taxYear', value)}
              options={taxYearOptions}
              placeholder="Für welches Jahr?"
            />
          </FormField>

          <FormField label="Zeitrahmen" required>
            <FormSelect
              value={formData.urgency || ''}
              onChange={value => handleInputChange('urgency', value)}
              options={urgencyOptions}
              placeholder="Wann wird die Beratung benötigt?"
            />
          </FormField>

          <FormField label="Budget-Rahmen">
            <FormInput
              type="text"
              value={formData.budgetRange || ''}
              onChange={value => handleInputChange('budgetRange', value)}
              placeholder="z.B. 500-1.500 EUR"
            />
          </FormField>

          <FormField label="Jahresumsatz (für Unternehmen)">
            <FormInput
              type="text"
              value={formData.annualRevenue || ''}
              onChange={value => handleInputChange('annualRevenue', value)}
              placeholder="z.B. 50.000 EUR"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Beschreibung des Anliegens">
            <FormTextarea
              value={formData.requestDescription || ''}
              onChange={value => handleInputChange('requestDescription', value)}
              placeholder="Beschreiben Sie Ihr steuerliches Anliegen..."
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
                { value: 'beratung', label: 'Steuerliche Beratung' },
                { value: 'erstellung', label: 'Steuererklärung erstellen' },
                { value: 'optimierung', label: 'Steueroptimierung' },
                { value: 'vertretung', label: 'Vertretung bei Finanzamt' },
                { value: 'prüfung', label: 'Prüfung vorhandener Unterlagen' },
                { value: 'schulung', label: 'Schulung/Weiterbildung' },
                { value: 'dokumentation', label: 'Dokumentation/Archivierung' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Vorhandene Unterlagen">
            <FormCheckboxGroup
              value={formData.availableDocuments || []}
              onChange={value => handleInputChange('availableDocuments', value)}
              options={[
                { value: 'lohnsteuerbescheinigung', label: 'Lohnsteuerbescheinigung' },
                { value: 'belege', label: 'Belege/Quittungen' },
                { value: 'bankauszüge', label: 'Bankauszüge' },
                { value: 'rechnungen', label: 'Rechnungen' },
                { value: 'verträge', label: 'Verträge' },
                { value: 'vorjahreserklärung', label: 'Vorjahres-Steuererklärung' },
                { value: 'buchhaltung', label: 'Buchhaltungsunterlagen' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Laufende Betreuung gewünscht">
            <FormRadioGroup
              name="ongoingSupport"
              value={formData.ongoingSupport || ''}
              onChange={value => handleInputChange('ongoingSupport', value)}
              options={[
                { value: 'ja', label: 'Ja, laufende Betreuung gewünscht' },
                { value: 'nein', label: 'Nein, nur einmalige Beratung' },
                { value: 'unentschieden', label: 'Noch unentschieden' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Kommunikation bevorzugt">
            <FormRadioGroup
              name="preferredCommunication"
              value={formData.preferredCommunication || ''}
              onChange={value => handleInputChange('preferredCommunication', value)}
              options={[
                { value: 'persönlich', label: 'Persönliche Termine' },
                { value: 'telefon', label: 'Telefon' },
                { value: 'email', label: 'E-Mail' },
                { value: 'digital', label: 'Digitale Plattform' },
              ]}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Steuerberatung" formData={formData} />
    </div>
  );
};

export default SteuerberatungForm;
