import React, { useState, useEffect } from 'react';
import { MusikunterrichtData } from '@/types/subcategory-forms';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface MusikunterrichtFormProps {
  data: MusikunterrichtData;
  onDataChange: (data: MusikunterrichtData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const MusikunterrichtForm: React.FC<MusikunterrichtFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const handleFieldChange = (field: keyof MusikunterrichtData, value: any) => {
    onDataChange({
      ...data,
      [field]: value,
    });
  };

  // Validierungslogik
  useEffect(() => {
    const isValid = !!(data.instrument && data.level && data.pricePerHour);
    onValidationChange(isValid);
  }, [data, onValidationChange]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Musikunterricht</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormField label="Instrument" required description="Welches Instrument unterrichten Sie?">
            <FormSelect
              value={data.instrument || ''}
              onChange={value => handleFieldChange('instrument', value)}
              options={[
                { value: 'klavier', label: 'Klavier' },
                { value: 'gitarre', label: 'Gitarre' },
                { value: 'e_gitarre', label: 'E-Gitarre' },
                { value: 'bass', label: 'Bass' },
                { value: 'violine', label: 'Violine' },
                { value: 'cello', label: 'Cello' },
                { value: 'schlagzeug', label: 'Schlagzeug' },
                { value: 'gesang', label: 'Gesang' },
                { value: 'saxophon', label: 'Saxophon' },
                { value: 'trompete', label: 'Trompete' },
                { value: 'klarinette', label: 'Klarinette' },
                { value: 'querflöte', label: 'Querflöte' },
                { value: 'keyboard', label: 'Keyboard' },
                { value: 'ukulele', label: 'Ukulele' },
                { value: 'harmonika', label: 'Harmonika' },
                { value: 'andere', label: 'Anderes Instrument' },
              ]}
            />
          </FormField>

          <FormField
            label="Niveau"
            required
            description="Für welches Niveau bieten Sie Unterricht an?"
          >
            <FormCheckboxGroup
              value={data.level || []}
              onChange={value => handleFieldChange('level', value)}
              options={[
                { value: 'anfänger', label: 'Anfänger' },
                { value: 'fortgeschritten', label: 'Fortgeschritten' },
                { value: 'profi', label: 'Profi-Niveau' },
                { value: 'alle', label: 'Alle Niveaus' },
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
                { value: 'musikschule', label: 'In Musikschule' },
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
                { value: 'kinder', label: 'Kinder (4-12 Jahre)' },
                { value: 'jugendliche', label: 'Jugendliche (13-18 Jahre)' },
                { value: 'erwachsene', label: 'Erwachsene' },
                { value: 'senioren', label: 'Senioren' },
                { value: 'alle', label: 'Alle Altersgruppen' },
              ]}
            />
          </FormField>

          <FormField label="Musikstil" description="Welche Musikstile unterrichten Sie?">
            <FormCheckboxGroup
              value={data.musicStyle || []}
              onChange={value => handleFieldChange('musicStyle', value)}
              options={[
                { value: 'klassik', label: 'Klassik' },
                { value: 'pop', label: 'Pop' },
                { value: 'rock', label: 'Rock' },
                { value: 'jazz', label: 'Jazz' },
                { value: 'blues', label: 'Blues' },
                { value: 'folk', label: 'Folk' },
                { value: 'metal', label: 'Metal' },
                { value: 'country', label: 'Country' },
                { value: 'electronic', label: 'Electronic' },
                { value: 'alle', label: 'Alle Stile' },
              ]}
            />
          </FormField>

          <FormField label="Qualifikationen" description="Welche Qualifikationen besitzen Sie?">
            <FormCheckboxGroup
              value={data.qualifications || []}
              onChange={value => handleFieldChange('qualifications', value)}
              options={[
                { value: 'musikstudium', label: 'Musikstudium' },
                { value: 'musiklehrer', label: 'Ausgebildeter Musiklehrer' },
                { value: 'konservatorium', label: 'Konservatorium' },
                { value: 'profi_musiker', label: 'Professioneller Musiker' },
                { value: 'band_erfahrung', label: 'Band-Erfahrung' },
                { value: 'langjährige_erfahrung', label: 'Langjährige Erfahrung' },
                { value: 'zertifikate', label: 'Musikzertifikate' },
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
                { value: '30min', label: '30 Minuten' },
                { value: '45min', label: '45 Minuten' },
                { value: '60min', label: '60 Minuten' },
                { value: '90min', label: '90 Minuten' },
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
            label="Instrument vorhanden"
            description="Ist ein Instrument vor Ort vorhanden?"
          >
            <FormRadioGroup
              value={data.instrumentAvailable || ''}
              onChange={value => handleFieldChange('instrumentAvailable', value)}
              name="instrumentAvailable"
              options={[
                { value: 'yes', label: 'Ja, Instrument vorhanden' },
                { value: 'no', label: 'Nein, Schüler bringt mit' },
                { value: 'both', label: 'Beides möglich' },
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
            label="Zusätzliche Angebote"
            description="Welche zusätzlichen Angebote bieten Sie?"
          >
            <FormCheckboxGroup
              value={data.additionalServices || []}
              onChange={value => handleFieldChange('additionalServices', value)}
              options={[
                { value: 'aufnahmen', label: 'Aufnahmen/Recording' },
                { value: 'bandcoaching', label: 'Bandcoaching' },
                { value: 'auftrittsvorbereitung', label: 'Auftrittsvorbereitung' },
                { value: 'komposition', label: 'Komposition' },
                { value: 'musiktheorie', label: 'Musiktheorie' },
                { value: 'gehörbildung', label: 'Gehörbildung' },
                { value: 'improvisation', label: 'Improvisation' },
              ]}
            />
          </FormField>

          <FormField
            label="Besondere Hinweise"
            description="Zusätzliche Informationen zu Ihrem Musikunterricht"
          >
            <FormTextarea
              value={data.specialNotes || ''}
              onChange={value => handleFieldChange('specialNotes', value)}
              placeholder="Besondere Hinweise zum Musikunterricht..."
            />
          </FormField>
        </CardContent>
      </Card>
    </div>
  );
};

export default MusikunterrichtForm;
