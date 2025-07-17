import React, { useState, useEffect } from 'react';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface DekorationData {
  subcategory: string;
  decorationType: string;
  occasion: string;
  location: string;
  area: string;
  style: string;
  budget: string;
  materials: string[];
  timeframe: string;
  description?: string;
}

interface DekorationFormProps {
  data: DekorationData;
  onDataChange: (data: DekorationData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const DekorationForm: React.FC<DekorationFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<DekorationData>(data);

  const decorationTypeOptions = [
    { value: 'event', label: 'Event-Dekoration' },
    { value: 'interior', label: 'Innenraumgestaltung' },
    { value: 'schaufenster', label: 'Schaufensterdekoration' },
    { value: 'bühne', label: 'Bühnendekoration' },
    { value: 'messe', label: 'Messedekoration' },
    { value: 'blumen', label: 'Blumendekoration' },
    { value: 'tabelle', label: 'Tischdekoration' },
    { value: 'saison', label: 'Saisonale Dekoration' },
    { value: 'andere', label: 'Andere' },
  ];

  const occasionOptions = [
    { value: 'hochzeit', label: 'Hochzeit' },
    { value: 'firmenfeier', label: 'Firmenfeier' },
    { value: 'geburtstag', label: 'Geburtstag' },
    { value: 'weihnachten', label: 'Weihnachten' },
    { value: 'ostern', label: 'Ostern' },
    { value: 'messe', label: 'Messe/Ausstellung' },
    { value: 'eröffnung', label: 'Eröffnung' },
    { value: 'showroom', label: 'Showroom-Design' },
    { value: 'jubiläum', label: 'Jubiläum' },
    { value: 'andere', label: 'Andere' },
  ];

  const locationOptions = [
    { value: 'privat', label: 'Privatwohnung/Haus' },
    { value: 'büro', label: 'Büro/Geschäftsräume' },
    { value: 'hotel', label: 'Hotel/Restaurant' },
    { value: 'eventlocation', label: 'Event-Location' },
    { value: 'messehalle', label: 'Messehalle' },
    { value: 'garten', label: 'Garten/Außenbereich' },
    { value: 'schaufenster', label: 'Schaufenster/Ladenlokal' },
    { value: 'andere', label: 'Andere' },
  ];

  const areaOptions = [
    { value: 'klein', label: 'Klein (< 50m²)' },
    { value: 'mittel', label: 'Mittel (50-100m²)' },
    { value: 'gross', label: 'Groß (100-200m²)' },
    { value: 'sehr_gross', label: 'Sehr groß (> 200m²)' },
  ];

  const styleOptions = [
    { value: 'modern', label: 'Modern' },
    { value: 'klassisch', label: 'Klassisch' },
    { value: 'rustikal', label: 'Rustikal' },
    { value: 'vintage', label: 'Vintage' },
    { value: 'minimalistisch', label: 'Minimalistisch' },
    { value: 'elegant', label: 'Elegant' },
    { value: 'bohemian', label: 'Bohemian' },
    { value: 'skandinavisch', label: 'Skandinavisch' },
    { value: 'industrial', label: 'Industrial' },
    { value: 'retro', label: 'Retro' },
    { value: 'thematisch', label: 'Thematisch' },
    { value: 'andere', label: 'Andere' },
  ];

  const budgetOptions = [
    { value: 'niedrig', label: 'Niedrig (< 500€)' },
    { value: 'mittel', label: 'Mittel (500-1500€)' },
    { value: 'hoch', label: 'Hoch (1500-5000€)' },
    { value: 'sehr_hoch', label: 'Sehr hoch (> 5000€)' },
  ];

  const materialsOptions = [
    { value: 'blumen', label: 'Blumen & Pflanzen' },
    { value: 'stoffe', label: 'Stoffe & Textilien' },
    { value: 'lichter', label: 'Lichter & Beleuchtung' },
    { value: 'möbel', label: 'Möbel & Requisiten' },
    { value: 'papier', label: 'Papier & Kartonagen' },
    { value: 'holz', label: 'Holz' },
    { value: 'metall', label: 'Metall' },
    { value: 'glas', label: 'Glas' },
    { value: 'keramik', label: 'Keramik' },
    { value: 'kunststoff', label: 'Kunststoff' },
    { value: 'ballons', label: 'Ballons' },
    { value: 'andere', label: 'Andere' },
  ];

  const timeframeOptions = [
    { value: 'sofort', label: 'Sofort/Dringend' },
    { value: 'kurzfristig', label: 'Kurzfristig (< 1 Woche)' },
    { value: 'mittelfristig', label: 'Mittelfristig (1-4 Wochen)' },
    { value: 'langfristig', label: 'Langfristig (> 1 Monat)' },
    { value: 'datum', label: 'Zu einem bestimmten Datum' },
    { value: 'dauerhaft', label: 'Dauerhaft (bleibende Installation)' },
  ];

  useEffect(() => {
    onDataChange(formData);
  }, [formData, onDataChange]);

  const handleChange = (field: keyof DekorationData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const isValid = !!(
      formData.decorationType &&
      formData.occasion &&
      formData.location &&
      formData.area &&
      formData.timeframe
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <FormField label="Art der Dekoration" required>
        <FormSelect
          value={formData.decorationType}
          onChange={value => handleChange('decorationType', value)}
          options={decorationTypeOptions}
        />
      </FormField>

      <FormField label="Anlass" required>
        <FormSelect
          value={formData.occasion}
          onChange={value => handleChange('occasion', value)}
          options={occasionOptions}
        />
      </FormField>

      <FormField label="Ort/Räumlichkeit" required>
        <FormSelect
          value={formData.location}
          onChange={value => handleChange('location', value)}
          options={locationOptions}
        />
      </FormField>

      <FormField label="Größe des zu dekorierenden Bereichs" required>
        <FormSelect
          value={formData.area}
          onChange={value => handleChange('area', value)}
          options={areaOptions}
        />
      </FormField>

      <FormField label="Gewünschter Stil/Design">
        <FormSelect
          value={formData.style || ''}
          onChange={value => handleChange('style', value)}
          options={styleOptions}
        />
      </FormField>

      <FormField label="Budget">
        <FormSelect
          value={formData.budget || ''}
          onChange={value => handleChange('budget', value)}
          options={budgetOptions}
        />
      </FormField>

      <FormField label="Bevorzugte Materialien">
        <FormCheckboxGroup
          value={formData.materials || []}
          onChange={value => handleChange('materials', value)}
          options={materialsOptions}
        />
      </FormField>

      <FormField label="Zeitrahmen" required>
        <FormSelect
          value={formData.timeframe}
          onChange={value => handleChange('timeframe', value)}
          options={timeframeOptions}
        />
      </FormField>

      <FormField label="Zusätzliche Informationen oder Wünsche">
        <FormTextarea
          value={formData.description || ''}
          onChange={value => handleChange('description', value)}
          placeholder="Beschreiben Sie weitere Details, Ideen oder spezielle Anforderungen für Ihre Dekoration"
        />
      </FormField>
    </div>
  );
};

export default DekorationForm;
