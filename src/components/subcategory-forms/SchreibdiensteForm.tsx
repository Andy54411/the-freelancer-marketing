import React, { useState, useEffect } from 'react';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface SchreibdiensteData {
  subcategory: string;
  serviceType: string;
  documentType: string;
  length: string;
  subject: string;
  language: string;
  format: string;
  deadline: string;
  researchRequired: boolean;
  description?: string;
}

interface SchreibdiensteFormProps {
  data: SchreibdiensteData;
  onDataChange: (data: SchreibdiensteData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const SchreibdiensteForm: React.FC<SchreibdiensteFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<SchreibdiensteData>(data);

  const serviceTypeOptions = [
    { value: 'texterstellung', label: 'Texterstellung/Schreiben' },
    { value: 'korrektur', label: 'Korrekturlesen/Lektorat' },
    { value: 'transkription', label: 'Transkription' },
    { value: 'übersetzung', label: 'Übersetzung' },
    { value: 'formatierung', label: 'Formatierung/Layout' },
    { value: 'bewerbung', label: 'Bewerbungsunterlagen' },
    { value: 'textoptimierung', label: 'Textoptimierung/Überarbeitung' },
    { value: 'ghostwriting', label: 'Ghostwriting' },
    { value: 'andere', label: 'Andere' },
  ];

  const documentTypeOptions = [
    { value: 'brief', label: 'Brief/E-Mail' },
    { value: 'artikel', label: 'Artikel/Blog' },
    { value: 'bericht', label: 'Bericht/Report' },
    { value: 'wissenschaftlich', label: 'Wissenschaftliche Arbeit' },
    { value: 'marketing', label: 'Marketing/Werbetexte' },
    { value: 'website', label: 'Website-Inhalte' },
    { value: 'biografie', label: 'Biografie/Lebenslauf' },
    { value: 'präsentation', label: 'Präsentation' },
    { value: 'handbuch', label: 'Handbuch/Anleitung' },
    { value: 'protokoll', label: 'Protokoll/Notizen' },
    { value: 'kreativ', label: 'Kreative Texte' },
    { value: 'geschäftlich', label: 'Geschäftsdokumente' },
    { value: 'technisch', label: 'Technische Dokumentation' },
    { value: 'andere', label: 'Andere' },
  ];

  const lengthOptions = [
    { value: 'kurz', label: 'Kurz (< 5 Seiten)' },
    { value: 'mittel', label: 'Mittel (5-20 Seiten)' },
    { value: 'lang', label: 'Lang (20-50 Seiten)' },
    { value: 'sehr_lang', label: 'Sehr lang (> 50 Seiten)' },
    { value: 'nach_wort', label: 'Nach Wortzahl' },
  ];

  const subjectOptions = [
    { value: 'allgemein', label: 'Allgemein/Diverse Themen' },
    { value: 'wirtschaft', label: 'Wirtschaft/Business' },
    { value: 'technik', label: 'Technik/IT' },
    { value: 'gesundheit', label: 'Gesundheit/Medizin' },
    { value: 'bildung', label: 'Bildung/Wissenschaft' },
    { value: 'recht', label: 'Recht/Jura' },
    { value: 'lifestyle', label: 'Lifestyle/Unterhaltung' },
    { value: 'kunst', label: 'Kunst/Kultur' },
    { value: 'sport', label: 'Sport' },
    { value: 'reise', label: 'Reise/Tourismus' },
    { value: 'andere', label: 'Andere' },
  ];

  const languageOptions = [
    { value: 'deutsch', label: 'Deutsch' },
    { value: 'englisch', label: 'Englisch' },
    { value: 'französisch', label: 'Französisch' },
    { value: 'spanisch', label: 'Spanisch' },
    { value: 'italienisch', label: 'Italienisch' },
    { value: 'andere', label: 'Andere' },
  ];

  const formatOptions = [
    { value: 'word', label: 'Word/Textdokument' },
    { value: 'pdf', label: 'PDF' },
    { value: 'powerpoint', label: 'PowerPoint' },
    { value: 'excel', label: 'Excel' },
    { value: 'html', label: 'HTML/Webformat' },
    { value: 'markdown', label: 'Markdown' },
    { value: 'andere', label: 'Andere' },
  ];

  const deadlineOptions = [
    { value: 'dringend', label: 'Dringend (< 24 Stunden)' },
    { value: 'kurzfristig', label: 'Kurzfristig (1-3 Tage)' },
    { value: 'standard', label: 'Standard (3-7 Tage)' },
    { value: 'langfristig', label: 'Langfristig (> 1 Woche)' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const researchRequiredOptions = [
    { value: 'true', label: 'Ja, Recherche erforderlich' },
    { value: 'false', label: 'Nein, alle Informationen werden bereitgestellt' },
  ];

  useEffect(() => {
    onDataChange(formData);
  }, [formData, onDataChange]);

  const handleChange = (field: keyof SchreibdiensteData, value: string | string[] | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const isValid = !!(formData.serviceType && formData.documentType && formData.length);
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <FormField label="Art des Schreibdienstes" required>
        <FormSelect
          value={formData.serviceType}
          onChange={value => handleChange('serviceType', value)}
          options={serviceTypeOptions}
        />
      </FormField>

      <FormField label="Art des Dokuments" required>
        <FormSelect
          value={formData.documentType}
          onChange={value => handleChange('documentType', value)}
          options={documentTypeOptions}
        />
      </FormField>

      <FormField label="Umfang/Länge" required>
        <FormSelect
          value={formData.length}
          onChange={value => handleChange('length', value)}
          options={lengthOptions}
        />
      </FormField>

      <FormField label="Themengebiet">
        <FormSelect
          value={formData.subject || ''}
          onChange={value => handleChange('subject', value)}
          options={subjectOptions}
        />
      </FormField>

      <FormField label="Sprache">
        <FormSelect
          value={formData.language || ''}
          onChange={value => handleChange('language', value)}
          options={languageOptions}
        />
      </FormField>

      <FormField label="Gewünschtes Format">
        <FormSelect
          value={formData.format || ''}
          onChange={value => handleChange('format', value)}
          options={formatOptions}
        />
      </FormField>

      <FormField label="Deadline/Zeitrahmen">
        <FormSelect
          value={formData.deadline || ''}
          onChange={value => handleChange('deadline', value)}
          options={deadlineOptions}
        />
      </FormField>

      <FormField label="Recherche erforderlich?">
        <FormRadioGroup
          name="researchRequired"
          value={formData.researchRequired ? 'true' : 'false'}
          onChange={value => handleChange('researchRequired', value === 'true')}
          options={researchRequiredOptions}
        />
      </FormField>

      <FormField label="Zusätzliche Informationen oder Anforderungen">
        <FormTextarea
          value={formData.description || ''}
          onChange={value => handleChange('description', value)}
          placeholder="Beschreiben Sie Ihr Projekt genauer, inkl. Zielgruppe, Stil, besondere Anforderungen, etc."
        />
      </FormField>
    </div>
  );
};

export default SchreibdiensteForm;
