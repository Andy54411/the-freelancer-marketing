import React, { useState, useEffect } from 'react';
import { TeppichreinigungData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface TeppichreinigungFormProps {
  data: TeppichreinigungData;
  onDataChange: (data: TeppichreinigungData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const TeppichreinigungForm: React.FC<TeppichreinigungFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<TeppichreinigungData>(data);

  const serviceTypeOptions = [
    { value: 'grundreinigung', label: 'Grundreinigung' },
    { value: 'tiefenreinigung', label: 'Tiefenreinigung' },
    { value: 'fleckenentfernung', label: 'Fleckenentfernung' },
    { value: 'imprägnierung', label: 'Imprägnierung' },
    { value: 'geruchsentfernung', label: 'Geruchsentfernung' },
    { value: 'reparatur', label: 'Reparatur' },
    { value: 'entstaubung', label: 'Entstaubung' },
    { value: 'desinfizierung', label: 'Desinfizierung' },
    { value: 'behandlung', label: 'Spezialbehandlung' },
  ];

  const carpetTypeOptions = [
    { value: 'orientteppich', label: 'Orientteppich' },
    { value: 'perserteppich', label: 'Perserteppich' },
    { value: 'hochflor', label: 'Hochflor' },
    { value: 'kurzflor', label: 'Kurzflor' },
    { value: 'berber', label: 'Berber' },
    { value: 'sisal', label: 'Sisal' },
    { value: 'jute', label: 'Jute' },
    { value: 'wolle', label: 'Wolle' },
    { value: 'seide', label: 'Seide' },
    { value: 'synthetisch', label: 'Synthetisch' },
    { value: 'vintage', label: 'Vintage' },
    { value: 'antik', label: 'Antik' },
    { value: 'modern', label: 'Modern' },
    { value: 'maschinell', label: 'Maschinell gefertigt' },
    { value: 'handgeknüpft', label: 'Handgeknüpft' },
  ];

  const carpetSizeOptions = [
    { value: 'klein', label: 'Klein (bis 2 qm)' },
    { value: 'mittel', label: 'Mittel (2-6 qm)' },
    { value: 'gross', label: 'Groß (6-12 qm)' },
    { value: 'sehr_gross', label: 'Sehr groß (über 12 qm)' },
    { value: 'läufer', label: 'Läufer' },
    { value: 'brücke', label: 'Brücke' },
  ];

  const materialOptions = [
    { value: 'wolle', label: 'Wolle' },
    { value: 'seide', label: 'Seide' },
    { value: 'baumwolle', label: 'Baumwolle' },
    { value: 'viskose', label: 'Viskose' },
    { value: 'polyester', label: 'Polyester' },
    { value: 'nylon', label: 'Nylon' },
    { value: 'polypropylen', label: 'Polypropylen' },
    { value: 'jute', label: 'Jute' },
    { value: 'sisal', label: 'Sisal' },
    { value: 'mischgewebe', label: 'Mischgewebe' },
    { value: 'andere', label: 'Andere' },
  ];

  const stainTypeOptions = [
    { value: 'wein', label: 'Wein' },
    { value: 'kaffee', label: 'Kaffee' },
    { value: 'tee', label: 'Tee' },
    { value: 'blut', label: 'Blut' },
    { value: 'urin', label: 'Urin' },
    { value: 'kot', label: 'Kot' },
    { value: 'erbrochenes', label: 'Erbrochenes' },
    { value: 'fett', label: 'Fett/Öl' },
    { value: 'farbe', label: 'Farbe' },
    { value: 'tinte', label: 'Tinte' },
    { value: 'wachs', label: 'Wachs' },
    { value: 'kaugummi', label: 'Kaugummi' },
    { value: 'schlamm', label: 'Schlamm' },
    { value: 'gras', label: 'Gras' },
    { value: 'saft', label: 'Saft' },
    { value: 'andere', label: 'Andere' },
  ];

  const cleaningMethodOptions = [
    { value: 'nassreinigung', label: 'Nassreinigung' },
    { value: 'trockenreinigung', label: 'Trockenreinigung' },
    { value: 'sprühextraktion', label: 'Sprühextraktion' },
    { value: 'dampfreinigung', label: 'Dampfreinigung' },
    { value: 'shamponierung', label: 'Shamponierung' },
    { value: 'pulverreinigung', label: 'Pulverreinigung' },
    { value: 'schaumreinigung', label: 'Schaumreinigung' },
    { value: 'nach_absprache', label: 'Nach Absprache' },
  ];

  const frequencyOptions = [
    { value: 'einmalig', label: 'Einmalig' },
    { value: 'halbjährlich', label: 'Halbjährlich' },
    { value: 'jährlich', label: 'Jährlich' },
    { value: 'alle_zwei_jahre', label: 'Alle 2 Jahre' },
    { value: 'nach_bedarf', label: 'Nach Bedarf' },
    { value: 'regelmäßig', label: 'Regelmäßig' },
  ];

  const budgetRangeOptions = [
    { value: 'unter_50', label: 'Unter 50€' },
    { value: '50_100', label: '50€ - 100€' },
    { value: '100_200', label: '100€ - 200€' },
    { value: '200_400', label: '200€ - 400€' },
    { value: '400_800', label: '400€ - 800€' },
    { value: 'über_800', label: 'Über 800€' },
  ];

  const additionalServicesOptions = [
    { value: 'abhol_lieferservice', label: 'Abhol-/Lieferservice' },
    { value: 'reparatur', label: 'Reparatur' },
    { value: 'fransen_korrektur', label: 'Fransenkorrektur' },
    { value: 'kantenschutz', label: 'Kantenschutz' },
    { value: 'mottenschutz', label: 'Mottenschutz' },
    { value: 'antibakterielle_behandlung', label: 'Antibakterielle Behandlung' },
    { value: 'anti_allergene_behandlung', label: 'Anti-Allergene Behandlung' },
    { value: 'geruchsneutralisation', label: 'Geruchsneutralisation' },
    { value: 'schnellservice', label: 'Schnellservice' },
    { value: 'notfallservice', label: 'Notfallservice' },
    { value: 'wertgutachten', label: 'Wertgutachten' },
    { value: 'zustandsbericht', label: 'Zustandsbericht' },
    { value: 'lagerung', label: 'Lagerung' },
    { value: 'verpackung', label: 'Verpackung' },
    { value: 'versicherung', label: 'Versicherung' },
  ];

  const locationOptions = [
    { value: 'vor_ort', label: 'Vor Ort beim Kunden' },
    { value: 'werkstatt', label: 'In der Werkstatt' },
    { value: 'beides', label: 'Beides möglich' },
  ];

  const urgencyOptions = [
    { value: 'nicht_eilig', label: 'Nicht eilig' },
    { value: 'normal', label: 'Normal' },
    { value: 'eilig', label: 'Eilig' },
    { value: 'sehr_eilig', label: 'Sehr eilig' },
  ];

  const conditionOptions = [
    { value: 'sehr_gut', label: 'Sehr gut' },
    { value: 'gut', label: 'Gut' },
    { value: 'befriedigend', label: 'Befriedigend' },
    { value: 'ausreichend', label: 'Ausreichend' },
    { value: 'mangelhaft', label: 'Mangelhaft' },
    { value: 'stark_verschmutzt', label: 'Stark verschmutzt' },
    { value: 'beschädigt', label: 'Beschädigt' },
  ];

  const handleInputChange = (field: keyof TeppichreinigungData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.carpetType &&
      formData.carpetSize &&
      formData.material &&
      formData.cleaningMethod &&
      formData.frequency &&
      formData.budgetRange &&
      formData.location &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Teppichreinigung-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Reinigung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art der Reinigung"
            />
          </FormField>

          <FormField label="Teppichart" required>
            <FormSelect
              value={formData.carpetType || ''}
              onChange={value => handleInputChange('carpetType', value)}
              options={carpetTypeOptions}
              placeholder="Wählen Sie die Teppichart"
            />
          </FormField>

          <FormField label="Teppichgröße" required>
            <FormSelect
              value={formData.carpetSize || ''}
              onChange={value => handleInputChange('carpetSize', value)}
              options={carpetSizeOptions}
              placeholder="Wählen Sie die Teppichgröße"
            />
          </FormField>

          <FormField label="Material" required>
            <FormSelect
              value={formData.material || ''}
              onChange={value => handleInputChange('material', value)}
              options={materialOptions}
              placeholder="Wählen Sie das Material"
            />
          </FormField>

          <FormField label="Reinigungsmethode" required>
            <FormSelect
              value={formData.cleaningMethod || ''}
              onChange={value => handleInputChange('cleaningMethod', value)}
              options={cleaningMethodOptions}
              placeholder="Wählen Sie die Reinigungsmethode"
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

          <FormField label="Budget-Rahmen" required>
            <FormSelect
              value={formData.budgetRange || ''}
              onChange={value => handleInputChange('budgetRange', value)}
              options={budgetRangeOptions}
              placeholder="Wählen Sie den Budget-Rahmen"
            />
          </FormField>

          <FormField label="Reinigungsort" required>
            <FormSelect
              value={formData.location || ''}
              onChange={value => handleInputChange('location', value)}
              options={locationOptions}
              placeholder="Wählen Sie den Reinigungsort"
            />
          </FormField>

          <FormField label="Zustand des Teppichs">
            <FormSelect
              value={formData.condition || ''}
              onChange={value => handleInputChange('condition', value)}
              options={conditionOptions}
              placeholder="Wählen Sie den Zustand"
            />
          </FormField>

          <FormField label="Anzahl Teppiche">
            <FormInput
              type="number"
              value={formData.quantity?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'quantity',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl der Teppiche"
            />
          </FormField>

          <FormField label="Abmessungen">
            <FormInput
              type="text"
              value={formData.dimensions || ''}
              onChange={value => handleInputChange('dimensions', value)}
              placeholder="Länge x Breite (cm)"
            />
          </FormField>

          <FormField label="Alter des Teppichs">
            <FormInput
              type="number"
              value={formData.age?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'age',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Alter in Jahren"
            />
          </FormField>

          <FormField label="Wert des Teppichs">
            <FormInput
              type="number"
              value={formData.value?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'value',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Wert in Euro"
            />
          </FormField>

          <FormField label="Kontaktperson">
            <FormInput
              type="text"
              value={formData.contactPerson || ''}
              onChange={value => handleInputChange('contactPerson', value)}
              placeholder="Name der Kontaktperson"
            />
          </FormField>

          <FormField label="Telefonnummer">
            <FormInput
              type="text"
              value={formData.phoneNumber || ''}
              onChange={value => handleInputChange('phoneNumber', value)}
              placeholder="Telefonnummer"
            />
          </FormField>

          <FormField label="E-Mail">
            <FormInput
              type="email"
              value={formData.email || ''}
              onChange={value => handleInputChange('email', value)}
              placeholder="E-Mail-Adresse"
            />
          </FormField>

          <FormField label="Adresse">
            <FormInput
              type="text"
              value={formData.address || ''}
              onChange={value => handleInputChange('address', value)}
              placeholder="Straße, PLZ, Ort"
            />
          </FormField>

          <FormField label="Gewünschter Termin">
            <FormInput
              type="text"
              value={formData.preferredDate || ''}
              onChange={value => handleInputChange('preferredDate', value)}
              placeholder="TT.MM.JJJJ"
            />
          </FormField>

          <FormField label="Herkunft/Herstellungsort">
            <FormInput
              type="text"
              value={formData.origin || ''}
              onChange={value => handleInputChange('origin', value)}
              placeholder="z.B. Persien, Türkei, Deutschland"
            />
          </FormField>

          <FormField label="Hersteller/Marke">
            <FormInput
              type="text"
              value={formData.manufacturer || ''}
              onChange={value => handleInputChange('manufacturer', value)}
              placeholder="Hersteller oder Marke"
            />
          </FormField>

          <FormField label="Knotendichte">
            <FormInput
              type="text"
              value={formData.knotDensity || ''}
              onChange={value => handleInputChange('knotDensity', value)}
              placeholder="Knoten pro qm"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Fleckenarten">
            <FormCheckboxGroup
              value={formData.stainTypes || []}
              onChange={value => handleInputChange('stainTypes', value)}
              options={stainTypeOptions}
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
              placeholder="Beschreiben Sie Ihre Teppichreinigung-Anforderungen detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Fleckenbeschreibung">
            <FormTextarea
              value={formData.stainDescription || ''}
              onChange={value => handleInputChange('stainDescription', value)}
              placeholder="Beschreiben Sie die Flecken detailliert"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Besondere Anforderungen oder Wünsche"
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
          <FormField label="Versicherung">
            <FormTextarea
              value={formData.insurance || ''}
              onChange={value => handleInputChange('insurance', value)}
              placeholder="Versicherungsinformationen"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Vorherige Reinigungen">
            <FormTextarea
              value={formData.previousCleanings || ''}
              onChange={value => handleInputChange('previousCleanings', value)}
              placeholder="Informationen zu vorherigen Reinigungen"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Dringlichkeit">
            <FormRadioGroup
              name="urgency"
              value={formData.urgency || ''}
              onChange={value => handleInputChange('urgency', value)}
              options={urgencyOptions.map(option => ({
                value: option.value,
                label: option.label,
              }))}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Wertvoll/Antik">
            <FormRadioGroup
              name="valuable"
              value={formData.valuable || ''}
              onChange={value => handleInputChange('valuable', value)}
              options={[
                { value: 'ja', label: 'Ja, wertvoll/antik' },
                { value: 'nein', label: 'Nein, normaler Teppich' },
                { value: 'unbekannt', label: 'Unbekannt' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Haustiere im Haushalt">
            <FormRadioGroup
              name="pets"
              value={formData.pets || ''}
              onChange={value => handleInputChange('pets', value)}
              options={[
                { value: 'ja', label: 'Ja, Haustiere vorhanden' },
                { value: 'nein', label: 'Nein, keine Haustiere' },
                { value: 'katzen', label: 'Katzen' },
                { value: 'hunde', label: 'Hunde' },
                { value: 'andere', label: 'Andere Haustiere' },
              ]}
            />
          </FormField>
        </div>

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
          <FormField label="Garantie gewünscht">
            <FormRadioGroup
              name="warranty"
              value={formData.warranty || ''}
              onChange={value => handleInputChange('warranty', value)}
              options={[
                { value: 'ja', label: 'Ja, Garantie gewünscht' },
                { value: 'nein', label: 'Nein, nicht erforderlich' },
                { value: 'nach_absprache', label: 'Nach Absprache' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zertifizierung wichtig">
            <FormRadioGroup
              name="certification"
              value={formData.certification || ''}
              onChange={value => handleInputChange('certification', value)}
              options={[
                { value: 'ja', label: 'Ja, Zertifizierung wichtig' },
                { value: 'nein', label: 'Nein, nicht wichtig' },
                { value: 'bevorzugt', label: 'Bevorzugt' },
              ]}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default TeppichreinigungForm;
