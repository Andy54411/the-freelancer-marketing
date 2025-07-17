import React, { useState, useEffect } from 'react';
import { GartenpflegeData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface GartenpflegeFormProps {
  data: GartenpflegeData;
  onDataChange: (data: GartenpflegeData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const GartenpflegeForm: React.FC<GartenpflegeFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<GartenpflegeData>(data);

  const serviceTypeOptions = [
    { value: 'rasenpflege', label: 'Rasenpflege' },
    { value: 'heckenschnitt', label: 'Heckenschnitt' },
    { value: 'baumschnitt', label: 'Baumschnitt' },
    { value: 'beetpflege', label: 'Beetpflege' },
    { value: 'unkrautentfernung', label: 'Unkrautentfernung' },
    { value: 'laubentfernung', label: 'Laubentfernung' },
    { value: 'winterdienst', label: 'Winterdienst' },
    { value: 'bewässerung', label: 'Bewässerung' },
    { value: 'düngung', label: 'Düngung' },
    { value: 'pflanzung', label: 'Pflanzung' },
  ];

  const gardenSizeOptions = [
    { value: 'klein', label: 'Klein (bis 100 qm)' },
    { value: 'mittel', label: 'Mittel (100-300 qm)' },
    { value: 'gross', label: 'Groß (300-600 qm)' },
    { value: 'sehr_gross', label: 'Sehr groß (über 600 qm)' },
  ];

  const frequencyOptions = [
    { value: 'einmalig', label: 'Einmalig' },
    { value: 'wöchentlich', label: 'Wöchentlich' },
    { value: 'zweiwöchentlich', label: 'Alle 2 Wochen' },
    { value: 'monatlich', label: 'Monatlich' },
    { value: 'saisonal', label: 'Saisonal' },
    { value: 'nach_bedarf', label: 'Nach Bedarf' },
  ];

  const gardenTypeOptions = [
    { value: 'ziergarten', label: 'Ziergarten' },
    { value: 'nutzgarten', label: 'Nutzgarten' },
    { value: 'gemischter_garten', label: 'Gemischter Garten' },
    { value: 'vorgarten', label: 'Vorgarten' },
    { value: 'balkon_terrasse', label: 'Balkon/Terrasse' },
    { value: 'dachgarten', label: 'Dachgarten' },
  ];

  const toolsOptions = [
    { value: 'rasenmäher', label: 'Rasenmäher' },
    { value: 'heckenschere', label: 'Heckenschere' },
    { value: 'kettensäge', label: 'Kettensäge' },
    { value: 'laubsauger', label: 'Laubsauger' },
    { value: 'vertikutierer', label: 'Vertikutierer' },
    { value: 'häcksler', label: 'Häcksler' },
    { value: 'hochdruckreiniger', label: 'Hochdruckreiniger' },
    { value: 'spaten_schaufeln', label: 'Spaten & Schaufeln' },
  ];
  const seasonOptions = [
    { value: 'frühling', label: 'Frühling' },
    { value: 'sommer', label: 'Sommer' },
    { value: 'herbst', label: 'Herbst' },
    { value: 'winter', label: 'Winter' },
    { value: 'ganzjährig', label: 'Ganzjährig' },
  ];

  const plantTypeOptions = [
    { value: 'rasen', label: 'Rasen' },
    { value: 'hecken', label: 'Hecken' },
    { value: 'bäume', label: 'Bäume' },
    { value: 'sträucher', label: 'Sträucher' },
    { value: 'blumen', label: 'Blumen' },
    { value: 'gemüse', label: 'Gemüse' },
    { value: 'kräuter', label: 'Kräuter' },
    { value: 'obstbäume', label: 'Obstbäume' },
  ];

  const additionalServicesOptions = [
    { value: 'gartenplanung', label: 'Gartenplanung' },
    { value: 'gartenberatung', label: 'Gartenberatung' },
    { value: 'pflanzberatung', label: 'Pflanzberatung' },
    { value: 'schädlingsbekämpfung', label: 'Schädlingsbekämpfung' },
    { value: 'kompostierung', label: 'Kompostierung' },
    { value: 'mulchen', label: 'Mulchen' },
    { value: 'teichpflege', label: 'Teichpflege' },
    { value: 'wegebau', label: 'Wegebau' },
    { value: 'zaunbau', label: 'Zaunbau' },
    { value: 'beleuchtung', label: 'Gartenbeleuchtung' },
  ];

  const handleInputChange = (field: keyof GartenpflegeData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.gardenSize &&
      formData.frequency &&
      formData.gardenType &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Gartenpflege-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Dienstleistung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art der Gartenpflege"
            />
          </FormField>

          <FormField label="Gartengröße" required>
            <FormSelect
              value={formData.gardenSize || ''}
              onChange={value => handleInputChange('gardenSize', value)}
              options={gardenSizeOptions}
              placeholder="Wählen Sie die Gartengröße"
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

          <FormField label="Gartentyp" required>
            <FormSelect
              value={formData.gardenType || ''}
              onChange={value => handleInputChange('gardenType', value)}
              options={gardenTypeOptions}
              placeholder="Wählen Sie den Gartentyp"
            />
          </FormField>
          <FormField label="Saison">
            <FormCheckboxGroup
              value={formData.season || []}
              onChange={value => handleInputChange('season', value)}
              options={seasonOptions}
            />
          </FormField>

          <FormField label="Gartenfläche (qm)">
            <FormInput
              type="number"
              value={formData.gardenArea?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'gardenArea',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Gartenfläche in qm"
            />
          </FormField>

          <FormField label="Anzahl Bäume">
            <FormInput
              type="number"
              value={formData.numberOfTrees?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'numberOfTrees',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl der Bäume"
            />
          </FormField>

          <FormField label="Heckenlänge (m)">
            <FormInput
              type="number"
              value={formData.hedgeLength?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'hedgeLength',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Heckenlänge in Metern"
            />
          </FormField>

          <FormField label="Rasenfläche (qm)">
            <FormInput
              type="number"
              value={formData.lawnArea?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'lawnArea',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Rasenfläche in qm"
            />
          </FormField>

          <FormField label="Gewünschter Termin">
            <FormInput
              type="text"
              value={formData.preferredDate || ''}
              onChange={value => handleInputChange('preferredDate', value)}
              placeholder="TT.MM.JJJJ"
            />
          </FormField>

          <FormField label="Dauer der Arbeit">
            <FormInput
              type="text"
              value={formData.workDuration || ''}
              onChange={value => handleInputChange('workDuration', value)}
              placeholder="z.B. 2 Stunden, halber Tag"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Benötigte Werkzeuge">
            <FormCheckboxGroup
              value={formData.requiredTools || []}
              onChange={value => handleInputChange('requiredTools', value)}
              options={toolsOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Pflanzenarten">
            <FormCheckboxGroup
              value={formData.plantTypes || []}
              onChange={value => handleInputChange('plantTypes', value)}
              options={plantTypeOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zusätzliche Services">
            <FormCheckboxGroup
              value={formData.additionalServices || []}
              onChange={value => handleInputChange('additionalServices', value)}
              options={additionalServicesOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Projektbeschreibung" required>
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie Ihre Gartenpflege-Anforderungen detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Wünsche">
            <FormTextarea
              value={formData.specialRequests || ''}
              onChange={value => handleInputChange('specialRequests', value)}
              placeholder="Besondere Wünsche oder Anforderungen"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Gartenbesonderheiten">
            <FormTextarea
              value={formData.gardenSpecials || ''}
              onChange={value => handleInputChange('gardenSpecials', value)}
              placeholder="Besonderheiten Ihres Gartens (Hanglage, Teich, etc.)"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Pflanzenprobleme">
            <FormTextarea
              value={formData.plantProblems || ''}
              onChange={value => handleInputChange('plantProblems', value)}
              placeholder="Aktuelle Probleme mit Pflanzen oder Schädlingen"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Eigene Werkzeuge vorhanden">
            <FormRadioGroup
              name="hasOwnTools"
              value={formData.hasOwnTools || ''}
              onChange={value => handleInputChange('hasOwnTools', value)}
              options={[
                { value: 'ja', label: 'Ja, eigene Werkzeuge vorhanden' },
                { value: 'teilweise', label: 'Teilweise vorhanden' },
                { value: 'nein', label: 'Nein, keine eigenen Werkzeuge' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Wasserzugang">
            <FormRadioGroup
              name="waterAccess"
              value={formData.waterAccess || ''}
              onChange={value => handleInputChange('waterAccess', value)}
              options={[
                { value: 'ja', label: 'Ja, Wasserzugang vorhanden' },
                { value: 'nein', label: 'Nein, kein Wasserzugang' },
                { value: 'begrenzt', label: 'Begrenzt verfügbar' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Entsorgung Grünschnitt">
            <FormRadioGroup
              name="wasteDisposal"
              value={formData.wasteDisposal || ''}
              onChange={value => handleInputChange('wasteDisposal', value)}
              options={[
                { value: 'selbst', label: 'Selbst entsorgen' },
                { value: 'dienstleister', label: 'Dienstleister soll entsorgen' },
                { value: 'kompost', label: 'Kompostierung vor Ort' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Erfahrung mit Gartenpflege">
            <FormRadioGroup
              name="experienceLevel"
              value={formData.experienceLevel || ''}
              onChange={value => handleInputChange('experienceLevel', value)}
              options={[
                { value: 'anfänger', label: 'Anfänger' },
                { value: 'fortgeschritten', label: 'Fortgeschritten' },
                { value: 'erfahren', label: 'Erfahren' },
                { value: 'profi', label: 'Profi' },
              ]}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default GartenpflegeForm;
