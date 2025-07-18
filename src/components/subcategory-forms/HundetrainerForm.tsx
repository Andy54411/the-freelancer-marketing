import React, { useState, useEffect } from 'react';
import { HundetrainerData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';

interface HundetrainerFormProps {
  data: HundetrainerData;
  onDataChange: (data: HundetrainerData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const HundetrainerForm: React.FC<HundetrainerFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<HundetrainerData>(data);

  const serviceTypeOptions = [
    { value: 'grundausbildung', label: 'Grundausbildung' },
    { value: 'welpentraining', label: 'Welpentraining' },
    { value: 'verhaltenskorrektur', label: 'Verhaltenskorrektur' },
    { value: 'einzeltraining', label: 'Einzeltraining' },
    { value: 'gruppentraining', label: 'Gruppentraining' },
    { value: 'agility', label: 'Agility-Training' },
    { value: 'schutztraining', label: 'Schutztraining' },
    { value: 'therapiehund', label: 'Therapiehund-Ausbildung' },
    { value: 'jagdtraining', label: 'Jagdtraining' },
    { value: 'clickertraining', label: 'Clickertraining' },
  ];

  const dogBreedOptions = [
    { value: 'schäferhund', label: 'Schäferhund' },
    { value: 'labrador', label: 'Labrador' },
    { value: 'golden_retriever', label: 'Golden Retriever' },
    { value: 'mischling', label: 'Mischling' },
    { value: 'dackel', label: 'Dackel' },
    { value: 'border_collie', label: 'Border Collie' },
    { value: 'rottweiler', label: 'Rottweiler' },
    { value: 'dobermann', label: 'Dobermann' },
    { value: 'bulldogge', label: 'Bulldogge' },
    { value: 'jack_russell', label: 'Jack Russell Terrier' },
    { value: 'andere', label: 'Andere Rasse' },
  ];

  const dogSizeOptions = [
    { value: 'klein', label: 'Klein (unter 10kg)' },
    { value: 'mittel', label: 'Mittel (10-25kg)' },
    { value: 'gross', label: 'Groß (25-40kg)' },
    { value: 'sehr_gross', label: 'Sehr groß (über 40kg)' },
  ];

  const trainingLocationOptions = [
    { value: 'zuhause', label: 'Bei Ihnen zu Hause' },
    { value: 'trainingsplatz', label: 'Auf dem Trainingsplatz' },
    { value: 'outdoor', label: 'Im Freien (Park, Wald)' },
    { value: 'hundeschule', label: 'In der Hundeschule' },
    { value: 'flexibel', label: 'Flexibel je nach Bedarf' },
  ];

  const frequencyOptions = [
    { value: 'einmalig', label: 'Einmalig' },
    { value: 'wöchentlich', label: 'Wöchentlich' },
    { value: 'zweiwöchentlich', label: 'Alle 2 Wochen' },
    { value: 'monatlich', label: 'Monatlich' },
    { value: 'kurs', label: 'Kurs (mehrere Termine)' },
    { value: 'intensiv', label: 'Intensivtraining' },
  ];
  const problemBehaviorOptions = [
    { value: 'aggression', label: 'Aggression' },
    { value: 'bellen', label: 'Übermäßiges Bellen' },
    { value: 'ziehen_leine', label: 'Ziehen an der Leine' },
    { value: 'ungehorsam', label: 'Ungehorsam' },
    { value: 'angst', label: 'Ängstlichkeit' },
    { value: 'trennungsangst', label: 'Trennungsangst' },
    { value: 'zerstörung', label: 'Zerstörungsverhalten' },
    { value: 'unsauberkeit', label: 'Unsauberkeit' },
    { value: 'hyperaktivität', label: 'Hyperaktivität' },
    { value: 'ressourcenverteidigung', label: 'Ressourcenverteidigung' },
  ];

  const trainingGoalsOptions = [
    { value: 'grundkommandos', label: 'Grundkommandos' },
    { value: 'leinenführigkeit', label: 'Leinenführigkeit' },
    { value: 'rückruf', label: 'Rückruf' },
    { value: 'sozialisation', label: 'Sozialisation' },
    { value: 'stubenreinheit', label: 'Stubenreinheit' },
    { value: 'ruhe', label: 'Ruhe und Entspannung' },
    { value: 'apportieren', label: 'Apportieren' },
    { value: 'tricks', label: 'Tricks' },
    { value: 'schutz', label: 'Schutztraining' },
    { value: 'therapie', label: 'Therapiehund-Verhalten' },
  ];

  const additionalServicesOptions = [
    { value: 'verhaltensanalyse', label: 'Verhaltensanalyse' },
    { value: 'beratung', label: 'Beratung' },
    { value: 'hausbesuch', label: 'Hausbesuch' },
    { value: 'notfalltraining', label: 'Notfalltraining' },
    { value: 'gruppenaktivitäten', label: 'Gruppenaktivitäten' },
    { value: 'ernährungsberatung', label: 'Ernährungsberatung' },
    { value: 'gesundheitscheck', label: 'Gesundheitscheck' },
    { value: 'beschäftigungstherapie', label: 'Beschäftigungstherapie' },
    { value: 'stressmanagement', label: 'Stressmanagement' },
    { value: 'nachbetreuung', label: 'Nachbetreuung' },
  ];

  const handleInputChange = (field: keyof HundetrainerData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.dogBreed &&
      formData.dogSize &&
      formData.trainingLocation &&
      formData.frequency &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.dogBreed &&
      formData.dogSize &&
      formData.trainingLocation &&
      formData.frequency &&
      formData.projectDescription
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Hundetrainer-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Dienstleistung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art des Trainings"
            />
          </FormField>

          <FormField label="Hunderasse" required>
            <FormSelect
              value={formData.dogBreed || ''}
              onChange={value => handleInputChange('dogBreed', value)}
              options={dogBreedOptions}
              placeholder="Wählen Sie die Hunderasse"
            />
          </FormField>

          <FormField label="Hundegröße" required>
            <FormSelect
              value={formData.dogSize || ''}
              onChange={value => handleInputChange('dogSize', value)}
              options={dogSizeOptions}
              placeholder="Wählen Sie die Hundegröße"
            />
          </FormField>

          <FormField label="Trainingsort" required>
            <FormSelect
              value={formData.trainingLocation || ''}
              onChange={value => handleInputChange('trainingLocation', value)}
              options={trainingLocationOptions}
              placeholder="Wählen Sie den Trainingsort"
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
          <FormField label="Name des Hundes">
            <FormInput
              type="text"
              value={formData.dogName || ''}
              onChange={value => handleInputChange('dogName', value)}
              placeholder="Name des Hundes"
            />
          </FormField>

          <FormField label="Alter des Hundes">
            <FormInput
              type="number"
              value={formData.dogAge?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'dogAge',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Alter in Jahren"
            />
          </FormField>

          <FormField label="Gewicht des Hundes">
            <FormInput
              type="number"
              value={formData.dogWeight?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'dogWeight',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Gewicht in kg"
            />
          </FormField>

          <FormField label="Gewünschter Starttermin">
            <FormInput
              type="text"
              value={formData.preferredStartDate || ''}
              onChange={value => handleInputChange('preferredStartDate', value)}
              placeholder="TT.MM.JJJJ"
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

          <FormField label="Vorherige Trainer">
            <FormInput
              type="text"
              value={formData.previousTrainers || ''}
              onChange={value => handleInputChange('previousTrainers', value)}
              placeholder="Vorherige Hundetrainer"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Problemverhalten">
            <FormCheckboxGroup
              value={formData.problemBehaviors || []}
              onChange={value => handleInputChange('problemBehaviors', value)}
              options={problemBehaviorOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Trainingsziele">
            <FormCheckboxGroup
              value={formData.trainingGoals || []}
              onChange={value => handleInputChange('trainingGoals', value)}
              options={trainingGoalsOptions}
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
              placeholder="Beschreiben Sie Ihre Hundetraining-Anforderungen detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Hundeverhalten">
            <FormTextarea
              value={formData.dogBehavior || ''}
              onChange={value => handleInputChange('dogBehavior', value)}
              placeholder="Beschreiben Sie das aktuelle Verhalten Ihres Hundes"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Sozialverhalten">
            <FormTextarea
              value={formData.socialBehavior || ''}
              onChange={value => handleInputChange('socialBehavior', value)}
              placeholder="Verhalten gegenüber anderen Hunden und Menschen"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Medizinische Besonderheiten">
            <FormTextarea
              value={formData.medicalConditions || ''}
              onChange={value => handleInputChange('medicalConditions', value)}
              placeholder="Gesundheitliche Besonderheiten oder Einschränkungen"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Bisherige Trainingserfahrung">
            <FormTextarea
              value={formData.previousTrainingExperience || ''}
              onChange={value => handleInputChange('previousTrainingExperience', value)}
              placeholder="Bisherige Trainingserfahrung und -methoden"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Familiensituation">
            <FormTextarea
              value={formData.familySituation || ''}
              onChange={value => handleInputChange('familySituation', value)}
              placeholder="Familiensituation, Kinder, andere Haustiere"
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

        <div className="mt-4">
          <FormField label="Geschlecht des Hundes">
            <FormRadioGroup
              name="dogGender"
              value={formData.dogGender || ''}
              onChange={value => handleInputChange('dogGender', value)}
              options={[
                { value: 'rüde', label: 'Rüde' },
                { value: 'hündin', label: 'Hündin' },
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
                { value: 'geplant', label: 'Geplant' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Trainingserfahrung des Besitzers">
            <FormRadioGroup
              name="ownerExperience"
              value={formData.ownerExperience || ''}
              onChange={value => handleInputChange('ownerExperience', value)}
              options={[
                { value: 'anfänger', label: 'Anfänger' },
                { value: 'fortgeschritten', label: 'Fortgeschritten' },
                { value: 'erfahren', label: 'Erfahren' },
                { value: 'profi', label: 'Profi' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4"></div>

        <div className="mt-4">
          <FormField label="Impfstatus">
            <FormRadioGroup
              name="vaccinationStatus"
              value={formData.vaccinationStatus || ''}
              onChange={value => handleInputChange('vaccinationStatus', value)}
              options={[
                { value: 'vollständig', label: 'Vollständig geimpft' },
                { value: 'teilweise', label: 'Teilweise geimpft' },
                { value: 'nicht_geimpft', label: 'Nicht geimpft' },
                { value: 'unbekannt', label: 'Unbekannt' },
              ]}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Hundetrainer" />
    </div>
  );
};

export default HundetrainerForm;
