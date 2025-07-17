import React, { useState, useEffect } from 'react';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface ProjektmanagementData {
  subcategory: string;
  projectType: string;
  industry: string;
  projectSize: string;
  duration: string;
  projectPhase: string;
  tasks: string[];
  tools: string[];
  teamSize: string;
  location: string;
  description?: string;
}

interface ProjektmanagementFormProps {
  data: ProjektmanagementData;
  onDataChange: (data: ProjektmanagementData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const ProjektmanagementForm: React.FC<ProjektmanagementFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<ProjektmanagementData>(data);

  const projectTypeOptions = [
    { value: 'it', label: 'IT/Software-Projekt' },
    { value: 'marketing', label: 'Marketing-Projekt' },
    { value: 'product', label: 'Produktentwicklung' },
    { value: 'event', label: 'Eventplanung' },
    { value: 'construction', label: 'Bauprojekt' },
    { value: 'business', label: 'Geschäftsprozessoptimierung' },
    { value: 'research', label: 'Forschungs-/Entwicklungsprojekt' },
    { value: 'reorganisation', label: 'Reorganisation/Change Management' },
    { value: 'implementation', label: 'Systemimplementierung' },
    { value: 'launch', label: 'Markteinführung/Produktlaunch' },
    { value: 'content', label: 'Content-Projekt' },
    { value: 'andere', label: 'Andere' },
  ];

  const industryOptions = [
    { value: 'it', label: 'IT/Software' },
    { value: 'finance', label: 'Finanzen/Banking' },
    { value: 'manufacturing', label: 'Produktion/Fertigung' },
    { value: 'retail', label: 'Handel/Einzelhandel' },
    { value: 'healthcare', label: 'Gesundheitswesen' },
    { value: 'education', label: 'Bildung/Ausbildung' },
    { value: 'media', label: 'Medien/Entertainment' },
    { value: 'marketing', label: 'Marketing/Werbung' },
    { value: 'construction', label: 'Bauwesen/Immobilien' },
    { value: 'nonprofit', label: 'Non-Profit/NGO' },
    { value: 'public', label: 'Öffentlicher Dienst' },
    { value: 'andere', label: 'Andere' },
  ];

  const projectSizeOptions = [
    { value: 'klein', label: 'Klein (Budget < 10.000€)' },
    { value: 'mittel', label: 'Mittel (Budget 10.000-50.000€)' },
    { value: 'gross', label: 'Groß (Budget 50.000-200.000€)' },
    { value: 'sehr_gross', label: 'Sehr groß (Budget > 200.000€)' },
  ];

  const durationOptions = [
    { value: 'kurz', label: 'Kurzfristig (< 1 Monat)' },
    { value: 'mittel', label: 'Mittelfristig (1-6 Monate)' },
    { value: 'lang', label: 'Langfristig (6-12 Monate)' },
    { value: 'sehr_lang', label: 'Sehr langfristig (> 12 Monate)' },
  ];

  const projectPhaseOptions = [
    { value: 'initiierung', label: 'Initiierung/Konzeption' },
    { value: 'planung', label: 'Planung' },
    { value: 'durchführung', label: 'Durchführung/Umsetzung' },
    { value: 'kontrolle', label: 'Kontrolle/Monitoring' },
    { value: 'abschluss', label: 'Abschluss' },
    { value: 'komplett', label: 'Komplettes Projektmanagement' },
  ];

  const tasksOptions = [
    { value: 'planung', label: 'Projektplanung' },
    { value: 'koordination', label: 'Teamkoordination' },
    { value: 'ressourcen', label: 'Ressourcenmanagement' },
    { value: 'budget', label: 'Budgetmanagement' },
    { value: 'risiko', label: 'Risikomanagement' },
    { value: 'reporting', label: 'Reporting/Dokumentation' },
    { value: 'stakeholder', label: 'Stakeholder-Management' },
    { value: 'qualität', label: 'Qualitätssicherung' },
    { value: 'meetings', label: 'Meeting-Leitung' },
    { value: 'konflikt', label: 'Konfliktmanagement' },
    { value: 'implementation', label: 'Implementationsunterstützung' },
    { value: 'schulung', label: 'Schulung/Training' },
    { value: 'coaching', label: 'Team-Coaching' },
    { value: 'andere', label: 'Andere' },
  ];

  const toolsOptions = [
    { value: 'ms_project', label: 'Microsoft Project' },
    { value: 'jira', label: 'Jira' },
    { value: 'asana', label: 'Asana' },
    { value: 'trello', label: 'Trello' },
    { value: 'monday', label: 'Monday.com' },
    { value: 'basecamp', label: 'Basecamp' },
    { value: 'slack', label: 'Slack' },
    { value: 'teams', label: 'Microsoft Teams' },
    { value: 'excel', label: 'Excel/Spreadsheets' },
    { value: 'gantt', label: 'Gantt-Charts' },
    { value: 'agile', label: 'Agile/Scrum-Tools' },
    { value: 'andere', label: 'Andere' },
  ];

  const teamSizeOptions = [
    { value: 'klein', label: 'Klein (2-5 Personen)' },
    { value: 'mittel', label: 'Mittel (6-15 Personen)' },
    { value: 'gross', label: 'Groß (16-50 Personen)' },
    { value: 'sehr_gross', label: 'Sehr groß (> 50 Personen)' },
  ];

  const locationOptions = [
    { value: 'vor_ort', label: 'Vor Ort beim Kunden' },
    { value: 'remote', label: 'Remote/Virtuell' },
    { value: 'hybrid', label: 'Hybrid (Vor Ort & Remote)' },
    { value: 'flexibel', label: 'Flexibel nach Absprache' },
  ];

  useEffect(() => {
    onDataChange(formData);
  }, [formData, onDataChange]);

  const handleChange = (field: keyof ProjektmanagementData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const isValid = !!(
      formData.projectType &&
      formData.industry &&
      formData.projectSize &&
      formData.duration
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <FormField label="Art des Projekts" required>
        <FormSelect
          value={formData.projectType}
          onChange={value => handleChange('projectType', value)}
          options={projectTypeOptions}
        />
      </FormField>

      <FormField label="Branche" required>
        <FormSelect
          value={formData.industry}
          onChange={value => handleChange('industry', value)}
          options={industryOptions}
        />
      </FormField>

      <FormField label="Projektgröße/Budget" required>
        <FormSelect
          value={formData.projectSize}
          onChange={value => handleChange('projectSize', value)}
          options={projectSizeOptions}
        />
      </FormField>

      <FormField label="Projektdauer" required>
        <FormSelect
          value={formData.duration}
          onChange={value => handleChange('duration', value)}
          options={durationOptions}
        />
      </FormField>

      <FormField label="Projektphase">
        <FormSelect
          value={formData.projectPhase || ''}
          onChange={value => handleChange('projectPhase', value)}
          options={projectPhaseOptions}
        />
      </FormField>

      <FormField label="Aufgabenbereiche">
        <FormCheckboxGroup
          value={formData.tasks || []}
          onChange={value => handleChange('tasks', value)}
          options={tasksOptions}
        />
      </FormField>

      <FormField label="Gewünschte Tools/Software">
        <FormCheckboxGroup
          value={formData.tools || []}
          onChange={value => handleChange('tools', value)}
          options={toolsOptions}
        />
      </FormField>

      <FormField label="Teamgröße">
        <FormSelect
          value={formData.teamSize || ''}
          onChange={value => handleChange('teamSize', value)}
          options={teamSizeOptions}
        />
      </FormField>

      <FormField label="Arbeitsort">
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
          placeholder="Beschreiben Sie weitere Details oder besondere Anforderungen für das Projektmanagement"
        />
      </FormField>
    </div>
  );
};

export default ProjektmanagementForm;
