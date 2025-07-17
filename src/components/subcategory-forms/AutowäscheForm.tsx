import React, { useState, useEffect } from 'react';
import { AutowäscheData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface AutowäscheFormProps {
  data: AutowäscheData;
  onDataChange: (data: AutowäscheData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const AutowäscheForm: React.FC<AutowäscheFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<AutowäscheData>(data);

  const serviceTypeOptions = [
    { value: 'aussenwäsche', label: 'Außenwäsche' },
    { value: 'innenwäsche', label: 'Innenwäsche' },
    { value: 'komplettreinigung', label: 'Komplettreinigung' },
    { value: 'motorwäsche', label: 'Motorwäsche' },
    { value: 'felgenreinigung', label: 'Felgenreinigung' },
    { value: 'unterbodenwäsche', label: 'Unterbodenwäsche' },
    { value: 'wachsbehandlung', label: 'Wachsbehandlung' },
    { value: 'versiegelung', label: 'Versiegelung' },
    { value: 'polsterreinigung', label: 'Polsterreinigung' },
    { value: 'lederreinigung', label: 'Lederreinigung' },
    { value: 'scheibenreinigung', label: 'Scheibenreinigung' },
    { value: 'aufbereitung', label: 'Aufbereitung' },
    { value: 'detailing', label: 'Detailing' },
    { value: 'keramikversiegelung', label: 'Keramikversiegelung' },
    { value: 'nano_versiegelung', label: 'Nano-Versiegelung' },
  ];

  const vehicleTypeOptions = [
    { value: 'pkw', label: 'PKW' },
    { value: 'kombi', label: 'Kombi' },
    { value: 'suv', label: 'SUV' },
    { value: 'transporter', label: 'Transporter' },
    { value: 'lkw', label: 'LKW' },
    { value: 'motorrad', label: 'Motorrad' },
    { value: 'wohnmobil', label: 'Wohnmobil' },
    { value: 'oldtimer', label: 'Oldtimer' },
    { value: 'cabrio', label: 'Cabrio' },
    { value: 'sportwagen', label: 'Sportwagen' },
    { value: 'hybrid', label: 'Hybrid' },
    { value: 'elektro', label: 'Elektro' },
    { value: 'andere', label: 'Andere' },
  ];

  const vehicleSizeOptions = [
    { value: 'klein', label: 'Klein' },
    { value: 'kompakt', label: 'Kompakt' },
    { value: 'mittel', label: 'Mittel' },
    { value: 'gross', label: 'Groß' },
    { value: 'sehr_gross', label: 'Sehr groß' },
  ];

  const colorOptions = [
    { value: 'weiss', label: 'Weiß' },
    { value: 'schwarz', label: 'Schwarz' },
    { value: 'grau', label: 'Grau' },
    { value: 'silber', label: 'Silber' },
    { value: 'blau', label: 'Blau' },
    { value: 'rot', label: 'Rot' },
    { value: 'grün', label: 'Grün' },
    { value: 'gelb', label: 'Gelb' },
    { value: 'braun', label: 'Braun' },
    { value: 'metallic', label: 'Metallic' },
    { value: 'perl', label: 'Perlmutt' },
    { value: 'matt', label: 'Matt' },
    { value: 'andere', label: 'Andere' },
  ];

  const paintTypeOptions = [
    { value: 'standard', label: 'Standard' },
    { value: 'metallic', label: 'Metallic' },
    { value: 'perlmutt', label: 'Perlmutt' },
    { value: 'matt', label: 'Matt' },
    { value: 'foliert', label: 'Foliert' },
    { value: 'andere', label: 'Andere' },
  ];

  const frequencyOptions = [
    { value: 'einmalig', label: 'Einmalig' },
    { value: 'wöchentlich', label: 'Wöchentlich' },
    { value: 'zweiwöchentlich', label: 'Alle 2 Wochen' },
    { value: 'monatlich', label: 'Monatlich' },
    { value: 'vierteljährlich', label: 'Vierteljährlich' },
    { value: 'halbjährlich', label: 'Halbjährlich' },
    { value: 'jährlich', label: 'Jährlich' },
    { value: 'nach_bedarf', label: 'Nach Bedarf' },
  ];

  const locationOptions = [
    { value: 'waschanlage', label: 'Waschanlage' },
    { value: 'zuhause', label: 'Beim Kunden zu Hause' },
    { value: 'mobil', label: 'Mobiler Service' },
    { value: 'werkstatt', label: 'Werkstatt' },
    { value: 'garage', label: 'Garage' },
    { value: 'parkplatz', label: 'Parkplatz' },
    { value: 'andere', label: 'Andere' },
  ];

  const conditionOptions = [
    { value: 'sehr_sauber', label: 'Sehr sauber' },
    { value: 'sauber', label: 'Sauber' },
    { value: 'normal', label: 'Normal' },
    { value: 'verschmutzt', label: 'Verschmutzt' },
    { value: 'stark_verschmutzt', label: 'Stark verschmutzt' },
    { value: 'sehr_stark_verschmutzt', label: 'Sehr stark verschmutzt' },
  ];
  const additionalServicesOptions = [
    { value: 'staubsaugen', label: 'Staubsaugen' },
    { value: 'wischen', label: 'Wischen' },
    { value: 'armaturenbrett_reinigen', label: 'Armaturenbrett reinigen' },
    { value: 'türverkleidung_reinigen', label: 'Türverkleidung reinigen' },
    { value: 'kofferraum_reinigen', label: 'Kofferraum reinigen' },
    { value: 'fußmatten_reinigen', label: 'Fußmatten reinigen' },
    { value: 'sitze_reinigen', label: 'Sitze reinigen' },
    { value: 'polster_imprägnieren', label: 'Polster imprägnieren' },
    { value: 'leder_pflegen', label: 'Leder pflegen' },
    { value: 'kunststoff_pflegen', label: 'Kunststoff pflegen' },
    { value: 'gummi_pflegen', label: 'Gummi pflegen' },
    { value: 'reifen_glanz', label: 'Reifen-Glanz' },
    { value: 'felgen_versiegeln', label: 'Felgen versiegeln' },
    { value: 'scheiben_versiegeln', label: 'Scheiben versiegeln' },
    { value: 'geruchsbeseitigung', label: 'Geruchsbeseitigung' },
    { value: 'ozon_behandlung', label: 'Ozon-Behandlung' },
    { value: 'klimaanlage_reinigen', label: 'Klimaanlage reinigen' },
    { value: 'pollenfilter_wechseln', label: 'Pollenfilter wechseln' },
    { value: 'insektenentfernung', label: 'Insektenentfernung' },
    { value: 'baumharz_entfernen', label: 'Baumharz entfernen' },
    { value: 'teer_entfernen', label: 'Teer entfernen' },
    { value: 'kratzer_entfernen', label: 'Kratzer entfernen' },
    { value: 'politur', label: 'Politur' },
    { value: 'wachs', label: 'Wachs' },
    { value: 'versiegelung', label: 'Versiegelung' },
  ];

  const handleInputChange = (field: keyof AutowäscheData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.vehicleType &&
      formData.vehicleSize &&
      formData.frequency &&
      formData.location &&
      formData.condition &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Autowäsche-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Wäsche" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art der Wäsche"
            />
          </FormField>

          <FormField label="Fahrzeugtyp" required>
            <FormSelect
              value={formData.vehicleType || ''}
              onChange={value => handleInputChange('vehicleType', value)}
              options={vehicleTypeOptions}
              placeholder="Wählen Sie den Fahrzeugtyp"
            />
          </FormField>

          <FormField label="Fahrzeuggröße" required>
            <FormSelect
              value={formData.vehicleSize || ''}
              onChange={value => handleInputChange('vehicleSize', value)}
              options={vehicleSizeOptions}
              placeholder="Wählen Sie die Fahrzeuggröße"
            />
          </FormField>

          <FormField label="Häufigkeit" required>
            <FormSelect
              value={formData.frequency || ''}
              onChange={value => handleInputChange('frequency', value)}
              options={frequencyOptions}
              placeholder="Wählen Sie die Häufigkeit"
            />
          </FormField>

          <FormField label="Ort der Wäsche" required>
            <FormSelect
              value={formData.location || ''}
              onChange={value => handleInputChange('location', value)}
              options={locationOptions}
              placeholder="Wählen Sie den Ort"
            />
          </FormField>

          <FormField label="Zustand des Fahrzeugs" required>
            <FormSelect
              value={formData.condition || ''}
              onChange={value => handleInputChange('condition', value)}
              options={conditionOptions}
              placeholder="Wählen Sie den Zustand"
            />
          </FormField>
          <FormField label="Fahrzeugfarbe">
            <FormSelect
              value={formData.color || ''}
              onChange={value => handleInputChange('color', value)}
              options={colorOptions}
              placeholder="Wählen Sie die Farbe"
            />
          </FormField>

          <FormField label="Lacktyp">
            <FormSelect
              value={formData.paintType || ''}
              onChange={value => handleInputChange('paintType', value)}
              options={paintTypeOptions}
              placeholder="Wählen Sie den Lacktyp"
            />
          </FormField>

          <FormField label="Marke">
            <FormInput
              type="text"
              value={formData.brand || ''}
              onChange={value => handleInputChange('brand', value)}
              placeholder="Fahrzeugmarke"
            />
          </FormField>

          <FormField label="Modell">
            <FormInput
              type="text"
              value={formData.model || ''}
              onChange={value => handleInputChange('model', value)}
              placeholder="Fahrzeugmodell"
            />
          </FormField>

          <FormField label="Baujahr">
            <FormInput
              type="number"
              value={formData.year?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'year',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Baujahr"
            />
          </FormField>

          <FormField label="Kilometerstand">
            <FormInput
              type="number"
              value={formData.mileage?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'mileage',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Kilometerstand"
            />
          </FormField>

          <FormField label="Kennzeichen">
            <FormInput
              type="text"
              value={formData.licensePlate || ''}
              onChange={value => handleInputChange('licensePlate', value)}
              placeholder="Kennzeichen"
            />
          </FormField>
          <FormField label="Dauer geschätzt">
            <FormInput
              type="number"
              value={formData.estimatedDuration?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'estimatedDuration',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Stunden"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zusätzliche Services">
            <FormCheckboxGroup
              value={formData.additionalServices || []}
              onChange={value => handleInputChange('additionalServices', value)}
              options={additionalServicesOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Projektbeschreibung" required>
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie Ihre Autowäsche-Anforderungen detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Verschmutzungen">
            <FormTextarea
              value={formData.specialDirt || ''}
              onChange={value => handleInputChange('specialDirt', value)}
              placeholder="Besondere Verschmutzungen oder Problemstellen"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Schäden oder Besonderheiten">
            <FormTextarea
              value={formData.damage || ''}
              onChange={value => handleInputChange('damage', value)}
              placeholder="Schäden oder Besonderheiten am Fahrzeug"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Allergien/Sensitivitäten">
            <FormTextarea
              value={formData.allergies || ''}
              onChange={value => handleInputChange('allergies', value)}
              placeholder="Allergien oder Sensitivitäten gegenüber Reinigungsmitteln"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zugangshinweise">
            <FormTextarea
              value={formData.accessInstructions || ''}
              onChange={value => handleInputChange('accessInstructions', value)}
              placeholder="Hinweise zum Zugang oder Parkplatz"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Wünsche">
            <FormTextarea
              value={formData.specialRequests || ''}
              onChange={value => handleInputChange('specialRequests', value)}
              placeholder="Besondere Wünsche oder Anforderungen"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4"></div>

        <div className="mt-4">
          <FormField label="Umweltfreundliche Reinigung">
            <FormRadioGroup
              name="ecoFriendly"
              value={formData.ecoFriendly || ''}
              onChange={value => handleInputChange('ecoFriendly', value)}
              options={[
                { value: 'ja', label: 'Ja, umweltfreundlich' },
                { value: 'nein', label: 'Nein, egal' },
                { value: 'bevorzugt', label: 'Bevorzugt' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Regelmäßiger Service">
            <FormRadioGroup
              name="regularService"
              value={formData.regularService || ''}
              onChange={value => handleInputChange('regularService', value)}
              options={[
                { value: 'ja', label: 'Ja, regelmäßiger Service' },
                { value: 'nein', label: 'Nein, einmalig' },
                { value: 'später', label: 'Später entscheiden' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Wasserversorgung vorhanden">
            <FormRadioGroup
              name="waterSupply"
              value={formData.waterSupply || ''}
              onChange={value => handleInputChange('waterSupply', value)}
              options={[
                { value: 'ja', label: 'Ja, Wasserversorgung vorhanden' },
                { value: 'nein', label: 'Nein, muss mitgebracht werden' },
                { value: 'unbekannt', label: 'Unbekannt' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Stromanschluss vorhanden">
            <FormRadioGroup
              name="powerSupply"
              value={formData.powerSupply || ''}
              onChange={value => handleInputChange('powerSupply', value)}
              options={[
                { value: 'ja', label: 'Ja, Stromanschluss vorhanden' },
                { value: 'nein', label: 'Nein, Generator erforderlich' },
                { value: 'unbekannt', label: 'Unbekannt' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Versicherung erforderlich">
            <FormRadioGroup
              name="insurance"
              value={formData.insurance || ''}
              onChange={value => handleInputChange('insurance', value)}
              options={[
                { value: 'ja', label: 'Ja, Versicherung erforderlich' },
                { value: 'nein', label: 'Nein, nicht erforderlich' },
                { value: 'unbekannt', label: 'Unbekannt' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Innen- und Außenreinigung">
            <FormRadioGroup
              name="interiorExterior"
              value={formData.interiorExterior || ''}
              onChange={value => handleInputChange('interiorExterior', value)}
              options={[
                { value: 'beides', label: 'Innen und Außen' },
                { value: 'nur_aussen', label: 'Nur Außen' },
                { value: 'nur_innen', label: 'Nur Innen' },
              ]}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default AutowäscheForm;
