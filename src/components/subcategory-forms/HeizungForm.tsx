import React, { useState, useEffect } from 'react';
import { HeizungData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface HeizungFormProps {
  data: HeizungData;
  onDataChange: (data: HeizungData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const HeizungForm: React.FC<HeizungFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<HeizungData>(data);

  const serviceTypeOptions = [
    { value: 'installation', label: 'Installation' },
    { value: 'reparatur', label: 'Reparatur' },
    { value: 'wartung', label: 'Wartung' },
    { value: 'modernisierung', label: 'Modernisierung' },
    { value: 'austausch', label: 'Austausch' },
    { value: 'beratung', label: 'Beratung' },
    { value: 'notdienst', label: 'Notdienst' },
    { value: 'inspektion', label: 'Inspektion' },
    { value: 'reinigung', label: 'Reinigung' },
    { value: 'optimierung', label: 'Optimierung' },
    { value: 'sanierung', label: 'Sanierung' },
    { value: 'umbau', label: 'Umbau' },
    { value: 'andere', label: 'Andere' },
  ];

  const heatingTypeOptions = [
    { value: 'gasheizung', label: 'Gasheizung' },
    { value: 'ölheizung', label: 'Ölheizung' },
    { value: 'pelletheizung', label: 'Pelletheizung' },
    { value: 'wärmepumpe', label: 'Wärmepumpe' },
    { value: 'fernwärme', label: 'Fernwärme' },
    { value: 'elektroheizung', label: 'Elektroheizung' },
    { value: 'solarthermie', label: 'Solarthermie' },
    { value: 'bhkw', label: 'Blockheizkraftwerk' },
    { value: 'kaminofen', label: 'Kaminofen' },
    { value: 'brennstoffzelle', label: 'Brennstoffzelle' },
    { value: 'hybridheizung', label: 'Hybridheizung' },
    { value: 'andere', label: 'Andere' },
  ];

  const buildingTypeOptions = [
    { value: 'einfamilienhaus', label: 'Einfamilienhaus' },
    { value: 'mehrfamilienhaus', label: 'Mehrfamilienhaus' },
    { value: 'wohnung', label: 'Wohnung' },
    { value: 'gewerbe', label: 'Gewerbe' },
    { value: 'büro', label: 'Büro' },
    { value: 'laden', label: 'Laden' },
    { value: 'werkstatt', label: 'Werkstatt' },
    { value: 'lager', label: 'Lager' },
    { value: 'andere', label: 'Andere' },
  ];

  const buildingAgeOptions = [
    { value: 'neubau', label: 'Neubau (0-5 Jahre)' },
    { value: 'neu', label: 'Neu (5-15 Jahre)' },
    { value: 'mittel', label: 'Mittel (15-30 Jahre)' },
    { value: 'alt', label: 'Alt (30-50 Jahre)' },
    { value: 'sehr_alt', label: 'Sehr alt (über 50 Jahre)' },
    { value: 'unbekannt', label: 'Unbekannt' },
  ];

  const livingSpaceOptions = [
    { value: 'unter_50', label: 'Unter 50 m²' },
    { value: '50_100', label: '50-100 m²' },
    { value: '100_150', label: '100-150 m²' },
    { value: '150_200', label: '150-200 m²' },
    { value: '200_300', label: '200-300 m²' },
    { value: 'über_300', label: 'Über 300 m²' },
  ];

  const urgencyOptions = [
    { value: 'notfall', label: 'Notfall' },
    { value: 'sehr_eilig', label: 'Sehr eilig' },
    { value: 'eilig', label: 'Eilig' },
    { value: 'normal', label: 'Normal' },
    { value: 'nicht_eilig', label: 'Nicht eilig' },
  ];

  const budgetRangeOptions = [
    { value: 'unter_500', label: 'Unter 500€' },
    { value: '500_1000', label: '500€ - 1000€' },
    { value: '1000_2500', label: '1000€ - 2500€' },
    { value: '2500_5000', label: '2500€ - 5000€' },
    { value: '5000_10000', label: '5000€ - 10000€' },
    { value: '10000_20000', label: '10000€ - 20000€' },
    { value: 'über_20000', label: 'Über 20000€' },
  ];

  const problemTypeOptions = [
    { value: 'kein_warmwasser', label: 'Kein Warmwasser' },
    { value: 'kalte_räume', label: 'Kalte Räume' },
    { value: 'geräusche', label: 'Geräusche' },
    { value: 'hohe_kosten', label: 'Hohe Kosten' },
    { value: 'druckverlust', label: 'Druckverlust' },
    { value: 'lecks', label: 'Lecks' },
    { value: 'störung', label: 'Störung' },
    { value: 'ausfall', label: 'Ausfall' },
    { value: 'verschleiß', label: 'Verschleiß' },
    { value: 'andere', label: 'Andere' },
  ];

  const additionalServicesOptions = [
    { value: 'planung', label: 'Planung' },
    { value: 'beratung', label: 'Beratung' },
    { value: 'gutachten', label: 'Gutachten' },
    { value: 'förderung', label: 'Förderberatung' },
    { value: 'energieberatung', label: 'Energieberatung' },
    { value: 'hydraulischer_abgleich', label: 'Hydraulischer Abgleich' },
    { value: 'thermografie', label: 'Thermografie' },
    { value: 'schornsteinfeger', label: 'Schornsteinfeger' },
    { value: 'gasanschluss', label: 'Gasanschluss' },
    { value: 'elektrik', label: 'Elektrik' },
    { value: 'sanitär', label: 'Sanitär' },
    { value: 'dämmung', label: 'Dämmung' },
    { value: 'estrich', label: 'Estrich' },
    { value: 'fliesenarbeiten', label: 'Fliesenarbeiten' },
    { value: 'malerarbeiten', label: 'Malerarbeiten' },
    { value: 'entsorgung', label: 'Entsorgung' },
    { value: 'reinigung', label: 'Reinigung' },
    { value: 'wartungsvertrag', label: 'Wartungsvertrag' },
    { value: 'notdienst', label: 'Notdienst' },
    { value: 'express_service', label: 'Express-Service' },
    { value: 'wochenend_service', label: 'Wochenend-Service' },
    { value: 'abnahme', label: 'Abnahme' },
    { value: 'dokumentation', label: 'Dokumentation' },
    { value: 'schulung', label: 'Schulung' },
    { value: 'fernwartung', label: 'Fernwartung' },
  ];

  const handleInputChange = (field: keyof HeizungData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.heatingType &&
      formData.buildingType &&
      formData.urgency &&
      formData.budgetRange &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Heizung-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Heizungsarbeit" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art der Arbeit"
            />
          </FormField>

          <FormField label="Heizungstyp" required>
            <FormSelect
              value={formData.heatingType || ''}
              onChange={value => handleInputChange('heatingType', value)}
              options={heatingTypeOptions}
              placeholder="Wählen Sie den Heizungstyp"
            />
          </FormField>

          <FormField label="Gebäudetyp" required>
            <FormSelect
              value={formData.buildingType || ''}
              onChange={value => handleInputChange('buildingType', value)}
              options={buildingTypeOptions}
              placeholder="Wählen Sie den Gebäudetyp"
            />
          </FormField>

          <FormField label="Dringlichkeit" required>
            <FormSelect
              value={formData.urgency || ''}
              onChange={value => handleInputChange('urgency', value)}
              options={urgencyOptions}
              placeholder="Wählen Sie die Dringlichkeit"
            />
          </FormField>

          <FormField label="Budget-Rahmen" required>
            <FormSelect
              value={formData.budgetRange || ''}
              onChange={value => handleInputChange('budgetRange', value)}
              options={budgetRangeOptions}
              placeholder="Wählen Sie den Budget-Rahmen"
            />
          </FormField>

          <FormField label="Gebäudealter">
            <FormSelect
              value={formData.buildingAge || ''}
              onChange={value => handleInputChange('buildingAge', value)}
              options={buildingAgeOptions}
              placeholder="Wählen Sie das Gebäudealter"
            />
          </FormField>

          <FormField label="Wohnfläche">
            <FormSelect
              value={formData.livingSpace || ''}
              onChange={value => handleInputChange('livingSpace', value)}
              options={livingSpaceOptions}
              placeholder="Wählen Sie die Wohnfläche"
            />
          </FormField>

          <FormField label="Hersteller">
            <FormInput
              type="text"
              value={formData.brand || ''}
              onChange={value => handleInputChange('brand', value)}
              placeholder="Hersteller der Heizung"
            />
          </FormField>

          <FormField label="Modell">
            <FormInput
              type="text"
              value={formData.model || ''}
              onChange={value => handleInputChange('model', value)}
              placeholder="Modell der Heizung"
            />
          </FormField>

          <FormField label="Baujahr">
            <FormInput
              type="number"
              value={formData.installationYear?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'installationYear',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Baujahr der Heizung"
            />
          </FormField>

          <FormField label="Leistung (kW)">
            <FormInput
              type="number"
              value={formData.power?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'power',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Leistung in kW"
            />
          </FormField>

          <FormField label="Anzahl Heizkörper">
            <FormInput
              type="number"
              value={formData.radiatorCount?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'radiatorCount',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl Heizkörper"
            />
          </FormField>

          <FormField label="Anzahl Räume">
            <FormInput
              type="number"
              value={formData.roomCount?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'roomCount',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl zu beheizender Räume"
            />
          </FormField>

          <FormField label="Stockwerke">
            <FormInput
              type="number"
              value={formData.floorCount?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'floorCount',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl Stockwerke"
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

          <FormField label="Gewünschte Uhrzeit">
            <FormInput
              type="text"
              value={formData.preferredTime || ''}
              onChange={value => handleInputChange('preferredTime', value)}
              placeholder="HH:MM"
            />
          </FormField>

          <FormField label="Kontaktperson">
            <FormInput
              type="text"
              value={formData.contactPerson || ''}
              onChange={value => handleInputChange('contactPerson', value)}
              placeholder="Name der Kontaktperson"
            />
          </FormField>

          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Besondere Anforderungen oder Wünsche"
            />
          </FormField>

          <FormField label="Geschätzte Dauer">
            <FormInput
              type="text"
              value={formData.estimatedDuration || ''}
              onChange={value => handleInputChange('estimatedDuration', value)}
              placeholder="Tage"
            />
          </FormField>

          <FormField label="Letzte Wartung">
            <FormInput
              type="text"
              value={formData.lastMaintenance || ''}
              onChange={value => handleInputChange('lastMaintenance', value)}
              placeholder="TT.MM.JJJJ"
            />
          </FormField>

          <FormField label="Gasanschluss vorhanden">
            <FormRadioGroup
              name="gasConnection"
              value={formData.gasConnection || ''}
              onChange={value => handleInputChange('gasConnection', value)}
              options={[
                { value: 'ja', label: 'Ja' },
                { value: 'nein', label: 'Nein' },
                { value: 'unbekannt', label: 'Unbekannt' },
              ]}
            />
          </FormField>

          <FormField label="Keller vorhanden">
            <FormRadioGroup
              name="basement"
              value={formData.basement || ''}
              onChange={value => handleInputChange('basement', value)}
              options={[
                { value: 'ja', label: 'Ja' },
                { value: 'nein', label: 'Nein' },
                { value: 'teilweise', label: 'Teilweise' },
              ]}
            />
          </FormField>

          <FormField label="Aufzug vorhanden">
            <FormRadioGroup
              name="elevator"
              value={formData.elevator || ''}
              onChange={value => handleInputChange('elevator', value)}
              options={[
                { value: 'ja', label: 'Ja' },
                { value: 'nein', label: 'Nein' },
                { value: 'unbekannt', label: 'Unbekannt' },
              ]}
            />
          </FormField>

          <FormField label="Parkplatz vorhanden">
            <FormRadioGroup
              name="parking"
              value={formData.parking || ''}
              onChange={value => handleInputChange('parking', value)}
              options={[
                { value: 'ja', label: 'Ja' },
                { value: 'nein', label: 'Nein' },
                { value: 'unbekannt', label: 'Unbekannt' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Problemtyp">
            <FormCheckboxGroup
              value={formData.problemType || []}
              onChange={value => handleInputChange('problemType', value)}
              options={problemTypeOptions}
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
              placeholder="Beschreiben Sie Ihr Heizungsprojekt detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Problem-Details">
            <FormTextarea
              value={formData.problemDetails || ''}
              onChange={value => handleInputChange('problemDetails', value)}
              placeholder="Details zum Problem oder zur Störung"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Energieeffizienz-Wünsche">
            <FormTextarea
              value={formData.energyEfficiencyWishes || ''}
              onChange={value => handleInputChange('energyEfficiencyWishes', value)}
              placeholder="Wünsche zur Energieeffizienz"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zugangshinweise">
            <FormTextarea
              value={formData.accessInstructions || ''}
              onChange={value => handleInputChange('accessInstructions', value)}
              placeholder="Hinweise zum Zugang oder zur Anfahrt"
              rows={3}
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
          <FormField label="Fußbodenheizung gewünscht">
            <FormRadioGroup
              name="floorHeating"
              value={formData.floorHeating || ''}
              onChange={value => handleInputChange('floorHeating', value)}
              options={[
                { value: 'ja', label: 'Ja, Fußbodenheizung' },
                { value: 'nein', label: 'Nein, Heizkörper' },
                { value: 'kombination', label: 'Kombination' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Warmwasserbereitung gewünscht">
            <FormRadioGroup
              name="hotWater"
              value={formData.hotWater || ''}
              onChange={value => handleInputChange('hotWater', value)}
              options={[
                { value: 'ja', label: 'Ja, mit Warmwasser' },
                { value: 'nein', label: 'Nein, nur Heizung' },
                { value: 'separat', label: 'Separat' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Förderung gewünscht">
            <FormRadioGroup
              name="funding"
              value={formData.funding || ''}
              onChange={value => handleInputChange('funding', value)}
              options={[
                { value: 'ja', label: 'Ja, Förderung nutzen' },
                { value: 'nein', label: 'Nein, ohne Förderung' },
                { value: 'unbekannt', label: 'Unbekannt' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Energieausweis vorhanden">
            <FormRadioGroup
              name="energyCertificate"
              value={formData.energyCertificate || ''}
              onChange={value => handleInputChange('energyCertificate', value)}
              options={[
                { value: 'ja', label: 'Ja, vorhanden' },
                { value: 'nein', label: 'Nein, nicht vorhanden' },
                { value: 'unbekannt', label: 'Unbekannt' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Wartungsvertrag gewünscht">
            <FormRadioGroup
              name="maintenanceContract"
              value={formData.maintenanceContract || ''}
              onChange={value => handleInputChange('maintenanceContract', value)}
              options={[
                { value: 'ja', label: 'Ja, Wartungsvertrag' },
                { value: 'nein', label: 'Nein, keine Wartung' },
                { value: 'später', label: 'Später entscheiden' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Notdienst erforderlich">
            <FormRadioGroup
              name="emergencyService"
              value={formData.emergencyService || ''}
              onChange={value => handleInputChange('emergencyService', value)}
              options={[
                { value: 'ja', label: 'Ja, Notdienst' },
                { value: 'nein', label: 'Nein, regulärer Termin' },
                { value: 'unbekannt', label: 'Unbekannt' },
              ]}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default HeizungForm;
