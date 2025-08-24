import React, { useState, useEffect } from 'react';
import { LandschaftsgärtnerData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';

interface LandschaftsgärtnerFormProps {
  data: LandschaftsgärtnerData;
  onDataChange: (data: LandschaftsgärtnerData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const LandschaftsgärtnerForm: React.FC<LandschaftsgärtnerFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<LandschaftsgärtnerData>(data);

  const serviceTypeOptions = [
    { value: 'gartenplanung', label: 'Gartenplanung' },
    { value: 'gartengestaltung', label: 'Gartengestaltung' },
    { value: 'terrassenbau', label: 'Terrassenbau' },
    { value: 'wegebau', label: 'Wegebau' },
    { value: 'pflasterarbeiten', label: 'Pflasterarbeiten' },
    { value: 'zaunbau', label: 'Zaunbau' },
    { value: 'teichbau', label: 'Teichbau' },
    { value: 'bewässerungssystem', label: 'Bewässerungssystem' },
    { value: 'rollrasen', label: 'Rollrasen verlegen' },
    { value: 'bepflanzung', label: 'Bepflanzung' },
  ];

  const projectSizeOptions = [
    { value: 'klein', label: 'Klein (bis 200 qm)' },
    { value: 'mittel', label: 'Mittel (200-500 qm)' },
    { value: 'gross', label: 'Groß (500-1000 qm)' },
    { value: 'sehr_gross', label: 'Sehr groß (über 1000 qm)' },
  ];
  const styleOptions = [
    { value: 'modern', label: 'Modern' },
    { value: 'klassisch', label: 'Klassisch' },
    { value: 'mediterran', label: 'Mediterran' },
    { value: 'japanisch', label: 'Japanisch' },
    { value: 'cottage', label: 'Cottage/Landhausstil' },
    { value: 'minimalistisch', label: 'Minimalistisch' },
    { value: 'natürlich', label: 'Natürlich' },
    { value: 'pflegeleicht', label: 'Pflegeleicht' },
  ];

  const materialOptions = [
    { value: 'naturstein', label: 'Naturstein' },
    { value: 'beton', label: 'Beton' },
    { value: 'klinker', label: 'Klinker' },
    { value: 'holz', label: 'Holz' },
    { value: 'metall', label: 'Metall' },
    { value: 'kies', label: 'Kies' },
    { value: 'mulch', label: 'Mulch' },
    { value: 'rasen', label: 'Rasen' },
  ];

  const plantTypeOptions = [
    { value: 'bäume', label: 'Bäume' },
    { value: 'sträucher', label: 'Sträucher' },
    { value: 'hecken', label: 'Hecken' },
    { value: 'stauden', label: 'Stauden' },
    { value: 'gräser', label: 'Gräser' },
    { value: 'rosen', label: 'Rosen' },
    { value: 'bodendecker', label: 'Bodendecker' },
    { value: 'obstbäume', label: 'Obstbäume' },
    { value: 'gemüse', label: 'Gemüse' },
    { value: 'kräuter', label: 'Kräuter' },
  ];

  const featureOptions = [
    { value: 'wasserspiel', label: 'Wasserspiel' },
    { value: 'teich', label: 'Teich' },
    { value: 'brunnen', label: 'Brunnen' },
    { value: 'grillplatz', label: 'Grillplatz' },
    { value: 'spielplatz', label: 'Spielplatz' },
    { value: 'beleuchtung', label: 'Beleuchtung' },
    { value: 'pergola', label: 'Pergola' },
    { value: 'pavillon', label: 'Pavillon' },
    { value: 'sitzbereich', label: 'Sitzbereich' },
    { value: 'feuerstelle', label: 'Feuerstelle' },
  ];

  const additionalServicesOptions = [
    { value: 'planung_3d', label: '3D-Planung' },
    { value: 'beratung', label: 'Beratung' },
    { value: 'erdarbeiten', label: 'Erdarbeiten' },
    { value: 'drainage', label: 'Drainage' },
    { value: 'automatische_bewässerung', label: 'Automatische Bewässerung' },
    { value: 'beleuchtung_installation', label: 'Beleuchtung Installation' },
    { value: 'pflege_service', label: 'Pflege-Service' },
    { value: 'winterschutz', label: 'Winterschutz' },
    { value: 'pflanzenpflege', label: 'Pflanzenpflege' },
    { value: 'wartung', label: 'Wartung' },
  ];

  const handleInputChange = (field: keyof LandschaftsgärtnerData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.projectSize &&
      formData.style &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.projectSize &&
      formData.style &&
      formData.projectDescription
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Landschaftsgärtner-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Dienstleistung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art der Dienstleistung"
            />
          </FormField>

          <FormField label="Projektgröße" required>
            <FormSelect
              value={formData.projectSize || ''}
              onChange={value => handleInputChange('projectSize', value)}
              options={projectSizeOptions}
              placeholder="Wählen Sie die Projektgröße"
            />
          </FormField>
          <FormField label="Stil" required>
            <FormSelect
              value={formData.style || ''}
              onChange={value => handleInputChange('style', value)}
              options={styleOptions}
              placeholder="Wählen Sie den gewünschten Stil"
            />
          </FormField>

          <FormField label="Fläche (qm)">
            <FormInput
              type="number"
              value={formData.area?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'area',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Fläche in qm"
            />
          </FormField>

          <FormField label="Gewünschter Starttermin">
            <FormInput
              type="text"
              value={formData.startDate || ''}
              onChange={value => handleInputChange('startDate', value)}
              placeholder="TT.MM.JJJJ"
            />
          </FormField>

          <FormField label="Gewünschter Fertigstellungstermin">
            <FormInput
              type="text"
              value={formData.completionDate || ''}
              onChange={value => handleInputChange('completionDate', value)}
              placeholder="TT.MM.JJJJ"
            />
          </FormField>

          <FormField label="Bodenbeschaffenheit">
            <FormInput
              type="text"
              value={formData.soilType || ''}
              onChange={value => handleInputChange('soilType', value)}
              placeholder="z.B. Lehm, Sand, Ton"
            />
          </FormField>

          <FormField label="Gefälle/Hanglage">
            <FormInput
              type="text"
              value={formData.slope || ''}
              onChange={value => handleInputChange('slope', value)}
              placeholder="z.B. leicht geneigt, stark abfallend"
            />
          </FormField>

          <FormField label="Sonneneinstrahlung">
            <FormInput
              type="text"
              value={formData.sunExposure || ''}
              onChange={value => handleInputChange('sunExposure', value)}
              placeholder="z.B. ganztägig sonnig, halbschattig"
            />
          </FormField>

          <FormField label="Vorhandene Pflanzen">
            <FormInput
              type="text"
              value={formData.existingPlants || ''}
              onChange={value => handleInputChange('existingPlants', value)}
              placeholder="Pflanzen, die erhalten bleiben sollen"
            />
          </FormField>

          <FormField label="Zugang zur Baustelle">
            <FormInput
              type="text"
              value={formData.siteAccess || ''}
              onChange={value => handleInputChange('siteAccess', value)}
              placeholder="z.B. durch Haus, Gartentor"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Bevorzugte Materialien">
            <FormCheckboxGroup
              value={formData.preferredMaterials || []}
              onChange={value => handleInputChange('preferredMaterials', value)}
              options={materialOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Gewünschte Pflanzen">
            <FormCheckboxGroup
              value={formData.desiredPlants || []}
              onChange={value => handleInputChange('desiredPlants', value)}
              options={plantTypeOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Gewünschte Features">
            <FormCheckboxGroup
              value={formData.desiredFeatures || []}
              onChange={value => handleInputChange('desiredFeatures', value)}
              options={featureOptions}
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
              placeholder="Beschreiben Sie Ihr Landschaftsgärtner-Projekt detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Inspiration/Vorstellungen">
            <FormTextarea
              value={formData.inspiration || ''}
              onChange={value => handleInputChange('inspiration', value)}
              placeholder="Beschreiben Sie Ihre Vorstellungen und Inspirationen"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Besondere Anforderungen oder Wünsche"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Probleme/Herausforderungen">
            <FormTextarea
              value={formData.challenges || ''}
              onChange={value => handleInputChange('challenges', value)}
              placeholder="Aktuelle Probleme oder Herausforderungen"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Nachbarschaft berücksichtigen">
            <FormTextarea
              value={formData.neighborhoodConsiderations || ''}
              onChange={value => handleInputChange('neighborhoodConsiderations', value)}
              placeholder="Rücksicht auf Nachbarn oder Sichtschutz"
              rows={2}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Pflegeaufwand">
            <FormRadioGroup
              name="maintenanceLevel"
              value={formData.maintenanceLevel || ''}
              onChange={value => handleInputChange('maintenanceLevel', value)}
              options={[
                { value: 'niedrig', label: 'Niedrig - pflegeleicht' },
                { value: 'mittel', label: 'Mittel - normale Pflege' },
                { value: 'hoch', label: 'Hoch - intensive Pflege' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zeitrahmen">
            <FormRadioGroup
              name="timeframe"
              value={formData.timeframe || ''}
              onChange={value => handleInputChange('timeframe', value)}
              options={[
                { value: 'sofort', label: 'Sofort' },
                { value: 'innerhalb_monat', label: 'Innerhalb eines Monats' },
                { value: 'innerhalb_quartal', label: 'Innerhalb eines Quartals' },
                { value: 'flexibel', label: 'Flexibel' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Bewässerungssystem gewünscht">
            <FormRadioGroup
              name="irrigationSystem"
              value={formData.irrigationSystem || ''}
              onChange={value => handleInputChange('irrigationSystem', value)}
              options={[
                { value: 'ja', label: 'Ja, automatisches System' },
                { value: 'teilweise', label: 'Teilweise/bestimmte Bereiche' },
                { value: 'nein', label: 'Nein, manuell' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Erfahrung mit Gartenprojekten">
            <FormRadioGroup
              name="experienceLevel"
              value={formData.experienceLevel || ''}
              onChange={value => handleInputChange('experienceLevel', value)}
              options={[
                { value: 'keine', label: 'Keine Erfahrung' },
                { value: 'wenig', label: 'Wenig Erfahrung' },
                { value: 'mittel', label: 'Mittlere Erfahrung' },
                { value: 'viel', label: 'Viel Erfahrung' },
              ]}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton
        isValid={isFormValid()}
        subcategory="Landschaftsgärtner"
        formData={formData}
      />
    </div>
  );
};

export default LandschaftsgärtnerForm;
