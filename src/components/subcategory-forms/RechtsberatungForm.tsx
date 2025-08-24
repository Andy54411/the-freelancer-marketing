'use client';
import React, { useState, useEffect } from 'react';
import { RechtsberatungData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';

interface RechtsberatungFormProps {
  data: RechtsberatungData;
  onDataChange: (data: RechtsberatungData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const RechtsberatungForm: React.FC<RechtsberatungFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<RechtsberatungData>(data);

  const legalAreaOptions = [
    { value: 'arbeitsrecht', label: 'Arbeitsrecht' },
    { value: 'mietrecht', label: 'Mietrecht' },
    { value: 'familienrecht', label: 'Familienrecht' },
    { value: 'verkehrsrecht', label: 'Verkehrsrecht' },
    { value: 'vertragsrecht', label: 'Vertragsrecht' },
    { value: 'strafrecht', label: 'Strafrecht' },
    { value: 'gesellschaftsrecht', label: 'Gesellschaftsrecht' },
    { value: 'erbrecht', label: 'Erbrecht' },
    { value: 'immobilienrecht', label: 'Immobilienrecht' },
    { value: 'versicherungsrecht', label: 'Versicherungsrecht' },
    { value: 'steuerrecht', label: 'Steuerrecht' },
    { value: 'sozialrecht', label: 'Sozialrecht' },
  ];

  const serviceTypeOptions = [
    { value: 'beratung', label: 'Rechtliche Beratung' },
    { value: 'vertretung', label: 'Rechtliche Vertretung' },
    { value: 'prüfung', label: 'Rechtliche Prüfung' },
    { value: 'erstellung', label: 'Vertragserstellung' },
  ];

  const clientTypeOptions = [
    { value: 'privatperson', label: 'Privatperson' },
    { value: 'unternehmen', label: 'Unternehmen' },
    { value: 'selbständig', label: 'Selbständiger' },
    { value: 'verein', label: 'Verein/Organisation' },
  ];

  const urgencyOptions = [
    { value: 'sofort', label: 'Sofort (Notfall)' },
    { value: 'diese_woche', label: 'Diese Woche' },
    { value: 'nächste_woche', label: 'Nächste Woche' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const consultationTypeOptions = [
    { value: 'erstberatung', label: 'Erstberatung' },
    { value: 'vertretung', label: 'Vertretung vor Gericht' },
    { value: 'vertragsgestaltung', label: 'Vertragsgestaltung' },
    { value: 'gutachten', label: 'Rechtsgutachten' },
    { value: 'mediation', label: 'Mediation' },
    { value: 'außergerichtlich', label: 'Außergerichtliche Vertretung' },
  ];

  const handleInputChange = (field: keyof RechtsberatungData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.legalArea &&
      formData.clientType &&
      formData.urgency &&
      formData.legalIssue
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const isFormValid = () => {
    return !!(formData.legalArea && formData.clientType && formData.urgency && formData.legalIssue);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Rechtsberatung Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Dienstleistung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Was wird benötigt?"
            />
          </FormField>

          <FormField label="Mandantentyp" required>
            <FormSelect
              value={formData.clientType || ''}
              onChange={value => handleInputChange('clientType', value)}
              options={clientTypeOptions}
              placeholder="Wer benötigt die Rechtsberatung?"
            />
          </FormField>

          <FormField label="Rechtsgebiet" required>
            <FormCheckboxGroup
              value={formData.legalArea || []}
              onChange={value => handleInputChange('legalArea', value)}
              options={legalAreaOptions}
            />
          </FormField>

          <FormField label="Zeitrahmen" required>
            <FormSelect
              value={formData.urgency || ''}
              onChange={value => handleInputChange('urgency', value)}
              options={urgencyOptions}
              placeholder="Wie dringend ist die Angelegenheit?"
            />
          </FormField>

          <FormField label="Art der Beratung">
            <FormSelect
              value={formData.consultationType || ''}
              onChange={value => handleInputChange('consultationType', value)}
              options={consultationTypeOptions}
              placeholder="Welche Art der Hilfe wird benötigt?"
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

          <FormField label="Streitwert (falls bekannt)">
            <FormInput
              type="text"
              value={formData.disputeValue || ''}
              onChange={value => handleInputChange('disputeValue', value)}
              placeholder="z.B. 10.000 EUR"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Rechtliches Problem" required>
            <FormTextarea
              value={formData.legalIssue || ''}
              onChange={value => handleInputChange('legalIssue', value)}
              placeholder="Beschreiben Sie Ihr rechtliches Problem detailliert..."
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Bereits unternommene Schritte">
            <FormTextarea
              value={formData.previousActions || ''}
              onChange={value => handleInputChange('previousActions', value)}
              placeholder="Was haben Sie bereits unternommen?"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Gewünschte Leistungen">
            <FormCheckboxGroup
              value={formData.desiredServices || []}
              onChange={value => handleInputChange('desiredServices', value)}
              options={[
                { value: 'beratung', label: 'Rechtliche Beratung' },
                { value: 'schriftverkehr', label: 'Schriftverkehr führen' },
                { value: 'verhandlung', label: 'Verhandlungen führen' },
                { value: 'klage', label: 'Klage einreichen' },
                { value: 'verteidigung', label: 'Verteidigung' },
                { value: 'vertragscheck', label: 'Verträge prüfen' },
                { value: 'vertragsgestaltung', label: 'Verträge erstellen' },
                { value: 'mediation', label: 'Mediation/Schlichtung' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Vorhandene Dokumente">
            <FormCheckboxGroup
              value={formData.availableDocuments || []}
              onChange={value => handleInputChange('availableDocuments', value)}
              options={[
                { value: 'verträge', label: 'Verträge' },
                { value: 'korrespondenz', label: 'E-Mails/Briefe' },
                { value: 'rechnungen', label: 'Rechnungen/Belege' },
                { value: 'zeugenaussagen', label: 'Zeugenaussagen' },
                { value: 'fotos', label: 'Fotos/Videos' },
                { value: 'gutachten', label: 'Gutachten' },
                { value: 'behördenschreiben', label: 'Behördenschreiben' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Rechtschutzversicherung vorhanden">
            <FormRadioGroup
              name="legalInsurance"
              value={formData.legalInsurance || ''}
              onChange={value => handleInputChange('legalInsurance', value)}
              options={[
                { value: 'ja', label: 'Ja, Rechtschutzversicherung vorhanden' },
                { value: 'nein', label: 'Nein, keine Rechtschutzversicherung' },
                { value: 'unbekannt', label: 'Unbekannt/muss geprüft werden' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Bevorzugte Kommunikation">
            <FormRadioGroup
              name="preferredCommunication"
              value={formData.preferredCommunication || ''}
              onChange={value => handleInputChange('preferredCommunication', value)}
              options={[
                { value: 'persönlich', label: 'Persönliche Termine' },
                { value: 'telefon', label: 'Telefon' },
                { value: 'email', label: 'E-Mail' },
                { value: 'video', label: 'Videokonferenz' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Gegnerische Partei">
            <FormRadioGroup
              name="opposingParty"
              value={formData.opposingParty || ''}
              onChange={value => handleInputChange('opposingParty', value)}
              options={[
                { value: 'privatperson', label: 'Privatperson' },
                { value: 'unternehmen', label: 'Unternehmen' },
                { value: 'versicherung', label: 'Versicherung' },
                { value: 'behörde', label: 'Behörde/Amt' },
                { value: 'unbekannt', label: 'Noch unbekannt' },
              ]}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Rechtsberatung" formData={formData} />
    </div>
  );
};

export default RechtsberatungForm;
