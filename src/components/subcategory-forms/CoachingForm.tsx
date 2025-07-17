import React, { useState, useEffect } from 'react';
import { CoachingData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface CoachingFormProps {
  data: CoachingData;
  onDataChange: (data: CoachingData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const CoachingForm: React.FC<CoachingFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<CoachingData>(data);

  const serviceTypeOptions = [
    { value: 'life_coaching', label: 'Life Coaching' },
    { value: 'business_coaching', label: 'Business Coaching' },
    { value: 'career_coaching', label: 'Career Coaching' },
    { value: 'executive_coaching', label: 'Executive Coaching' },
    { value: 'health_coaching', label: 'Health Coaching' },
    { value: 'relationship_coaching', label: 'Relationship Coaching' },
    { value: 'fitness_coaching', label: 'Fitness Coaching' },
    { value: 'mindfulness_coaching', label: 'Mindfulness Coaching' },
    { value: 'spiritual_coaching', label: 'Spiritual Coaching' },
    { value: 'financial_coaching', label: 'Financial Coaching' },
  ];

  const sessionTypeOptions = [
    { value: 'einzelsession', label: 'Einzelsession' },
    { value: 'gruppensession', label: 'Gruppensession' },
    { value: 'online', label: 'Online-Coaching' },
    { value: 'hybrid', label: 'Hybrid (Online + Präsenz)' },
    { value: 'intensive', label: 'Intensiv-Coaching' },
  ];

  const durationOptions = [
    { value: '60', label: '60 Minuten' },
    { value: '90', label: '90 Minuten' },
    { value: '120', label: '120 Minuten' },
    { value: '180', label: '3 Stunden' },
    { value: 'ganztag', label: 'Ganztag' },
  ];

  const frequencyOptions = [
    { value: 'einmalig', label: 'Einmalig' },
    { value: 'wöchentlich', label: 'Wöchentlich' },
    { value: 'zweiwöchentlich', label: 'Alle 2 Wochen' },
    { value: 'monatlich', label: 'Monatlich' },
    { value: 'intensiv', label: 'Intensiv (mehrmals pro Woche)' },
    { value: 'nach_bedarf', label: 'Nach Bedarf' },
  ];
  const goalsOptions = [
    { value: 'persönlichkeitsentwicklung', label: 'Persönlichkeitsentwicklung' },
    { value: 'karriereplanung', label: 'Karriereplanung' },
    { value: 'stressmanagement', label: 'Stressmanagement' },
    { value: 'work_life_balance', label: 'Work-Life-Balance' },
    { value: 'kommunikation', label: 'Kommunikation' },
    { value: 'führung', label: 'Führung' },
    { value: 'motivation', label: 'Motivation' },
    { value: 'ziele_erreichen', label: 'Ziele erreichen' },
    { value: 'self_confidence', label: 'Selbstvertrauen' },
    { value: 'beziehungen', label: 'Beziehungen' },
    { value: 'gesundheit', label: 'Gesundheit' },
    { value: 'spiritualität', label: 'Spiritualität' },
  ];

  const handleInputChange = (field: keyof CoachingData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.sessionType &&
      formData.duration &&
      formData.frequency
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Coaching-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art des Coachings" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art des Coachings"
            />
          </FormField>

          <FormField label="Session-Art" required>
            <FormSelect
              value={formData.sessionType || ''}
              onChange={value => handleInputChange('sessionType', value)}
              options={sessionTypeOptions}
              placeholder="Wählen Sie die Session-Art"
            />
          </FormField>

          <FormField label="Dauer pro Session" required>
            <FormSelect
              value={formData.duration || ''}
              onChange={value => handleInputChange('duration', value)}
              options={durationOptions}
              placeholder="Wählen Sie die Dauer"
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

          <FormField label="Anzahl Sessions">
            <FormInput
              type="number"
              value={formData.sessionCount?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'sessionCount',
                  typeof value === 'string' ? parseInt(value) : value
                )
              }
              placeholder="Gewünschte Anzahl Sessions"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Coaching-Ziele">
            <FormCheckboxGroup
              value={formData.goals || []}
              onChange={value => handleInputChange('goals', value)}
              options={goalsOptions}
              maxSelections={5}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Erfahrung mit Coaching">
            <FormRadioGroup
              name="experience"
              value={formData.experience || ''}
              onChange={value => handleInputChange('experience', value)}
              options={[
                { value: 'keine', label: 'Keine Erfahrung' },
                { value: 'wenig', label: 'Wenig Erfahrung' },
                { value: 'einige', label: 'Einige Erfahrung' },
                { value: 'viel', label: 'Viel Erfahrung' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Bevorzugte Qualifikationen">
            <FormRadioGroup
              name="qualifications"
              value={formData.qualifications || ''}
              onChange={value => handleInputChange('qualifications', value)}
              options={[
                { value: 'nicht_wichtig', label: 'Nicht wichtig' },
                { value: 'zertifiziert', label: 'Zertifizierter Coach' },
                { value: 'psychologie', label: 'Psychologie-Hintergrund' },
                { value: 'business', label: 'Business-Hintergrund' },
                { value: 'spezialisiert', label: 'Spezialisierung wichtig' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Bevorzugte Uhrzeit">
            <FormRadioGroup
              name="timePreference"
              value={formData.timePreference || ''}
              onChange={value => handleInputChange('timePreference', value)}
              options={[
                { value: 'vormittags', label: 'Vormittags' },
                { value: 'nachmittags', label: 'Nachmittags' },
                { value: 'abends', label: 'Abends' },
                { value: 'wochenende', label: 'Wochenende' },
                { value: 'flexibel', label: 'Flexibel' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Aktuelle Situation">
            <FormTextarea
              value={formData.currentSituation || ''}
              onChange={value => handleInputChange('currentSituation', value)}
              placeholder="Beschreiben Sie Ihre aktuelle Situation"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Erwartungen">
            <FormTextarea
              value={formData.expectations || ''}
              onChange={value => handleInputChange('expectations', value)}
              placeholder="Was erwarten Sie vom Coaching?"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Weitere Informationen">
            <FormTextarea
              value={formData.additionalInfo || ''}
              onChange={value => handleInputChange('additionalInfo', value)}
              placeholder="Weitere wichtige Informationen"
              rows={3}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default CoachingForm;
