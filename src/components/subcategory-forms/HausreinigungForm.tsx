import React, { useState, useEffect } from 'react';
import { HausreinigungData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface HausreinigungFormProps {
  data: HausreinigungData;
  onDataChange: (data: HausreinigungData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const HausreinigungForm: React.FC<HausreinigungFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<HausreinigungData>(data);

  const serviceTypeOptions = [
    { value: 'grundreinigung', label: 'Grundreinigung' },
    { value: 'unterhaltsreinigung', label: 'Unterhaltsreinigung' },
    { value: 'haushaltsreinigung', label: 'Haushaltsreinigung' },
    { value: 'büroreinigung', label: 'Büroreinigung' },
    { value: 'fensterreinigung', label: 'Fensterreinigung' },
    { value: 'teppichreinigung', label: 'Teppichreinigung' },
    { value: 'polsterreinigung', label: 'Polsterreinigung' },
    { value: 'küchenteinigung', label: 'Küchenreinigung' },
    { value: 'badreinigung', label: 'Badreinigung' },
    { value: 'umzugsreinigung', label: 'Umzugsreinigung' },
    { value: 'sanierungsreinigung', label: 'Sanierungsreinigung' },
    { value: 'glasreinigung', label: 'Glasreinigung' },
    { value: 'winterdienst', label: 'Winterdienst' },
  ];

  const propertyTypeOptions = [
    { value: 'wohnung', label: 'Wohnung' },
    { value: 'haus', label: 'Haus' },
    { value: 'büro', label: 'Büro' },
    { value: 'geschäft', label: 'Geschäft' },
    { value: 'praxis', label: 'Praxis' },
    { value: 'kanzlei', label: 'Kanzlei' },
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'hotel', label: 'Hotel' },
    { value: 'lager', label: 'Lager' },
    { value: 'werkstatt', label: 'Werkstatt' },
    { value: 'andere', label: 'Andere' },
  ];

  const cleaningFrequencyOptions = [
    { value: 'einmalig', label: 'Einmalig' },
    { value: 'wöchentlich', label: 'Wöchentlich' },
    { value: 'zweiwöchentlich', label: 'Alle 2 Wochen' },
    { value: 'monatlich', label: 'Monatlich' },
    { value: 'vierteljährlich', label: 'Vierteljährlich' },
    { value: 'halbjährlich', label: 'Halbjährlich' },
    { value: 'jährlich', label: 'Jährlich' },
    { value: 'nach_bedarf', label: 'Nach Bedarf' },
  ];

  const propertySizeOptions = [
    { value: '50', label: 'Bis 50 qm' },
    { value: '100', label: '50-100 qm' },
    { value: '150', label: '100-150 qm' },
    { value: '200', label: '150-200 qm' },
    { value: '300', label: '200-300 qm' },
    { value: '500', label: '300-500 qm' },
    { value: '1000', label: '500-1000 qm' },
    { value: 'über_1000', label: 'Über 1000 qm' },
  ];

  const roomCountOptions = [
    { value: '1', label: '1 Zimmer' },
    { value: '2', label: '2 Zimmer' },
    { value: '3', label: '3 Zimmer' },
    { value: '4', label: '4 Zimmer' },
    { value: '5', label: '5 Zimmer' },
    { value: '6', label: '6+ Zimmer' },
  ];

  const cleaningIntensityOptions = [
    { value: 'oberflächlich', label: 'Oberflächlich' },
    { value: 'standard', label: 'Standard' },
    { value: 'gründlich', label: 'Gründlich' },
    { value: 'intensiv', label: 'Intensiv' },
    { value: 'tiefenreinigung', label: 'Tiefenreinigung' },
  ];

  const cleaningMaterialsOptions = [
    { value: 'mitbringen', label: 'Reiniger bringt alles mit' },
    { value: 'vorhanden', label: 'Materialien sind vorhanden' },
    { value: 'teilweise', label: 'Teilweise vorhanden' },
    { value: 'bio', label: 'Bio-Reinigungsmittel gewünscht' },
    { value: 'spezielle', label: 'Spezielle Reinigungsmittel' },
  ];

  const budgetRangeOptions = [
    { value: 'unter_20', label: 'Unter 20€/Stunde' },
    { value: '20_30', label: '20€ - 30€/Stunde' },
    { value: '30_40', label: '30€ - 40€/Stunde' },
    { value: '40_60', label: '40€ - 60€/Stunde' },
    { value: 'über_60', label: 'Über 60€/Stunde' },
    { value: 'pauschal', label: 'Pauschalpreis' },
  ];

  const additionalServicesOptions = [
    { value: 'wäsche', label: 'Wäsche waschen' },
    { value: 'bügeln', label: 'Bügeln' },
    { value: 'einkaufen', label: 'Einkaufen' },
    { value: 'geschirrspülen', label: 'Geschirrspülen' },
    { value: 'betten_machen', label: 'Betten machen' },
    { value: 'staubsaugen', label: 'Staubsaugen' },
    { value: 'wischen', label: 'Wischen' },
    { value: 'bad_reinigen', label: 'Bad reinigen' },
    { value: 'küche_reinigen', label: 'Küche reinigen' },
    { value: 'fenster_putzen', label: 'Fenster putzen' },
    { value: 'balkon_terrasse', label: 'Balkon/Terrasse' },
    { value: 'keller_dachboden', label: 'Keller/Dachboden' },
    { value: 'garage', label: 'Garage' },
    { value: 'möbel_pflegen', label: 'Möbel pflegen' },
    { value: 'pflanzen_gießen', label: 'Pflanzen gießen' },
  ];

  const specialRequirementsOptions = [
    { value: 'allergien', label: 'Allergien beachten' },
    { value: 'haustiere', label: 'Haustiere vorhanden' },
    { value: 'kinder', label: 'Kinder im Haushalt' },
    { value: 'senioren', label: 'Senioren im Haushalt' },
    { value: 'terminflexibilität', label: 'Terminflexibilität' },
    { value: 'schlüssel', label: 'Schlüsselübergabe' },
    { value: 'versicherung', label: 'Versicherung erforderlich' },
    { value: 'referenzen', label: 'Referenzen gewünscht' },
    { value: 'deutsch', label: 'Deutschkenntnisse' },
    { value: 'diskretion', label: 'Diskretion wichtig' },
  ];

  const urgencyOptions = [
    { value: 'nicht_eilig', label: 'Nicht eilig' },
    { value: 'normal', label: 'Normal' },
    { value: 'eilig', label: 'Eilig' },
    { value: 'sehr_eilig', label: 'Sehr eilig' },
  ];

  const accessibilityOptions = [
    { value: 'ebenerdig', label: 'Ebenerdig' },
    { value: 'treppe', label: 'Treppe' },
    { value: 'aufzug', label: 'Aufzug vorhanden' },
    { value: 'kein_aufzug', label: 'Kein Aufzug' },
    { value: 'parkplatz', label: 'Parkplatz vorhanden' },
    { value: 'öffentlich', label: 'Öffentliche Verkehrsmittel' },
  ];

  const handleInputChange = (field: keyof HausreinigungData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.propertyType &&
      formData.cleaningFrequency &&
      formData.propertySize &&
      formData.cleaningIntensity &&
      formData.cleaningMaterials &&
      formData.budgetRange &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Hausreinigung-Projektdetails
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

          <FormField label="Objekttyp" required>
            <FormSelect
              value={formData.propertyType || ''}
              onChange={value => handleInputChange('propertyType', value)}
              options={propertyTypeOptions}
              placeholder="Wählen Sie den Objekttyp"
            />
          </FormField>

          <FormField label="Reinigungsfrequenz" required>
            <FormSelect
              value={formData.cleaningFrequency || ''}
              onChange={value => handleInputChange('cleaningFrequency', value)}
              options={cleaningFrequencyOptions}
              placeholder="Wählen Sie die Häufigkeit"
            />
          </FormField>

          <FormField label="Objektgröße" required>
            <FormSelect
              value={formData.propertySize || ''}
              onChange={value => handleInputChange('propertySize', value)}
              options={propertySizeOptions}
              placeholder="Wählen Sie die Objektgröße"
            />
          </FormField>

          <FormField label="Anzahl Zimmer">
            <FormSelect
              value={String(formData.roomCount || '')}
              onChange={value => handleInputChange('roomCount', value)}
              options={roomCountOptions}
              placeholder="Wählen Sie die Zimmeranzahl"
            />
          </FormField>

          <FormField label="Reinigungsintensität" required>
            <FormSelect
              value={formData.cleaningIntensity || ''}
              onChange={value => handleInputChange('cleaningIntensity', value)}
              options={cleaningIntensityOptions}
              placeholder="Wählen Sie die Intensität"
            />
          </FormField>

          <FormField label="Reinigungsmaterialien" required>
            <FormSelect
              value={formData.cleaningMaterials || ''}
              onChange={value => handleInputChange('cleaningMaterials', value)}
              options={cleaningMaterialsOptions}
              placeholder="Wählen Sie die Materialien"
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

          <FormField label="Gewünschter Termin">
            <FormInput
              type="text"
              value={formData.preferredDate || ''}
              onChange={value => handleInputChange('preferredDate', value)}
              placeholder="TT.MM.JJJJ"
            />
          </FormField>

          <FormField label="Uhrzeit">
            <FormInput
              type="text"
              value={formData.preferredTime || ''}
              onChange={value => handleInputChange('preferredTime', value)}
              placeholder="HH:MM"
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

          <FormField label="Geschätzter Zeitaufwand">
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

          <FormField label="Anzahl Badezimmer">
            <FormInput
              type="number"
              value={formData.bathroomCount?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'bathroomCount',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl Badezimmer"
            />
          </FormField>

          <FormField label="Anzahl Toiletten">
            <FormInput
              type="number"
              value={formData.toiletCount?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'toiletCount',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl Toiletten"
            />
          </FormField>

          <FormField label="Anzahl Küchen">
            <FormInput
              type="number"
              value={formData.kitchenCount?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'kitchenCount',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl Küchen"
            />
          </FormField>

          <FormField label="Anzahl Balkone/Terrassen">
            <FormInput
              type="number"
              value={formData.balconyCount?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'balconyCount',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl Balkone/Terrassen"
            />
          </FormField>

          <FormField label="Anzahl Fenster">
            <FormInput
              type="number"
              value={formData.windowCount?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'windowCount',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl Fenster"
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
          <FormField label="Besondere Anforderungen">
            <FormCheckboxGroup
              value={formData.specialRequirements || []}
              onChange={value => handleInputChange('specialRequirements', value)}
              options={specialRequirementsOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zugänglichkeit">
            <FormCheckboxGroup
              value={formData.accessibility || []}
              onChange={value => handleInputChange('accessibility', value)}
              options={accessibilityOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Projektbeschreibung" required>
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie Ihre Reinigungsanforderungen detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Wünsche">
            <FormTextarea
              value={formData.specialRequests || ''}
              onChange={value => handleInputChange('specialRequests', value)}
              placeholder="Besondere Wünsche oder Anmerkungen"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Problembereiche">
            <FormTextarea
              value={formData.problemAreas || ''}
              onChange={value => handleInputChange('problemAreas', value)}
              placeholder="Besonders verschmutzte oder problematische Bereiche"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Allergieinformationen">
            <FormTextarea
              value={formData.allergyInfo || ''}
              onChange={value => handleInputChange('allergyInfo', value)}
              placeholder="Informationen zu Allergien oder Unverträglichkeiten"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Haustierinformationen">
            <FormTextarea
              value={formData.petInfo || ''}
              onChange={value => handleInputChange('petInfo', value)}
              placeholder="Informationen zu Haustieren"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zugangshinweise">
            <FormTextarea
              value={formData.accessInstructions || ''}
              onChange={value => handleInputChange('accessInstructions', value)}
              placeholder="Hinweise zum Zugang (Schlüssel, Klingel, etc.)"
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
          <FormField label="Regelmäßiger Service gewünscht">
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
          <FormField label="Anwesenheit während der Reinigung">
            <FormRadioGroup
              name="presenceDuringCleaning"
              value={formData.presenceDuringCleaning || ''}
              onChange={value => handleInputChange('presenceDuringCleaning', value)}
              options={[
                { value: 'ja', label: 'Ja, anwesend' },
                { value: 'nein', label: 'Nein, nicht anwesend' },
                { value: 'teilweise', label: 'Teilweise anwesend' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zahlungsart">
            <FormRadioGroup
              name="paymentMethod"
              value={formData.paymentMethod || ''}
              onChange={value => handleInputChange('paymentMethod', value)}
              options={[
                { value: 'bar', label: 'Bar' },
                { value: 'überweisung', label: 'Überweisung' },
                { value: 'rechnung', label: 'Rechnung' },
                { value: 'karte', label: 'Karte' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Versicherung erforderlich">
            <FormRadioGroup
              name="insuranceRequired"
              value={formData.insuranceRequired || ''}
              onChange={value => handleInputChange('insuranceRequired', value)}
              options={[
                { value: 'ja', label: 'Ja, Versicherung erforderlich' },
                { value: 'nein', label: 'Nein, nicht erforderlich' },
                { value: 'unklar', label: 'Bin mir nicht sicher' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Referenzen gewünscht">
            <FormRadioGroup
              name="referencesRequired"
              value={formData.referencesRequired || ''}
              onChange={value => handleInputChange('referencesRequired', value)}
              options={[
                { value: 'ja', label: 'Ja, Referenzen gewünscht' },
                { value: 'nein', label: 'Nein, nicht erforderlich' },
                { value: 'hilfreich', label: 'Hilfreich, aber nicht Pflicht' },
              ]}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default HausreinigungForm;
