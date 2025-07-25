'use client';
import React, { useState, useEffect } from 'react';
import { SwimmtrainerData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';

interface SwimmtrainerFormProps {
  data: SwimmtrainerData;
  onDataChange: (data: SwimmtrainerData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const SwimmtrainerForm: React.FC<SwimmtrainerFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<SwimmtrainerData>(data);

  const trainingTypeOptions = [
    { value: 'schwimmen_lernen', label: 'Schwimmen lernen (Anfänger)' },
    { value: 'technik_verbessern', label: 'Technik verbessern' },
    { value: 'kondition', label: 'Konditionstraining' },
    { value: 'wettkampf', label: 'Wettkampfvorbereitung' },
    { value: 'aqua_fitness', label: 'Aqua Fitness' },
    { value: 'wassergymnastik', label: 'Wassergymnastik' },
    { value: 'rehabilitation', label: 'Rehabilitation/Therapie' },
    { value: 'triathlon', label: 'Triathlon-Training' },
  ];

  const ageGroupOptions = [
    { value: 'kleinkinder', label: 'Kleinkinder (2-4 Jahre)' },
    { value: 'kinder', label: 'Kinder (5-12 Jahre)' },
    { value: 'jugendliche', label: 'Jugendliche (13-17 Jahre)' },
    { value: 'erwachsene', label: 'Erwachsene (18-59 Jahre)' },
    { value: 'senioren', label: 'Senioren (60+ Jahre)' },
  ];

  const skillLevelOptions = [
    { value: 'anfänger', label: 'Anfänger (kann nicht schwimmen)' },
    { value: 'grundlagen', label: 'Grundlagen (kann sich über Wasser halten)' },
    { value: 'fortgeschritten', label: 'Fortgeschritten (schwimmt sicher)' },
    { value: 'wettkampf', label: 'Wettkampfniveau' },
  ];

  const sessionTypeOptions = [
    { value: 'einzeltraining', label: 'Einzeltraining' },
    { value: 'kleingrupppe', label: 'Kleingruppe (2-4 Personen)' },
    { value: 'gruppe', label: 'Gruppe (5-8 Personen)' },
    { value: 'familie', label: 'Familientraining' },
  ];

  const urgencyOptions = [
    { value: 'sofort', label: 'Sofort' },
    { value: 'diese_woche', label: 'Diese Woche' },
    { value: 'nächste_woche', label: 'Nächste Woche' },
    { value: 'diesen_monat', label: 'Diesen Monat' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const handleInputChange = (field: keyof SwimmtrainerData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.trainingType &&
      formData.ageGroup &&
      formData.skillLevel &&
      formData.sessionType &&
      formData.urgency
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const isFormValid = () => {
    return !!(
      formData.trainingType &&
      formData.ageGroup &&
      formData.skillLevel &&
      formData.sessionType &&
      formData.urgency
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Schwimmtrainer Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art des Trainings" required>
            <FormSelect
              value={formData.trainingType || ''}
              onChange={value => handleInputChange('trainingType', value)}
              options={trainingTypeOptions}
              placeholder="Welche Art von Training wird benötigt?"
            />
          </FormField>

          <FormField label="Altersgruppe" required>
            <FormSelect
              value={formData.ageGroup || ''}
              onChange={value => handleInputChange('ageGroup', value)}
              options={ageGroupOptions}
              placeholder="Für welche Altersgruppe?"
            />
          </FormField>

          <FormField label="Aktuelles Schwimmniveau" required>
            <FormSelect
              value={formData.skillLevel || ''}
              onChange={value => handleInputChange('skillLevel', value)}
              options={skillLevelOptions}
              placeholder="Wie ist das aktuelle Niveau?"
            />
          </FormField>

          <FormField label="Art der Trainingseinheit" required>
            <FormSelect
              value={formData.sessionType || ''}
              onChange={value => handleInputChange('sessionType', value)}
              options={sessionTypeOptions}
              placeholder="Einzel- oder Gruppentraining?"
            />
          </FormField>

          <FormField label="Zeitrahmen" required>
            <FormSelect
              value={formData.urgency || ''}
              onChange={value => handleInputChange('urgency', value)}
              options={urgencyOptions}
              placeholder="Wann soll das Training beginnen?"
            />
          </FormField>

          <FormField label="Anzahl Personen">
            <FormInput
              type="number"
              value={formData.numberOfStudents || ''}
              onChange={value => handleInputChange('numberOfStudents', Number(value))}
              placeholder="Wie viele Personen?"
            />
          </FormField>

          <FormField label="Gewünschte Trainingsfrequenz">
            <FormInput
              type="text"
              value={formData.frequency || ''}
              onChange={value => handleInputChange('frequency', value)}
              placeholder="z.B. 2x pro Woche"
            />
          </FormField>

          <FormField label="Dauer pro Trainingseinheit">
            <FormInput
              type="text"
              value={formData.sessionDuration || ''}
              onChange={value => handleInputChange('sessionDuration', value)}
              placeholder="z.B. 45 Minuten"
            />
          </FormField>

          <FormField label="Budget pro Stunde">
            <FormInput
              type="text"
              value={formData.hourlyBudget || ''}
              onChange={value => handleInputChange('hourlyBudget', value)}
              placeholder="z.B. 30-50 EUR"
            />
          </FormField>

          <FormField label="Gewünschter Ort">
            <FormInput
              type="text"
              value={formData.location || ''}
              onChange={value => handleInputChange('location', value)}
              placeholder="z.B. Schwimmhalle Berlin-Mitte"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Schwimmstile">
            <FormCheckboxGroup
              value={formData.swimmingStyles || []}
              onChange={value => handleInputChange('swimmingStyles', value)}
              options={[
                { value: 'brustschwimmen', label: 'Brustschwimmen' },
                { value: 'freistil', label: 'Freistil/Kraul' },
                { value: 'rückenschwimmen', label: 'Rückenschwimmen' },
                { value: 'schmetterling', label: 'Schmetterling/Delfin' },
                { value: 'rettungsschwimmen', label: 'Rettungsschwimmen' },
                { value: 'alle', label: 'Alle Stile' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Spezielle Anforderungen">
            <FormCheckboxGroup
              value={formData.specialRequirements || []}
              onChange={value => handleInputChange('specialRequirements', value)}
              options={[
                { value: 'wasserangst', label: 'Umgang mit Wasserangst' },
                { value: 'behinderung', label: 'Erfahrung mit Behinderungen' },
                { value: 'verletzung', label: 'Nach Verletzung/OP' },
                { value: 'seepferdchen', label: 'Seepferdchen-Vorbereitung' },
                { value: 'abzeichen', label: 'Schwimmabzeichen-Training' },
                { value: 'wettkampf', label: 'Wettkampfvorbereitung' },
                { value: 'ausdauer', label: 'Ausdauer-Fokus' },
                { value: 'technik', label: 'Technik-Fokus' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Bevorzugte Trainingszeiten">
            <FormCheckboxGroup
              value={formData.preferredTimes || []}
              onChange={value => handleInputChange('preferredTimes', value)}
              options={[
                { value: 'früh_morgens', label: 'Früh morgens (6-9 Uhr)' },
                { value: 'vormittags', label: 'Vormittags (9-12 Uhr)' },
                { value: 'mittags', label: 'Mittags (12-15 Uhr)' },
                { value: 'nachmittags', label: 'Nachmittags (15-18 Uhr)' },
                { value: 'abends', label: 'Abends (18-21 Uhr)' },
                { value: 'wochenende', label: 'Wochenende' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Trainingsziele">
            <FormTextarea
              value={formData.trainingGoals || ''}
              onChange={value => handleInputChange('trainingGoals', value)}
              placeholder="Was soll durch das Training erreicht werden? (z.B. Seepferdchen, bessere Technik, Kondition)"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Hinweise">
            <FormTextarea
              value={formData.specialNotes || ''}
              onChange={value => handleInputChange('specialNotes', value)}
              placeholder="Besondere Hinweise zum Training, Ängste, Vorerfahrungen, etc."
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Schwimmerfahrung">
            <FormRadioGroup
              name="experience"
              value={formData.experience || ''}
              onChange={value => handleInputChange('experience', value)}
              options={[
                { value: 'keine', label: 'Keine Schwimmerfahrung' },
                { value: 'wenig', label: 'Wenig Erfahrung' },
                { value: 'gut', label: 'Gute Grundlagen' },
                { value: 'sehr_gut', label: 'Sehr gute Schwimmfähigkeiten' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Gesundheitszustand">
            <FormRadioGroup
              name="healthStatus"
              value={formData.healthStatus || ''}
              onChange={value => handleInputChange('healthStatus', value)}
              options={[
                { value: 'gesund', label: 'Gesund und fit' },
                { value: 'einschränkungen', label: 'Leichte Einschränkungen' },
                { value: 'rehabilitation', label: 'In Rehabilitation' },
                { value: 'spezielle_bedürfnisse', label: 'Spezielle Bedürfnisse' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Gewünschte Qualifikation">
            <FormRadioGroup
              name="qualification"
              value={formData.qualification || ''}
              onChange={value => handleInputChange('qualification', value)}
              options={[
                { value: 'egal', label: 'Egal' },
                { value: 'übungsleiter', label: 'Übungsleiter Schwimmen' },
                { value: 'trainer_c', label: 'Trainer C-Lizenz' },
                { value: 'trainer_b', label: 'Trainer B-Lizenz oder höher' },
              ]}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Schwimmtrainer" formData={formData} />
    </div>
  );
};

export default SwimmtrainerForm;
