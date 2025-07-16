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
} from './FormComponents';

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
    const isValid = !!(data.language && data.level && data.pricePerHour);
    onValidationChange(isValid);
  }, [data, onValidationChange]);

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
                { value: 'koreanisch', label: 'Koreanisch' },
                { value: 'arabisch', label: 'Arabisch' },
                { value: 'türkisch', label: 'Türkisch' },
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
                { value: 'eigene_räume', label: 'In eigenen Räumen' },
              ]}
            />
          </FormField>

          <FormField
            label="Zielgruppe"
            description="Für welche Zielgruppe bieten Sie Unterricht an?"
          >
            <FormCheckboxGroup
              value={data.targetGroup || []}
              onChange={value => handleFieldChange('targetGroup', value)}
              options={[
                { value: 'kinder', label: 'Kinder (6-12 Jahre)' },
                { value: 'jugendliche', label: 'Jugendliche (13-18 Jahre)' },
                { value: 'erwachsene', label: 'Erwachsene' },
                { value: 'senioren', label: 'Senioren' },
                { value: 'geschäftskunden', label: 'Geschäftskunden' },
                { value: 'studenten', label: 'Studenten' },
              ]}
            />
          </FormField>

          <FormField
            label="Spezialisierung"
            description="Auf welche Bereiche haben Sie sich spezialisiert?"
          >
            <FormCheckboxGroup
              value={data.specialization || []}
              onChange={value => handleFieldChange('specialization', value)}
              options={[
                { value: 'konversation', label: 'Konversation' },
                { value: 'grammatik', label: 'Grammatik' },
                { value: 'business', label: 'Business-Sprache' },
                { value: 'prüfungsvorbereitung', label: 'Prüfungsvorbereitung' },
                { value: 'reisesprache', label: 'Reisesprache' },
                { value: 'literatur', label: 'Literatur' },
                { value: 'phonetik', label: 'Aussprache/Phonetik' },
                { value: 'schreibtraining', label: 'Schreibtraining' },
              ]}
            />
          </FormField>

          <FormField label="Qualifikationen" description="Welche Qualifikationen besitzen Sie?">
            <FormCheckboxGroup
              value={data.qualifications || []}
              onChange={value => handleFieldChange('qualifications', value)}
              options={[
                { value: 'muttersprachler', label: 'Muttersprachler' },
                { value: 'lehramtsstudium', label: 'Lehramtsstudium' },
                { value: 'zertifikat_daf', label: 'DaF-Zertifikat' },
                { value: 'tefl_tesol', label: 'TEFL/TESOL' },
                { value: 'universitätsabschluss', label: 'Universitätsabschluss' },
                { value: 'langjährige_erfahrung', label: 'Langjährige Erfahrung' },
                { value: 'sprachzertifikate', label: 'Sprachzertifikate' },
              ]}
            />
          </FormField>

          <FormField
            label="Preis pro Stunde"
            required
            description="Geben Sie den Preis pro Unterrichtsstunde an"
          >
            <FormInput
              type="number"
              value={data.pricePerHour || ''}
              onChange={value => handleFieldChange('pricePerHour', value)}
              placeholder="Preis in Euro"
            />
          </FormField>

          <FormField label="Paketpreise" description="Bieten Sie Paketpreise an?">
            <FormInput
              value={data.packagePrices || ''}
              onChange={value => handleFieldChange('packagePrices', value)}
              placeholder="z.B. 10 Stunden für 400€"
            />
          </FormField>

          <FormField
            label="Unterrichtsdauer"
            description="Wie lange dauert eine Unterrichtsstunde?"
          >
            <FormSelect
              value={data.lessonDuration || ''}
              onChange={value => handleFieldChange('lessonDuration', value)}
              options={[
                { value: '45min', label: '45 Minuten' },
                { value: '60min', label: '60 Minuten' },
                { value: '90min', label: '90 Minuten' },
                { value: '120min', label: '120 Minuten' },
                { value: 'flexibel', label: 'Flexibel' },
              ]}
            />
          </FormField>

          <FormField label="Verfügbarkeit" description="Wann sind Sie verfügbar?">
            <FormCheckboxGroup
              value={data.availability || []}
              onChange={value => handleFieldChange('availability', value)}
              options={[
                { value: 'vormittags', label: 'Vormittags' },
                { value: 'nachmittags', label: 'Nachmittags' },
                { value: 'abends', label: 'Abends' },
                { value: 'wochenende', label: 'Wochenende' },
                { value: 'wochentags', label: 'Wochentags' },
                { value: 'flexibel', label: 'Flexibel' },
              ]}
            />
          </FormField>

          <FormField
            label="Unterrichtsmaterial"
            description="Ist das Unterrichtsmaterial im Preis enthalten?"
          >
            <FormRadioGroup
              value={data.materialIncluded || ''}
              onChange={value => handleFieldChange('materialIncluded', value)}
              name="materialIncluded"
              options={[
                { value: 'yes', label: 'Ja, Material inklusive' },
                { value: 'no', label: 'Nein, Material separat' },
                { value: 'digital', label: 'Digitales Material inklusive' },
              ]}
            />
          </FormField>

          <FormField label="Probestunde" description="Bieten Sie eine Probestunde an?">
            <FormRadioGroup
              value={data.trialLesson || ''}
              onChange={value => handleFieldChange('trialLesson', value)}
              name="trialLesson"
              options={[
                { value: 'free', label: 'Kostenlose Probestunde' },
                { value: 'reduced', label: 'Reduzierte Probestunde' },
                { value: 'no', label: 'Keine Probestunde' },
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
    </div>
  );
};

export default SprachunterrichtForm;
