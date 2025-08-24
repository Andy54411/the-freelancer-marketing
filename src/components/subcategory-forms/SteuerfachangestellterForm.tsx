'use client';
import React, { useState, useEffect } from 'react';
import { SteuerfachangestellterData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';

interface SteuerfachangestellterFormProps {
  data: SteuerfachangestellterData;
  onDataChange: (data: SteuerfachangestellterData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const SteuerfachangestellterForm: React.FC<SteuerfachangestellterFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<SteuerfachangestellterData>(data);

  const serviceTypeOptions = [
    { value: 'steuererklärung', label: 'Steuererklärung erstellen' },
    { value: 'buchhaltung', label: 'Laufende Buchhaltung' },
    { value: 'jahresabschluss', label: 'Jahresabschluss' },
    { value: 'lohnabrechnung', label: 'Lohn- und Gehaltsabrechnung' },
    { value: 'beratung', label: 'Steuerberatung' },
    { value: 'betriebsprüfung', label: 'Betriebsprüfung' },
    { value: 'existenzgründung', label: 'Existenzgründungsberatung' },
    { value: 'nachzahlung', label: 'Steuernachzahlungen' },
  ];

  const clientTypeOptions = [
    { value: 'privatperson', label: 'Privatperson' },
    { value: 'einzelunternehmer', label: 'Einzelunternehmer' },
    { value: 'freiberufler', label: 'Freiberufler' },
    { value: 'gmbh', label: 'GmbH' },
    { value: 'ug', label: 'UG (haftungsbeschränkt)' },
    { value: 'kg', label: 'KG' },
    { value: 'ohg', label: 'OHG' },
    { value: 'andere', label: 'Andere Rechtsform' },
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
    { value: 'diesen_monat', label: 'Diesen Monat' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const handleInputChange = (field: keyof SteuerfachangestellterData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(formData.serviceType && formData.clientType && formData.urgency);
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const isFormValid = () => {
    return !!(formData.serviceType && formData.clientType && formData.urgency);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Steuerfachangestellte/r Projektdetails
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

          <FormField label="Mandantentyp" required>
            <FormSelect
              value={formData.clientType || ''}
              onChange={value => handleInputChange('clientType', value)}
              options={clientTypeOptions}
              placeholder="Art des Mandanten?"
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
              placeholder="Wann wird der Service benötigt?"
            />
          </FormField>

          <FormField label="Anzahl Mitarbeiter">
            <FormInput
              type="number"
              value={formData.numberOfEmployees || ''}
              onChange={value => handleInputChange('numberOfEmployees', Number(value))}
              placeholder="Falls Lohnabrechnung"
            />
          </FormField>

          <FormField label="Branche">
            <FormInput
              type="text"
              value={formData.industry || ''}
              onChange={value => handleInputChange('industry', value)}
              placeholder="z.B. Einzelhandel, IT, Handwerk"
            />
          </FormField>

          <FormField label="Jahresumsatz (ca.)">
            <FormInput
              type="text"
              value={formData.annualRevenue || ''}
              onChange={value => handleInputChange('annualRevenue', value)}
              placeholder="z.B. 50.000 EUR"
            />
          </FormField>

          <FormField label="Andere Rechtsform (falls ausgewählt)">
            <FormInput
              type="text"
              value={formData.otherLegalForm || ''}
              onChange={value => handleInputChange('otherLegalForm', value)}
              placeholder="Name der Rechtsform"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Benötigte Steuerarten">
            <FormCheckboxGroup
              value={formData.taxTypes || []}
              onChange={value => handleInputChange('taxTypes', value)}
              options={[
                { value: 'einkommensteuer', label: 'Einkommensteuer' },
                { value: 'körperschaftsteuer', label: 'Körperschaftsteuer' },
                { value: 'gewerbesteuer', label: 'Gewerbesteuer' },
                { value: 'umsatzsteuer', label: 'Umsatzsteuer' },
                { value: 'lohnsteuer', label: 'Lohnsteuer' },
                { value: 'erbschaftsteuer', label: 'Erbschaftsteuer' },
                { value: 'grundsteuer', label: 'Grundsteuer' },
                { value: 'grunderwerbsteuer', label: 'Grunderwerbsteuer' },
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
                { value: 'digitale_buchhaltung', label: 'Digitale Buchhaltung' },
                { value: 'kassenbuch', label: 'Kassenbuchführung' },
                { value: 'anlagenbuchhaltung', label: 'Anlagenbuchhaltung' },
                { value: 'kreditoren', label: 'Kreditorenbuchhaltung' },
                { value: 'debitoren', label: 'Debitorenbuchhaltung' },
                { value: 'mahnwesen', label: 'Mahnwesen' },
                { value: 'liquiditätsplanung', label: 'Liquiditätsplanung' },
                { value: 'kostenrechnung', label: 'Kostenrechnung' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Software-Präferenzen">
            <FormCheckboxGroup
              value={formData.softwarePreferences || []}
              onChange={value => handleInputChange('softwarePreferences', value)}
              options={[
                { value: 'datev', label: 'DATEV' },
                { value: 'lexware', label: 'Lexware' },
                { value: 'sevdesk', label: 'sevDesk' },
                { value: 'sage', label: 'Sage' },
                { value: 'fastbill', label: 'FastBill' },
                { value: 'keine_präferenz', label: 'Keine Präferenz' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Projektbeschreibung">
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie Ihre steuerlichen Anforderungen..."
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Umstände">
            <FormTextarea
              value={formData.specialCircumstances || ''}
              onChange={value => handleInputChange('specialCircumstances', value)}
              placeholder="Besondere steuerliche Umstände oder Herausforderungen..."
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Art der Zusammenarbeit">
            <FormRadioGroup
              name="collaborationType"
              value={formData.collaborationType || ''}
              onChange={value => handleInputChange('collaborationType', value)}
              options={[
                { value: 'einmalig', label: 'Einmaliger Auftrag' },
                { value: 'regelmäßig', label: 'Regelmäßige Zusammenarbeit' },
                { value: 'projektbezogen', label: 'Projektbezogen' },
                { value: 'dauerhaft', label: 'Dauerhafte Betreuung' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Komplexität des Falls">
            <FormRadioGroup
              name="complexity"
              value={formData.complexity || ''}
              onChange={value => handleInputChange('complexity', value)}
              options={[
                { value: 'einfach', label: 'Einfach (Standard-Fall)' },
                { value: 'mittel', label: 'Mittel (einige Besonderheiten)' },
                { value: 'komplex', label: 'Komplex (viele Besonderheiten)' },
                { value: 'sehr_komplex', label: 'Sehr komplex (Spezialfall)' },
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
              placeholder="z.B. 200-500 EUR"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Finanzamt">
            <FormInput
              type="text"
              value={formData.taxOffice || ''}
              onChange={value => handleInputChange('taxOffice', value)}
              placeholder="z.B. Finanzamt Berlin Mitte/Tiergarten"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Vorsteuerabzugsberechtigt">
            <FormRadioGroup
              name="vatDeductible"
              value={formData.vatDeductible || ''}
              onChange={value => handleInputChange('vatDeductible', value)}
              options={[
                { value: 'ja', label: 'Ja, vorsteuerabzugsberechtigt' },
                { value: 'nein', label: 'Nein, nicht berechtigt' },
                { value: 'weiß_nicht', label: 'Weiß ich nicht' },
              ]}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton
        isValid={isFormValid()}
        subcategory="Steuerfachangestellte/r"
        formData={formData}
      />
    </div>
  );
};

export default SteuerfachangestellterForm;
