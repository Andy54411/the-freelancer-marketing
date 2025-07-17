import React, { useState, useEffect } from 'react';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface ArchivierungData {
  subcategory: string;
  serviceType: string;
  materialType: string[];
  volume: string;
  timeframe: string;
  urgency: string;
  digitalCopy: boolean;
  organizationSystem: string;
  accessRequirements: string;
  description?: string;
}

interface ArchivierungFormProps {
  data: ArchivierungData;
  onDataChange: (data: ArchivierungData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const ArchivierungForm: React.FC<ArchivierungFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<ArchivierungData>(data);

  const serviceTypeOptions = [
    { value: 'dokumente', label: 'Dokumentenarchivierung' },
    { value: 'akten', label: 'Aktenarchivierung' },
    { value: 'bilder', label: 'Bilderarchivierung' },
    { value: 'medien', label: 'Medienarchivierung' },
    { value: 'digital', label: 'Digitale Archivierung' },
    { value: 'physisch', label: 'Physische Archivierung' },
    { value: 'langzeit', label: 'Langzeitarchivierung' },
    { value: 'datenmigration', label: 'Datenmigration & Archivierung' },
    { value: 'andere', label: 'Andere' },
  ];

  const materialTypeOptions = [
    { value: 'papier', label: 'Papierdokumente' },
    { value: 'fotos', label: 'Fotografien' },
    { value: 'negative', label: 'Negative/Dias' },
    { value: 'bücher', label: 'Bücher/Zeitschriften' },
    { value: 'audio', label: 'Audiomaterial' },
    { value: 'video', label: 'Videomaterial' },
    { value: 'filme', label: 'Filme' },
    { value: 'festplatten', label: 'Festplatten/Speichermedien' },
    { value: 'karten', label: 'Karten/Pläne' },
    { value: 'kunst', label: 'Kunstwerke' },
    { value: 'textilien', label: 'Textilien' },
    { value: 'andere', label: 'Andere' },
  ];

  const volumeOptions = [
    { value: 'klein', label: 'Klein (< 100 Dokumente/Objekte)' },
    { value: 'mittel', label: 'Mittel (100-500 Dokumente/Objekte)' },
    { value: 'gross', label: 'Groß (500-1000 Dokumente/Objekte)' },
    { value: 'sehr_gross', label: 'Sehr groß (> 1000 Dokumente/Objekte)' },
  ];

  const timeframeOptions = [
    { value: 'kurzfristig', label: 'Kurzfristig (< 1 Woche)' },
    { value: 'mittelfristig', label: 'Mittelfristig (1-4 Wochen)' },
    { value: 'langfristig', label: 'Langfristig (> 1 Monat)' },
    { value: 'dauerhaft', label: 'Dauerhaft (fortlaufender Service)' },
  ];

  const urgencyOptions = [
    { value: 'niedrig', label: 'Niedrig' },
    { value: 'normal', label: 'Normal' },
    { value: 'hoch', label: 'Hoch' },
    { value: 'dringend', label: 'Dringend' },
  ];

  const digitalCopyOptions = [
    { value: 'true', label: 'Ja, digitale Kopien erwünscht' },
    { value: 'false', label: 'Nein, nur physische Archivierung' },
  ];

  const organizationSystemOptions = [
    { value: 'chronologisch', label: 'Chronologisch' },
    { value: 'alphabetisch', label: 'Alphabetisch' },
    { value: 'thematisch', label: 'Thematisch' },
    { value: 'numerisch', label: 'Numerisch' },
    { value: 'kundenspezifisch', label: 'Kundenspezifisches System' },
    { value: 'empfehlung', label: 'Nach Empfehlung des Dienstleisters' },
  ];

  useEffect(() => {
    onDataChange(formData);
  }, [formData, onDataChange]);

  const handleChange = (
    field: keyof ArchivierungData,
    value: string | string[] | boolean | number
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.materialType &&
      formData.materialType.length > 0 &&
      formData.volume &&
      formData.timeframe &&
      formData.urgency
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <FormField label="Art der Archivierung" required>
        <FormSelect
          value={formData.serviceType}
          onChange={value => handleChange('serviceType', value)}
          options={serviceTypeOptions}
        />
      </FormField>

      <FormField label="Art der zu archivierenden Materialien" required>
        <FormCheckboxGroup
          value={formData.materialType || []}
          onChange={value => handleChange('materialType', value)}
          options={materialTypeOptions}
        />
      </FormField>

      <FormField label="Umfang der zu archivierenden Materialien" required>
        <FormSelect
          value={formData.volume}
          onChange={value => handleChange('volume', value)}
          options={volumeOptions}
        />
      </FormField>

      <FormField label="Zeitrahmen für die Archivierung" required>
        <FormSelect
          value={formData.timeframe}
          onChange={value => handleChange('timeframe', value)}
          options={timeframeOptions}
        />
      </FormField>

      <FormField label="Dringlichkeit" required>
        <FormSelect
          value={formData.urgency}
          onChange={value => handleChange('urgency', value)}
          options={urgencyOptions}
        />
      </FormField>

      <FormField label="Digitale Kopien erwünscht?">
        <FormRadioGroup
          name="digitalCopy"
          value={formData.digitalCopy ? 'true' : 'false'}
          onChange={value => handleChange('digitalCopy', value === 'true')}
          options={digitalCopyOptions}
        />
      </FormField>

      <FormField label="Gewünschtes Organisationssystem">
        <FormSelect
          value={formData.organizationSystem || ''}
          onChange={value => handleChange('organizationSystem', value)}
          options={organizationSystemOptions}
        />
      </FormField>

      <FormField label="Zugriffsanforderungen">
        <FormInput
          value={formData.accessRequirements || ''}
          onChange={value => handleChange('accessRequirements', value)}
          placeholder="z.B. regelmäßiger Zugriff, nur Notfallzugriff, etc."
        />
      </FormField>

      <FormField label="Zusätzliche Informationen oder Anforderungen">
        <FormTextarea
          value={formData.description || ''}
          onChange={value => handleChange('description', value)}
          placeholder="Beschreiben Sie weitere Details oder besondere Anforderungen für Ihre Archivierung"
        />
      </FormField>
    </div>
  );
};

export default ArchivierungForm;
