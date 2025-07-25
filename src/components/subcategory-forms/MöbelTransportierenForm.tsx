import React, { useState, useEffect } from 'react';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';

interface MöbelTransportierenData {
  subcategory: string;
  itemType: string[];
  volume: string;
  distance: string;
  floors: string;
  elevator: boolean;
  packaging: boolean;
  assembly: boolean;
  dateTime: string;
  specialItems: string;
  description?: string;
}

interface MöbelTransportierenFormProps {
  data: MöbelTransportierenData;
  onDataChange: (data: MöbelTransportierenData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const MöbelTransportierenForm: React.FC<MöbelTransportierenFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<MöbelTransportierenData>(data);

  const itemTypeOptions = [
    { value: 'einzelmöbel', label: 'Einzelmöbel (Sofa, Schrank, etc.)' },
    { value: 'möbelgruppe', label: 'Möbelgruppe (z.B. Wohnzimmereinrichtung)' },
    { value: 'komplettumzug', label: 'Kompletter Umzug (gesamter Haushalt)' },
    { value: 'büromöbel', label: 'Büromöbel' },
    { value: 'sperrige_gegenstände', label: 'Sperrige Gegenstände (Piano, Billardtisch, etc.)' },
    { value: 'zerbrechliche_gegenstände', label: 'Zerbrechliche/empfindliche Gegenstände' },
    { value: 'antiquitäten', label: 'Antiquitäten/wertvolle Möbel' },
    { value: 'einbauküche', label: 'Einbauküche' },
    { value: 'gartenmöbel', label: 'Gartenmöbel' },
    { value: 'waschmaschine', label: 'Waschmaschine/große Haushaltsgeräte' },
    { value: 'andere', label: 'Andere' },
  ];

  const volumeOptions = [
    { value: 'klein', label: 'Klein (1-2 Möbelstücke)' },
    { value: 'mittel', label: 'Mittel (3-5 Möbelstücke/kleines Zimmer)' },
    { value: 'gross', label: 'Groß (komplette Zimmereinrichtung)' },
    { value: 'sehr_gross', label: 'Sehr groß (mehrere Zimmer/kleine Wohnung)' },
    { value: 'komplett', label: 'Komplett (ganze Wohnung/Haus)' },
  ];

  const distanceOptions = [
    { value: 'innerorts', label: 'Innerorts (gleiche Stadt)' },
    { value: 'nahbereich', label: 'Nahbereich (< 50 km)' },
    { value: 'regional', label: 'Regional (50-200 km)' },
    { value: 'überregional', label: 'Überregional (> 200 km)' },
    { value: 'international', label: 'International' },
  ];

  const floorsOptions = [
    { value: 'erdgeschoss', label: 'Erdgeschoss' },
    { value: '1_stock', label: '1. Stock' },
    { value: '2_stock', label: '2. Stock' },
    { value: '3_stock', label: '3. Stock' },
    { value: '4_stock', label: '4. Stock oder höher' },
    {
      value: 'unterschiedlich',
      label: 'Unterschiedlich (Abholung/Lieferung in verschiedenen Stockwerken)',
    },
  ];

  const elevatorOptions = [
    { value: 'true', label: 'Ja, Aufzug vorhanden' },
    { value: 'false', label: 'Nein, kein Aufzug vorhanden' },
  ];

  const packagingOptions = [
    { value: 'true', label: 'Ja, Verpackungsservice gewünscht' },
    { value: 'false', label: 'Nein, nur Transport' },
  ];

  const assemblyOptions = [
    { value: 'true', label: 'Ja, Auf-/Abbau gewünscht' },
    { value: 'false', label: 'Nein, nur Transport' },
  ];

  useEffect(() => {
    onDataChange(formData);
  }, [formData, onDataChange]);

  const handleChange = (
    field: keyof MöbelTransportierenData,
    value: string | string[] | boolean
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const isValid = !!(
      formData.itemType &&
      formData.itemType.length > 0 &&
      formData.volume &&
      formData.distance
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.itemType &&
      formData.itemType.length > 0 &&
      formData.volume &&
      formData.distance
    );
  };

  return (
    <div className="space-y-6">
      <FormField label="Art der zu transportierenden Möbel/Gegenstände" required>
        <FormCheckboxGroup
          value={formData.itemType || []}
          onChange={value => handleChange('itemType', value)}
          options={itemTypeOptions}
        />
      </FormField>

      <FormField label="Umfang/Menge" required>
        <FormSelect
          value={formData.volume}
          onChange={value => handleChange('volume', value)}
          options={volumeOptions}
        />
      </FormField>

      <FormField label="Entfernung/Distanz" required>
        <FormSelect
          value={formData.distance}
          onChange={value => handleChange('distance', value)}
          options={distanceOptions}
        />
      </FormField>

      <FormField label="Stockwerk (Abholung und/oder Lieferung)">
        <FormSelect
          value={formData.floors || ''}
          onChange={value => handleChange('floors', value)}
          options={floorsOptions}
        />
      </FormField>

      <FormField label="Aufzug vorhanden?">
        <FormRadioGroup
          name="elevator"
          value={formData.elevator ? 'true' : 'false'}
          onChange={value => handleChange('elevator', value === 'true')}
          options={elevatorOptions}
        />
      </FormField>

      <FormField label="Verpackungsservice gewünscht?">
        <FormRadioGroup
          name="packaging"
          value={formData.packaging ? 'true' : 'false'}
          onChange={value => handleChange('packaging', value === 'true')}
          options={packagingOptions}
        />
      </FormField>

      <FormField label="Möbel Auf-/Abbau gewünscht?">
        <FormRadioGroup
          name="assembly"
          value={formData.assembly ? 'true' : 'false'}
          onChange={value => handleChange('assembly', value === 'true')}
          options={assemblyOptions}
        />
      </FormField>

      <FormField label="Gewünschter Zeitpunkt/Termin">
        <FormInput
          value={formData.dateTime || ''}
          onChange={value => handleChange('dateTime', value.toString())}
          placeholder="z.B. 15.10.2025 oder 'flexibel nach Absprache'"
        />
      </FormField>

      <FormField label="Besondere/sperrige Gegenstände">
        <FormInput
          value={formData.specialItems || ''}
          onChange={value => handleChange('specialItems', value.toString())}
          placeholder="z.B. Piano, Aquarium, Großgeräte, etc."
        />
      </FormField>

      <FormField label="Zusätzliche Informationen oder Anforderungen">
        <FormTextarea
          value={formData.description || ''}
          onChange={value => handleChange('description', value)}
          placeholder="Beschreiben Sie weitere Details, spezielle Möbelstücke oder besondere Anforderungen für den Möbeltransport"
        />
      </FormField>

      <FormSubmitButton isValid={isFormValid()} subcategory="MöbelTransportieren" />
    </div>
  );
}

export default MöbelTransportierenForm;
