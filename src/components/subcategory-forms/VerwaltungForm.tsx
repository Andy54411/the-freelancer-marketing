import React, { useState, useEffect } from 'react';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';

interface VerwaltungData {
  subcategory: string;
  administrationType: string;
  scope: string[];
  duration: string;
  frequency: string;
  software: string[];
  remote: boolean;
  languages: string[];
  industry: string;
  dataVolume: string;
  description?: string;
}

interface VerwaltungFormProps {
  data: VerwaltungData;
  onDataChange: (data: VerwaltungData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const VerwaltungForm: React.FC<VerwaltungFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<VerwaltungData>(data);

  const administrationTypeOptions = [
    { value: 'buero', label: 'Büroverwaltung' },
    { value: 'dokumenten', label: 'Dokumentenverwaltung' },
    { value: 'personal', label: 'Personalverwaltung' },
    { value: 'projekt', label: 'Projektverwaltung' },
    { value: 'finanzen', label: 'Finanzverwaltung' },
    { value: 'dateneingabe', label: 'Dateneingabe' },
    { value: 'termin', label: 'Terminverwaltung' },
    { value: 'kundenservice', label: 'Kundenservice/Anfragenbearbeitung' },
    { value: 'andere', label: 'Andere' },
  ];

  const scopeOptions = [
    { value: 'post', label: 'Post- und E-Mailbearbeitung' },
    { value: 'ablage', label: 'Ablage und Archivierung' },
    { value: 'korrespondenz', label: 'Korrespondenz' },
    { value: 'termine', label: 'Terminkoordination' },
    { value: 'reiseplanung', label: 'Reiseplanung' },
    { value: 'rechnungen', label: 'Rechnungsstellung' },
    { value: 'dateneingabe', label: 'Dateneingabe und -pflege' },
    { value: 'berichte', label: 'Berichte und Protokolle' },
    { value: 'personal', label: 'Personalakten' },
    { value: 'vertraege', label: 'Verträge und Dokumentation' },
    { value: 'kundenbetreuung', label: 'Kundenbetreuung' },
    { value: 'lieferantenmanagement', label: 'Lieferantenmanagement' },
    { value: 'andere', label: 'Andere' },
  ];

  const durationOptions = [
    { value: 'kurzfristig', label: 'Kurzfristig (bis zu 1 Monat)' },
    { value: 'mittelfristig', label: 'Mittelfristig (1-6 Monate)' },
    { value: 'langfristig', label: 'Langfristig (mehr als 6 Monate)' },
    { value: 'dauerhaft', label: 'Dauerhaft' },
    { value: 'einmalig', label: 'Einmalig' },
  ];

  const frequencyOptions = [
    { value: 'taeglich', label: 'Täglich' },
    { value: 'mehrmals_woche', label: 'Mehrmals pro Woche' },
    { value: 'woechentlich', label: 'Wöchentlich' },
    { value: 'monatlich', label: 'Monatlich' },
    { value: 'regelmaessig', label: 'Regelmäßig nach Vereinbarung' },
    { value: 'nach_bedarf', label: 'Nach Bedarf' },
    { value: 'einmalig', label: 'Einmalig' },
  ];

  const softwareOptions = [
    { value: 'ms_office', label: 'Microsoft Office (Word, Excel, etc.)' },
    { value: 'google_workspace', label: 'Google Workspace (Docs, Sheets, etc.)' },
    { value: 'crm', label: 'CRM-Systeme (z.B. Salesforce, HubSpot)' },
    { value: 'erp', label: 'ERP-Systeme (z.B. SAP, Oracle)' },
    { value: 'buchhaltung', label: 'Buchhaltungssoftware (z.B. DATEV, Lexware)' },
    { value: 'projektmanagement', label: 'Projektmanagement-Tools (z.B. Asana, Trello)' },
    { value: 'dokumentenmanagement', label: 'Dokumentenmanagement-Systeme' },
    { value: 'andere', label: 'Andere' },
    { value: 'keine', label: 'Keine speziellen Programme erforderlich' },
  ];

  const remoteOptions = [
    { value: 'true', label: 'Ja, Remote-Arbeit ist möglich' },
    { value: 'false', label: 'Nein, Präsenz vor Ort erforderlich' },
  ];

  const languageOptions = [
    { value: 'deutsch', label: 'Deutsch' },
    { value: 'englisch', label: 'Englisch' },
    { value: 'franzoesisch', label: 'Französisch' },
    { value: 'spanisch', label: 'Spanisch' },
    { value: 'italienisch', label: 'Italienisch' },
    { value: 'andere', label: 'Andere' },
  ];

  const industryOptions = [
    { value: 'dienstleistung', label: 'Dienstleistung' },
    { value: 'handel', label: 'Handel' },
    { value: 'produktion', label: 'Produktion/Fertigung' },
    { value: 'it', label: 'IT/Technologie' },
    { value: 'gesundheit', label: 'Gesundheitswesen' },
    { value: 'finanzen', label: 'Finanzen/Versicherungen' },
    { value: 'bildung', label: 'Bildung' },
    { value: 'immobilien', label: 'Immobilien' },
    { value: 'oeffentlicher_dienst', label: 'Öffentlicher Dienst' },
    { value: 'non_profit', label: 'Non-Profit' },
    { value: 'andere', label: 'Andere' },
    { value: 'privat', label: 'Privatperson' },
  ];

  const dataVolumeOptions = [
    { value: 'gering', label: 'Gering (einzelne Dokumente/Vorgänge)' },
    { value: 'mittel', label: 'Mittel (regelmäßige Bearbeitung)' },
    { value: 'hoch', label: 'Hoch (umfangreiche Datensätze)' },
    { value: 'sehr_hoch', label: 'Sehr hoch (komplexe Datenverwaltung)' },
  ];

  useEffect(() => {
    onDataChange(formData);
  }, [formData, onDataChange]);

  const handleChange = (field: keyof VerwaltungData, value: string | string[] | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const isValid = !!(
      formData.administrationType &&
      formData.scope &&
      formData.scope.length > 0 &&
      formData.duration &&
      formData.frequency
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.administrationType &&
      formData.scope &&
      formData.scope.length > 0 &&
      formData.duration &&
      formData.frequency
    );
  };

  return (
    <div className="space-y-6">
      <FormField label="Art der Verwaltungstätigkeit" required>
        <FormSelect
          value={formData.administrationType}
          onChange={value => handleChange('administrationType', value)}
          options={administrationTypeOptions}
        />
      </FormField>

      <FormField label="Umfang der Aufgaben" required>
        <FormCheckboxGroup
          value={formData.scope || []}
          onChange={value => handleChange('scope', value)}
          options={scopeOptions}
        />
      </FormField>

      <FormField label="Dauer des Auftrags" required>
        <FormSelect
          value={formData.duration}
          onChange={value => handleChange('duration', value)}
          options={durationOptions}
        />
      </FormField>

      <FormField label="Häufigkeit" required>
        <FormSelect
          value={formData.frequency}
          onChange={value => handleChange('frequency', value)}
          options={frequencyOptions}
        />
      </FormField>

      <FormField label="Benötigte Software/Programme">
        <FormCheckboxGroup
          value={formData.software || []}
          onChange={value => handleChange('software', value)}
          options={softwareOptions}
        />
      </FormField>

      <FormField label="Remote-Arbeit möglich?">
        <FormRadioGroup
          name="remote"
          value={formData.remote ? 'true' : 'false'}
          onChange={value => handleChange('remote', value === 'true')}
          options={remoteOptions}
        />
      </FormField>

      <FormField label="Benötigte Sprachkenntnisse">
        <FormCheckboxGroup
          value={formData.languages || []}
          onChange={value => handleChange('languages', value)}
          options={languageOptions}
        />
      </FormField>

      <FormField label="Branche">
        <FormSelect
          value={formData.industry || ''}
          onChange={value => handleChange('industry', value)}
          options={industryOptions}
        />
      </FormField>

      <FormField label="Datenvolumen">
        <FormSelect
          value={formData.dataVolume || ''}
          onChange={value => handleChange('dataVolume', value)}
          options={dataVolumeOptions}
        />
      </FormField>

      <FormField label="Detaillierte Aufgabenbeschreibung">
        <FormTextarea
          value={formData.description || ''}
          onChange={value => handleChange('description', value)}
          placeholder="Beschreiben Sie genauer, welche Verwaltungsaufgaben zu erledigen sind, besondere Anforderungen oder sonstige wichtige Informationen."
        />
      </FormField>

      <FormSubmitButton isValid={isFormValid()} subcategory="Verwaltung" formData={formData} />
    </div>
  );
};

export default VerwaltungForm;
