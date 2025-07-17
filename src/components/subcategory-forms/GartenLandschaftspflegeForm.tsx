import React, { useState, useEffect } from 'react';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface GartenLandschaftspflegeData {
  subcategory: string;
  serviceType: string[];
  gardenSize: string;
  gardenType: string;
  frequency: string;
  equipmentProvided: boolean;
  timeframe: string;
  specificPlants: string;
  specificRequirements: string;
  description?: string;
}

interface GartenLandschaftspflegeFormProps {
  data: GartenLandschaftspflegeData;
  onDataChange: (data: GartenLandschaftspflegeData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const GartenLandschaftspflegeForm: React.FC<GartenLandschaftspflegeFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<GartenLandschaftspflegeData>(data);

  const serviceTypeOptions = [
    { value: 'rasenpflege', label: 'Rasenpflege/Mähen' },
    { value: 'hecken', label: 'Hecken-/Strauchschnitt' },
    { value: 'bäume', label: 'Baumpflege/-schnitt' },
    { value: 'unkraut', label: 'Unkrautentfernung' },
    { value: 'bepflanzung', label: 'Bepflanzung/Gärtnern' },
    { value: 'bewässerung', label: 'Bewässerungssysteme' },
    { value: 'boden', label: 'Bodenbearbeitung/Umgraben' },
    { value: 'beete', label: 'Beete anlegen/pflegen' },
    { value: 'laub', label: 'Laubarbeiten' },
    { value: 'reinigung', label: 'Reinigung von Wegen/Terrassen' },
    { value: 'teich', label: 'Teichpflege' },
    { value: 'planung', label: 'Gartenplanung/Beratung' },
    { value: 'winterfest', label: 'Garten winterfest machen' },
    { value: 'frühjahrsputz', label: 'Frühjahrsvorbereitung' },
    { value: 'andere', label: 'Andere' },
  ];

  const gardenSizeOptions = [
    { value: 'klein', label: 'Klein (< 100m²)' },
    { value: 'mittel', label: 'Mittel (100-500m²)' },
    { value: 'gross', label: 'Groß (500-1000m²)' },
    { value: 'sehr_gross', label: 'Sehr groß (> 1000m²)' },
  ];

  const gardenTypeOptions = [
    { value: 'ziergarten', label: 'Ziergarten' },
    { value: 'nutzgarten', label: 'Nutzgarten/Gemüsegarten' },
    { value: 'obstgarten', label: 'Obstgarten' },
    { value: 'steingarten', label: 'Steingarten' },
    { value: 'teich', label: 'Garten mit Teich/Wasserelement' },
    { value: 'naturgarten', label: 'Naturgarten/Wildgarten' },
    { value: 'vorgarten', label: 'Vorgarten' },
    { value: 'innenhof', label: 'Innenhof' },
    { value: 'balkon', label: 'Balkongarten/Terrassengarten' },
    { value: 'dachgarten', label: 'Dachgarten' },
    { value: 'kleingartenanlage', label: 'Kleingartenanlage/Schrebergarten' },
    { value: 'japanisch', label: 'Japanischer Garten' },
    { value: 'englisch', label: 'Englischer Garten' },
    { value: 'andere', label: 'Andere' },
  ];

  const frequencyOptions = [
    { value: 'einmalig', label: 'Einmalig' },
    { value: 'wöchentlich', label: 'Wöchentlich' },
    { value: 'zweiwöchentlich', label: 'Zweiwöchentlich' },
    { value: 'monatlich', label: 'Monatlich' },
    { value: 'saisonal', label: 'Saisonal' },
    { value: 'regelmäßig', label: 'Regelmäßig nach Absprache' },
  ];

  const equipmentProvidedOptions = [
    { value: 'true', label: 'Ja, Equipment wird gestellt' },
    { value: 'false', label: 'Nein, Dienstleister soll eigenes Equipment mitbringen' },
  ];

  const timeframeOptions = [
    { value: 'sofort', label: 'Sofort/Dringend' },
    { value: 'kurzfristig', label: 'Kurzfristig (< 1 Woche)' },
    { value: 'mittelfristig', label: 'Mittelfristig (1-4 Wochen)' },
    { value: 'langfristig', label: 'Langfristig (> 1 Monat)' },
    { value: 'regelmäßig', label: 'Regelmäßiger Service' },
    { value: 'saisonal', label: 'Zu bestimmter Jahreszeit' },
  ];

  useEffect(() => {
    onDataChange(formData);
  }, [formData, onDataChange]);

  const handleChange = (
    field: keyof GartenLandschaftspflegeData,
    value: string | string[] | boolean
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.serviceType.length > 0 &&
      formData.gardenSize &&
      formData.frequency
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <FormField label="Art der Garten-/Landschaftspflege" required>
        <FormCheckboxGroup
          value={formData.serviceType || []}
          onChange={value => handleChange('serviceType', value)}
          options={serviceTypeOptions}
        />
      </FormField>

      <FormField label="Gartengröße" required>
        <FormSelect
          value={formData.gardenSize}
          onChange={value => handleChange('gardenSize', value)}
          options={gardenSizeOptions}
        />
      </FormField>

      <FormField label="Gartentyp">
        <FormSelect
          value={formData.gardenType || ''}
          onChange={value => handleChange('gardenType', value)}
          options={gardenTypeOptions}
        />
      </FormField>

      <FormField label="Häufigkeit/Regelmäßigkeit" required>
        <FormSelect
          value={formData.frequency}
          onChange={value => handleChange('frequency', value)}
          options={frequencyOptions}
        />
      </FormField>

      <FormField label="Wird Equipment zur Verfügung gestellt?">
        <FormRadioGroup
          name="equipmentProvided"
          value={formData.equipmentProvided ? 'true' : 'false'}
          onChange={value => handleChange('equipmentProvided', value === 'true')}
          options={equipmentProvidedOptions}
        />
      </FormField>

      <FormField label="Gewünschter Zeitrahmen">
        <FormSelect
          value={formData.timeframe || ''}
          onChange={value => handleChange('timeframe', value)}
          options={timeframeOptions}
        />
      </FormField>

      <FormField label="Besondere Pflanzen oder Bereiche">
        <FormInput
          value={formData.specificPlants || ''}
          onChange={value => handleChange('specificPlants', value.toString())}
          placeholder="z.B. exotische Pflanzen, alte Bäume, spezielle Beete, etc."
        />
      </FormField>

      <FormField label="Spezielle Anforderungen oder Einschränkungen">
        <FormInput
          value={formData.specificRequirements || ''}
          onChange={value => handleChange('specificRequirements', value.toString())}
          placeholder="z.B. biologisch/ohne Chemie, bestimmte Zeiten, etc."
        />
      </FormField>

      <FormField label="Zusätzliche Informationen oder Anforderungen">
        <FormTextarea
          value={formData.description || ''}
          onChange={value => handleChange('description', value)}
          placeholder="Beschreiben Sie weitere Details oder besondere Anforderungen für die Garten-/Landschaftspflege"
        />
      </FormField>
    </div>
  );
};

export default GartenLandschaftspflegeForm;
