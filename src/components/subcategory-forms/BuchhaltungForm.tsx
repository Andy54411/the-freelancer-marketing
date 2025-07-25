'use client';
import React, { useState, useEffect } from 'react';
import { BuchhaltungData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';

interface BuchhaltungFormProps {
  data: BuchhaltungData;
  onDataChange: (data: BuchhaltungData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const BuchhaltungForm: React.FC<BuchhaltungFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<BuchhaltungData>(data);

  const serviceTypeOptions = [
    { value: 'full_bookkeeping', label: 'Vollständige Buchhaltung' },
    { value: 'monthly_bookkeeping', label: 'Monatliche Buchhaltung' },
    { value: 'quarterly_bookkeeping', label: 'Quartalsbuchhaltung' },
    { value: 'annual_bookkeeping', label: 'Jahresabschluss' },
    { value: 'tax_preparation', label: 'Steuererklärung' },
    { value: 'payroll_accounting', label: 'Lohnbuchhaltung' },
    { value: 'invoice_management', label: 'Rechnungswesen' },
    { value: 'financial_analysis', label: 'Finanzanalyse' },
    { value: 'budget_planning', label: 'Budgetplanung' },
    { value: 'audit_support', label: 'Prüfungsunterstützung' },
  ];

  const companyTypeOptions = [
    { value: 'einzelunternehmen', label: 'Einzelunternehmen' },
    { value: 'freiberufler', label: 'Freiberufler' },
    { value: 'gbr', label: 'GbR' },
    { value: 'ohg', label: 'OHG' },
    { value: 'kg', label: 'KG' },
    { value: 'gmbh', label: 'GmbH' },
    { value: 'ug', label: 'UG (haftungsbeschränkt)' },
    { value: 'ag', label: 'AG' },
    { value: 'eg', label: 'eG' },
    { value: 'verein', label: 'Verein' },
    { value: 'stiftung', label: 'Stiftung' },
  ];

  const industryOptions = [
    { value: 'handel', label: 'Handel' },
    { value: 'handwerk', label: 'Handwerk' },
    { value: 'dienstleistung', label: 'Dienstleistung' },
    { value: 'gastronomie', label: 'Gastronomie' },
    { value: 'immobilien', label: 'Immobilien' },
    { value: 'it', label: 'IT & Software' },
    { value: 'beratung', label: 'Beratung' },
    { value: 'gesundheitswesen', label: 'Gesundheitswesen' },
    { value: 'bildung', label: 'Bildung' },
    { value: 'transport', label: 'Transport & Logistik' },
    { value: 'produktion', label: 'Produktion' },
    { value: 'sonstige', label: 'Sonstige' },
  ];

  const companySizeOptions = [
    { value: 'micro', label: 'Kleinstunternehmen (1-9 Mitarbeiter)' },
    { value: 'small', label: 'Kleinunternehmen (10-49 Mitarbeiter)' },
    { value: 'medium', label: 'Mittleres Unternehmen (50-249 Mitarbeiter)' },
    { value: 'large', label: 'Großunternehmen (250+ Mitarbeiter)' },
  ];

  const frequencyOptions = [
    { value: 'einmalig', label: 'Einmalig' },
    { value: 'monatlich', label: 'Monatlich' },
    { value: 'quartalsweise', label: 'Quartalsweise' },
    { value: 'halbjährlich', label: 'Halbjährlich' },
    { value: 'jährlich', label: 'Jährlich' },
    { value: 'nach_bedarf', label: 'Nach Bedarf' },
  ];

  const additionalServicesOptions = [
    { value: 'bank_reconciliation', label: 'Kontoabstimmung' },
    { value: 'expense_management', label: 'Ausgabenmanagement' },
    { value: 'cash_flow_analysis', label: 'Cashflow-Analyse' },
    { value: 'kpi_reporting', label: 'KPI-Reporting' },
    { value: 'tax_optimization', label: 'Steueroptimierung' },
    { value: 'business_consulting', label: 'Betriebswirtschaftliche Beratung' },
    { value: 'compliance_monitoring', label: 'Compliance-Überwachung' },
    { value: 'audit_preparation', label: 'Prüfungsvorbereitung' },
  ];

  const handleInputChange = (field: keyof BuchhaltungData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.companyType &&
      formData.industry &&
      formData.companySize &&
      formData.frequency &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.companyType &&
      formData.industry &&
      formData.companySize &&
      formData.frequency &&
      formData.projectDescription
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Buchhaltungs-Projektdetails
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

          <FormField label="Unternehmensform" required>
            <FormSelect
              value={formData.companyType || ''}
              onChange={value => handleInputChange('companyType', value)}
              options={companyTypeOptions}
              placeholder="Wählen Sie Ihre Unternehmensform"
            />
          </FormField>

          <FormField label="Branche" required>
            <FormSelect
              value={formData.industry || ''}
              onChange={value => handleInputChange('industry', value)}
              options={industryOptions}
              placeholder="Wählen Sie Ihre Branche"
            />
          </FormField>

          <FormField label="Unternehmensgröße" required>
            <FormSelect
              value={formData.companySize || ''}
              onChange={value => handleInputChange('companySize', value)}
              options={companySizeOptions}
              placeholder="Wählen Sie die Unternehmensgröße"
            />
          </FormField>

          <FormField label="Häufigkeit" required>
            <FormSelect
              value={formData.frequency || ''}
              onChange={value => handleInputChange('frequency', value)}
              options={frequencyOptions}
              placeholder="Wie oft benötigen Sie die Dienstleistung?"
            />
          </FormField>

          <FormField label="Geschäftsjahr">
            <FormInput
              type="text"
              value={formData.businessYear || ''}
              onChange={value => handleInputChange('businessYear', value)}
              placeholder="z.B. 01.01. - 31.12."
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Anzahl Belege pro Monat">
            <FormInput
              type="number"
              value={formData.monthlyDocuments || ''}
              onChange={value => handleInputChange('monthlyDocuments', value)}
              placeholder="Geschätzte Anzahl der Belege"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Jahresumsatz (ca.)">
            <FormInput
              type="text"
              value={formData.annualRevenue || ''}
              onChange={value => handleInputChange('annualRevenue', value)}
              placeholder="z.B. 100.000 EUR"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zusätzliche Dienstleistungen">
            <FormCheckboxGroup
              value={formData.additionalServices || []}
              onChange={value => handleInputChange('additionalServices', value)}
              options={additionalServicesOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Projektbeschreibung" required>
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie Ihr Projekt und Ihre Anforderungen detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Besondere Anforderungen oder Wünsche"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besonderheiten">
            <FormTextarea
              value={formData.specialCircumstances || ''}
              onChange={value => handleInputChange('specialCircumstances', value)}
              placeholder="Besonderheiten Ihres Unternehmens oder Ihrer Branche"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Dokumente verfügbar">
            <FormRadioGroup
              name="documentsAvailable"
              value={formData.documentsAvailable || ''}
              onChange={value => handleInputChange('documentsAvailable', value)}
              options={[
                { value: 'vollständig', label: 'Vollständig digital verfügbar' },
                { value: 'teilweise', label: 'Teilweise digital verfügbar' },
                { value: 'papier', label: 'Nur in Papierform vorhanden' },
                { value: 'unvollständig', label: 'Unvollständig/Lücken vorhanden' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Kleinunternehmerregelung">
            <FormRadioGroup
              name="smallBusinessRegulation"
              value={formData.smallBusinessRegulation || ''}
              onChange={value => handleInputChange('smallBusinessRegulation', value)}
              options={[
                { value: 'ja', label: 'Ja, ich nutze die Kleinunternehmerregelung' },
                { value: 'nein', label: 'Nein, ich bin umsatzsteuerpflichtig' },
                { value: 'unsicher', label: 'Unsicher' },
              ]}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Buchhaltung" formData={formData} />
    </div>
  );
};

export default BuchhaltungForm;
