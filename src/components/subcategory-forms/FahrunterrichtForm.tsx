import React, { useState, useEffect } from 'react';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface FahrunterrichtData {
  subcategory: string;
  licenseType: string;
  experience: string;
  lessonType: string;
  vehicleType: string;
  duration: string;
  frequency: string;
  location: string;
  goal: string;
  description?: string;
}

interface FahrunterrichtFormProps {
  data: FahrunterrichtData;
  onDataChange: (data: FahrunterrichtData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const FahrunterrichtForm: React.FC<FahrunterrichtFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<FahrunterrichtData>(data);

  const licenseTypeOptions = [
    { value: 'pkw', label: 'PKW (Klasse B)' },
    { value: 'motorrad', label: 'Motorrad (Klasse A)' },
    { value: 'lkw', label: 'LKW (Klasse C)' },
    { value: 'bus', label: 'Bus (Klasse D)' },
    { value: 'anhänger', label: 'Anhänger (BE, CE, etc.)' },
    { value: 'traktor', label: 'Traktor/Land- und forstwirtschaftliche Fahrzeuge' },
    { value: 'auffrischung', label: 'Auffrischungsfahrten (bereits Führerschein vorhanden)' },
    { value: 'senioren', label: 'Seniorenfahrtraining' },
    { value: 'andere', label: 'Andere' },
  ];

  const experienceOptions = [
    { value: 'keine', label: 'Keine Erfahrung' },
    { value: 'anfänger', label: 'Anfänger (erste Fahrstunden bereits absolviert)' },
    { value: 'fortgeschritten', label: 'Fortgeschritten (kurz vor der Prüfung)' },
    { value: 'führerscheinbesitzer', label: 'Führerscheinbesitzer (Auffrischung)' },
    { value: 'führerscheinbesitzer_lange', label: 'Führerscheinbesitzer (lange nicht gefahren)' },
    { value: 'ausland', label: 'Führerscheinbesitzer aus dem Ausland' },
  ];

  const lessonTypeOptions = [
    { value: 'standard', label: 'Standard-Fahrstunden' },
    { value: 'intensiv', label: 'Intensivkurs' },
    { value: 'auffrischung', label: 'Auffrischungsfahrten' },
    { value: 'autobahn', label: 'Autobahnfahrten' },
    { value: 'nachtfahrt', label: 'Nachtfahrten' },
    { value: 'überlandfahrt', label: 'Überlandfahrten' },
    { value: 'einparken', label: 'Einparktraining' },
    { value: 'angstbewältigung', label: 'Angstbewältigungstraining' },
    { value: 'sicherheitstraining', label: 'Sicherheitstraining' },
    { value: 'sprachunterstützung', label: 'Mit Sprachunterstützung' },
    { value: 'andere', label: 'Andere' },
  ];

  const vehicleTypeOptions = [
    { value: 'fahrschulfahrzeug', label: 'Fahrschulfahrzeug' },
    { value: 'privatfahrzeug', label: 'Privatfahrzeug des Schülers' },
    { value: 'automatik', label: 'Automatikfahrzeug' },
    { value: 'schaltung', label: 'Fahrzeug mit Schaltung' },
    { value: 'andere', label: 'Andere' },
  ];

  const durationOptions = [
    { value: 'einzelstunde', label: 'Einzelstunde (45-60 Minuten)' },
    { value: 'doppelstunde', label: 'Doppelstunde (90-120 Minuten)' },
    { value: 'halbtag', label: 'Halbtag (3-4 Stunden)' },
    { value: 'ganztag', label: 'Ganztag (Intensivtraining)' },
    { value: 'prüfungsvorbereitung', label: 'Prüfungsvorbereitungsstunde' },
    { value: 'andere', label: 'Andere' },
  ];

  const frequencyOptions = [
    { value: 'einmalig', label: 'Einmalig' },
    { value: 'wöchentlich', label: 'Wöchentlich' },
    { value: 'mehrmals_woche', label: 'Mehrmals pro Woche' },
    { value: 'intensiv', label: 'Intensivkurs (täglich)' },
    { value: 'flexibel', label: 'Flexibel nach Absprache' },
  ];

  const locationOptions = [
    { value: 'stadtgebiet', label: 'Im Stadtgebiet' },
    { value: 'ländlich', label: 'In ländlicher Gegend' },
    { value: 'autobahn', label: 'Auf der Autobahn' },
    { value: 'prüfungsstrecken', label: 'Auf typischen Prüfungsstrecken' },
    { value: 'wohnort', label: 'Ab/bis Wohnort' },
    { value: 'fahrschule', label: 'Ab/bis Fahrschule' },
    { value: 'andere', label: 'Andere' },
  ];

  useEffect(() => {
    onDataChange(formData);
  }, [formData, onDataChange]);

  const handleChange = (field: keyof FahrunterrichtData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const isValid = !!(
      formData.licenseType &&
      formData.experience &&
      formData.lessonType &&
      formData.duration
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <FormField label="Führerscheinklasse/Art des Fahrunterrichts" required>
        <FormSelect
          value={formData.licenseType}
          onChange={value => handleChange('licenseType', value)}
          options={licenseTypeOptions}
        />
      </FormField>

      <FormField label="Erfahrungslevel" required>
        <FormSelect
          value={formData.experience}
          onChange={value => handleChange('experience', value)}
          options={experienceOptions}
        />
      </FormField>

      <FormField label="Art der Fahrstunden" required>
        <FormSelect
          value={formData.lessonType}
          onChange={value => handleChange('lessonType', value)}
          options={lessonTypeOptions}
        />
      </FormField>

      <FormField label="Fahrzeugtyp">
        <FormSelect
          value={formData.vehicleType || ''}
          onChange={value => handleChange('vehicleType', value)}
          options={vehicleTypeOptions}
        />
      </FormField>

      <FormField label="Dauer der Fahrstunden" required>
        <FormSelect
          value={formData.duration}
          onChange={value => handleChange('duration', value)}
          options={durationOptions}
        />
      </FormField>

      <FormField label="Gewünschte Häufigkeit">
        <FormSelect
          value={formData.frequency || ''}
          onChange={value => handleChange('frequency', value)}
          options={frequencyOptions}
        />
      </FormField>

      <FormField label="Bevorzugte Fahrgebiete">
        <FormSelect
          value={formData.location || ''}
          onChange={value => handleChange('location', value)}
          options={locationOptions}
        />
      </FormField>

      <FormField label="Ziel des Fahrunterrichts">
        <FormInput
          value={formData.goal || ''}
          onChange={value => handleChange('goal', value.toString())}
          placeholder="z.B. Führerscheinprüfung bestehen, Sicherheit gewinnen, etc."
        />
      </FormField>

      <FormField label="Zusätzliche Informationen oder Anforderungen">
        <FormTextarea
          value={formData.description || ''}
          onChange={value => handleChange('description', value)}
          placeholder="Beschreiben Sie weitere Details oder besondere Anforderungen für Ihren Fahrunterricht"
        />
      </FormField>
    </div>
  );
};

export default FahrunterrichtForm;
