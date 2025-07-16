// Hauptkomponente für dynamische Unterkategorie-Formulare
import React, { useState, useEffect } from 'react';
import {
  SubcategoryData,
  getSubcategoryType,
  validateSubcategoryData,
} from '@/types/subcategory-forms';
import MalerForm from './MalerForm';
import ElektrikerForm from './ElektrikerForm';
import TischlerForm from './TischlerForm';
import KlempnerForm from './KlempnerForm';
import ReinigungskraftForm from './ReinigungskraftForm';
import HaushaltshilfeForm from './HaushaltshilfeForm';
import WebentwicklungForm from './WebentwicklungForm';
import ITForm from './ITForm';
import UmzugForm from './UmzugForm';
import HeizungSanitärForm from './HeizungSanitärForm';
import FliesenlegerForm from './FliesenlegerForm';
import DachdeckerForm from './DachdeckerForm';
import MaurerForm from './MaurerForm';
import TrockenbauerForm from './TrockenbauerForm';
import SchreinerForm from './SchreinerForm';
import ZimmererForm from './ZimmererForm';
import BodenlegerForm from './BodenlegerForm';
import GlaserForm from './GlaserForm';
import SchlosserForm from './SchlosserForm';
import MetallbauerForm from './MetallbauerForm';
// Import weiterer Formulare hier...

interface SubcategoryFormManagerProps {
  subcategory: string;
  onDataChange: (data: SubcategoryData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const SubcategoryFormManager: React.FC<SubcategoryFormManagerProps> = ({
  subcategory,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<SubcategoryData | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  // Initialisiere Formulardaten basierend auf Unterkategorie
  useEffect(() => {
    const initializeFormData = (): SubcategoryData => {
      switch (subcategory) {
        case 'Maler & Lackierer':
          return {
            subcategory: 'Maler & Lackierer',
            roomType: 'zimmer',
            paintType: 'innenfarbe',
            materialProvided: 'handwerker',
            surfaceCondition: 'gut',
            additionalServices: [],
            timeframe: 'flexibel',
          };
        case 'Elektriker':
          return {
            subcategory: 'Elektriker',
            serviceType: 'installation',
            workType: 'steckdosen',
            urgency: 'normal',
            buildingType: 'einfamilienhaus',
            existingInstallation: 'vorhanden',
            certificationNeeded: false,
            materialProvided: 'handwerker',
          };
        case 'Tischler':
          return {
            subcategory: 'Tischler',
            serviceType: 'reparatur',
            furnitureType: 'tisch',
            material: 'holz',
            complexity: 'mittel',
            materialProvided: 'handwerker',
            timeframe: 'flexibel',
          };
        case 'Klempner':
          return {
            subcategory: 'Klempner',
            serviceType: 'reparatur',
            problemType: 'undichtigkeit',
            urgency: 'normal',
            roomType: 'bad',
            buildingType: 'wohnung',
            accessibilityIssues: false,
            materialProvided: 'handwerker',
          };
        case 'Reinigungskraft':
          return {
            subcategory: 'Reinigungskraft',
            serviceType: 'regelmäßig',
            cleaningType: 'unterhaltsreinigung',
            specialAreas: ['bad', 'küche'],
            equipment: 'mitbringen',
            chemicals: 'mitbringen',
            timePreference: 'flexibel',
            accessMethod: 'anwesend',
          };
        case 'Webentwicklung':
          return {
            subcategory: 'Webentwicklung',
            serviceType: 'neubau',
            projectType: 'website',
            technology: ['html_css', 'javascript'],
            complexity: 'mittel',
            features: ['responsive', 'seo'],
            timeframe: 'flexibel',
            support: 'einmalig',
          };
        case 'Umzugshelfer':
          return {
            subcategory: 'Umzugshelfer',
            serviceType: 'komplettservice',
            fromFloor: 1,
            toFloor: 1,
            hasElevator: 'keine',
            distance: 10,
            roomCount: 3,
            furnitureType: ['schwere_möbel'],
            packingMaterial: 'benötigt',
            vehicleSize: 'mittel',
            additionalServices: [],
            dateFlexible: false,
          };
        case 'Haushaltshilfe':
          return {
            subcategory: 'Haushaltshilfe',
            serviceType: 'regelmäßig',
            services: ['putzen'],
            timePreference: 'flexibel',
            languages: ['deutsch'],
            experience: 'egal',
            ownTransport: false,
          };
        case 'IT-Support':
          return {
            subcategory: 'IT-Support',
            serviceType: 'reparatur',
            urgency: 'normal',
            location: 'vor_ort',
            dataBackup: 'vorhanden',
            businessHours: true,
          };
        case 'Heizungsbau & Sanitär':
          return {
            subcategory: 'Heizungsbau & Sanitär',
            serviceType: 'reparatur',
            systemType: 'heizung',
            urgency: 'normal',
            buildingType: 'einfamilienhaus',
            heatingType: 'gas',
            certification: false,
          };
        case 'Fliesenleger':
          return {
            subcategory: 'Fliesenleger',
            serviceType: 'neubau',
            roomType: 'bad',
            tileType: 'keramik',
            tileSize: 'mittel',
            pattern: 'standard',
            preparationWork: 'nicht_nötig',
            materialProvided: 'handwerker',
            waterproofing: false,
          };
        case 'Dachdecker':
          return {
            subcategory: 'Dachdecker',
            serviceType: 'neubau',
            roofType: 'steildach',
            material: 'ziegel',
            roofSize: 'mittel',
            urgency: 'normal',
            scaffolding: 'benötigt',
            insulation: 'nicht_nötig',
            gutters: 'nicht_nötig',
          };
        case 'Maurer':
          return {
            subcategory: 'Maurer',
            serviceType: 'neubau',
            workType: 'mauer',
            materialType: 'ziegel',
            projectSize: 'mittel',
            foundation: 'vorhanden',
            permits: 'nicht_nötig',
            materialProvided: 'handwerker',
          };
        case 'Trockenbauer':
          return {
            subcategory: 'Trockenbauer',
            serviceType: 'neubau',
            workType: 'wand',
            materialType: 'gipskarton',
            projectSize: 'mittel',
            foundation: 'vorhanden',
            permits: 'nicht_nötig',
            materialProvided: 'handwerker',
          };
        case 'Schreiner':
          return {
            subcategory: 'Schreiner',
            serviceType: 'anfertigung',
            workType: 'möbel',
            woodType: 'eiche',
            projectSize: 'mittel',
            foundation: 'vorhanden',
            permits: 'nicht_nötig',
            materialProvided: 'handwerker',
          };
        case 'Zimmerer':
          return {
            subcategory: 'Zimmerer',
            serviceType: 'neubau',
            workType: 'dachstuhl',
            woodType: 'fichte',
            projectSize: 'mittel',
            foundation: 'vorhanden',
            permits: 'nicht_nötig',
            insulation: 'nicht_nötig',
            materialProvided: 'handwerker',
          };
        case 'Bodenleger':
          return {
            subcategory: 'Bodenleger',
            serviceType: 'neubau',
            floorType: 'parkett',
            roomType: 'wohnzimmer',
            underfloor: 'estrich',
            projectSize: 'mittel',
            preparationWork: 'nicht_nötig',
            underfloorHeating: 'nicht_vorhanden',
            skirting: 'nicht_nötig',
            materialProvided: 'handwerker',
          };
        case 'Glaser':
          return {
            subcategory: 'Glaser',
            serviceType: 'reparatur',
            glassType: 'fenster',
            glassMaterial: 'einfachglas',
            urgency: 'normal',
            measurement: 'benötigt',
            installation: 'inklusive',
            disposal: 'nicht_nötig',
          };
        case 'Schlosser':
          return {
            subcategory: 'Schlosser',
            serviceType: 'reparatur',
            workType: 'schloss',
            lockType: 'zylinder',
            securityLevel: 'standard',
            urgency: 'normal',
            keyService: 'inklusive',
            installation: 'inklusive',
          };
        case 'Metallbauer':
          return {
            subcategory: 'Metallbauer',
            serviceType: 'neubau',
            workType: 'treppe',
            material: 'stahl',
            projectSize: 'mittel',
            foundation: 'vorhanden',
            permits: 'nicht_nötig',
            materialProvided: 'handwerker',
          };
        // Weitere Unterkategorien...
        default:
          return {
            subcategory: subcategory as any,
            serviceType: 'installation',
            workType: 'steckdosen',
            urgency: 'normal',
            buildingType: 'einfamilienhaus',
            existingInstallation: 'vorhanden',
            certificationNeeded: false,
            materialProvided: 'handwerker',
          };
      }
    };

    const initialData = initializeFormData();
    setFormData(initialData);
  }, [subcategory]);

  // Validierung und Datenweiterleitung
  useEffect(() => {
    if (!formData) return;

    const validationErrors = validateSubcategoryData(formData);
    setErrors(validationErrors);
    onValidationChange(validationErrors.length === 0);
    onDataChange(formData);
  }, [formData, onDataChange, onValidationChange]);

  const handleDataChange = (newData: SubcategoryData) => {
    setFormData(newData);
  };

  if (!formData) {
    return <div>Lade Formular...</div>;
  }

  // Rendere das passende Formular basierend auf Unterkategorie
  const renderForm = () => {
    switch (subcategory) {
      case 'Maler & Lackierer':
        return (
          <MalerForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Elektriker':
        return (
          <ElektrikerForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Tischler':
        return (
          <TischlerForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Klempner':
        return (
          <KlempnerForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Reinigungskraft':
        return (
          <ReinigungskraftForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Webentwicklung':
        return (
          <WebentwicklungForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Umzugshelfer':
        return (
          <UmzugForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Haushaltshilfe':
        return (
          <HaushaltshilfeForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'IT-Support':
        return (
          <ITForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Heizungsbau & Sanitär':
        return (
          <HeizungSanitärForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Fliesenleger':
        return (
          <FliesenlegerForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Dachdecker':
        return (
          <DachdeckerForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Maurer':
        return (
          <MaurerForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Trockenbauer':
        return (
          <TrockenbauerForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Schreiner':
        return (
          <SchreinerForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Zimmerer':
        return (
          <ZimmererForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Bodenleger':
        return (
          <BodenlegerForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Glaser':
        return (
          <GlaserForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Schlosser':
        return (
          <SchlosserForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      case 'Metallbauer':
        return (
          <MetallbauerForm
            data={formData as any}
            onDataChange={handleDataChange}
            onValidationChange={() => {}}
          />
        );
      // Weitere Unterkategorien...
      default:
        return (
          <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {subcategory}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Spezifisches Formular für {subcategory} wird noch entwickelt.
            </p>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Besondere Anforderungen
              </label>
              <textarea
                value={(formData as any).specialRequirements || ''}
                onChange={e =>
                  handleDataChange({
                    ...formData,
                    specialRequirements: e.target.value,
                  } as any)
                }
                placeholder="Beschreiben Sie Ihre spezifischen Anforderungen..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-vertical"
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {renderForm()}

      {/* Fehleranzeige */}
      {errors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h4 className="text-red-800 dark:text-red-200 font-semibold mb-2">
            Bitte korrigieren Sie folgende Fehler:
          </h4>
          <ul className="text-red-700 dark:text-red-300 text-sm space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SubcategoryFormManager;
