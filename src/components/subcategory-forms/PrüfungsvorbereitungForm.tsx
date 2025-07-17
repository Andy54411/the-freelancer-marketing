import React, { useState, useEffect } from 'react';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface PrüfungsvorbereitungData {
  subcategory: string;
  examType: string;
  subject: string;
  level: string;
  timeframe: string;
  format: string;
  frequency: string;
  learningMaterials: boolean;
  focusAreas: string;
  description?: string;
}

interface PrüfungsvorbereitungFormProps {
  data: PrüfungsvorbereitungData;
  onDataChange: (data: PrüfungsvorbereitungData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const PrüfungsvorbereitungForm: React.FC<PrüfungsvorbereitungFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<PrüfungsvorbereitungData>(data);

  const examTypeOptions = [
    { value: 'schulprüfung', label: 'Schulprüfung' },
    { value: 'abitur', label: 'Abitur' },
    { value: 'universitätsprüfung', label: 'Universitäts-/Hochschulprüfung' },
    { value: 'ausbildungsprüfung', label: 'Ausbildungsprüfung' },
    { value: 'sprachprüfung', label: 'Sprachprüfung' },
    { value: 'einstellungstest', label: 'Einstellungstest' },
    { value: 'staatsexamen', label: 'Staatsexamen' },
    { value: 'zertifikatsprüfung', label: 'Zertifikatsprüfung' },
    { value: 'nachprüfung', label: 'Nachprüfung' },
    { value: 'andere', label: 'Andere' },
  ];

  const subjectOptions = [
    { value: 'mathematik', label: 'Mathematik' },
    { value: 'deutsch', label: 'Deutsch' },
    { value: 'englisch', label: 'Englisch' },
    { value: 'französisch', label: 'Französisch' },
    { value: 'spanisch', label: 'Spanisch' },
    { value: 'andere_sprache', label: 'Andere Sprache' },
    { value: 'physik', label: 'Physik' },
    { value: 'chemie', label: 'Chemie' },
    { value: 'biologie', label: 'Biologie' },
    { value: 'geschichte', label: 'Geschichte' },
    { value: 'geographie', label: 'Geographie' },
    { value: 'wirtschaft', label: 'Wirtschaft/BWL/VWL' },
    { value: 'informatik', label: 'Informatik' },
    { value: 'jura', label: 'Jura/Rechtswissenschaften' },
    { value: 'medizin', label: 'Medizin' },
    { value: 'psychologie', label: 'Psychologie' },
    { value: 'pädagogik', label: 'Pädagogik' },
    { value: 'politik', label: 'Politik/Sozialwissenschaften' },
    { value: 'andere', label: 'Andere' },
  ];

  const levelOptions = [
    { value: 'grundschule', label: 'Grundschule' },
    { value: 'hauptschule', label: 'Hauptschule' },
    { value: 'realschule', label: 'Realschule' },
    { value: 'gymnasium', label: 'Gymnasium' },
    { value: 'bachelor', label: 'Bachelor-Studium' },
    { value: 'master', label: 'Master-Studium' },
    { value: 'ausbildung', label: 'Berufsausbildung' },
    { value: 'fortbildung', label: 'Fort-/Weiterbildung' },
    { value: 'andere', label: 'Andere' },
  ];

  const timeframeOptions = [
    { value: 'dringend', label: 'Dringend (< 1 Woche)' },
    { value: 'kurzfristig', label: 'Kurzfristig (1-2 Wochen)' },
    { value: 'mittelfristig', label: 'Mittelfristig (2-4 Wochen)' },
    { value: 'langfristig', label: 'Langfristig (> 1 Monat)' },
  ];

  const formatOptions = [
    { value: 'einzelunterricht', label: 'Einzelunterricht' },
    { value: 'kleingruppe', label: 'Kleingruppe (2-5 Personen)' },
    { value: 'lerngruppe', label: 'Lerngruppe (> 5 Personen)' },
    { value: 'online', label: 'Online-Unterricht' },
    { value: 'hybrid', label: 'Hybrid (Online & Präsenz)' },
    { value: 'selbststudium', label: 'Unterstütztes Selbststudium' },
    { value: 'crashkurs', label: 'Crashkurs/Intensivvorbereitung' },
    { value: 'andere', label: 'Andere' },
  ];

  const frequencyOptions = [
    { value: 'einmalig', label: 'Einmalig' },
    { value: 'wöchentlich', label: 'Wöchentlich' },
    { value: 'mehrmals_woche', label: 'Mehrmals pro Woche' },
    { value: 'intensiv', label: 'Intensiv (täglich)' },
    { value: 'nach_bedarf', label: 'Nach Bedarf/flexibel' },
  ];

  const learningMaterialsOptions = [
    { value: 'true', label: 'Ja, Lernmaterialien vorhanden' },
    { value: 'false', label: 'Nein, keine Lernmaterialien vorhanden' },
  ];

  useEffect(() => {
    onDataChange(formData);
  }, [formData, onDataChange]);

  const handleChange = (
    field: keyof PrüfungsvorbereitungData,
    value: string | string[] | boolean
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const isValid = !!(
      formData.examType &&
      formData.subject &&
      formData.level &&
      formData.timeframe
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <FormField label="Art der Prüfung" required>
        <FormSelect
          value={formData.examType}
          onChange={value => handleChange('examType', value)}
          options={examTypeOptions}
        />
      </FormField>

      <FormField label="Fach/Themengebiet" required>
        <FormSelect
          value={formData.subject}
          onChange={value => handleChange('subject', value)}
          options={subjectOptions}
        />
      </FormField>

      <FormField label="Niveau/Bildungsstufe" required>
        <FormSelect
          value={formData.level}
          onChange={value => handleChange('level', value)}
          options={levelOptions}
        />
      </FormField>

      <FormField label="Zeitrahmen bis zur Prüfung" required>
        <FormSelect
          value={formData.timeframe}
          onChange={value => handleChange('timeframe', value)}
          options={timeframeOptions}
        />
      </FormField>

      <FormField label="Format der Vorbereitung">
        <FormSelect
          value={formData.format || ''}
          onChange={value => handleChange('format', value)}
          options={formatOptions}
        />
      </FormField>

      <FormField label="Gewünschte Häufigkeit">
        <FormSelect
          value={formData.frequency || ''}
          onChange={value => handleChange('frequency', value)}
          options={frequencyOptions}
        />
      </FormField>

      <FormField label="Lernmaterialien vorhanden?">
        <FormRadioGroup
          name="learningMaterials"
          value={formData.learningMaterials ? 'true' : 'false'}
          onChange={value => handleChange('learningMaterials', value === 'true')}
          options={learningMaterialsOptions}
        />
      </FormField>

      <FormField label="Schwerpunkte/Problembereiche">
        <FormInput
          value={formData.focusAreas || ''}
          onChange={value => handleChange('focusAreas', value.toString())}
          placeholder="z.B. bestimmte Themen, Schwierigkeiten, spezielle Konzepte"
        />
      </FormField>

      <FormField label="Zusätzliche Informationen oder Anforderungen">
        <FormTextarea
          value={formData.description || ''}
          onChange={value => handleChange('description', value)}
          placeholder="Beschreiben Sie weitere Details oder besondere Anforderungen für Ihre Prüfungsvorbereitung"
        />
      </FormField>
    </div>
  );
};

export default PrüfungsvorbereitungForm;
