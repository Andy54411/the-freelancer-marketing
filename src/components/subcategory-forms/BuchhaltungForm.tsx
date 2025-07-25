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
import { useRouter } from 'next/navigation';

interface BuchhaltungFormProps {
  data: BuchhaltungData;
  onDataChange: (data: BuchhaltungData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const BuchhaltungForm: React.FC<BuchhaltungFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<BuchhaltungData>(data);
  const router = useRouter();
    return (
      <div className="space-y-6 mt-8">
        {!isValid && (
          <div className="text-center">
            <div className="inline-flex items-center py-3 px-5 bg-gradient-to-r from-teal-50 to-cyan-50 border border-[#14ad9f]/20 rounded-xl shadow-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-3 text-[#14ad9f]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-gray-700 font-medium">
                Bitte füllen Sie alle Pflichtfelder aus, um fortzufahren.
              </span>
            </div>
          </div>
        )}
        {isValid && (
          <div className="text-center">
            <button
              className="bg-[#14ad9f] hover:bg-teal-700 text-white font-medium py-3 px-6 rounded-lg shadow transition-colors duration-200"
              onClick={handleNextClick}
            >
              Weiter zur Adresseingabe
            </button>
          </div>
        )}
      </div>
    );
  };

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
    { value: 'gesundheit', label: 'Gesundheitswesen' },
    { value: 'bildung', label: 'Bildung' },
    { value: 'transport', label: 'Transport & Logistik' },
    { value: 'produktion', label: 'Produktion' },
    { value: 'non_profit', label: 'Non-Profit' },
  ];

  const companySizeOptions = [
    { value: 'startup', label: 'Startup (< 5 Mitarbeiter)' },
    { value: 'small', label: 'Klein (5-20 Mitarbeiter)' },
    { value: 'medium', label: 'Mittel (20-100 Mitarbeiter)' },
    { value: 'large', label: 'Groß (100+ Mitarbeiter)' },
  ];

  const softwareOptions = [
    { value: 'datev', label: 'DATEV' },
    { value: 'lexware', label: 'Lexware' },
    { value: 'sage', label: 'Sage' },
    { value: 'sevdesk', label: 'sevDesk' },
    { value: 'debitoor', label: 'Debitoor' },
    { value: 'fastbill', label: 'FastBill' },
    { value: 'billomat', label: 'Billomat' },
    { value: 'banana', label: 'Banana Accounting' },
    { value: 'buhl', label: 'Buhl' },
    { value: 'andere', label: 'Andere Software' },
    { value: 'keine', label: 'Keine Software vorhanden' },
  ];

  const taxTypeOptions = [
    { value: 'umsatzsteuer', label: 'Umsatzsteuer' },
    { value: 'einkommensteuer', label: 'Einkommensteuer' },
    { value: 'koerperschaftsteuer', label: 'Körperschaftsteuer' },
    { value: 'gewerbesteuer', label: 'Gewerbesteuer' },
    { value: 'lohnsteuer', label: 'Lohnsteuer' },
    { value: 'vorsteuer', label: 'Vorsteuer' },
    { value: 'zusammenfassende_meldung', label: 'Zusammenfassende Meldung' },
    { value: 'intrastat', label: 'Intrastat' },
  ];

  const frequencyOptions = [
    { value: 'monthly', label: 'Monatlich' },
    { value: 'quarterly', label: 'Quartalsweise' },
    { value: 'annually', label: 'Jährlich' },
    { value: 'project_based', label: 'Projektbezogen' },
  ];
  const additionalServicesOptions = [
    { value: 'digital_bookkeeping', label: 'Digitale Buchhaltung' },
    { value: 'document_management', label: 'Belegverwaltung' },
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
              placeholder="Wählen Sie die Art der Buchhaltung"
            />
          </FormField>

          <FormField label="Unternehmensform" required>
            <FormSelect
              value={formData.companyType || ''}
              onChange={value => handleInputChange('companyType', value)}
              options={companyTypeOptions}
              placeholder="Wählen Sie die Unternehmensform"
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
              placeholder="Wählen Sie die Häufigkeit"
            />
          </FormField>
          <FormField label="Unternehmen">
            <FormInput
              type="text"
              value={formData.company || ''}
              onChange={value => handleInputChange('company', value)}
              placeholder="Ihr Unternehmen"
            />
          </FormField>

          <FormField label="Steuernummer">
            <FormInput
              type="text"
              value={formData.taxNumber || ''}
              onChange={value => handleInputChange('taxNumber', value)}
              placeholder="Steuernummer"
            />
          </FormField>

          <FormField label="Umsatzsteuer-ID">
            <FormInput
              type="text"
              value={formData.vatId || ''}
              onChange={value => handleInputChange('vatId', value)}
              placeholder="Umsatzsteuer-ID"
            />
          </FormField>

          <FormField label="Anzahl Mitarbeiter">
            <FormInput
              type="number"
              value={formData.employeeCount?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'employeeCount',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl der Mitarbeiter"
            />
          </FormField>

          <FormField label="Jahresumsatz">
            <FormInput
              type="number"
              value={formData.annualRevenue?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'annualRevenue',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Jahresumsatz in €"
            />
          </FormField>

          <FormField label="Belege pro Monat">
            <FormInput
              type="number"
              value={formData.monthlyTransactions?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'monthlyTransactions',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Durchschnittliche Anzahl Belege pro Monat"
            />
          </FormField>

          <FormField label="Geschäftsjahr Beginn">
            <FormInput
              type="text"
              value={formData.fiscalYearStart || ''}
              onChange={value => handleInputChange('fiscalYearStart', value)}
              placeholder="z.B. 01.01 oder 01.07"
            />
          </FormField>

          <FormField label="Startdatum">
            <FormInput
              type="text"
              value={formData.startDate || ''}
              onChange={value => handleInputChange('startDate', value)}
              placeholder="TT.MM.JJJJ"
            />
          </FormField>

          <FormField label="Steuerberater">
            <FormInput
              type="text"
              value={formData.taxAdvisor || ''}
              onChange={value => handleInputChange('taxAdvisor', value)}
              placeholder="Name des Steuerberaters (falls vorhanden)"
            />
          </FormField>

          <FormField label="Bankverbindung">
            <FormInput
              type="text"
              value={formData.bankAccount || ''}
              onChange={value => handleInputChange('bankAccount', value)}
              placeholder="Hauptbankverbindung"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Verwendete Software">
            <FormCheckboxGroup
              value={formData.currentSoftware || []}
              onChange={value => handleInputChange('currentSoftware', value)}
              options={softwareOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Steuerarten">
            <FormCheckboxGroup
              value={formData.taxTypes || []}
              onChange={value => handleInputChange('taxTypes', value)}
              options={taxTypeOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zusätzliche Services">
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
              placeholder="Beschreiben Sie Ihre Buchhaltungsanforderungen detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Aktuelle Situation">
            <FormTextarea
              value={formData.currentSituation || ''}
              onChange={value => handleInputChange('currentSituation', value)}
              placeholder="Beschreiben Sie Ihre aktuelle Buchhaltungssituation"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Spezielle Anforderungen">
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

      <FormSubmitButton isValid={isFormValid()} subcategory="Buchhaltung" />
    </div>
  );
}

export default BuchhaltungForm;
