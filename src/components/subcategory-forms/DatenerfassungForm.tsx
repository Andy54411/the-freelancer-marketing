import React, { useState, useEffect } from 'react';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface DatenerfassungData {
  subcategory: string;
  dataType: string;
  dataVolume: string;
  inputFormat: string[];
  outputFormat: string[];
  timeframe: string;
  accuracy: string;
  confidentiality: string;
  software: string | number;
  description?: string;
}

interface DatenerfassungFormProps {
  data: DatenerfassungData;
  onDataChange: (data: DatenerfassungData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const DatenerfassungForm: React.FC<DatenerfassungFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<DatenerfassungData>(data);

  const dataTypeOptions = [
    { value: 'kundendaten', label: 'Kundendaten' },
    { value: 'produktdaten', label: 'Produktdaten' },
    { value: 'finanzdaten', label: 'Finanzdaten' },
    { value: 'umfragedaten', label: 'Umfragedaten' },
    { value: 'forschungsdaten', label: 'Forschungsdaten' },
    { value: 'inventurdaten', label: 'Inventurdaten' },
    { value: 'texttranskription', label: 'Texttranskription' },
    { value: 'katalogisierung', label: 'Katalogisierung' },
    { value: 'andere', label: 'Andere' },
  ];

  const dataVolumeOptions = [
    { value: 'klein', label: 'Klein (< 100 Datensätze)' },
    { value: 'mittel', label: 'Mittel (100-1000 Datensätze)' },
    { value: 'gross', label: 'Groß (1000-10000 Datensätze)' },
    { value: 'sehr_gross', label: 'Sehr groß (> 10000 Datensätze)' },
  ];

  const inputFormatOptions = [
    { value: 'papier', label: 'Papier/Dokumente' },
    { value: 'excel', label: 'Excel-Dateien' },
    { value: 'pdf', label: 'PDF-Dokumente' },
    { value: 'word', label: 'Word-Dokumente' },
    { value: 'bilder', label: 'Bilder/Scans' },
    { value: 'audio', label: 'Audiodateien' },
    { value: 'fragebögen', label: 'Fragebögen' },
    { value: 'handschriftlich', label: 'Handschriftliche Notizen' },
    { value: 'datenbank', label: 'Bestehende Datenbank' },
    { value: 'andere', label: 'Andere' },
  ];

  const outputFormatOptions = [
    { value: 'excel', label: 'Excel-Tabelle' },
    { value: 'csv', label: 'CSV-Datei' },
    { value: 'datenbank', label: 'Datenbank-Einträge' },
    { value: 'pdf', label: 'PDF-Dokument' },
    { value: 'word', label: 'Word-Dokument' },
    { value: 'bericht', label: 'Formatierter Bericht' },
    { value: 'api', label: 'API/Webservice' },
    { value: 'andere', label: 'Andere' },
  ];

  const timeframeOptions = [
    { value: 'sofort', label: 'Sofort/Dringend' },
    { value: 'kurzfristig', label: 'Kurzfristig (< 1 Woche)' },
    { value: 'mittelfristig', label: 'Mittelfristig (1-4 Wochen)' },
    { value: 'langfristig', label: 'Langfristig (> 1 Monat)' },
    { value: 'dauerhaft', label: 'Dauerhaft (fortlaufender Service)' },
  ];

  const accuracyOptions = [
    { value: 'standard', label: 'Standard' },
    { value: 'hoch', label: 'Hoch' },
    { value: 'maximal', label: 'Maximal' },
  ];

  const confidentialityOptions = [
    { value: 'niedrig', label: 'Niedrig (keine sensiblen Daten)' },
    { value: 'mittel', label: 'Mittel (geschäftliche Daten)' },
    { value: 'hoch', label: 'Hoch (personenbezogene/vertrauliche Daten)' },
    { value: 'sehr_hoch', label: 'Sehr hoch (hochsensible Daten)' },
  ];

  useEffect(() => {
    onDataChange(formData);
  }, [formData, onDataChange]);

  const handleChange = (field: keyof DatenerfassungData, value: string | string[] | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const isValid = !!(
      formData.dataType &&
      formData.dataVolume &&
      formData.inputFormat &&
      formData.inputFormat.length > 0 &&
      formData.outputFormat &&
      formData.outputFormat.length > 0 &&
      formData.timeframe
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <FormField label="Art der Daten" required>
        <FormSelect
          value={formData.dataType}
          onChange={value => handleChange('dataType', value)}
          options={dataTypeOptions}
        />
      </FormField>

      <FormField label="Datenmenge" required>
        <FormSelect
          value={formData.dataVolume}
          onChange={value => handleChange('dataVolume', value)}
          options={dataVolumeOptions}
        />
      </FormField>

      <FormField label="Eingabeformat(e)" required>
        <FormCheckboxGroup
          value={formData.inputFormat || []}
          onChange={value => handleChange('inputFormat', value)}
          options={inputFormatOptions}
        />
      </FormField>

      <FormField label="Gewünschtes Ausgabeformat(e)" required>
        <FormCheckboxGroup
          value={formData.outputFormat || []}
          onChange={value => handleChange('outputFormat', value)}
          options={outputFormatOptions}
        />
      </FormField>

      <FormField label="Zeitrahmen" required>
        <FormSelect
          value={formData.timeframe}
          onChange={value => handleChange('timeframe', value)}
          options={timeframeOptions}
        />
      </FormField>

      <FormField label="Genauigkeitsanforderungen">
        <FormSelect
          value={formData.accuracy || ''}
          onChange={value => handleChange('accuracy', value)}
          options={accuracyOptions}
        />
      </FormField>

      <FormField label="Vertraulichkeit der Daten">
        <FormSelect
          value={formData.confidentiality || ''}
          onChange={value => handleChange('confidentiality', value)}
          options={confidentialityOptions}
        />
      </FormField>

      <FormField label="Spezifische Software für die Datenerfassung">
        <FormInput
          value={formData.software || ''}
          onChange={value => handleChange('software', value)}
          placeholder="z.B. Microsoft Excel, SPSS, spezialisierte Software, etc."
        />
      </FormField>

      <FormField label="Zusätzliche Informationen oder Anforderungen">
        <FormTextarea
          value={formData.description || ''}
          onChange={value => handleChange('description', value)}
          placeholder="Beschreiben Sie weitere Details oder besondere Anforderungen für Ihre Datenerfassung"
        />
      </FormField>
    </div>
  );
};

export default DatenerfassungForm;
