import React, { useState, useEffect } from 'react';
import { NachhilfeleherData } from '@/types/subcategory-forms';
import { FormField, FormSelect, FormTextarea, FormSubmitButton } from './FormComponents';

interface NachhilfeleherFormProps {
  data: NachhilfeleherData;
  onDataChange: (data: NachhilfeleherData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const NachhilfeleherForm: React.FC<NachhilfeleherFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<NachhilfeleherData>(data);

  const subjectOptions = [
    { value: 'mathematik', label: 'Mathematik' },
    { value: 'deutsch', label: 'Deutsch' },
    { value: 'englisch', label: 'Englisch' },
    { value: 'französisch', label: 'Französisch' },
    { value: 'spanisch', label: 'Spanisch' },
    { value: 'physik', label: 'Physik' },
    { value: 'chemie', label: 'Chemie' },
    { value: 'biologie', label: 'Biologie' },
    { value: 'geschichte', label: 'Geschichte' },
    { value: 'geografie', label: 'Geografie' },
    { value: 'informatik', label: 'Informatik' },
    { value: 'wirtschaft', label: 'Wirtschaft' },
    { value: 'andere', label: 'Andere Fächer' },
  ];

  const levelOptions = [
    { value: 'grundschule', label: 'Grundschule (1.-4. Klasse)' },
    { value: 'unterstufe', label: 'Unterstufe (5.-7. Klasse)' },
    { value: 'mittelstufe', label: 'Mittelstufe (8.-10. Klasse)' },
    { value: 'oberstufe', label: 'Oberstufe (11.-13. Klasse)' },
    { value: 'studium', label: 'Studium/Hochschule' },
    { value: 'erwachsene', label: 'Erwachsenenbildung' },
  ];

  const formatOptions = [
    { value: 'einzelunterricht', label: 'Einzelunterricht' },
    { value: 'gruppenunterricht', label: 'Gruppenunterricht (2-4 Personen)' },
    { value: 'online', label: 'Online-Unterricht' },
    { value: 'praesenz', label: 'Präsenz-Unterricht' },
    { value: 'hybrid', label: 'Hybrid (Online + Präsenz)' },
  ];

  const frequencyOptions = [
    { value: 'einmalig', label: 'Einmalig' },
    { value: 'woechentlich', label: 'Wöchentlich' },
    { value: 'mehrmals_woechentlich', label: 'Mehrmals wöchentlich' },
    { value: 'intensivkurs', label: 'Intensivkurs' },
    { value: 'pruefungsvorbereitung', label: 'Prüfungsvorbereitung' },
  ];

  const handleInputChange = (field: keyof NachhilfeleherData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.subject &&
      formData.level &&
      formData.format &&
      formData.frequency &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.subject &&
      formData.level &&
      formData.format &&
      formData.frequency &&
      formData.projectDescription
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Nachhilfelehrer-Projektdetails
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

          <FormField label="Klassenstufe/Niveau" required>
            <FormSelect
              value={formData.level || ''}
              onChange={value => handleInputChange('level', value)}
              options={levelOptions}
              placeholder="Wählen Sie die Klassenstufe"
            />
          </FormField>

          <FormField label="Unterrichtsformat" required>
            <FormSelect
              value={formData.format || ''}
              onChange={value => handleInputChange('format', value)}
              options={formatOptions}
              placeholder="Wählen Sie das Format"
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
        </div>

        <div className="mt-4">
          <FormField label="Projektbeschreibung" required>
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie Ihre Nachhilfe-Anforderungen (Lernziele, Schwierigkeiten, gewünschte Zeiten, besondere Bedürfnisse, etc.)"
              rows={4}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Nachhilfeleher" formData={formData} />
    </div>
  );
};

export default NachhilfeleherForm;
