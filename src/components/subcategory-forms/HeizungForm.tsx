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

          <FormField label="Wohnfläche">
            <FormSelect
              value={formData.livingSpace || ''}
              onChange={value => handleInputChange('livingSpace', value)}
              options={livingSpaceOptions}
              placeholder="Wählen Sie die Wohnfläche"
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
          <FormField label="Problemtyp">
            <FormCheckboxGroup
              value={formData.problemType || []}
              onChange={value => handleInputChange('problemType', value)}
              options={problemTypeOptions}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default HeizungForm;
