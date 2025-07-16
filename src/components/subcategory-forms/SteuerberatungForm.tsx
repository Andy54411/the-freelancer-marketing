import React, { useState, useEffect } from 'react';
import { SteuerberatungData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface SteuerberatungFormProps {
  data: SteuerberatungData;
  onDataChange: (data: SteuerberatungData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const SteuerberatungForm: React.FC<SteuerberatungFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<SteuerberatungData>(data);

  const serviceTypeOptions = [
    { value: 'tax_declaration', label: 'Steuererklärung' },
    { value: 'tax_planning', label: 'Steuerplanung' },
    { value: 'tax_optimization', label: 'Steueroptimierung' },
    { value: 'business_tax_consulting', label: 'Betriebsteuerberatung' },
    { value: 'succession_planning', label: 'Nachfolgeplanung' },
    { value: 'corporate_restructuring', label: 'Unternehmensumstrukturierung' },
    { value: 'international_tax', label: 'Internationales Steuerrecht' },
    { value: 'tax_audit_support', label: 'Betriebsprüfungsunterstützung' },
    { value: 'vat_consulting', label: 'Umsatzsteuerberatung' },
    { value: 'payroll_tax', label: 'Lohnsteuerberatung' },
  ];

  const clientTypeOptions = [
    { value: 'einzelperson', label: 'Einzelperson' },
    { value: 'freiberufler', label: 'Freiberufler' },
    { value: 'einzelunternehmen', label: 'Einzelunternehmen' },
    { value: 'personengesellschaft', label: 'Personengesellschaft' },
    { value: 'kapitalgesellschaft', label: 'Kapitalgesellschaft' },
    { value: 'verein', label: 'Verein' },
    { value: 'stiftung', label: 'Stiftung' },
    { value: 'immobilieneigentümer', label: 'Immobilieneigentümer' },
  ];

  const taxTypeOptions = [
    { value: 'einkommensteuer', label: 'Einkommensteuer' },
    { value: 'koerperschaftsteuer', label: 'Körperschaftsteuer' },
    { value: 'umsatzsteuer', label: 'Umsatzsteuer' },
    { value: 'gewerbesteuer', label: 'Gewerbesteuer' },
    { value: 'lohnsteuer', label: 'Lohnsteuer' },
    { value: 'grundsteuer', label: 'Grundsteuer' },
    { value: 'grunderwerbsteuer', label: 'Grunderwerbsteuer' },
    { value: 'erbschaftsteuer', label: 'Erbschaftsteuer' },
    { value: 'schenkungsteuer', label: 'Schenkungsteuer' },
    { value: 'kirchensteuer', label: 'Kirchensteuer' },
  ];

  const urgencyOptions = [
    { value: 'nicht_eilig', label: 'Nicht eilig' },
    { value: 'normal', label: 'Normal' },
    { value: 'eilig', label: 'Eilig' },
    { value: 'sehr_eilig', label: 'Sehr eilig' },
  ];

  const complexityOptions = [
    { value: 'einfach', label: 'Einfach' },
    { value: 'mittel', label: 'Mittel' },
    { value: 'komplex', label: 'Komplex' },
    { value: 'sehr_komplex', label: 'Sehr komplex' },
  ];

  const budgetRangeOptions = [
    { value: 'unter_500', label: 'Unter 500€' },
    { value: '500_1500', label: '500€ - 1.500€' },
    { value: '1500_3000', label: '1.500€ - 3.000€' },
    { value: '3000_8000', label: '3.000€ - 8.000€' },
    { value: 'über_8000', label: 'Über 8.000€' },
  ];

  const frequencyOptions = [
    { value: 'einmalig', label: 'Einmalig' },
    { value: 'jährlich', label: 'Jährlich' },
    { value: 'quartalsweise', label: 'Quartalsweise' },
    { value: 'monatlich', label: 'Monatlich' },
    { value: 'bei_bedarf', label: 'Bei Bedarf' },
  ];

  const additionalServicesOptions = [
    { value: 'bookkeeping', label: 'Buchhaltung' },
    { value: 'payroll', label: 'Lohnabrechnung' },
    { value: 'business_consulting', label: 'Betriebswirtschaftliche Beratung' },
    { value: 'legal_consulting', label: 'Rechtsberatung' },
    { value: 'audit_support', label: 'Prüfungsunterstützung' },
    { value: 'compliance_monitoring', label: 'Compliance-Überwachung' },
    { value: 'tax_software_support', label: 'Steuersoftware-Unterstützung' },
    { value: 'training', label: 'Schulungen' },
    { value: 'representation', label: 'Behördenvertretung' },
    { value: 'document_preparation', label: 'Dokumentenvorbereitung' },
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
      formData.urgency &&
      formData.complexity &&
      formData.budgetRange &&
      formData.frequency &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Steuerberatungs-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Dienstleistung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art der Steuerberatung"
            />
          </FormField>

          <FormField label="Mandantentyp" required>
            <FormSelect
              value={formData.clientType || ''}
              onChange={value => handleInputChange('clientType', value)}
              options={clientTypeOptions}
              placeholder="Wählen Sie den Mandantentyp"
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

          <FormField label="Komplexität" required>
            <FormSelect
              value={formData.complexity || ''}
              onChange={value => handleInputChange('complexity', value)}
              options={complexityOptions}
              placeholder="Wählen Sie die Komplexität"
            />
          </FormField>

          <FormField label="Budget-Rahmen" required>
            <FormSelect
              value={formData.budgetRange || ''}
              onChange={value => handleInputChange('budgetRange', value)}
              options={budgetRangeOptions}
              placeholder="Wählen Sie den Budget-Rahmen"
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

          <FormField label="Name/Unternehmen">
            <FormInput
              type="text"
              value={formData.clientName || ''}
              onChange={value => handleInputChange('clientName', value)}
              placeholder="Ihr Name oder Unternehmen"
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

          <FormField label="Jahreseinkommen/Umsatz">
            <FormInput
              type="number"
              value={formData.annualIncome?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'annualIncome',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Jahreseinkommen/-umsatz in €"
            />
          </FormField>

          <FormField label="Steuerjahr">
            <FormInput
              type="number"
              value={formData.taxYear?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'taxYear',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="z.B. 2023"
            />
          </FormField>

          <FormField label="Steuerklasse">
            <FormInput
              type="text"
              value={formData.taxClass || ''}
              onChange={value => handleInputChange('taxClass', value)}
              placeholder="Steuerklasse (falls zutreffend)"
            />
          </FormField>

          <FormField label="Frist">
            <FormInput
              type="text"
              value={formData.deadline || ''}
              onChange={value => handleInputChange('deadline', value)}
              placeholder="TT.MM.JJJJ"
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

          <FormField label="Vorheriger Berater">
            <FormInput
              type="text"
              value={formData.previousAdvisor || ''}
              onChange={value => handleInputChange('previousAdvisor', value)}
              placeholder="Vorheriger Steuerberater (falls vorhanden)"
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
              placeholder="Beschreiben Sie Ihr Steuerberatungsanliegen detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Aktuelle Situation">
            <FormTextarea
              value={formData.currentSituation || ''}
              onChange={value => handleInputChange('currentSituation', value)}
              placeholder="Beschreiben Sie Ihre aktuelle steuerliche Situation"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Dokumente vorhanden">
            <FormTextarea
              value={formData.availableDocuments || ''}
              onChange={value => handleInputChange('availableDocuments', value)}
              placeholder="Welche Dokumente/Unterlagen haben Sie bereits?"
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
              placeholder="Besondere Umstände oder Besonderheiten"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Erfahrung mit Steuerberatung">
            <FormRadioGroup
              name="experienceLevel"
              value={formData.experienceLevel || ''}
              onChange={value => handleInputChange('experienceLevel', value)}
              options={[
                { value: 'keine', label: 'Keine Erfahrung' },
                { value: 'wenig', label: 'Wenig Erfahrung' },
                { value: 'mittel', label: 'Mittlere Erfahrung' },
                { value: 'viel', label: 'Viel Erfahrung' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Persönliche Beratung gewünscht">
            <FormRadioGroup
              name="personalConsultation"
              value={formData.personalConsultation || ''}
              onChange={value => handleInputChange('personalConsultation', value)}
              options={[
                { value: 'ja', label: 'Ja, persönliche Beratung erwünscht' },
                { value: 'nein', label: 'Nein, digitale Abwicklung ausreichend' },
                { value: 'flexibel', label: 'Flexibel, je nach Bedarf' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Laufende Mandate">
            <FormRadioGroup
              name="ongoingMandates"
              value={formData.ongoingMandates || ''}
              onChange={value => handleInputChange('ongoingMandates', value)}
              options={[
                { value: 'ja', label: 'Ja, bereits laufende Mandate' },
                { value: 'nein', label: 'Nein, neuer Mandant' },
                { value: 'wechsel', label: 'Wechsel von anderem Berater' },
              ]}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default SteuerberatungForm;
