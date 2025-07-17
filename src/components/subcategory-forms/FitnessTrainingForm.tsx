import React, { useState, useEffect } from 'react';
import { FitnessTrainingData } from '@/types/subcategory-forms';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface FitnessTrainingFormProps {
  data: FitnessTrainingData;
  onDataChange: (data: FitnessTrainingData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const FitnessTrainingForm: React.FC<FitnessTrainingFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const handleFieldChange = (field: keyof FitnessTrainingData, value: any) => {
    onDataChange({
      ...data,
      [field]: value,
    });
  };

  // Validierungslogik
  useEffect(() => {
    const isValid = !!(data.trainingType && data.durationPerSession && data.pricePerSession);
    onValidationChange(isValid);
  }, [data, onValidationChange]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Fitness-Training</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormField label="Art des Trainings" required>
            <FormSelect
              value={data.serviceType}
              onChange={value => handleFieldChange('serviceType', value)}
              options={[
                { value: 'personal_training', label: 'Personal Training' },
                { value: 'gruppentraining', label: 'Gruppentraining' },
                { value: 'krafttraining', label: 'Krafttraining' },
                { value: 'ausdauer', label: 'Ausdauertraining' },
                { value: 'functional', label: 'Functional Training' },
                { value: 'yoga', label: 'Yoga' },
                { value: 'pilates', label: 'Pilates' },
                { value: 'crossfit', label: 'CrossFit' },
                { value: 'martial_arts', label: 'Kampfsport' },
                { value: 'dance', label: 'Tanz-Fitness' },
                { value: 'rehabilitation', label: 'Reha-Training' },
                { value: 'abnehmen', label: 'Abnehm-Training' },
              ]}
            />
          </FormField>

          <FormField label="Fitness-Level" required>
            <FormSelect
              value={data.fitnessLevel}
              onChange={value => handleFieldChange('fitnessLevel', value)}
              options={[
                { value: 'anfänger', label: 'Anfänger' },
                { value: 'fortgeschritten', label: 'Fortgeschritten' },
                { value: 'profi', label: 'Profi' },
              ]}
            />
          </FormField>

          <FormField label="Trainingsort" required>
            <FormSelect
              value={data.location}
              onChange={value => handleFieldChange('location', value)}
              options={[
                { value: 'zuhause', label: 'Zuhause' },
                { value: 'studio', label: 'Im Fitness-Studio' },
                { value: 'outdoor', label: 'Im Freien' },
                { value: 'online', label: 'Online-Training' },
                { value: 'flexibel', label: 'Flexibel' },
              ]}
            />
          </FormField>

          <FormField label="Trainingsziel">
            <FormCheckboxGroup
              value={data.goals || []}
              onChange={value => handleFieldChange('goals', value)}
              options={[
                { value: 'abnehmen', label: 'Abnehmen' },
                { value: 'muskelaufbau', label: 'Muskelaufbau' },
                { value: 'ausdauer', label: 'Ausdauer verbessern' },
                { value: 'kraft', label: 'Kraft steigern' },
                { value: 'beweglichkeit', label: 'Beweglichkeit' },
                { value: 'haltung', label: 'Haltung verbessern' },
                { value: 'stress', label: 'Stressabbau' },
                { value: 'rehabilitation', label: 'Rehabilitation' },
                { value: 'wettkampf', label: 'Wettkampfvorbereitung' },
              ]}
            />
          </FormField>

          <FormField label="Trainingsfrequenz">
            <FormSelect
              value={data.frequency || ''}
              onChange={value => handleFieldChange('frequency', value)}
              options={[
                { value: '1x_woche', label: '1x pro Woche' },
                { value: '2x_woche', label: '2x pro Woche' },
                { value: '3x_woche', label: '3x pro Woche' },
                { value: '4x_woche', label: '4x pro Woche' },
                { value: 'täglich', label: 'Täglich' },
                { value: 'individuell', label: 'Individuell' },
              ]}
            />
          </FormField>

          <FormField label="Trainingszeit pro Einheit">
            <FormSelect
              value={data.sessionDuration || ''}
              onChange={value => handleFieldChange('sessionDuration', value)}
              options={[
                { value: '30_min', label: '30 Minuten' },
                { value: '45_min', label: '45 Minuten' },
                { value: '60_min', label: '60 Minuten' },
                { value: '90_min', label: '90 Minuten' },
                { value: 'flexibel', label: 'Flexibel' },
              ]}
            />
          </FormField>

          <FormField label="Bevorzugte Trainingszeit">
            <FormSelect
              value={data.preferredTime || ''}
              onChange={value => handleFieldChange('preferredTime', value)}
              options={[
                { value: 'früh', label: 'Früh am Morgen' },
                { value: 'vormittags', label: 'Vormittags' },
                { value: 'mittags', label: 'Mittags' },
                { value: 'nachmittags', label: 'Nachmittags' },
                { value: 'abends', label: 'Abends' },
                { value: 'wochenende', label: 'Wochenende' },
                { value: 'flexibel', label: 'Flexibel' },
              ]}
            />
          </FormField>
          <FormField label="Gesundheitliche Einschränkungen">
            <FormTextarea
              value={data.healthRestrictions || ''}
              onChange={value => handleFieldChange('healthRestrictions', value)}
              placeholder="Bitte beschreiben Sie eventuelle gesundheitliche Einschränkungen oder Verletzungen..."
            />
          </FormField>

          <FormField label="Zusätzliche Wünsche">
            <FormTextarea
              value={data.additionalInfo || ''}
              onChange={value => handleFieldChange('additionalInfo', value)}
              placeholder="Besondere Wünsche oder Anforderungen..."
            />
          </FormField>
        </CardContent>
      </Card>
    </div>
  );
};

export default FitnessTrainingForm;
