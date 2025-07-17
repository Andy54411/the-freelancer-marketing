import React, { useState, useEffect } from 'react';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface TierarztAssistenzData {
  subcategory: string;
  assistanceType: string;
  animalTypes: string[];
  scheduleType: string;
  duration: string;
  experience: string;
  tasks: string[];
  specialSkills: string[];
  location: string;
  description?: string;
}

interface TierarztAssistenzFormProps {
  data: TierarztAssistenzData;
  onDataChange: (data: TierarztAssistenzData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const TierarztAssistenzForm: React.FC<TierarztAssistenzFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<TierarztAssistenzData>(data);

  const assistanceTypeOptions = [
    { value: 'praxisassistenz', label: 'Tierarztpraxisassistenz' },
    { value: 'op_assistenz', label: 'OP-Assistenz' },
    { value: 'empfang', label: 'Empfang/Anmeldung' },
    { value: 'tierpflege', label: 'Tierpflege/Nachsorge' },
    { value: 'labor', label: 'Laborassistenz' },
    { value: 'mobile_assistenz', label: 'Mobile Tierarztassistenz' },
    { value: 'admin', label: 'Administrative Unterstützung' },
    { value: 'andere', label: 'Andere' },
  ];

  const animalTypeOptions = [
    { value: 'kleintiere', label: 'Kleintiere (Hunde, Katzen)' },
    { value: 'nagetiere', label: 'Nagetiere (Kaninchen, Meerschweinchen, etc.)' },
    { value: 'voegel', label: 'Vögel' },
    { value: 'reptilien', label: 'Reptilien' },
    { value: 'grosstiere', label: 'Großtiere (Pferde, Kühe, etc.)' },
    { value: 'nutztiere', label: 'Nutztiere' },
    { value: 'exotische_tiere', label: 'Exotische Tiere' },
    { value: 'alle', label: 'Alle Tierarten' },
  ];

  const scheduleTypeOptions = [
    { value: 'regelmaessig', label: 'Regelmäßig (feste Tage/Zeiten)' },
    { value: 'projekt', label: 'Projektbasiert (zeitlich begrenzt)' },
    { value: 'aushilfe', label: 'Aushilfe (nach Bedarf)' },
    { value: 'vertretung', label: 'Vertretung (Urlaubs-/Krankheitsvertretung)' },
    { value: 'notdienst', label: 'Notdienst/Bereitschaftsdienst' },
  ];

  const durationOptions = [
    { value: 'kurzfristig', label: 'Kurzfristig (bis zu 1 Monat)' },
    { value: 'mittelfristig', label: 'Mittelfristig (1-6 Monate)' },
    { value: 'langfristig', label: 'Langfristig (mehr als 6 Monate)' },
    { value: 'dauerhaft', label: 'Dauerhaft' },
  ];

  const experienceOptions = [
    { value: 'keine', label: 'Keine Erfahrung notwendig' },
    { value: 'grundlegend', label: 'Grundlegende Erfahrung' },
    { value: 'fortgeschritten', label: 'Fortgeschrittene Erfahrung' },
    { value: 'tierfachperson', label: 'Ausbildung als Tierfachperson/TFA' },
  ];

  const taskOptions = [
    { value: 'patientenbetreuung', label: 'Patientenbetreuung' },
    { value: 'instrumente', label: 'Instrumente vorbereiten/reinigen' },
    { value: 'op_assistenz', label: 'OP-Assistenz' },
    { value: 'anmeldung', label: 'Anmeldung/Empfang' },
    { value: 'terminplanung', label: 'Terminplanung' },
    { value: 'reinigung', label: 'Reinigung/Desinfektion' },
    { value: 'medikamente', label: 'Medikamentengabe' },
    { value: 'labor', label: 'Laborarbeiten' },
    { value: 'verwaltung', label: 'Verwaltungsaufgaben' },
    { value: 'beratung', label: 'Kundenberatung' },
    { value: 'andere', label: 'Andere' },
  ];

  const specialSkillOptions = [
    { value: 'narkose', label: 'Narkoseüberwachung' },
    { value: 'roentgen', label: 'Röntgen/Bildgebende Verfahren' },
    { value: 'labordiagnostik', label: 'Labordiagnostik' },
    { value: 'wundversorgung', label: 'Wundversorgung' },
    { value: 'kommunikation', label: 'Kundenkommunikation' },
    { value: 'praxisverwaltung', label: 'Praxisverwaltungssoftware' },
    { value: 'medikation', label: 'Medikationsmanagement' },
    { value: 'notfall', label: 'Notfallversorgung' },
    { value: 'keine', label: 'Keine speziellen Fähigkeiten erforderlich' },
  ];

  const locationOptions = [
    { value: 'praxis', label: 'In der Tierarztpraxis' },
    { value: 'klinik', label: 'In einer Tierklinik' },
    { value: 'mobil', label: 'Mobiler Service (Hausbesuche)' },
    { value: 'farm', label: 'Auf einer Farm/in einem landwirtschaftlichen Betrieb' },
    { value: 'zoo', label: 'In einem Zoo/Tierpark' },
    { value: 'andere', label: 'Anderer Ort' },
  ];

  useEffect(() => {
    onDataChange(formData);
  }, [formData, onDataChange]);

  const handleChange = (field: keyof TierarztAssistenzData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const isValid = !!(
      formData.assistanceType &&
      formData.animalTypes &&
      formData.animalTypes.length > 0 &&
      formData.scheduleType &&
      formData.duration
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <FormField label="Art der Assistenz" required>
        <FormSelect
          value={formData.assistanceType}
          onChange={value => handleChange('assistanceType', value)}
          options={assistanceTypeOptions}
        />
      </FormField>

      <FormField label="Tierarten" required>
        <FormCheckboxGroup
          value={formData.animalTypes || []}
          onChange={value => handleChange('animalTypes', value)}
          options={animalTypeOptions}
        />
      </FormField>

      <FormField label="Zeitplan" required>
        <FormSelect
          value={formData.scheduleType}
          onChange={value => handleChange('scheduleType', value)}
          options={scheduleTypeOptions}
        />
      </FormField>

      <FormField label="Dauer des Einsatzes" required>
        <FormSelect
          value={formData.duration}
          onChange={value => handleChange('duration', value)}
          options={durationOptions}
        />
      </FormField>

      <FormField label="Erforderliche Erfahrung">
        <FormSelect
          value={formData.experience || ''}
          onChange={value => handleChange('experience', value)}
          options={experienceOptions}
        />
      </FormField>

      <FormField label="Aufgaben">
        <FormCheckboxGroup
          value={formData.tasks || []}
          onChange={value => handleChange('tasks', value)}
          options={taskOptions}
        />
      </FormField>

      <FormField label="Spezielle Fähigkeiten">
        <FormCheckboxGroup
          value={formData.specialSkills || []}
          onChange={value => handleChange('specialSkills', value)}
          options={specialSkillOptions}
        />
      </FormField>

      <FormField label="Einsatzort">
        <FormSelect
          value={formData.location || ''}
          onChange={value => handleChange('location', value)}
          options={locationOptions}
        />
      </FormField>

      <FormField label="Weitere Details">
        <FormTextarea
          value={formData.description || ''}
          onChange={value => handleChange('description', value)}
          placeholder="Beschreiben Sie genauer, welche Aufgaben zu erledigen sind, besondere Anforderungen oder sonstige wichtige Informationen."
        />
      </FormField>
    </div>
  );
};

export default TierarztAssistenzForm;
