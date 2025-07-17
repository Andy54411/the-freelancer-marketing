import React, { useState, useEffect } from 'react';
import { GartengestaltungData } from '@/types/subcategory-forms';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface GartengestaltungFormProps {
  data: GartengestaltungData;
  onDataChange: (data: GartengestaltungData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const GartengestaltungForm: React.FC<GartengestaltungFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const handleFieldChange = (field: keyof GartengestaltungData, value: any) => {
    onDataChange({
      ...data,
      [field]: value,
    });
  };

  // Validierungslogik
  useEffect(() => {
    const isValid = !!(data.projectType && data.gardenSize && data.budget);
    onValidationChange(isValid);
  }, [data, onValidationChange]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gartengestaltung</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormField
            label="Art des Projekts"
            required
            description="Welche Art von Gartengestaltung benötigen Sie?"
          >
            <FormSelect
              value={data.projectType || ''}
              onChange={value => handleFieldChange('projectType', value)}
              options={[
                { value: 'neuanlage', label: 'Garten-Neuanlage' },
                { value: 'umgestaltung', label: 'Garten-Umgestaltung' },
                { value: 'teilbereich', label: 'Teilbereich gestalten' },
                { value: 'vorgarten', label: 'Vorgarten-Gestaltung' },
                { value: 'terrasse', label: 'Terrassen-Gestaltung' },
                { value: 'balkon', label: 'Balkon-Gestaltung' },
                { value: 'dachgarten', label: 'Dachgarten' },
                { value: 'pflanzplan', label: 'Pflanzplan erstellen' },
              ]}
            />
          </FormField>

          <FormField
            label="Gartengröße"
            required
            description="Wie groß ist die zu gestaltende Fläche?"
          >
            <FormSelect
              value={data.gardenSize || ''}
              onChange={value => handleFieldChange('gardenSize', value)}
              options={[
                { value: 'bis_50qm', label: 'Bis 50 qm' },
                { value: '50_100qm', label: '50-100 qm' },
                { value: '100_300qm', label: '100-300 qm' },
                { value: '300_500qm', label: '300-500 qm' },
                { value: '500_1000qm', label: '500-1000 qm' },
                { value: 'über_1000qm', label: 'Über 1000 qm' },
              ]}
            />
          </FormField>
          <FormField
            label="Gewünschte Elemente"
            description="Welche Elemente sollen in den Garten integriert werden?"
          >
            <FormCheckboxGroup
              value={data.desiredElements || []}
              onChange={value => handleFieldChange('desiredElements', value)}
              options={[
                { value: 'rasen', label: 'Rasen' },
                { value: 'blumenbeete', label: 'Blumenbeete' },
                { value: 'sträucher', label: 'Sträucher' },
                { value: 'bäume', label: 'Bäume' },
                { value: 'hecken', label: 'Hecken' },
                { value: 'wege', label: 'Wege' },
                { value: 'terrasse', label: 'Terrasse' },
                { value: 'wasserelement', label: 'Wasserelement' },
                { value: 'beleuchtung', label: 'Beleuchtung' },
                { value: 'sichtschutz', label: 'Sichtschutz' },
                { value: 'spielbereich', label: 'Spielbereich' },
                { value: 'gemüsegarten', label: 'Gemüsegarten' },
              ]}
            />
          </FormField>

          <FormField label="Gartenstil" description="Welchen Gartenstil bevorzugen Sie?">
            <FormSelect
              value={data.gardenStyle || ''}
              onChange={value => handleFieldChange('gardenStyle', value)}
              options={[
                { value: 'modern', label: 'Modern' },
                { value: 'klassisch', label: 'Klassisch' },
                { value: 'natürlich', label: 'Natürlich' },
                { value: 'mediterran', label: 'Mediterran' },
                { value: 'japanisch', label: 'Japanisch' },
                { value: 'englisch', label: 'Englisch' },
                { value: 'cottage', label: 'Cottage' },
                { value: 'minimalistisch', label: 'Minimalistisch' },
                { value: 'bauerngarten', label: 'Bauerngarten' },
              ]}
            />
          </FormField>

          <FormField label="Bodenbeschaffenheit" description="Wie ist die Bodenbeschaffenheit?">
            <FormSelect
              value={data.soilCondition || ''}
              onChange={value => handleFieldChange('soilCondition', value)}
              options={[
                { value: 'lehmig', label: 'Lehmig' },
                { value: 'sandig', label: 'Sandig' },
                { value: 'tonig', label: 'Tonig' },
                { value: 'humusreich', label: 'Humusreich' },
                { value: 'steinig', label: 'Steinig' },
                { value: 'verdichtet', label: 'Verdichtet' },
                { value: 'unbekannt', label: 'Unbekannt' },
              ]}
            />
          </FormField>

          <FormField
            label="Lichtverhältnisse"
            description="Wie sind die Lichtverhältnisse im Garten?"
          >
            <FormSelect
              value={data.lightConditions || ''}
              onChange={value => handleFieldChange('lightConditions', value)}
              options={[
                { value: 'vollsonne', label: 'Vollsonne' },
                { value: 'halbschatten', label: 'Halbschatten' },
                { value: 'schatten', label: 'Schatten' },
                { value: 'wechselnd', label: 'Wechselnd' },
                { value: 'unbekannt', label: 'Unbekannt' },
              ]}
            />
          </FormField>

          <FormField label="Pflegeanspruch" description="Wie pflegeintensiv soll der Garten sein?">
            <FormSelect
              value={data.maintenanceLevel || ''}
              onChange={value => handleFieldChange('maintenanceLevel', value)}
              options={[
                { value: 'pflegeleicht', label: 'Pflegeleicht' },
                { value: 'mittel', label: 'Mittlerer Pflegeaufwand' },
                { value: 'pflegeintensiv', label: 'Pflegeintensiv' },
                { value: 'egal', label: 'Egal' },
              ]}
            />
          </FormField>

          <FormField
            label="Zusätzliche Leistungen"
            description="Welche zusätzlichen Leistungen werden benötigt?"
          >
            <FormCheckboxGroup
              value={data.additionalServices || []}
              onChange={value => handleFieldChange('additionalServices', value)}
              options={[
                { value: 'planung', label: 'Gartenplanung' },
                { value: 'beratung', label: 'Beratung' },
                { value: 'umsetzung', label: 'Umsetzung' },
                { value: 'pflanzung', label: 'Pflanzung' },
                { value: 'erdarbeiten', label: 'Erdarbeiten' },
                { value: 'wegebau', label: 'Wegebau' },
                { value: 'bewässerung', label: 'Bewässerungssystem' },
                { value: 'pflege', label: 'Nachpflege' },
              ]}
            />
          </FormField>

          <FormField label="Zeitrahmen" description="Wann soll das Projekt umgesetzt werden?">
            <FormSelect
              value={data.timeframe || ''}
              onChange={value => handleFieldChange('timeframe', value)}
              options={[
                { value: 'sofort', label: 'Sofort' },
                { value: 'frühjahr', label: 'Frühjahr' },
                { value: 'sommer', label: 'Sommer' },
                { value: 'herbst', label: 'Herbst' },
                { value: 'winter', label: 'Winter' },
                { value: 'flexibel', label: 'Flexibel' },
              ]}
            />
          </FormField>

          <FormField
            label="Nur Planung oder auch Umsetzung?"
            description="Benötigen Sie nur die Planung oder auch die Umsetzung?"
          >
            <FormRadioGroup
              value={data.serviceScope || ''}
              onChange={value => handleFieldChange('serviceScope', value)}
              name="serviceScope"
              options={[
                { value: 'nur_planung', label: 'Nur Planung' },
                { value: 'nur_umsetzung', label: 'Nur Umsetzung' },
                { value: 'planung_umsetzung', label: 'Planung + Umsetzung' },
              ]}
            />
          </FormField>

          <FormField
            label="Besondere Wünsche"
            description="Haben Sie besondere Wünsche oder Vorstellungen?"
          >
            <FormTextarea
              value={data.specialRequests || ''}
              onChange={value => handleFieldChange('specialRequests', value)}
              placeholder="Besondere Wünsche für die Gartengestaltung..."
            />
          </FormField>
        </CardContent>
      </Card>
    </div>
  );
};

export default GartengestaltungForm;
