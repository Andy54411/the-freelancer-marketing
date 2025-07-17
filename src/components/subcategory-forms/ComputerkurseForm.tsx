import React, { useState, useEffect } from 'react';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface ComputerkurseData {
  subcategory: string;
  courseType: string;
  level: string;
  format: string;
  duration: string;
  participants: string;
  software: string[];
  goal: string | number;
  location: string;
  description?: string;
}

interface ComputerkurseFormProps {
  data: ComputerkurseData;
  onDataChange: (data: ComputerkurseData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const ComputerkurseForm: React.FC<ComputerkurseFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<ComputerkurseData>(data);

  const courseTypeOptions = [
    { value: 'office', label: 'Office-Programme (Word, Excel, PowerPoint, etc.)' },
    { value: 'internet', label: 'Internet & E-Mail' },
    { value: 'betriebssysteme', label: 'Betriebssysteme (Windows, macOS, Linux)' },
    { value: 'programmierung', label: 'Programmierung' },
    { value: 'webdesign', label: 'Webdesign & Webentwicklung' },
    { value: 'grafikdesign', label: 'Grafikdesign & Bildbearbeitung' },
    { value: 'videobearbeitung', label: 'Videobearbeitung' },
    { value: 'datenbanken', label: 'Datenbanken' },
    { value: 'netzwerke', label: 'Netzwerke & IT-Sicherheit' },
    { value: 'cloud', label: 'Cloud-Computing' },
    { value: 'smartphone', label: 'Smartphone & Tablet' },
    { value: 'maßgeschneidert', label: 'Maßgeschneiderter Kurs' },
    { value: 'andere', label: 'Andere' },
  ];

  const levelOptions = [
    { value: 'anfänger', label: 'Anfänger (keine Vorkenntnisse)' },
    { value: 'grundkenntnisse', label: 'Grundkenntnisse vorhanden' },
    { value: 'fortgeschritten', label: 'Fortgeschritten' },
    { value: 'profi', label: 'Profi/Experte' },
    { value: 'gemischt', label: 'Gemischte Gruppe' },
  ];

  const formatOptions = [
    { value: 'einzelunterricht', label: 'Einzelunterricht' },
    { value: 'kleingruppe', label: 'Kleingruppe (2-5 Personen)' },
    { value: 'gruppe', label: 'Gruppe (6-15 Personen)' },
    { value: 'workshop', label: 'Workshop' },
    { value: 'seminar', label: 'Seminar' },
    { value: 'online', label: 'Online-Kurs' },
    { value: 'hybrid', label: 'Hybrid (Online & Präsenz)' },
  ];

  const durationOptions = [
    { value: 'einmalig', label: 'Einmalig (1 Termin)' },
    { value: 'kurz', label: 'Kurzfristig (2-5 Termine)' },
    { value: 'mittel', label: 'Mittelfristig (5-10 Termine)' },
    { value: 'lang', label: 'Langfristig (> 10 Termine)' },
    { value: 'regelmäßig', label: 'Regelmäßig (fortlaufend)' },
    { value: 'intensiv', label: 'Intensivkurs' },
  ];

  const participantsOptions = [
    { value: '1', label: '1 Person' },
    { value: '2-5', label: '2-5 Personen' },
    { value: '6-10', label: '6-10 Personen' },
    { value: '11-20', label: '11-20 Personen' },
    { value: 'über_20', label: 'Über 20 Personen' },
  ];

  const softwareOptions = [
    { value: 'word', label: 'Microsoft Word' },
    { value: 'excel', label: 'Microsoft Excel' },
    { value: 'powerpoint', label: 'Microsoft PowerPoint' },
    { value: 'outlook', label: 'Microsoft Outlook' },
    { value: 'access', label: 'Microsoft Access' },
    { value: 'google_docs', label: 'Google Docs/Sheets' },
    { value: 'photoshop', label: 'Adobe Photoshop' },
    { value: 'illustrator', label: 'Adobe Illustrator' },
    { value: 'indesign', label: 'Adobe InDesign' },
    { value: 'premiere', label: 'Adobe Premiere Pro' },
    { value: 'aftereffects', label: 'Adobe After Effects' },
    { value: 'wordpress', label: 'WordPress' },
    { value: 'html_css', label: 'HTML/CSS' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'sql', label: 'SQL' },
    { value: 'andere', label: 'Andere' },
  ];

  const locationOptions = [
    { value: 'beim_kunden', label: 'Bei mir/beim Kunden' },
    { value: 'beim_trainer', label: 'Beim Trainer' },
    { value: 'schulungsraum', label: 'In einem Schulungsraum' },
    { value: 'online', label: 'Online' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  useEffect(() => {
    onDataChange(formData);
  }, [formData, onDataChange]);

  const handleChange = (field: keyof ComputerkurseData, value: string | string[] | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const isValid = !!(
      formData.courseType &&
      formData.level &&
      formData.format &&
      formData.duration &&
      formData.participants
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <FormField label="Art des Computerkurses" required>
        <FormSelect
          value={formData.courseType}
          onChange={value => handleChange('courseType', value)}
          options={courseTypeOptions}
        />
      </FormField>

      <FormField label="Niveau/Level" required>
        <FormSelect
          value={formData.level}
          onChange={value => handleChange('level', value)}
          options={levelOptions}
        />
      </FormField>

      <FormField label="Format des Kurses" required>
        <FormSelect
          value={formData.format}
          onChange={value => handleChange('format', value)}
          options={formatOptions}
        />
      </FormField>

      <FormField label="Dauer/Umfang des Kurses" required>
        <FormSelect
          value={formData.duration}
          onChange={value => handleChange('duration', value)}
          options={durationOptions}
        />
      </FormField>

      <FormField label="Anzahl der Teilnehmer" required>
        <FormSelect
          value={formData.participants}
          onChange={value => handleChange('participants', value)}
          options={participantsOptions}
        />
      </FormField>

      <FormField label="Software/Programme (falls zutreffend)">
        <FormCheckboxGroup
          value={formData.software || []}
          onChange={value => handleChange('software', value)}
          options={softwareOptions}
        />
      </FormField>

      <FormField label="Ziel des Kurses">
        <FormInput
          value={formData.goal || ''}
          onChange={value => handleChange('goal', value)}
          placeholder="z.B. Grundkenntnisse erwerben, Effizienz steigern, etc."
        />
      </FormField>

      <FormField label="Gewünschter Ort/Durchführung">
        <FormSelect
          value={formData.location || ''}
          onChange={value => handleChange('location', value)}
          options={locationOptions}
        />
      </FormField>

      <FormField label="Zusätzliche Informationen oder Anforderungen">
        <FormTextarea
          value={formData.description || ''}
          onChange={value => handleChange('description', value)}
          placeholder="Beschreiben Sie weitere Details, spezifische Themen oder besondere Anforderungen für Ihren Computerkurs"
        />
      </FormField>
    </div>
  );
};

export default ComputerkurseForm;
