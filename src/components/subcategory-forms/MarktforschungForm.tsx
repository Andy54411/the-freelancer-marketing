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

interface MarktforschungData {
  subcategory: string;
  researchType: string;
  researchMethod: string[];
  targetGroup: string;
  sampleSize: string;
  location: string;
  duration: string;
  timeline: string;
  deliverables: string[];
  description?: string;
}

interface MarktforschungFormProps {
  data: MarktforschungData;
  onDataChange: (data: MarktforschungData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const MarktforschungForm: React.FC<MarktforschungFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<MarktforschungData>(data);

  const researchTypeOptions = [
    { value: 'kundenzufriedenheit', label: 'Kundenzufriedenheitsanalyse' },
    { value: 'konkurrenzanalyse', label: 'Konkurrenz-/Wettbewerbsanalyse' },
    { value: 'produkttest', label: 'Produkttest/-bewertung' },
    { value: 'markteintritt', label: 'Markteintrittsanalyse' },
    { value: 'zielgruppenanalyse', label: 'Zielgruppenanalyse' },
    { value: 'preisanalyse', label: 'Preisanalyse' },
    { value: 'trendforschung', label: 'Trendforschung' },
    { value: 'marktpotenzial', label: 'Marktpotenzialanalyse' },
    { value: 'imageanalyse', label: 'Imageanalyse' },
    { value: 'kaufverhalten', label: 'Kaufverhaltensanalyse' },
    { value: 'werbeeffektivität', label: 'Werbeeffektivitätsmessung' },
    { value: 'andere', label: 'Andere' },
  ];

  const researchMethodOptions = [
    { value: 'umfrage_online', label: 'Online-Umfrage' },
    { value: 'umfrage_telefon', label: 'Telefonumfrage' },
    { value: 'umfrage_persönlich', label: 'Persönliche Befragung' },
    { value: 'fokusgruppe', label: 'Fokusgruppe' },
    { value: 'interview', label: 'Tiefeninterview' },
    { value: 'mystery_shopping', label: 'Mystery Shopping' },
    { value: 'beobachtung', label: 'Beobachtungsstudie' },
    { value: 'feldtest', label: 'Feldtest' },
    { value: 'panel', label: 'Panel-Forschung' },
    { value: 'datenanalyse', label: 'Sekundärdatenanalyse' },
    { value: 'desk_research', label: 'Desk Research' },
    { value: 'social_media', label: 'Social Media Analyse' },
    { value: 'andere', label: 'Andere' },
  ];

  const targetGroupOptions = [
    { value: 'b2c_allgemein', label: 'B2C - Allgemeine Verbraucher' },
    { value: 'b2c_spezifisch', label: 'B2C - Spezifische Zielgruppe' },
    { value: 'b2b_allgemein', label: 'B2B - Allgemein' },
    { value: 'b2b_branche', label: 'B2B - Spezifische Branche' },
    { value: 'mitarbeiter', label: 'Mitarbeiter' },
    { value: 'experten', label: 'Experten/Fachleute' },
    { value: 'partner', label: 'Geschäftspartner' },
    { value: 'andere', label: 'Andere' },
  ];

  const sampleSizeOptions = [
    { value: 'klein', label: 'Klein (< 50 Teilnehmer)' },
    { value: 'mittel', label: 'Mittel (50-200 Teilnehmer)' },
    { value: 'gross', label: 'Groß (200-1000 Teilnehmer)' },
    { value: 'sehr_gross', label: 'Sehr groß (> 1000 Teilnehmer)' },
  ];

  const locationOptions = [
    { value: 'lokal', label: 'Lokal (eine Stadt/Region)' },
    { value: 'regional', label: 'Regional (mehrere Regionen)' },
    { value: 'national', label: 'National (landesweit)' },
    { value: 'international', label: 'International (mehrere Länder)' },
    { value: 'online', label: 'Online (ortsunabhängig)' },
    { value: 'andere', label: 'Andere' },
  ];

  const durationOptions = [
    { value: 'kurz', label: 'Kurz (< 1 Woche)' },
    { value: 'mittel', label: 'Mittel (1-4 Wochen)' },
    { value: 'lang', label: 'Lang (1-3 Monate)' },
    { value: 'sehr_lang', label: 'Sehr lang (> 3 Monate)' },
    { value: 'fortlaufend', label: 'Fortlaufend/kontinuierlich' },
  ];

  const timelineOptions = [
    { value: 'sofort', label: 'Sofort/Dringend' },
    { value: 'kurzfristig', label: 'Kurzfristig (innerhalb 2 Wochen)' },
    { value: 'mittelfristig', label: 'Mittelfristig (innerhalb 1-2 Monate)' },
    { value: 'langfristig', label: 'Langfristig (> 2 Monate)' },
    { value: 'terminiert', label: 'Zu bestimmtem Termin' },
    { value: 'regelmäßig', label: 'Regelmäßig wiederkehrend' },
  ];

  const deliverablesOptions = [
    { value: 'rohdaten', label: 'Rohdaten' },
    { value: 'bericht', label: 'Ausführlicher Bericht' },
    { value: 'zusammenfassung', label: 'Executive Summary' },
    { value: 'präsentation', label: 'Präsentation' },
    { value: 'dashboard', label: 'Dashboard/Live-Auswertung' },
    { value: 'empfehlungen', label: 'Handlungsempfehlungen' },
    { value: 'grafiken', label: 'Grafiken/Visualisierungen' },
    { value: 'workshop', label: 'Workshop mit Ergebnispräsentation' },
    { value: 'andere', label: 'Andere' },
  ];

  useEffect(() => {
    onDataChange(formData);
  }, [formData, onDataChange]);

  const handleChange = (field: keyof MarktforschungData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const isValid = !!(
      formData.researchType &&
      formData.researchMethod &&
      formData.researchMethod.length > 0 &&
      formData.targetGroup &&
      formData.sampleSize
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.researchType &&
      formData.researchMethod &&
      formData.researchMethod.length > 0 &&
      formData.targetGroup &&
      formData.sampleSize
    );
  };

  return (
    <div className="space-y-6">
      <FormField label="Art der Marktforschung" required>
        <FormSelect
          value={formData.researchType}
          onChange={value => handleChange('researchType', value)}
          options={researchTypeOptions}
        />
      </FormField>

      <FormField label="Bevorzugte Forschungsmethode(n)" required>
        <FormCheckboxGroup
          value={formData.researchMethod || []}
          onChange={value => handleChange('researchMethod', value)}
          options={researchMethodOptions}
        />
      </FormField>

      <FormField label="Zielgruppe" required>
        <FormSelect
          value={formData.targetGroup}
          onChange={value => handleChange('targetGroup', value)}
          options={targetGroupOptions}
        />
      </FormField>

      <FormField label="Stichprobengröße" required>
        <FormSelect
          value={formData.sampleSize}
          onChange={value => handleChange('sampleSize', value)}
          options={sampleSizeOptions}
        />
      </FormField>

      <FormField label="Geographischer Fokus">
        <FormSelect
          value={formData.location || ''}
          onChange={value => handleChange('location', value)}
          options={locationOptions}
        />
      </FormField>

      <FormField label="Dauer der Studie">
        <FormSelect
          value={formData.duration || ''}
          onChange={value => handleChange('duration', value)}
          options={durationOptions}
        />
      </FormField>

      <FormField label="Zeitrahmen für Durchführung">
        <FormSelect
          value={formData.timeline || ''}
          onChange={value => handleChange('timeline', value)}
          options={timelineOptions}
        />
      </FormField>

      <FormField label="Gewünschte Ergebnisformate">
        <FormCheckboxGroup
          value={formData.deliverables || []}
          onChange={value => handleChange('deliverables', value)}
          options={deliverablesOptions}
        />
      </FormField>

      <FormField label="Zusätzliche Informationen oder Anforderungen">
        <FormTextarea
          value={formData.description || ''}
          onChange={value => handleChange('description', value)}
          placeholder="Beschreiben Sie weitere Details oder besondere Anforderungen für Ihre Marktforschung"
        />
      </FormField>

      <FormSubmitButton isValid={isFormValid()} subcategory="Marktforschung" />
    </div>
  );
};

export default MarktforschungForm;
