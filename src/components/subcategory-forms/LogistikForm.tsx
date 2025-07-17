import React, { useState, useEffect } from 'react';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface LogistikData {
  subcategory: string;
  serviceType: string;
  goodsType: string[];
  volume: string;
  weight: string;
  frequency: string;
  timeframe: string;
  distance: string;
  specialRequirements: string[];
  description?: string;
}

interface LogistikFormProps {
  data: LogistikData;
  onDataChange: (data: LogistikData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const LogistikForm: React.FC<LogistikFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<LogistikData>(data);

  const serviceTypeOptions = [
    { value: 'transport', label: 'Transport/Lieferung' },
    { value: 'lagerung', label: 'Lagerung/Einlagerung' },
    { value: 'kommissionierung', label: 'Kommissionierung' },
    { value: 'verpackung', label: 'Verpackung' },
    { value: 'inventur', label: 'Inventur/Bestandsmanagement' },
    { value: 'retourenmanagement', label: 'Retourenmanagement' },
    { value: 'expressversand', label: 'Expressversand/Kurierdienst' },
    { value: 'dispositionsplanung', label: 'Dispositionsplanung' },
    { value: 'beschaffungslogistik', label: 'Beschaffungslogistik' },
    { value: 'distributionslogistik', label: 'Distributionslogistik' },
    { value: 'kontraktlogistik', label: 'Kontraktlogistik' },
    { value: 'andere', label: 'Andere' },
  ];

  const goodsTypeOptions = [
    { value: 'stückgut', label: 'Stückgut' },
    { value: 'paletten', label: 'Paletten' },
    { value: 'pakete', label: 'Pakete' },
    { value: 'dokumente', label: 'Dokumente/Briefe' },
    { value: 'möbel', label: 'Möbel' },
    { value: 'lebensmittel', label: 'Lebensmittel' },
    { value: 'kühlware', label: 'Kühlware/Tiefkühlware' },
    { value: 'gefahrgut', label: 'Gefahrgut' },
    { value: 'medizinisch', label: 'Medizinische Produkte' },
    { value: 'pharma', label: 'Pharmazeutische Produkte' },
    { value: 'elektronik', label: 'Elektronik/Technik' },
    { value: 'kleidung', label: 'Kleidung/Textilien' },
    { value: 'baumaterial', label: 'Baumaterial' },
    { value: 'maschinen', label: 'Maschinen/Anlagen' },
    { value: 'andere', label: 'Andere' },
  ];

  const volumeOptions = [
    { value: 'klein', label: 'Klein (< 1m³)' },
    { value: 'mittel', label: 'Mittel (1-5m³)' },
    { value: 'gross', label: 'Groß (5-20m³)' },
    { value: 'sehr_gross', label: 'Sehr groß (> 20m³)' },
    { value: 'lkw_klein', label: 'Kleiner LKW (bis 7,5t)' },
    { value: 'lkw_mittel', label: 'Mittlerer LKW (7,5-12t)' },
    { value: 'lkw_gross', label: 'Großer LKW (> 12t)' },
    { value: 'container', label: 'Container' },
  ];

  const weightOptions = [
    { value: 'leicht', label: 'Leicht (< 50kg)' },
    { value: 'mittel', label: 'Mittel (50-500kg)' },
    { value: 'schwer', label: 'Schwer (500-1000kg)' },
    { value: 'sehr_schwer', label: 'Sehr schwer (> 1000kg)' },
  ];

  const frequencyOptions = [
    { value: 'einmalig', label: 'Einmalig' },
    { value: 'täglich', label: 'Täglich' },
    { value: 'wöchentlich', label: 'Wöchentlich' },
    { value: 'monatlich', label: 'Monatlich' },
    { value: 'quartalsweise', label: 'Quartalsweise' },
    { value: 'regelmäßig', label: 'Regelmäßig nach Bedarf' },
  ];

  const timeframeOptions = [
    { value: 'sofort', label: 'Sofort/Dringend' },
    { value: 'express', label: 'Express (< 24h)' },
    { value: 'kurzfristig', label: 'Kurzfristig (1-3 Tage)' },
    { value: 'mittelfristig', label: 'Mittelfristig (3-7 Tage)' },
    { value: 'langfristig', label: 'Langfristig (> 1 Woche)' },
    { value: 'terminiert', label: 'Zu festgelegtem Termin' },
  ];

  const distanceOptions = [
    { value: 'lokal', label: 'Lokal (innerhalb der Stadt)' },
    { value: 'regional', label: 'Regional (< 100km)' },
    { value: 'überregional', label: 'Überregional (innerhalb des Landes)' },
    { value: 'international', label: 'International (grenzüberschreitend)' },
    { value: 'interkontinental', label: 'Interkontinental' },
  ];

  const specialRequirementsOptions = [
    { value: 'temperaturgeführt', label: 'Temperaturgeführter Transport' },
    { value: 'zerbrechlich', label: 'Zerbrechliche Waren' },
    { value: 'versicherung', label: 'Spezielle Versicherung' },
    { value: 'tracking', label: 'Tracking/Verfolgung' },
    { value: 'express', label: 'Express/Zeitkritisch' },
    { value: 'zweimann', label: 'Zweipersonenhandling' },
    { value: 'hebebühne', label: 'Hebebühne erforderlich' },
    { value: 'adr', label: 'ADR-Transport (Gefahrgut)' },
    { value: 'sicherheit', label: 'Erhöhte Sicherheitsanforderungen' },
    { value: 'zollabwicklung', label: 'Zollabwicklung' },
    { value: 'andere', label: 'Andere' },
  ];

  useEffect(() => {
    onDataChange(formData);
  }, [formData, onDataChange]);

  const handleChange = (field: keyof LogistikData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.goodsType &&
      formData.goodsType.length > 0 &&
      formData.volume &&
      formData.timeframe
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <FormField label="Art der Logistikdienstleistung" required>
        <FormSelect
          value={formData.serviceType}
          onChange={value => handleChange('serviceType', value)}
          options={serviceTypeOptions}
        />
      </FormField>

      <FormField label="Art der Waren/Güter" required>
        <FormCheckboxGroup
          value={formData.goodsType || []}
          onChange={value => handleChange('goodsType', value)}
          options={goodsTypeOptions}
        />
      </FormField>

      <FormField label="Volumen/Menge" required>
        <FormSelect
          value={formData.volume}
          onChange={value => handleChange('volume', value)}
          options={volumeOptions}
        />
      </FormField>

      <FormField label="Gewicht">
        <FormSelect
          value={formData.weight || ''}
          onChange={value => handleChange('weight', value)}
          options={weightOptions}
        />
      </FormField>

      <FormField label="Häufigkeit/Regelmäßigkeit">
        <FormSelect
          value={formData.frequency || ''}
          onChange={value => handleChange('frequency', value)}
          options={frequencyOptions}
        />
      </FormField>

      <FormField label="Zeitrahmen" required>
        <FormSelect
          value={formData.timeframe}
          onChange={value => handleChange('timeframe', value)}
          options={timeframeOptions}
        />
      </FormField>

      <FormField label="Distanz/Reichweite">
        <FormSelect
          value={formData.distance || ''}
          onChange={value => handleChange('distance', value)}
          options={distanceOptions}
        />
      </FormField>

      <FormField label="Besondere Anforderungen">
        <FormCheckboxGroup
          value={formData.specialRequirements || []}
          onChange={value => handleChange('specialRequirements', value)}
          options={specialRequirementsOptions}
        />
      </FormField>

      <FormField label="Zusätzliche Informationen oder Anforderungen">
        <FormTextarea
          value={formData.description || ''}
          onChange={value => handleChange('description', value)}
          placeholder="Beschreiben Sie weitere Details oder besondere Anforderungen für Ihre Logistikdienstleistung"
        />
      </FormField>
    </div>
  );
};

export default LogistikForm;
