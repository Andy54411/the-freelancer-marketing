import React, { useState, useEffect } from 'react';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface QualitätskontrolleData {
  subcategory: string;
  controlType: string;
  industry: string;
  scope: string;
  standards: string[];
  frequency: string;
  documentation: string;
  implementation: boolean;
  methodology: string;
  description?: string;
}

interface QualitätskontrolleFormProps {
  data: QualitätskontrolleData;
  onDataChange: (data: QualitätskontrolleData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const QualitätskontrolleForm: React.FC<QualitätskontrolleFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<QualitätskontrolleData>(data);

  const controlTypeOptions = [
    { value: 'produktqualität', label: 'Produktqualitätskontrolle' },
    { value: 'prozessqualität', label: 'Prozessqualitätskontrolle' },
    { value: 'servicequalität', label: 'Servicequalitätskontrolle' },
    { value: 'systemqualität', label: 'Qualitätsmanagementsysteme' },
    { value: 'audit', label: 'Qualitätsaudit' },
    { value: 'konformität', label: 'Konformitätsprüfung' },
    { value: 'lieferanten', label: 'Lieferantenqualifikation' },
    { value: 'fehleranalyse', label: 'Fehleranalyse' },
    { value: 'zertifizierung', label: 'Zertifizierungsvorbereitung' },
    { value: 'andere', label: 'Andere' },
  ];

  const industryOptions = [
    { value: 'produktion', label: 'Produktion/Fertigung' },
    { value: 'lebensmittel', label: 'Lebensmittelindustrie' },
    { value: 'pharma', label: 'Pharma/Medizintechnik' },
    { value: 'automobil', label: 'Automobilindustrie' },
    { value: 'chemie', label: 'Chemische Industrie' },
    { value: 'elektronik', label: 'Elektronik/Elektrotechnik' },
    { value: 'it', label: 'IT/Software' },
    { value: 'dienstleistung', label: 'Dienstleistungssektor' },
    { value: 'handel', label: 'Handel/Logistik' },
    { value: 'bau', label: 'Bauwesen/Handwerk' },
    { value: 'gesundheit', label: 'Gesundheitswesen' },
    { value: 'andere', label: 'Andere' },
  ];

  const scopeOptions = [
    { value: 'eingangskontrolle', label: 'Eingangskontrolle' },
    { value: 'prozesskontrolle', label: 'Prozesskontrolle' },
    { value: 'endkontrolle', label: 'Endkontrolle' },
    { value: 'stichproben', label: 'Stichprobenprüfung' },
    { value: 'vollprüfung', label: 'Vollständige Prüfung' },
    { value: 'systemprüfung', label: 'Systembewertung' },
    { value: 'dokumentenprüfung', label: 'Dokumentenprüfung' },
    { value: 'prozessauditing', label: 'Prozessauditing' },
    { value: 'andere', label: 'Andere' },
  ];

  const standardsOptions = [
    { value: 'iso9001', label: 'ISO 9001' },
    { value: 'iso14001', label: 'ISO 14001' },
    { value: 'iso13485', label: 'ISO 13485 (Medizinprodukte)' },
    { value: 'iatf16949', label: 'IATF 16949 (Automobil)' },
    { value: 'haccp', label: 'HACCP (Lebensmittel)' },
    { value: 'gmp', label: 'GMP (Good Manufacturing Practice)' },
    { value: 'fda', label: 'FDA-Anforderungen' },
    { value: 'ce', label: 'CE-Kennzeichnung' },
    { value: 'interne', label: 'Interne Standards' },
    { value: 'branchenspezifisch', label: 'Branchenspezifische Standards' },
    { value: 'andere', label: 'Andere' },
  ];

  const frequencyOptions = [
    { value: 'einmalig', label: 'Einmalig' },
    { value: 'regelmäßig', label: 'Regelmäßig (z.B. monatlich)' },
    { value: 'kontinuierlich', label: 'Kontinuierlich' },
    { value: 'bei_bedarf', label: 'Bei Bedarf/nach Anfrage' },
    { value: 'zertifizierung', label: 'Im Rahmen einer Zertifizierung' },
    { value: 'audit', label: 'Im Rahmen eines Audits' },
  ];

  const documentationOptions = [
    { value: 'bericht', label: 'Standardbericht' },
    { value: 'detailliert', label: 'Detaillierter Bericht mit Analyse' },
    { value: 'checkliste', label: 'Checklisten/Protokolle' },
    { value: 'dashboard', label: 'Dashboard/Kennzahlen' },
    { value: 'audit', label: 'Auditbericht' },
    { value: 'präsentation', label: 'Präsentation der Ergebnisse' },
    { value: 'konformitätserklärung', label: 'Konformitätserklärung' },
    { value: 'andere', label: 'Andere' },
  ];

  const implementationOptions = [
    { value: 'true', label: 'Ja, Umsetzungsunterstützung gewünscht' },
    { value: 'false', label: 'Nein, nur Kontrolle/Bewertung' },
  ];

  const methodologyOptions = [
    { value: 'statistische', label: 'Statistische Methoden' },
    { value: 'sensorische', label: 'Sensorische Prüfung' },
    { value: 'messtechnisch', label: 'Messtechnische Prüfung' },
    { value: 'audit', label: 'Auditverfahren' },
    { value: 'fehleranalyse', label: 'Fehleranalyse-Methoden' },
    { value: 'prozessoptimierung', label: 'Prozessoptimierungsmethoden' },
    { value: 'laboranalyse', label: 'Laboranalysen' },
    { value: 'kundenfeedback', label: 'Kundenfeedback-Analyse' },
    { value: 'andere', label: 'Andere' },
  ];

  useEffect(() => {
    onDataChange(formData);
  }, [formData, onDataChange]);

  const handleChange = (
    field: keyof QualitätskontrolleData,
    value: string | string[] | boolean
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const isValid = !!(formData.controlType && formData.industry && formData.scope);
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <FormField label="Art der Qualitätskontrolle" required>
        <FormSelect
          value={formData.controlType}
          onChange={value => handleChange('controlType', value)}
          options={controlTypeOptions}
        />
      </FormField>

      <FormField label="Branche/Sektor" required>
        <FormSelect
          value={formData.industry}
          onChange={value => handleChange('industry', value)}
          options={industryOptions}
        />
      </FormField>

      <FormField label="Umfang/Bereich der Kontrolle" required>
        <FormSelect
          value={formData.scope}
          onChange={value => handleChange('scope', value)}
          options={scopeOptions}
        />
      </FormField>

      <FormField label="Relevante Standards/Normen">
        <FormCheckboxGroup
          value={formData.standards || []}
          onChange={value => handleChange('standards', value)}
          options={standardsOptions}
        />
      </FormField>

      <FormField label="Häufigkeit/Regelmäßigkeit">
        <FormSelect
          value={formData.frequency || ''}
          onChange={value => handleChange('frequency', value)}
          options={frequencyOptions}
        />
      </FormField>

      <FormField label="Gewünschte Dokumentation/Berichterstattung">
        <FormSelect
          value={formData.documentation || ''}
          onChange={value => handleChange('documentation', value)}
          options={documentationOptions}
        />
      </FormField>

      <FormField label="Unterstützung bei der Umsetzung von Verbesserungen?">
        <FormRadioGroup
          name="implementation"
          value={formData.implementation ? 'true' : 'false'}
          onChange={value => handleChange('implementation', value === 'true')}
          options={implementationOptions}
        />
      </FormField>

      <FormField label="Bevorzugte Prüfmethode/Methodik">
        <FormSelect
          value={formData.methodology || ''}
          onChange={value => handleChange('methodology', value)}
          options={methodologyOptions}
        />
      </FormField>

      <FormField label="Zusätzliche Informationen oder Anforderungen">
        <FormTextarea
          value={formData.description || ''}
          onChange={value => handleChange('description', value)}
          placeholder="Beschreiben Sie weitere Details oder besondere Anforderungen für Ihre Qualitätskontrolle"
        />
      </FormField>
    </div>
  );
};

export default QualitätskontrolleForm;
