import React, { useState, useEffect } from 'react';
import { TierbetreuungData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface TierbetreuungFormProps {
  data: TierbetreuungData;
  onDataChange: (data: TierbetreuungData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const TierbetreuungForm: React.FC<TierbetreuungFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<TierbetreuungData>(data);

  const serviceTypeOptions = [
    { value: 'pet_sitting', label: 'Haustierbetreuung' },
    { value: 'dog_walking', label: 'Hundespaziergänge' },
    { value: 'pet_boarding', label: 'Tierpension' },
    { value: 'veterinary_transport', label: 'Tierarztfahrten' },
    { value: 'pet_grooming', label: 'Tierpflege' },
    { value: 'pet_training', label: 'Tiertraining' },
    { value: 'pet_daycare', label: 'Tiertagespflege' },
    { value: 'overnight_care', label: 'Übernachtungsbetreuung' },
    { value: 'holiday_care', label: 'Urlaubsbetreuung' },
    { value: 'emergency_care', label: 'Notfallbetreuung' },
  ];

  const animalTypeOptions = [
    { value: 'hund', label: 'Hund' },
    { value: 'katze', label: 'Katze' },
    { value: 'kaninchen', label: 'Kaninchen' },
    { value: 'meerschweinchen', label: 'Meerschweinchen' },
    { value: 'hamster', label: 'Hamster' },
    { value: 'vogel', label: 'Vogel' },
    { value: 'fisch', label: 'Fisch' },
    { value: 'reptil', label: 'Reptil' },
    { value: 'pferd', label: 'Pferd' },
    { value: 'andere', label: 'Andere' },
  ];

  const dogSizeOptions = [
    { value: 'klein', label: 'Klein (unter 10kg)' },
    { value: 'mittel', label: 'Mittel (10-25kg)' },
    { value: 'gross', label: 'Groß (25-40kg)' },
    { value: 'sehr_gross', label: 'Sehr groß (über 40kg)' },
  ];

  const frequencyOptions = [
    { value: 'einmalig', label: 'Einmalig' },
    { value: 'gelegentlich', label: 'Gelegentlich' },
    { value: 'wöchentlich', label: 'Wöchentlich' },
    { value: 'mehrmals_wöchentlich', label: 'Mehrmals wöchentlich' },
    { value: 'täglich', label: 'Täglich' },
    { value: 'urlaubsvertretung', label: 'Urlaubsvertretung' },
  ];

  const durationOptions = [
    { value: '1_stunde', label: '1 Stunde' },
    { value: '2_stunden', label: '2 Stunden' },
    { value: '3_stunden', label: '3 Stunden' },
    { value: '4_stunden', label: '4 Stunden' },
    { value: 'halber_tag', label: 'Halber Tag' },
    { value: 'ganzer_tag', label: 'Ganzer Tag' },
    { value: 'übernachtung', label: 'Übernachtung' },
    { value: 'mehrere_tage', label: 'Mehrere Tage' },
  ];

  const locationOptions = [
    { value: 'beim_besitzer', label: 'Beim Besitzer' },
    { value: 'beim_betreuer', label: 'Beim Betreuer' },
    { value: 'outdoor', label: 'Outdoor (Spaziergänge)' },
    { value: 'flexibel', label: 'Flexibel' },
  ];
  const specialCareOptions = [
    { value: 'medication', label: 'Medikamentengabe' },
    { value: 'special_diet', label: 'Spezielle Ernährung' },
    { value: 'elderly_care', label: 'Seniorenbetreuung' },
    { value: 'puppy_care', label: 'Welpenbetreuung' },
    { value: 'behavioral_issues', label: 'Verhaltensprobleme' },
    { value: 'disabled_care', label: 'Behindertenbetreuung' },
    { value: 'anxiety_support', label: 'Angst-Unterstützung' },
    { value: 'grooming', label: 'Fellpflege' },
    { value: 'training', label: 'Training' },
    { value: 'socialization', label: 'Sozialisierung' },
  ];

  const additionalServicesOptions = [
    { value: 'feeding', label: 'Fütterung' },
    { value: 'plant_care', label: 'Pflanzenpflege' },
    { value: 'mail_collection', label: 'Posteinwurf' },
    { value: 'house_check', label: 'Hauskontrolle' },
    { value: 'cleaning', label: 'Grundreinigung' },
    { value: 'toy_provision', label: 'Spielzeug mitbringen' },
    { value: 'photo_updates', label: 'Foto-Updates' },
    { value: 'emergency_contact', label: 'Notfallkontakt' },
    { value: 'vet_transport', label: 'Tierarztfahrt' },
    { value: 'exercise', label: 'Zusätzliche Bewegung' },
  ];

  const handleInputChange = (field: keyof TierbetreuungData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.animalType &&
      formData.frequency &&
      formData.duration &&
      formData.location &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Tierbetreuungs-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Dienstleistung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art der Tierbetreuung"
            />
          </FormField>

          <FormField label="Tierart" required>
            <FormSelect
              value={formData.animalType || ''}
              onChange={value => handleInputChange('animalType', value)}
              options={animalTypeOptions}
              placeholder="Wählen Sie die Tierart"
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

          <FormField label="Dauer" required>
            <FormSelect
              value={formData.duration || ''}
              onChange={value => handleInputChange('duration', value)}
              options={durationOptions}
              placeholder="Wählen Sie die Dauer"
            />
          </FormField>

          <FormField label="Ort" required>
            <FormSelect
              value={formData.location || ''}
              onChange={value => handleInputChange('location', value)}
              options={locationOptions}
              placeholder="Wählen Sie den Ort"
            />
          </FormField>
          <FormField label="Hundegröße">
            <FormSelect
              value={formData.dogSize || ''}
              onChange={value => handleInputChange('dogSize', value)}
              options={dogSizeOptions}
              placeholder="Wählen Sie die Hundegröße"
            />
          </FormField>

          <FormField label="Tiername">
            <FormInput
              type="text"
              value={formData.petName || ''}
              onChange={value => handleInputChange('petName', value)}
              placeholder="Name des Tieres"
            />
          </FormField>

          <FormField label="Alter des Tieres">
            <FormInput
              type="number"
              value={formData.petAge?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'petAge',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Alter in Jahren"
            />
          </FormField>

          <FormField label="Rasse">
            <FormInput
              type="text"
              value={formData.breed || ''}
              onChange={value => handleInputChange('breed', value)}
              placeholder="Rasse des Tieres"
            />
          </FormField>

          <FormField label="Gewicht">
            <FormInput
              type="number"
              value={formData.weight?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'weight',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Gewicht in kg"
            />
          </FormField>

          <FormField label="Tierarzt">
            <FormInput
              type="text"
              value={formData.veterinarian || ''}
              onChange={value => handleInputChange('veterinarian', value)}
              placeholder="Tierarzt mit Kontaktdaten"
            />
          </FormField>

          <FormField label="Notfallkontakt">
            <FormInput
              type="text"
              value={formData.emergencyContact || ''}
              onChange={value => handleInputChange('emergencyContact', value)}
              placeholder="Notfallkontakt"
            />
          </FormField>

          <FormField label="Startdatum">
            <FormInput
              type="text"
              value={formData.startDate || ''}
              onChange={value => handleInputChange('startDate', value)}
              placeholder="TT.MM.JJJJ"
            />
          </FormField>

          <FormField label="Enddatum">
            <FormInput
              type="text"
              value={formData.endDate || ''}
              onChange={value => handleInputChange('endDate', value)}
              placeholder="TT.MM.JJJJ"
            />
          </FormField>

          <FormField label="Bevorzugte Zeiten">
            <FormInput
              type="text"
              value={formData.preferredTimes || ''}
              onChange={value => handleInputChange('preferredTimes', value)}
              placeholder="z.B. 8:00-18:00"
            />
          </FormField>

          <FormField label="Futter">
            <FormInput
              type="text"
              value={formData.food || ''}
              onChange={value => handleInputChange('food', value)}
              placeholder="Futter und Fütterungszeiten"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Betreuung">
            <FormCheckboxGroup
              value={formData.specialCare || []}
              onChange={value => handleInputChange('specialCare', value)}
              options={specialCareOptions}
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
              placeholder="Beschreiben Sie Ihre Tierbetreuungsanforderungen detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Charakter des Tieres">
            <FormTextarea
              value={formData.petCharacter || ''}
              onChange={value => handleInputChange('petCharacter', value)}
              placeholder="Beschreiben Sie den Charakter und die Eigenarten Ihres Tieres"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Bedürfnisse">
            <FormTextarea
              value={
                Array.isArray(formData.specialNeeds)
                  ? formData.specialNeeds.join(', ')
                  : formData.specialNeeds || ''
              }
              onChange={value => handleInputChange('specialNeeds', value)}
              placeholder="Besondere Bedürfnisse oder Anforderungen"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Gesundheitsinformationen">
            <FormTextarea
              value={formData.healthInfo || ''}
              onChange={value => handleInputChange('healthInfo', value)}
              placeholder="Gesundheitsinformationen, Medikamente, Allergien"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Routine und Gewohnheiten">
            <FormTextarea
              value={formData.routine || ''}
              onChange={value => handleInputChange('routine', value)}
              placeholder="Tagesroutine und Gewohnheiten des Tieres"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Lieblingsspielzeug">
            <FormTextarea
              value={formData.favoriteToys || ''}
              onChange={value => handleInputChange('favoriteToys', value)}
              placeholder="Lieblingsspielzeug und Beschäftigungen"
              rows={2}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Ängste und Abneigungen">
            <FormTextarea
              value={formData.fears || ''}
              onChange={value => handleInputChange('fears', value)}
              placeholder="Ängste, Abneigungen oder Trigger"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Gechipt">
            <FormRadioGroup
              name="microchipped"
              value={formData.microchipped || ''}
              onChange={value => handleInputChange('microchipped', value)}
              options={[
                { value: 'ja', label: 'Ja, mit Chip' },
                { value: 'nein', label: 'Nein, nicht gechipt' },
                { value: 'unsicher', label: 'Unsicher' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Versicherung">
            <FormRadioGroup
              name="insured"
              value={formData.insured || ''}
              onChange={value => handleInputChange('insured', value)}
              options={[
                { value: 'ja', label: 'Ja, versichert' },
                { value: 'nein', label: 'Nein, nicht versichert' },
                { value: 'teilweise', label: 'Teilweise versichert' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Sozialverhalten">
            <FormRadioGroup
              name="socialBehavior"
              value={formData.socialBehavior || ''}
              onChange={value => handleInputChange('socialBehavior', value)}
              options={[
                { value: 'sehr_sozial', label: 'Sehr sozial' },
                { value: 'sozial', label: 'Sozial' },
                { value: 'vorsichtig', label: 'Vorsichtig' },
                { value: 'scheu', label: 'Scheu' },
                { value: 'aggressiv', label: 'Aggressiv' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Kastration">
            <FormRadioGroup
              name="neutered"
              value={formData.neutered || ''}
              onChange={value => handleInputChange('neutered', value)}
              options={[
                { value: 'ja', label: 'Ja, kastriert' },
                { value: 'nein', label: 'Nein, nicht kastriert' },
                { value: 'unsicher', label: 'Unsicher' },
              ]}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default TierbetreuungForm;
