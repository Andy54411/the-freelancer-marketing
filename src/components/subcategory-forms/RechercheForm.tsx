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

interface RechercheData {
  subcategory: string;
  researchType: string;
  topic: string;
  depth: string;
  timeframe: string;
  sources: string[];
  format: string;
  language: string;
  specialFocus: string;
  description?: string;
}

interface RechercheFormProps {
  data: RechercheData;
  onDataChange: (data: RechercheData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const RechercheForm: React.FC<RechercheFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<RechercheData>(data);

  const researchTypeOptions = [
    { value: 'akademisch', label: 'Akademische Recherche' },
    { value: 'markt', label: 'Marktrecherche' },
    { value: 'wettbewerb', label: 'Wettbewerbsrecherche' },
    { value: 'trend', label: 'Trendrecherche' },
    { value: 'hintergrund', label: 'Hintergrundrecherche' },
    { value: 'medien', label: 'Medienrecherche' },
    { value: 'fakten', label: 'Faktenchecking' },
    { value: 'rechtlich', label: 'Rechtliche Recherche' },
    { value: 'literatur', label: 'Literaturrecherche' },
    { value: 'historisch', label: 'Historische Recherche' },
    { value: 'patent', label: 'Patentrecherche' },
    { value: 'statistisch', label: 'Statistische Recherche' },
    { value: 'andere', label: 'Andere' },
  ];

  const depthOptions = [
    { value: 'oberflächlich', label: 'Oberflächlich (Überblick)' },
    { value: 'standard', label: 'Standard (fundierte Informationen)' },
    { value: 'detailliert', label: 'Detailliert (umfassende Analyse)' },
    { value: 'tiefgehend', label: 'Tiefgehend (wissenschaftlich)' },
  ];

  const timeframeOptions = [
    { value: 'dringend', label: 'Dringend (< 24 Stunden)' },
    { value: 'kurzfristig', label: 'Kurzfristig (1-3 Tage)' },
    { value: 'mittelfristig', label: 'Mittelfristig (3-7 Tage)' },
    { value: 'langfristig', label: 'Langfristig (> 1 Woche)' },
  ];

  const sourcesOptions = [
    { value: 'online', label: 'Online-Quellen' },
    { value: 'wissenschaftlich', label: 'Wissenschaftliche Publikationen' },
    { value: 'bücher', label: 'Bücher/Literatur' },
    { value: 'zeitschriften', label: 'Zeitschriften/Magazine' },
    { value: 'zeitungen', label: 'Zeitungen/Pressearchive' },
    { value: 'datenbanken', label: 'Datenbanken' },
    { value: 'interviews', label: 'Interviews/Expertenmeinungen' },
    { value: 'statistiken', label: 'Statistiken/Daten' },
    { value: 'social_media', label: 'Social Media' },
    { value: 'umfragen', label: 'Umfragen/Studien' },
    { value: 'archive', label: 'Archive/historische Quellen' },
    { value: 'andere', label: 'Andere' },
  ];

  const formatOptions = [
    { value: 'text', label: 'Textdokument' },
    { value: 'präsentation', label: 'Präsentation' },
    { value: 'tabelle', label: 'Tabelle/Datensammlung' },
    { value: 'zusammenfassung', label: 'Kurze Zusammenfassung' },
    { value: 'analyse', label: 'Ausführliche Analyse' },
    { value: 'liste', label: 'Auflistung/Liste' },
    { value: 'bericht', label: 'Formeller Bericht' },
    { value: 'rohdaten', label: 'Rohdaten/Quellensammlung' },
    { value: 'andere', label: 'Andere' },
  ];

  const languageOptions = [
    { value: 'deutsch', label: 'Deutsch' },
    { value: 'englisch', label: 'Englisch' },
    { value: 'französisch', label: 'Französisch' },
    { value: 'spanisch', label: 'Spanisch' },
    { value: 'italienisch', label: 'Italienisch' },
    { value: 'mehrsprachig', label: 'Mehrsprachig' },
    { value: 'andere', label: 'Andere' },
  ];

  useEffect(() => {
    onDataChange(formData);
  }, [formData, onDataChange]);

  const handleChange = (field: keyof RechercheData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const isValid = !!(
      formData.researchType &&
      formData.topic &&
      formData.depth &&
      formData.timeframe
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(formData.researchType && formData.topic && formData.depth && formData.timeframe);
  };

  return (
    <div className="space-y-6">
      <FormField label="Art der Recherche" required>
        <FormSelect
          value={formData.researchType}
          onChange={value => handleChange('researchType', value)}
          options={researchTypeOptions}
        />
      </FormField>

      <FormField label="Thema/Fragestellung" required>
        <FormInput
          value={formData.topic || ''}
          onChange={value => handleChange('topic', value.toString())}
          placeholder="z.B. 'Marktentwicklung im Bereich XY', 'Geschichte der Stadt Z', etc."
        />
      </FormField>

      <FormField label="Gewünschte Recherchetiefe" required>
        <FormSelect
          value={formData.depth}
          onChange={value => handleChange('depth', value)}
          options={depthOptions}
        />
      </FormField>

      <FormField label="Zeitrahmen" required>
        <FormSelect
          value={formData.timeframe}
          onChange={value => handleChange('timeframe', value)}
          options={timeframeOptions}
        />
      </FormField>

      <FormField label="Bevorzugte Quellen">
        <FormCheckboxGroup
          value={formData.sources || []}
          onChange={value => handleChange('sources', value)}
          options={sourcesOptions}
        />
      </FormField>

      <FormField label="Gewünschtes Format der Ergebnisse">
        <FormSelect
          value={formData.format || ''}
          onChange={value => handleChange('format', value)}
          options={formatOptions}
        />
      </FormField>

      <FormField label="Sprache">
        <FormSelect
          value={formData.language || ''}
          onChange={value => handleChange('language', value)}
          options={languageOptions}
        />
      </FormField>

      <FormField label="Besonderer Fokus/Schwerpunkt">
        <FormInput
          value={formData.specialFocus || ''}
          onChange={value => handleChange('specialFocus', value.toString())}
          placeholder="z.B. 'Fokus auf Nachhaltigkeit', 'Besonders aktuelle Entwicklungen', etc."
        />
      </FormField>

      <FormField label="Zusätzliche Informationen oder Anforderungen">
        <FormTextarea
          value={formData.description || ''}
          onChange={value => handleChange('description', value)}
          placeholder="Beschreiben Sie weitere Details oder besondere Anforderungen für Ihre Recherche"
        />
      </FormField>

      <FormSubmitButton isValid={isFormValid()} subcategory="Recherche" formData={formData} />
    </div>
  );
}

export default RechercheForm;
