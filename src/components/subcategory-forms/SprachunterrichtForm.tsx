'use client';
import React, { useState, useEffect } from 'react';
import { SprachunterrichtData } from '@/types/subcategory-forms';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';
import { useRouter } from 'next/navigation';

interface SprachunterrichtFormProps {
  data: SprachunterrichtData;
  onDataChange: (data: SprachunterrichtData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const SprachunterrichtForm: React.FC<SprachunterrichtFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const handleFieldChange = (field: keyof SprachunterrichtData, value: any) => {
    onDataChange({
      ...data,
      [field]: value,
    });
  };

  // Validierungslogik
  useEffect(() => {
    const isValid = !!(data.language && data.level && data.level.length > 0);
    onValidationChange(isValid);
  }, [data, onValidationChange]);

  const isFormValid = () => {
    return !!(data.language && data.level && data.level.length > 0);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sprachunterricht</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormField label="Sprache" required description="Welche Sprache unterrichten Sie?">
            <FormSelect
              value={data.language || ''}
              onChange={value => handleFieldChange('language', value)}
              options={[
                { value: 'deutsch', label: 'Deutsch' },
                { value: 'englisch', label: 'Englisch' },
                { value: 'spanisch', label: 'Spanisch' },
                { value: 'französisch', label: 'Französisch' },
                { value: 'italienisch', label: 'Italienisch' },
                { value: 'portugiesisch', label: 'Portugiesisch' },
                { value: 'russisch', label: 'Russisch' },
                { value: 'chinesisch', label: 'Chinesisch' },
                { value: 'japanisch', label: 'Japanisch' },
                { value: 'andere', label: 'Andere Sprache' },
              ]}
            />
          </FormField>

          <FormField
            label="Sprachniveau"
            required
            description="Für welches Niveau bieten Sie Unterricht an?"
          >
            <FormCheckboxGroup
              value={data.level || []}
              onChange={value => handleFieldChange('level', value)}
              options={[
                { value: 'a1', label: 'A1 - Anfänger' },
                { value: 'a2', label: 'A2 - Grundkenntnisse' },
                { value: 'b1', label: 'B1 - Fortgeschritten' },
                { value: 'b2', label: 'B2 - Selbstständig' },
                { value: 'c1', label: 'C1 - Fachkundig' },
                { value: 'c2', label: 'C2 - Muttersprachlich' },
              ]}
            />
          </FormField>

          <FormField
            label="Unterrichtsformat"
            description="In welchem Format bieten Sie den Unterricht an?"
          >
            <FormCheckboxGroup
              value={data.format || []}
              onChange={value => handleFieldChange('format', value)}
              options={[
                { value: 'einzelunterricht', label: 'Einzelunterricht' },
                { value: 'gruppenunterricht', label: 'Gruppenunterricht' },
                { value: 'online', label: 'Online-Unterricht' },
                { value: 'vor_ort', label: 'Vor Ort beim Schüler' },
              ]}
            />
          </FormField>

          <FormField
            label="Besondere Hinweise"
            description="Zusätzliche Informationen zu Ihrem Sprachunterricht"
          >
            <FormTextarea
              value={data.specialNotes || ''}
              onChange={value => handleFieldChange('specialNotes', value)}
              placeholder="Besondere Hinweise zum Sprachunterricht..."
            />
          </FormField>
        </CardContent>
      </Card>

      <FormSubmitButton isValid={isFormValid()} subcategory="Sprachunterricht" formData={data} />
    </div>
  );
}

export default SprachunterrichtForm;
