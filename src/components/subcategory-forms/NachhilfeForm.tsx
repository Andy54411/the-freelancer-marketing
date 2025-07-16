import React, { useState, useEffect } from 'react';
import { NachhilfeData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface NachhilfeFormProps {
  data: NachhilfeData;
  onDataChange: (data: NachhilfeData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const NachhilfeForm: React.FC<NachhilfeFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<NachhilfeData>(data);

  const subjectOptions = [
    { value: 'mathematik', label: 'Mathematik' },
    { value: 'deutsch', label: 'Deutsch' },
    { value: 'englisch', label: 'Englisch' },
    { value: 'französisch', label: 'Französisch' },
    { value: 'spanisch', label: 'Spanisch' },
    { value: 'latein', label: 'Latein' },
    { value: 'physik', label: 'Physik' },
    { value: 'chemie', label: 'Chemie' },
    { value: 'biologie', label: 'Biologie' },
    { value: 'geschichte', label: 'Geschichte' },
    { value: 'geographie', label: 'Geographie' },
    { value: 'politik', label: 'Politik' },
    { value: 'wirtschaft', label: 'Wirtschaft' },
    { value: 'informatik', label: 'Informatik' },
    { value: 'kunst', label: 'Kunst' },
    { value: 'musik', label: 'Musik' },
    { value: 'sport', label: 'Sport' },
  ];

  const gradeLevelOptions = [
    { value: 'grundschule', label: 'Grundschule (1.-4. Klasse)' },
    { value: 'unterstufe', label: 'Unterstufe (5.-7. Klasse)' },
    { value: 'mittelstufe', label: 'Mittelstufe (8.-10. Klasse)' },
    { value: 'oberstufe', label: 'Oberstufe (11.-13. Klasse)' },
    { value: 'studium', label: 'Studium' },
    { value: 'ausbildung', label: 'Ausbildung' },
    { value: 'erwachsenenbildung', label: 'Erwachsenenbildung' },
  ];

  const sessionTypeOptions = [
    { value: 'einzelunterricht', label: 'Einzelunterricht' },
    { value: 'gruppenunterricht', label: 'Gruppenunterricht (2-3 Personen)' },
    { value: 'online', label: 'Online-Unterricht' },
    { value: 'hybrid', label: 'Hybrid (Präsenz + Online)' },
  ];

  const frequencyOptions = [
    { value: 'einmalig', label: 'Einmalig' },
    { value: 'wöchentlich', label: 'Wöchentlich' },
    { value: 'zweiwöchentlich', label: 'Alle 2 Wochen' },
    { value: 'intensiv', label: 'Intensivkurs' },
    { value: 'prüfungsvorbereitung', label: 'Prüfungsvorbereitung' },
    { value: 'ferien', label: 'Ferienkurs' },
  ];

  const durationOptions = [
    { value: '45', label: '45 Minuten' },
    { value: '60', label: '60 Minuten' },
    { value: '90', label: '90 Minuten' },
    { value: '120', label: '120 Minuten' },
  ];

  const budgetRangeOptions = [
    { value: 'bis_15', label: 'Bis 15 €/Stunde' },
    { value: '15_25', label: '15 - 25 €/Stunde' },
    { value: '25_35', label: '25 - 35 €/Stunde' },
    { value: '35_50', label: '35 - 50 €/Stunde' },
    { value: 'über_50', label: 'Über 50 €/Stunde' },
  ];

  const handleInputChange = (field: keyof NachhilfeData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.subject &&
      formData.gradeLevel &&
      formData.sessionType &&
      formData.frequency
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Nachhilfe-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Fach" required>
            <FormSelect
              value={formData.subject || ''}
              onChange={value => handleInputChange('subject', value)}
              options={subjectOptions}
              placeholder="Wählen Sie das Fach"
            />
          </FormField>

          <FormField label="Klassenstufe" required>
            <FormSelect
              value={formData.gradeLevel || ''}
              onChange={value => handleInputChange('gradeLevel', value)}
              options={gradeLevelOptions}
              placeholder="Wählen Sie die Klassenstufe"
            />
          </FormField>

          <FormField label="Unterrichtsart" required>
            <FormSelect
              value={formData.sessionType || ''}
              onChange={value => handleInputChange('sessionType', value)}
              options={sessionTypeOptions}
              placeholder="Wählen Sie die Unterrichtsart"
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

          <FormField label="Dauer pro Einheit">
            <FormSelect
              value={formData.duration || ''}
              onChange={value => handleInputChange('duration', value)}
              options={durationOptions}
              placeholder="Wählen Sie die Dauer"
            />
          </FormField>

          <FormField label="Budget pro Stunde">
            <FormSelect
              value={formData.budgetRange || ''}
              onChange={value => handleInputChange('budgetRange', value)}
              options={budgetRangeOptions}
              placeholder="Wählen Sie das Budget"
            />
          </FormField>

          <FormField label="Anzahl Schüler">
            <FormInput
              type="number"
              value={formData.studentCount?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'studentCount',
                  typeof value === 'string' ? parseInt(value) : value
                )
              }
              placeholder="Anzahl der Schüler"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Ort des Unterrichts">
            <FormRadioGroup
              name="location"
              value={formData.location || ''}
              onChange={value => handleInputChange('location', value)}
              options={[
                { value: 'bei_schüler', label: 'Bei dem Schüler zu Hause' },
                { value: 'bei_lehrer', label: 'Bei dem Lehrer' },
                { value: 'online', label: 'Online' },
                { value: 'neutral', label: 'Neutraler Ort (Bibliothek, etc.)' },
                { value: 'flexibel', label: 'Flexibel' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Bevorzugte Unterrichtszeit">
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
          <FormField label="Lernziele">
            <FormTextarea
              value={formData.learningGoals || ''}
              onChange={value => handleInputChange('learningGoals', value)}
              placeholder="Beschreiben Sie die Lernziele und Schwerpunkte"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Schwierigkeiten">
            <FormTextarea
              value={formData.difficulties || ''}
              onChange={value => handleInputChange('difficulties', value)}
              placeholder="Welche Schwierigkeiten bestehen? Was soll verbessert werden?"
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

export default NachhilfeForm;
