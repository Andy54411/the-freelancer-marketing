import React, { useState, useEffect } from 'react';
import { BodenreinigungData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface BodenreinigungFormProps {
  data: BodenreinigungData;
  onDataChange: (data: BodenreinigungData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const BodenreinigungForm: React.FC<BodenreinigungFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<BodenreinigungData>(data);

  const serviceTypeOptions = [
    { value: 'grundreinigung', label: 'Grundreinigung' },
    { value: 'unterhaltsreinigung', label: 'Unterhaltsreinigung' },
    { value: 'tiefenreinigung', label: 'Tiefenreinigung' },
    { value: 'kristallisation', label: 'Kristallisation' },
    { value: 'imprägnierung', label: 'Imprägnierung' },
    { value: 'versiegelung', label: 'Versiegelung' },
    { value: 'politur', label: 'Politur' },
    { value: 'schleifung', label: 'Schleifung' },
    { value: 'restauration', label: 'Restauration' },
    { value: 'sanierung', label: 'Sanierung' },
    { value: 'fleckenentfernung', label: 'Fleckenentfernung' },
    { value: 'desinfizierung', label: 'Desinfizierung' },
  ];

  const floorTypeOptions = [
    { value: 'parkett', label: 'Parkett' },
    { value: 'laminat', label: 'Laminat' },
    { value: 'fliesen', label: 'Fliesen' },
    { value: 'naturstein', label: 'Naturstein' },
    { value: 'marmor', label: 'Marmor' },
    { value: 'granit', label: 'Granit' },
    { value: 'linoleum', label: 'Linoleum' },
    { value: 'vinyl', label: 'Vinyl' },
    { value: 'pvc', label: 'PVC' },
    { value: 'kork', label: 'Kork' },
    { value: 'teppichboden', label: 'Teppichboden' },
    { value: 'estrich', label: 'Estrich' },
    { value: 'beton', label: 'Beton' },
    { value: 'epoxidharz', label: 'Epoxidharz' },
    { value: 'andere', label: 'Andere' },
  ];

  const floorSizeOptions = [
    { value: 'klein', label: 'Klein (bis 50 qm)' },
    { value: 'mittel', label: 'Mittel (50-100 qm)' },
    { value: 'gross', label: 'Groß (100-200 qm)' },
    { value: 'sehr_gross', label: 'Sehr groß (200-500 qm)' },
    { value: 'mega', label: 'Mega (über 500 qm)' },
  ];

  const roomTypeOptions = [
    { value: 'wohnzimmer', label: 'Wohnzimmer' },
    { value: 'schlafzimmer', label: 'Schlafzimmer' },
    { value: 'küche', label: 'Küche' },
    { value: 'badezimmer', label: 'Badezimmer' },
    { value: 'flur', label: 'Flur' },
    { value: 'balkon', label: 'Balkon' },
    { value: 'terrasse', label: 'Terrasse' },
    { value: 'büro', label: 'Büro' },
    { value: 'geschäft', label: 'Geschäft' },
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'hotel', label: 'Hotel' },
    { value: 'klinik', label: 'Klinik' },
    { value: 'schule', label: 'Schule' },
    { value: 'lager', label: 'Lager' },
    { value: 'werkstatt', label: 'Werkstatt' },
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

  const cleaningMethodOptions = [
    { value: 'maschinell', label: 'Maschinell' },
    { value: 'handarbeit', label: 'Handarbeit' },
    { value: 'kombiniert', label: 'Kombiniert' },
    { value: 'dampfreinigung', label: 'Dampfreinigung' },
    { value: 'hochdruckreinigung', label: 'Hochdruckreinigung' },
    { value: 'chemische_reinigung', label: 'Chemische Reinigung' },
    { value: 'trockenreinigung', label: 'Trockenreinigung' },
    { value: 'nassreinigung', label: 'Nassreinigung' },
    { value: 'spezialverfahren', label: 'Spezialverfahren' },
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

  const budgetRangeOptions = [
    { value: 'unter_100', label: 'Unter 100€' },
    { value: '100_300', label: '100€ - 300€' },
    { value: '300_500', label: '300€ - 500€' },
    { value: '500_1000', label: '500€ - 1.000€' },
    { value: '1000_2000', label: '1.000€ - 2.000€' },
    { value: 'über_2000', label: 'Über 2.000€' },
  ];

  const additionalServicesOptions = [
    { value: 'möbel_verrücken', label: 'Möbel verrücken' },
    { value: 'schutzfolien', label: 'Schutzfolien' },
    { value: 'entsorgung', label: 'Entsorgung' },
    { value: 'lüftung', label: 'Lüftung' },
    { value: 'trocknung', label: 'Trocknung' },
    { value: 'geruchsbeseitigung', label: 'Geruchsbeseitigung' },
    { value: 'antibakterielle_behandlung', label: 'Antibakterielle Behandlung' },
    { value: 'anti_rutsch_behandlung', label: 'Anti-Rutsch-Behandlung' },
    { value: 'fugenreinigung', label: 'Fugenreinigung' },
    { value: 'sockelleistenreinigung', label: 'Sockelleistenreinigung' },
    { value: 'eckenreinigung', label: 'Eckenreinigung' },
    { value: 'kanten_versiegelung', label: 'Kantensversiegelung' },
    { value: 'pflege_beratung', label: 'Pflegeberatung' },
    { value: 'garantie', label: 'Garantie' },
    { value: 'nachbehandlung', label: 'Nachbehandlung' },
  ];

  const specialRequirementsOptions = [
    { value: 'allergien', label: 'Allergien beachten' },
    { value: 'haustiere', label: 'Haustiere vorhanden' },
    { value: 'kinder', label: 'Kinder im Haushalt' },
    { value: 'umweltfreundlich', label: 'Umweltfreundliche Mittel' },
    { value: 'geruchsarm', label: 'Geruchsarme Reinigung' },
    { value: 'schnell_trocknend', label: 'Schnell trocknend' },
    { value: 'rutschfest', label: 'Rutschfeste Behandlung' },
    { value: 'antibakteriell', label: 'Antibakterielle Behandlung' },
    { value: 'anti_allergisch', label: 'Anti-allergische Behandlung' },
    { value: 'wochenende', label: 'Wochenendarbeiten' },
    { value: 'nachts', label: 'Nachtarbeiten' },
    { value: 'leise', label: 'Leise Arbeitsweise' },
    { value: 'sicherheit', label: 'Hohe Sicherheitsstandards' },
    { value: 'versicherung', label: 'Versicherungsschutz' },
    { value: 'zertifizierung', label: 'Zertifizierte Reinigung' },
  ];

  const urgencyOptions = [
    { value: 'nicht_eilig', label: 'Nicht eilig' },
    { value: 'normal', label: 'Normal' },
    { value: 'eilig', label: 'Eilig' },
    { value: 'sehr_eilig', label: 'Sehr eilig' },
  ];

  const handleInputChange = (field: keyof BodenreinigungData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.floorType &&
      formData.floorSize &&
      formData.roomType &&
      formData.frequency &&
      formData.cleaningMethod &&
      formData.condition &&
      formData.budgetRange &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Bodenreinigung-Projektdetails
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

          <FormField label="Bodentyp" required>
            <FormSelect
              value={formData.floorType || ''}
              onChange={value => handleInputChange('floorType', value)}
              options={floorTypeOptions}
              placeholder="Wählen Sie den Bodentyp"
            />
          </FormField>

          <FormField label="Bodenfläche" required>
            <FormSelect
              value={formData.floorSize || ''}
              onChange={value => handleInputChange('floorSize', value)}
              options={floorSizeOptions}
              placeholder="Wählen Sie die Bodenfläche"
            />
          </FormField>

          <FormField label="Raumtyp" required>
            <FormSelect
              value={formData.roomType || ''}
              onChange={value => handleInputChange('roomType', value)}
              options={roomTypeOptions}
              placeholder="Wählen Sie den Raumtyp"
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

          <FormField label="Reinigungsmethode" required>
            <FormSelect
              value={formData.cleaningMethod || ''}
              onChange={value => handleInputChange('cleaningMethod', value)}
              options={cleaningMethodOptions}
              placeholder="Wählen Sie die Reinigungsmethode"
            />
          </FormField>

          <FormField label="Zustand des Bodens" required>
            <FormSelect
              value={formData.condition || ''}
              onChange={value => handleInputChange('condition', value)}
              options={conditionOptions}
              placeholder="Wählen Sie den Zustand"
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

          <FormField label="Genaue Quadratmeter">
            <FormInput
              type="number"
              value={formData.exactSquareMeters?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'exactSquareMeters',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Genaue qm-Angabe"
            />
          </FormField>

          <FormField label="Anzahl Räume">
            <FormInput
              type="number"
              value={formData.numberOfRooms?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'numberOfRooms',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl der Räume"
            />
          </FormField>

          <FormField label="Alter des Bodens">
            <FormInput
              type="number"
              value={formData.floorAge?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'floorAge',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Alter in Jahren"
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

          <FormField label="Hersteller/Marke">
            <FormInput
              type="text"
              value={formData.manufacturer || ''}
              onChange={value => handleInputChange('manufacturer', value)}
              placeholder="Hersteller oder Marke des Bodens"
            />
          </FormField>

          <FormField label="Oberflächenbehandlung">
            <FormInput
              type="text"
              value={formData.surfaceTreatment || ''}
              onChange={value => handleInputChange('surfaceTreatment', value)}
              placeholder="Bestehende Oberflächenbehandlung"
            />
          </FormField>

          <FormField label="Stockwerk">
            <FormInput
              type="number"
              value={formData.floor?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'floor',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Stockwerk"
            />
          </FormField>

          <FormField label="Aufzug vorhanden">
            <FormInput
              type="text"
              value={formData.elevator || ''}
              onChange={value => handleInputChange('elevator', value)}
              placeholder="Ja/Nein"
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
          <FormField label="Projektbeschreibung" required>
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie Ihre Bodenreinigung-Anforderungen detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Verschmutzungsart">
            <FormTextarea
              value={formData.dirtType || ''}
              onChange={value => handleInputChange('dirtType', value)}
              placeholder="Beschreiben Sie die Art der Verschmutzung"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Problemstellen">
            <FormTextarea
              value={formData.problemAreas || ''}
              onChange={value => handleInputChange('problemAreas', value)}
              placeholder="Beschreiben Sie besondere Problemstellen"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Vorherige Behandlungen">
            <FormTextarea
              value={formData.previousTreatments || ''}
              onChange={value => handleInputChange('previousTreatments', value)}
              placeholder="Vorherige Reinigungen oder Behandlungen"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Allergien/Sensitivitäten">
            <FormTextarea
              value={formData.allergies || ''}
              onChange={value => handleInputChange('allergies', value)}
              placeholder="Allergien oder Sensitivitäten"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zugangshinweise">
            <FormTextarea
              value={formData.accessInstructions || ''}
              onChange={value => handleInputChange('accessInstructions', value)}
              placeholder="Hinweise zum Zugang"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Nachbehandlung">
            <FormTextarea
              value={formData.aftercare || ''}
              onChange={value => handleInputChange('aftercare', value)}
              placeholder="Gewünschte Nachbehandlung oder Pflege"
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
          <FormField label="Schutzmaßnahmen erforderlich">
            <FormRadioGroup
              name="protectionRequired"
              value={formData.protectionRequired || ''}
              onChange={value => handleInputChange('protectionRequired', value)}
              options={[
                { value: 'ja', label: 'Ja, Schutzmaßnahmen erforderlich' },
                { value: 'nein', label: 'Nein, nicht erforderlich' },
                { value: 'teilweise', label: 'Teilweise erforderlich' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Versiegelung gewünscht">
            <FormRadioGroup
              name="sealingDesired"
              value={formData.sealingDesired || ''}
              onChange={value => handleInputChange('sealingDesired', value)}
              options={[
                { value: 'ja', label: 'Ja, Versiegelung gewünscht' },
                { value: 'nein', label: 'Nein, nur Reinigung' },
                { value: 'beratung', label: 'Beratung gewünscht' },
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
          <FormField label="Regelmäßige Wartung">
            <FormRadioGroup
              name="regularMaintenance"
              value={formData.regularMaintenance || ''}
              onChange={value => handleInputChange('regularMaintenance', value)}
              options={[
                { value: 'ja', label: 'Ja, regelmäßige Wartung' },
                { value: 'nein', label: 'Nein, einmalig' },
                { value: 'später', label: 'Später entscheiden' },
              ]}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default BodenreinigungForm;
