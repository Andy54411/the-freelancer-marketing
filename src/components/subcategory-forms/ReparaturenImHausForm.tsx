import React, { useState, useEffect } from 'react';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface ReparaturenImHausData {
  subcategory: string;
  repairType: string[];
  property: string;
  materials: string;
  expertise: string;
  timeframe: string;
  description?: string;
}

interface ReparaturenImHausFormProps {
  data: ReparaturenImHausData;
  onDataChange: (data: ReparaturenImHausData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const ReparaturenImHausForm: React.FC<ReparaturenImHausFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<ReparaturenImHausData>(data);

  const repairTypeOptions = [
    { value: 'sanitär', label: 'Sanitär/Wasserinstallation' },
    { value: 'elektrik', label: 'Elektrik/Elektrische Anlagen' },
    { value: 'heizung', label: 'Heizung/Klimaanlage' },
    { value: 'wände', label: 'Wände/Decken (Risse, Löcher, etc.)' },
    { value: 'fliesen', label: 'Fliesen/Bodenlegen' },
    { value: 'türen', label: 'Türen/Fenster' },
    { value: 'andere', label: 'Andere' },
  ];

  const propertyOptions = [
    { value: 'apartment', label: 'Wohnung/Apartment' },
    { value: 'einfamilienhaus', label: 'Einfamilienhaus' },
    { value: 'mehrfamilienhaus', label: 'Mehrfamilienhaus' },
    { value: 'büro', label: 'Büro/Geschäftsräume' },
    { value: 'gewerbe', label: 'Gewerbeobjekt' },
    { value: 'andere', label: 'Andere' },
  ];

  const materialsOptions = [
    { value: 'vorhanden', label: 'Materialien sind vorhanden' },
    { value: 'teilweise', label: 'Materialien teilweise vorhanden' },
    { value: 'nicht_vorhanden', label: 'Materialien müssen besorgt werden' },
    { value: 'nach_absprache', label: 'Nach Absprache' },
  ];

  const expertiseOptions = [
    { value: 'einfach', label: 'Einfache Reparatur (kein Fachmann nötig)' },
    { value: 'mittel', label: 'Mittelschwere Reparatur (handwerkliches Geschick)' },
    { value: 'komplex', label: 'Komplexe Reparatur (Fachmann empfohlen)' },
    { value: 'spezialisiert', label: 'Spezialisierte Reparatur (Experte erforderlich)' },
  ];

  const timeframeOptions = [
    { value: 'kurz', label: 'Kurz (< 2 Stunden)' },
    { value: 'mittel', label: 'Mittel (2-5 Stunden)' },
    { value: 'tag', label: 'Tagesarbeit (5-8 Stunden)' },
    { value: 'mehrtägig', label: 'Mehrtägig' },
    { value: 'projekt', label: 'Längerfristiges Projekt' },
  ];
  useEffect(() => {
    onDataChange(formData);
  }, [formData, onDataChange]);

  const handleChange = (field: keyof ReparaturenImHausData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const isValid = !!(formData.repairType && formData.repairType.length > 0 && formData.property);
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <FormField label="Art der Reparatur" required>
        <FormCheckboxGroup
          value={formData.repairType || []}
          onChange={value => handleChange('repairType', value)}
          options={repairTypeOptions}
        />
      </FormField>

      <FormField label="Art der Immobilie" required>
        <FormSelect
          value={formData.property}
          onChange={value => handleChange('property', value)}
          options={propertyOptions}
        />
      </FormField>

      <FormField label="Materialverfügbarkeit">
        <FormSelect
          value={formData.materials || ''}
          onChange={value => handleChange('materials', value)}
          options={materialsOptions}
        />
      </FormField>

      <FormField label="Komplexität/Erforderliche Expertise">
        <FormSelect
          value={formData.expertise || ''}
          onChange={value => handleChange('expertise', value)}
          options={expertiseOptions}
        />
      </FormField>

      <FormField label="Geschätzter Zeitrahmen">
        <FormSelect
          value={formData.timeframe || ''}
          onChange={value => handleChange('timeframe', value)}
          options={timeframeOptions}
        />
      </FormField>
      <FormField label="Detaillierte Beschreibung des Problems/der Aufgabe">
        <FormTextarea
          value={formData.description || ''}
          onChange={value => handleChange('description', value)}
          placeholder="Beschreiben Sie das Problem genauer, inkl. Symptome, Ort, Ausmaß, bisherige Lösungsversuche, etc."
        />
      </FormField>
    </div>
  );
};

export default ReparaturenImHausForm;
