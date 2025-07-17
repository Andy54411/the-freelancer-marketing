import React, { useState, useEffect } from 'react';
import { BaumpflegeData } from '@/types/subcategory-forms';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface BaumpflegeFormProps {
  data: BaumpflegeData;
  onDataChange: (data: BaumpflegeData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const BaumpflegeForm: React.FC<BaumpflegeFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const handleFieldChange = (field: keyof BaumpflegeData, value: any) => {
    onDataChange({
      ...data,
      [field]: value,
    });
  };

  // Validierungslogik
  useEffect(() => {
    const isValid = !!(data.serviceType && data.treeHeight && data.pricePerTree);
    onValidationChange(isValid);
  }, [data, onValidationChange]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Baumpflege</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormField
            label="Art der Baumpflege"
            required
            description="Wählen Sie die Art der Baumpflege aus"
          >
            <FormSelect
              value={data.serviceType || ''}
              onChange={value => handleFieldChange('serviceType', value)}
              options={[
                { value: 'baumschnitt', label: 'Baumschnitt' },
                { value: 'baumfällung', label: 'Baumfällung' },
                { value: 'kronenpflege', label: 'Kronenpflege' },
                { value: 'totholzentfernung', label: 'Totholzentfernung' },
                { value: 'baumkontrolle', label: 'Baumkontrolle' },
                { value: 'wurzelbehandlung', label: 'Wurzelbehandlung' },
                { value: 'baumberatung', label: 'Baumberatung' },
                { value: 'baumpflanzung', label: 'Baumpflanzung' },
              ]}
            />
          </FormField>

          <FormField label="Baumhöhe" required description="Geben Sie die Höhe des Baumes an">
            <FormSelect
              value={data.treeHeight || ''}
              onChange={value => handleFieldChange('treeHeight', value)}
              options={[
                { value: 'bis_5m', label: 'Bis 5m' },
                { value: '5_10m', label: '5-10m' },
                { value: '10_15m', label: '10-15m' },
                { value: '15_20m', label: '15-20m' },
                { value: 'über_20m', label: 'Über 20m' },
              ]}
            />
          </FormField>

          <FormField label="Baumart" description="Welche Baumart soll bearbeitet werden?">
            <FormInput
              value={data.treeType || ''}
              onChange={value => handleFieldChange('treeType', value)}
              placeholder="z.B. Eiche, Buche, Fichte"
            />
          </FormField>

          <FormField
            label="Anzahl der Bäume"
            description="Wie viele Bäume sollen bearbeitet werden?"
          >
            <FormInput
              type="number"
              value={data.numberOfTrees || ''}
              onChange={value => handleFieldChange('numberOfTrees', value)}
              placeholder="Anzahl"
            />
          </FormField>

          <FormField label="Benötigte Ausrüstung" description="Welche Ausrüstung wird benötigt?">
            <FormCheckboxGroup
              value={data.equipment || []}
              onChange={value => handleFieldChange('equipment', value)}
              options={[
                { value: 'hebebühne', label: 'Hebebühne' },
                { value: 'kettensäge', label: 'Kettensäge' },
                { value: 'häcksler', label: 'Häcksler' },
                { value: 'seilklettertechnik', label: 'Seilklettertechnik' },
                { value: 'kran', label: 'Kran' },
                { value: 'absperrung', label: 'Absperrung' },
              ]}
            />
          </FormField>

          <FormField label="Preis pro Baum" required description="Geben Sie den Preis pro Baum an">
            <FormInput
              type="number"
              value={data.pricePerTree || ''}
              onChange={value => handleFieldChange('pricePerTree', value)}
              placeholder="Preis in Euro"
            />
          </FormField>

          <FormField
            label="Mindestpreis"
            description="Geben Sie den Mindestpreis für den Auftrag an"
          >
            <FormInput
              type="number"
              value={data.minimumPrice || ''}
              onChange={value => handleFieldChange('minimumPrice', value)}
              placeholder="Mindestpreis in Euro"
            />
          </FormField>

          <FormField
            label="Entsorgung inklusive?"
            description="Ist die Entsorgung des Schnittguts im Preis enthalten?"
          >
            <FormRadioGroup
              value={data.includesDisposal || ''}
              onChange={value => handleFieldChange('includesDisposal', value)}
              name="includesDisposal"
              options={[
                { value: 'yes', label: 'Ja, Entsorgung inklusive' },
                { value: 'no', label: 'Nein, Entsorgung separat' },
                { value: 'optional', label: 'Optional gegen Aufpreis' },
              ]}
            />
          </FormField>

          <FormField label="Arbeitszeiten" description="Zu welchen Zeiten können Sie arbeiten?">
            <FormCheckboxGroup
              value={data.workingHours || []}
              onChange={value => handleFieldChange('workingHours', value)}
              options={[
                { value: 'weekdays', label: 'Werktags' },
                { value: 'weekends', label: 'Wochenende' },
                { value: 'early_morning', label: 'Früh morgens' },
                { value: 'late_evening', label: 'Spät abends' },
              ]}
            />
          </FormField>

          <FormField
            label="Zertifikate/Qualifikationen"
            description="Welche Zertifikate besitzen Sie?"
          >
            <FormCheckboxGroup
              value={data.certifications || []}
              onChange={value => handleFieldChange('certifications', value)}
              options={[
                { value: 'european_tree_worker', label: 'European Tree Worker' },
                { value: 'baumpfleger', label: 'Zertifizierter Baumpfleger' },
                { value: 'fll_zertifikat', label: 'FLL-Zertifikat' },
                { value: 'seilklettertechnik', label: 'Seilklettertechnik' },
                { value: 'motorsägen_schein', label: 'Motorsägen-Schein' },
                { value: 'first_aid', label: 'Erste Hilfe' },
              ]}
            />
          </FormField>

          <FormField
            label="Besondere Hinweise"
            description="Zusätzliche Informationen oder Besonderheiten"
          >
            <FormTextarea
              value={data.specialNotes || ''}
              onChange={value => handleFieldChange('specialNotes', value)}
              placeholder="Besondere Hinweise zu der Baumpflege..."
            />
          </FormField>
        </CardContent>
      </Card>
    </div>
  );
};

export default BaumpflegeForm;
