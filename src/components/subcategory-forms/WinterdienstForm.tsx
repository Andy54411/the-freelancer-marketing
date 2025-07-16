import React, { useState, useEffect } from 'react';
import { WinterdienstData } from '@/types/subcategory-forms';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface WinterdienstFormProps {
  data: WinterdienstData;
  onDataChange: (data: WinterdienstData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const WinterdienstForm: React.FC<WinterdienstFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const handleFieldChange = (field: keyof WinterdienstData, value: any) => {
    onDataChange({
      ...data,
      [field]: value,
    });
  };

  // Validierungslogik
  useEffect(() => {
    const isValid = !!(data.serviceType && data.areaSize && data.pricePerService);
    onValidationChange(isValid);
  }, [data, onValidationChange]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Winterdienst</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormField
            label="Art des Winterdienstes"
            required
            description="Wählen Sie die Art des Winterdienstes aus"
          >
            <FormSelect
              value={data.serviceType || ''}
              onChange={value => handleFieldChange('serviceType', value)}
              options={[
                { value: 'schneeräumung', label: 'Schneeräumung' },
                { value: 'streudienst', label: 'Streudienst' },
                { value: 'kombination', label: 'Schneeräumung + Streudienst' },
                { value: 'enteisen', label: 'Enteisung' },
                { value: 'laubbeseitigung', label: 'Laubbeseitigung' },
              ]}
            />
          </FormField>

          <FormField
            label="Flächengröße"
            required
            description="Geben Sie die Größe der zu räumenden Fläche an"
          >
            <FormSelect
              value={data.areaSize || ''}
              onChange={value => handleFieldChange('areaSize', value)}
              options={[
                { value: 'bis_100qm', label: 'Bis 100 qm' },
                { value: '100_500qm', label: '100-500 qm' },
                { value: '500_1000qm', label: '500-1000 qm' },
                { value: '1000_5000qm', label: '1000-5000 qm' },
                { value: 'über_5000qm', label: 'Über 5000 qm' },
              ]}
            />
          </FormField>

          <FormField label="Flächentyp" description="Welche Art von Fläche soll bearbeitet werden?">
            <FormCheckboxGroup
              value={data.surfaceType || []}
              onChange={value => handleFieldChange('surfaceType', value)}
              options={[
                { value: 'gehweg', label: 'Gehweg' },
                { value: 'einfahrt', label: 'Einfahrt' },
                { value: 'parkplatz', label: 'Parkplatz' },
                { value: 'zufahrt', label: 'Zufahrt' },
                { value: 'terrasse', label: 'Terrasse' },
                { value: 'hof', label: 'Hof' },
                { value: 'balkon', label: 'Balkon' },
                { value: 'treppe', label: 'Treppe' },
              ]}
            />
          </FormField>

          <FormField
            label="Häufigkeit des Dienstes"
            description="Wie oft soll der Winterdienst durchgeführt werden?"
          >
            <FormSelect
              value={data.frequency || ''}
              onChange={value => handleFieldChange('frequency', value)}
              options={[
                { value: 'nach_bedarf', label: 'Nach Bedarf' },
                { value: 'täglich', label: 'Täglich' },
                { value: 'wöchentlich', label: 'Wöchentlich' },
                { value: 'bei_schneefall', label: 'Bei Schneefall' },
                { value: 'bereitschaft', label: 'Bereitschaftsdienst' },
              ]}
            />
          </FormField>

          <FormField label="Zeiten" description="Zu welchen Zeiten soll der Winterdienst erfolgen?">
            <FormCheckboxGroup
              value={data.workingTimes || []}
              onChange={value => handleFieldChange('workingTimes', value)}
              options={[
                { value: 'früh_morgens', label: 'Früh morgens (5-7 Uhr)' },
                { value: 'tagsüber', label: 'Tagsüber (8-18 Uhr)' },
                { value: 'abends', label: 'Abends (18-22 Uhr)' },
                { value: 'nachts', label: 'Nachts (22-5 Uhr)' },
                { value: 'wochenende', label: 'Wochenende' },
                { value: 'feiertage', label: 'Feiertage' },
              ]}
            />
          </FormField>

          <FormField label="Benötigte Ausrüstung" description="Welche Ausrüstung wird benötigt?">
            <FormCheckboxGroup
              value={data.equipment || []}
              onChange={value => handleFieldChange('equipment', value)}
              options={[
                { value: 'schneeschieber', label: 'Schneeschieber' },
                { value: 'schneefräse', label: 'Schneefräse' },
                { value: 'streuwagen', label: 'Streuwagen' },
                { value: 'salz', label: 'Salz' },
                { value: 'split', label: 'Split' },
                { value: 'eiskratzer', label: 'Eiskratzer' },
                { value: 'besen', label: 'Besen' },
                { value: 'fahrzeug', label: 'Fahrzeug mit Schneepflug' },
              ]}
            />
          </FormField>

          <FormField
            label="Preis pro Einsatz"
            required
            description="Geben Sie den Preis pro Einsatz an"
          >
            <FormInput
              type="number"
              value={data.pricePerService || ''}
              onChange={value => handleFieldChange('pricePerService', value)}
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

          <FormField label="Saisonvertrag möglich?" description="Bieten Sie Saisonverträge an?">
            <FormRadioGroup
              value={data.seasonContract || ''}
              onChange={value => handleFieldChange('seasonContract', value)}
              name="seasonContract"
              options={[
                { value: 'yes', label: 'Ja, Saisonvertrag möglich' },
                { value: 'no', label: 'Nein, nur Einzeleinsätze' },
                { value: 'both', label: 'Beides möglich' },
              ]}
            />
          </FormField>

          <FormField
            label="Bereitschaftsdienst"
            description="Bieten Sie einen Bereitschaftsdienst an?"
          >
            <FormRadioGroup
              value={data.emergencyService || ''}
              onChange={value => handleFieldChange('emergencyService', value)}
              name="emergencyService"
              options={[
                { value: 'yes', label: 'Ja, 24h verfügbar' },
                { value: 'limited', label: 'Begrenzte Zeiten' },
                { value: 'no', label: 'Nein' },
              ]}
            />
          </FormField>

          <FormField
            label="Material inklusive?"
            description="Ist das Streumaterial im Preis enthalten?"
          >
            <FormRadioGroup
              value={data.materialIncluded || ''}
              onChange={value => handleFieldChange('materialIncluded', value)}
              name="materialIncluded"
              options={[
                { value: 'yes', label: 'Ja, Material inklusive' },
                { value: 'no', label: 'Nein, Material separat' },
                { value: 'optional', label: 'Optional gegen Aufpreis' },
              ]}
            />
          </FormField>

          <FormField
            label="Verfügbarkeit"
            description="In welchem Zeitraum bieten Sie den Winterdienst an?"
          >
            <FormSelect
              value={data.availability || ''}
              onChange={value => handleFieldChange('availability', value)}
              options={[
                { value: 'november_märz', label: 'November - März' },
                { value: 'dezember_februar', label: 'Dezember - Februar' },
                { value: 'oktober_april', label: 'Oktober - April' },
                { value: 'ganzjährig', label: 'Ganzjährig' },
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
              placeholder="Besondere Hinweise zum Winterdienst..."
            />
          </FormField>
        </CardContent>
      </Card>
    </div>
  );
};

export default WinterdienstForm;
