'use client';
import React, { useState, useEffect } from 'react';
import { SprachlehrerData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';

interface SprachlehrerFormProps {
  data: SprachlehrerData;
  onDataChange: (data: SprachlehrerData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const SprachlehrerForm: React.FC<SprachlehrerFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<SprachlehrerData>(data);

  const languageOptions = [
    { value: 'englisch', label: 'Englisch' },
    { value: 'spanisch', label: 'Spanisch' },
    { value: 'französisch', label: 'Französisch' },
    { value: 'italienisch', label: 'Italienisch' },
    { value: 'portugiesisch', label: 'Portugiesisch' },
    { value: 'russisch', label: 'Russisch' },
    { value: 'chinesisch', label: 'Chinesisch' },
    { value: 'japanisch', label: 'Japanisch' },
    { value: 'arabisch', label: 'Arabisch' },
    { value: 'türkisch', label: 'Türkisch' },
    { value: 'niederländisch', label: 'Niederländisch' },
    { value: 'polnisch', label: 'Polnisch' },
    { value: 'andere', label: 'Andere Sprache' },
  ];

  const levelOptions = [
    { value: 'anfänger', label: 'Anfänger (A1-A2)' },
    { value: 'mittelstufe', label: 'Mittelstufe (B1-B2)' },
    { value: 'fortgeschritten', label: 'Fortgeschritten (C1-C2)' },
    { value: 'gemischt', label: 'Gemischtes Level' },
  ];

  const lessonTypeOptions = [
    { value: 'einzelunterricht', label: 'Einzelunterricht' },
    { value: 'gruppenunterricht', label: 'Gruppenunterricht' },
    { value: 'konversation', label: 'Konversationstraining' },
    { value: 'business', label: 'Business-Sprache' },
    { value: 'prüfungsvorbereitung', label: 'Prüfungsvorbereitung' },
    { value: 'intensivkurs', label: 'Intensivkurs' },
    { value: 'online', label: 'Online-Unterricht' },
    { value: 'nachhilfe', label: 'Nachhilfe' },
  ];

  const ageGroupOptions = [
    { value: 'kinder', label: 'Kinder (3-12 Jahre)' },
    { value: 'jugendliche', label: 'Jugendliche (13-17 Jahre)' },
    { value: 'erwachsene', label: 'Erwachsene (18+ Jahre)' },
    { value: 'senioren', label: 'Senioren (60+ Jahre)' },
  ];

  const urgencyOptions = [
    { value: 'sofort', label: 'Sofort' },
    { value: 'diese_woche', label: 'Diese Woche' },
    { value: 'nächste_woche', label: 'Nächste Woche' },
    { value: 'diesen_monat', label: 'Diesen Monat' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const handleInputChange = (field: keyof SprachlehrerData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.language &&
      formData.level &&
      formData.lessonType &&
      formData.ageGroup &&
      formData.urgency
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const isFormValid = () => {
    return !!(
      formData.language &&
      formData.level &&
      formData.lessonType &&
      formData.ageGroup &&
      formData.urgency
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Sprachlehrer Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Gewünschte Sprache" required>
            <FormSelect
              value={formData.language || ''}
              onChange={value => handleInputChange('language', value)}
              options={languageOptions}
              placeholder="Welche Sprache soll gelernt werden?"
            />
          </FormField>

          <FormField label="Aktuelles Sprachniveau" required>
            <FormSelect
              value={formData.level || ''}
              onChange={value => handleInputChange('level', value)}
              options={levelOptions}
              placeholder="Aktuelles Niveau der Lernenden?"
            />
          </FormField>

          <FormField label="Art des Unterrichts" required>
            <FormSelect
              value={formData.lessonType || ''}
              onChange={value => handleInputChange('lessonType', value)}
              options={lessonTypeOptions}
              placeholder="Welche Art von Unterricht?"
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

          <FormField label="Zeitrahmen" required>
            <FormSelect
              value={formData.urgency || ''}
              onChange={value => handleInputChange('urgency', value)}
              options={urgencyOptions}
              placeholder="Wann soll der Unterricht beginnen?"
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

          <FormField label="Gewünschte Stunden pro Woche">
            <FormInput
              type="number"
              value={formData.hoursPerWeek || ''}
              onChange={value => handleInputChange('hoursPerWeek', Number(value))}
              placeholder="z.B. 2"
            />
          </FormField>

          <FormField label="Dauer insgesamt">
            <FormInput
              type="text"
              value={formData.duration || ''}
              onChange={value => handleInputChange('duration', value)}
              placeholder="z.B. 3 Monate, 1 Jahr"
            />
          </FormField>

          <FormField label="Andere Sprache (falls ausgewählt)">
            <FormInput
              type="text"
              value={formData.otherLanguage || ''}
              onChange={value => handleInputChange('otherLanguage', value)}
              placeholder="Name der Sprache"
            />
          </FormField>

          <FormField label="Budget pro Stunde">
            <FormInput
              type="text"
              value={formData.hourlyBudget || ''}
              onChange={value => handleInputChange('hourlyBudget', value)}
              placeholder="z.B. 25-40 EUR"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Spezielle Anforderungen">
            <FormCheckboxGroup
              value={formData.specialRequirements || []}
              onChange={value => handleInputChange('specialRequirements', value)}
              options={[
                { value: 'muttersprachler', label: 'Muttersprachler bevorzugt' },
                { value: 'zertifiziert', label: 'Zertifizierte Lehrkraft' },
                { value: 'erfahrung_kinder', label: 'Erfahrung mit Kindern' },
                { value: 'business_fokus', label: 'Business-Fokus' },
                { value: 'prüfung', label: 'Prüfungsvorbereitung' },
                { value: 'online_möglich', label: 'Online-Unterricht möglich' },
                { value: 'hausbesuch', label: 'Hausbesuch möglich' },
                { value: 'flexibel', label: 'Flexible Zeiten' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Lernziele">
            <FormCheckboxGroup
              value={formData.learningGoals || []}
              onChange={value => handleInputChange('learningGoals', value)}
              options={[
                { value: 'grundlagen', label: 'Grundlagen lernen' },
                { value: 'konversation', label: 'Konversation verbessern' },
                { value: 'grammatik', label: 'Grammatik verstehen' },
                { value: 'aussprache', label: 'Aussprache verbessern' },
                { value: 'wortschatz', label: 'Wortschatz erweitern' },
                { value: 'schreiben', label: 'Schreiben lernen' },
                { value: 'lesen', label: 'Leseverständnis' },
                { value: 'beruf', label: 'Berufliche Kommunikation' },
                { value: 'reisen', label: 'Für Reisen' },
                { value: 'prüfung', label: 'Prüfung bestehen' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Bevorzugte Unterrichtszeiten">
            <FormCheckboxGroup
              value={formData.preferredTimes || []}
              onChange={value => handleInputChange('preferredTimes', value)}
              options={[
                { value: 'morgens', label: 'Morgens (6-12 Uhr)' },
                { value: 'mittags', label: 'Mittags (12-18 Uhr)' },
                { value: 'abends', label: 'Abends (18-22 Uhr)' },
                { value: 'wochenende', label: 'Wochenende' },
                { value: 'wochentags', label: 'Nur Wochentags' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Projektbeschreibung">
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie Ihre Sprachlern-Ziele und -Wünsche..."
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Unterrichtsformat">
            <FormRadioGroup
              name="format"
              value={formData.format || ''}
              onChange={value => handleInputChange('format', value)}
              options={[
                { value: 'vor_ort', label: 'Vor Ort beim Lehrer' },
                { value: 'hausbesuch', label: 'Hausbesuch' },
                { value: 'online', label: 'Online-Unterricht' },
                { value: 'hybrid', label: 'Kombination aus beidem' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Vorerfahrung mit der Sprache">
            <FormRadioGroup
              name="previousExperience"
              value={formData.previousExperience || ''}
              onChange={value => handleInputChange('previousExperience', value)}
              options={[
                { value: 'keine', label: 'Keine Vorerfahrung' },
                { value: 'wenig', label: 'Wenig Vorerfahrung' },
                { value: 'schulisch', label: 'Schulisches Wissen' },
                { value: 'gute_basis', label: 'Gute Basis vorhanden' },
              ]}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Sprachlehrer" formData={formData} />
    </div>
  );
};

export default SprachlehrerForm;
