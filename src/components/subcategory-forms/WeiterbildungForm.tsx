import React, { useState, useEffect } from 'react';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface WeiterbildungData {
  subcategory: string;
  trainingType: string;
  trainingTopic: string;
  targetAudience: string;
  groupSize: string;
  duration: string;
  level: string;
  format: string;
  customization: boolean;
  materials: boolean;
  certificate: boolean;
  description?: string;
}

interface WeiterbildungFormProps {
  data: WeiterbildungData;
  onDataChange: (data: WeiterbildungData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const WeiterbildungForm: React.FC<WeiterbildungFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<WeiterbildungData>(data);

  const trainingTypeOptions = [
    { value: 'fachtraining', label: 'Fachliches Training' },
    { value: 'softskill', label: 'Soft Skills Training' },
    { value: 'führungskräfte', label: 'Führungskräfteentwicklung' },
    { value: 'digitalisierung', label: 'Digitale Kompetenzentwicklung' },
    { value: 'coaching', label: 'Individuelles Coaching' },
    { value: 'teamentwicklung', label: 'Teamentwicklung' },
    { value: 'onboarding', label: 'Onboarding/Einarbeitung' },
    { value: 'compliance', label: 'Compliance Schulung' },
    { value: 'andere', label: 'Andere' },
  ];

  const targetAudienceOptions = [
    { value: 'mitarbeiter', label: 'Mitarbeiter allgemein' },
    { value: 'führungskräfte', label: 'Führungskräfte' },
    { value: 'auszubildende', label: 'Auszubildende/Praktikanten' },
    { value: 'vertrieb', label: 'Vertriebsmitarbeiter' },
    { value: 'produktion', label: 'Produktionsmitarbeiter' },
    { value: 'it', label: 'IT-Mitarbeiter' },
    { value: 'hr', label: 'Personalabteilung' },
    { value: 'kundenservice', label: 'Kundenservicemitarbeiter' },
    { value: 'privatpersonen', label: 'Privatpersonen' },
    { value: 'andere', label: 'Andere' },
  ];

  const groupSizeOptions = [
    { value: 'einzeln', label: 'Einzeltraining' },
    { value: 'klein', label: 'Kleine Gruppe (2-5 Personen)' },
    { value: 'mittel', label: 'Mittlere Gruppe (6-15 Personen)' },
    { value: 'gross', label: 'Große Gruppe (16-30 Personen)' },
    { value: 'sehr_gross', label: 'Sehr große Gruppe (über 30 Personen)' },
  ];

  const durationOptions = [
    { value: 'kurz', label: 'Kurz (bis zu 4 Stunden)' },
    { value: 'halbtag', label: 'Halbtägig' },
    { value: 'ganztag', label: 'Ganztägig' },
    { value: 'mehrtägig', label: 'Mehrtägig' },
    { value: 'mehrwöchig', label: 'Mehrwöchig' },
    { value: 'individuell', label: 'Individuell anpassbar' },
  ];

  const levelOptions = [
    { value: 'anfänger', label: 'Anfänger/Grundlagen' },
    { value: 'fortgeschritten', label: 'Fortgeschritten' },
    { value: 'experte', label: 'Experten/Spezialisierung' },
    { value: 'gemischt', label: 'Gemischte Vorkenntnisse' },
  ];

  const formatOptions = [
    { value: 'präsenz', label: 'Präsenzschulung' },
    { value: 'online_live', label: 'Online-Live-Schulung' },
    { value: 'selbstlernkurs', label: 'Selbstlernkurs' },
    { value: 'blended', label: 'Blended Learning' },
    { value: 'workshop', label: 'Workshop/interaktives Format' },
    { value: 'vortrag', label: 'Vortrag/Präsentation' },
    { value: 'flexibel', label: 'Flexibel anpassbar' },
  ];

  const customizationOptions = [
    { value: 'true', label: 'Ja, maßgeschneiderte Inhalte gewünscht' },
    { value: 'false', label: 'Nein, Standardschulung ausreichend' },
  ];

  const materialsOptions = [
    { value: 'true', label: 'Ja, Schulungsunterlagen gewünscht' },
    { value: 'false', label: 'Nein, keine Unterlagen benötigt' },
  ];

  const certificateOptions = [
    { value: 'true', label: 'Ja, Teilnahmebescheinigung/Zertifikat gewünscht' },
    { value: 'false', label: 'Nein, kein Zertifikat benötigt' },
  ];

  useEffect(() => {
    onDataChange(formData);
  }, [formData, onDataChange]);

  const handleChange = (field: keyof WeiterbildungData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const isValid = !!(
      formData.trainingType &&
      formData.trainingTopic &&
      formData.targetAudience &&
      formData.groupSize &&
      formData.duration
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <FormField label="Art der Weiterbildung" required>
        <FormSelect
          value={formData.trainingType}
          onChange={value => handleChange('trainingType', value)}
          options={trainingTypeOptions}
        />
      </FormField>

      <FormField label="Thema der Weiterbildung" required>
        <FormInput
          value={formData.trainingTopic || ''}
          onChange={value => handleChange('trainingTopic', value.toString())}
          placeholder="z.B. 'MS Excel für Fortgeschrittene', 'Konfliktmanagement', etc."
        />
      </FormField>

      <FormField label="Zielgruppe" required>
        <FormSelect
          value={formData.targetAudience}
          onChange={value => handleChange('targetAudience', value)}
          options={targetAudienceOptions}
        />
      </FormField>

      <FormField label="Gruppengröße" required>
        <FormSelect
          value={formData.groupSize}
          onChange={value => handleChange('groupSize', value)}
          options={groupSizeOptions}
        />
      </FormField>

      <FormField label="Dauer" required>
        <FormSelect
          value={formData.duration}
          onChange={value => handleChange('duration', value)}
          options={durationOptions}
        />
      </FormField>

      <FormField label="Niveau">
        <FormSelect
          value={formData.level || ''}
          onChange={value => handleChange('level', value)}
          options={levelOptions}
        />
      </FormField>

      <FormField label="Format">
        <FormSelect
          value={formData.format || ''}
          onChange={value => handleChange('format', value)}
          options={formatOptions}
        />
      </FormField>

      <FormField label="Individuelle Anpassung der Inhalte?">
        <FormRadioGroup
          name="customization"
          value={formData.customization ? 'true' : 'false'}
          onChange={value => handleChange('customization', value === 'true')}
          options={customizationOptions}
        />
      </FormField>

      <FormField label="Schulungsunterlagen gewünscht?">
        <FormRadioGroup
          name="materials"
          value={formData.materials ? 'true' : 'false'}
          onChange={value => handleChange('materials', value === 'true')}
          options={materialsOptions}
        />
      </FormField>

      <FormField label="Teilnahmezertifikat gewünscht?">
        <FormRadioGroup
          name="certificate"
          value={formData.certificate ? 'true' : 'false'}
          onChange={value => handleChange('certificate', value === 'true')}
          options={certificateOptions}
        />
      </FormField>

      <FormField label="Detaillierte Beschreibung der Weiterbildung">
        <FormTextarea
          value={formData.description || ''}
          onChange={value => handleChange('description', value)}
          placeholder="Beschreiben Sie genauer, welche Inhalte vermittelt werden sollen, besondere Anforderungen oder sonstige wichtige Informationen."
        />
      </FormField>
    </div>
  );
};

export default WeiterbildungForm;
