import React, { useState, useEffect } from 'react';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface InventurData {
  subcategory: string;
  inventoryType: string;
  businessType: string;
  inventorySize: string;
  location: string;
  scanningSystem: string;
  timeframe: string;
  frequency: string;
  documentation: string[];
  description?: string;
}

interface InventurFormProps {
  data: InventurData;
  onDataChange: (data: InventurData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const InventurForm: React.FC<InventurFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<InventurData>(data);

  const inventoryTypeOptions = [
    { value: 'vollständig', label: 'Vollständige Inventur' },
    { value: 'stichprobe', label: 'Stichprobeninventur' },
    { value: 'permanent', label: 'Permanente Inventur' },
    { value: 'körperlich', label: 'Körperliche Inventur' },
    { value: 'buchführung', label: 'Buchführungsinventur' },
    { value: 'waren', label: 'Wareninventur' },
    { value: 'anlagen', label: 'Anlagenerfassung' },
    { value: 'andere', label: 'Andere' },
  ];

  const businessTypeOptions = [
    { value: 'einzelhandel', label: 'Einzelhandel' },
    { value: 'großhandel', label: 'Großhandel' },
    { value: 'produktion', label: 'Produktionsbetrieb' },
    { value: 'lager', label: 'Lager/Logistik' },
    { value: 'büro', label: 'Büro/Verwaltung' },
    { value: 'gastronomie', label: 'Gastronomie' },
    { value: 'hotel', label: 'Hotel' },
    { value: 'gesundheit', label: 'Gesundheitswesen' },
    { value: 'bildung', label: 'Bildungseinrichtung' },
    { value: 'öffentlich', label: 'Öffentliche Einrichtung' },
    { value: 'private', label: 'Privater Haushalt' },
    { value: 'andere', label: 'Andere' },
  ];

  const inventorySizeOptions = [
    { value: 'klein', label: 'Klein (< 500 Artikel/Positionen)' },
    { value: 'mittel', label: 'Mittel (500-2000 Artikel/Positionen)' },
    { value: 'gross', label: 'Groß (2000-10000 Artikel/Positionen)' },
    { value: 'sehr_gross', label: 'Sehr groß (> 10000 Artikel/Positionen)' },
  ];

  const locationOptions = [
    { value: 'einzelstandort', label: 'Einzelner Standort' },
    { value: 'mehrstandorte', label: 'Mehrere Standorte' },
    { value: 'filialen', label: 'Filialnetz' },
    { value: 'lager', label: 'Lager/Lagerhallen' },
    { value: 'verkaufsraum', label: 'Verkaufsraum' },
    { value: 'büro', label: 'Büroräume' },
    { value: 'produktion', label: 'Produktionsbereich' },
    { value: 'andere', label: 'Andere' },
  ];

  const scanningSystemOptions = [
    { value: 'barcode', label: 'Barcode-Scanner' },
    { value: 'rfid', label: 'RFID-System' },
    { value: 'papier', label: 'Papierbasiert/Listen' },
    { value: 'software', label: 'Softwarelösung ohne Scanner' },
    { value: 'app', label: 'Mobile App' },
    { value: 'keine', label: 'Keine spezielle Technik' },
    { value: 'andere', label: 'Andere' },
  ];

  const timeframeOptions = [
    { value: 'sofort', label: 'Sofort/Dringend' },
    { value: 'kurzfristig', label: 'Kurzfristig (< 1 Woche)' },
    { value: 'mittelfristig', label: 'Mittelfristig (1-4 Wochen)' },
    { value: 'langfristig', label: 'Langfristig (> 1 Monat)' },
    { value: 'jahresende', label: 'Zum Jahresende' },
    { value: 'geschäftsjahresende', label: 'Zum Geschäftsjahresende' },
  ];

  const frequencyOptions = [
    { value: 'einmalig', label: 'Einmalig' },
    { value: 'jährlich', label: 'Jährlich' },
    { value: 'halbjährlich', label: 'Halbjährlich' },
    { value: 'quartalsweise', label: 'Quartalsweise' },
    { value: 'monatlich', label: 'Monatlich' },
    { value: 'andere', label: 'Andere' },
  ];

  const documentationOptions = [
    { value: 'excel', label: 'Excel-Tabellen' },
    { value: 'datenbank', label: 'Datenbank-Eintragung' },
    { value: 'warenwirtschaft', label: 'In Warenwirtschaftssystem' },
    { value: 'bericht', label: 'Abschlussbericht' },
    { value: 'fotodokumentation', label: 'Fotodokumentation' },
    { value: 'kategorisierung', label: 'Mit Kategorisierung/Klassifikation' },
    { value: 'standortzuweisung', label: 'Mit Standortzuweisung' },
    { value: 'differenzliste', label: 'Differenzliste (Soll/Ist)' },
    { value: 'andere', label: 'Andere' },
  ];

  useEffect(() => {
    onDataChange(formData);
  }, [formData, onDataChange]);

  const handleChange = (field: keyof InventurData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const isValid = !!(
      formData.inventoryType &&
      formData.businessType &&
      formData.inventorySize &&
      formData.timeframe
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <FormField label="Art der Inventur" required>
        <FormSelect
          value={formData.inventoryType}
          onChange={value => handleChange('inventoryType', value)}
          options={inventoryTypeOptions}
        />
      </FormField>

      <FormField label="Branche/Art des Unternehmens" required>
        <FormSelect
          value={formData.businessType}
          onChange={value => handleChange('businessType', value)}
          options={businessTypeOptions}
        />
      </FormField>

      <FormField label="Umfang der Inventur" required>
        <FormSelect
          value={formData.inventorySize}
          onChange={value => handleChange('inventorySize', value)}
          options={inventorySizeOptions}
        />
      </FormField>

      <FormField label="Standortinformationen">
        <FormSelect
          value={formData.location || ''}
          onChange={value => handleChange('location', value)}
          options={locationOptions}
        />
      </FormField>

      <FormField label="Vorhandenes Scan-/Erfassungssystem">
        <FormSelect
          value={formData.scanningSystem || ''}
          onChange={value => handleChange('scanningSystem', value)}
          options={scanningSystemOptions}
        />
      </FormField>

      <FormField label="Zeitrahmen" required>
        <FormSelect
          value={formData.timeframe}
          onChange={value => handleChange('timeframe', value)}
          options={timeframeOptions}
        />
      </FormField>

      <FormField label="Häufigkeit/Regelmäßigkeit">
        <FormSelect
          value={formData.frequency || ''}
          onChange={value => handleChange('frequency', value)}
          options={frequencyOptions}
        />
      </FormField>

      <FormField label="Gewünschte Dokumentation/Ausgabeformate">
        <FormCheckboxGroup
          value={formData.documentation || []}
          onChange={value => handleChange('documentation', value)}
          options={documentationOptions}
        />
      </FormField>

      <FormField label="Zusätzliche Informationen oder Anforderungen">
        <FormTextarea
          value={formData.description || ''}
          onChange={value => handleChange('description', value)}
          placeholder="Beschreiben Sie weitere Details oder besondere Anforderungen für Ihre Inventur"
        />
      </FormField>
    </div>
  );
};

export default InventurForm;
