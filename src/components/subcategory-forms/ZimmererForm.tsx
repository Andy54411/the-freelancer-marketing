'use client';
import React, { useState, useEffect } from 'react';
import { ZimmererData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';

interface ZimmererFormProps {
  data: ZimmererData;
  onDataChange: (data: ZimmererData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const ZimmererForm: React.FC<ZimmererFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<ZimmererData>(data);

  const serviceTypeOptions = [
    { value: 'dachstuhl', label: 'Dachstuhl errichten' },
    { value: 'dachausbau', label: 'Dachausbau' },
    { value: 'dachsanierung', label: 'Dachsanierung' },
    { value: 'carport', label: 'Carport bauen' },
    { value: 'pergola', label: 'Pergola/Überdachung' },
    { value: 'holzbau', label: 'Holzbau allgemein' },
    { value: 'balkon', label: 'Balkon/Terrasse' },
    { value: 'wintergarten', label: 'Wintergarten' },
    { value: 'reparatur', label: 'Reparatur/Sanierung' },
    { value: 'anbau', label: 'Anbau/Erweiterung' },
  ];

  const projectSizeOptions = [
    { value: 'klein', label: 'Klein (1-3 Tage)' },
    { value: 'mittel', label: 'Mittel (1-2 Wochen)' },
    { value: 'groß', label: 'Groß (mehrere Wochen)' },
    { value: 'sehr_groß', label: 'Sehr groß (mehrere Monate)' },
  ];

  const woodTypeOptions = [
    { value: 'fichte', label: 'Fichte' },
    { value: 'kiefer', label: 'Kiefer' },
    { value: 'lärche', label: 'Lärche' },
    { value: 'douglasie', label: 'Douglasie' },
    { value: 'eiche', label: 'Eiche' },
    { value: 'bsh', label: 'Brettschichtholz (BSH)' },
    { value: 'kvh', label: 'Konstruktionsvollholz (KVH)' },
    { value: 'beratung_gewünscht', label: 'Beratung gewünscht' },
  ];

  const urgencyOptions = [
    { value: 'sofort', label: 'Sofort' },
    { value: 'diese_woche', label: 'Diese Woche' },
    { value: 'nächste_woche', label: 'Nächste Woche' },
    { value: 'diesen_monat', label: 'Diesen Monat' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const handleInputChange = (field: keyof ZimmererData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.projectSize &&
      formData.urgency &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.projectSize &&
      formData.urgency &&
      formData.projectDescription
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Zimmerer Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Dienstleistung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Welcher Service wird benötigt?"
            />
          </FormField>

          <FormField label="Projektgröße" required>
            <FormSelect
              value={formData.projectSize || ''}
              onChange={value => handleInputChange('projectSize', value)}
              options={projectSizeOptions}
              placeholder="Wie groß ist das Projekt?"
            />
          </FormField>

          <FormField label="Zeitrahmen" required>
            <FormSelect
              value={formData.urgency || ''}
              onChange={value => handleInputChange('urgency', value)}
              options={urgencyOptions}
              placeholder="Wann soll das Projekt starten?"
            />
          </FormField>

          <FormField label="Holzart-Präferenz">
            <FormSelect
              value={formData.woodType || ''}
              onChange={value => handleInputChange('woodType', value)}
              options={woodTypeOptions}
              placeholder="Welche Holzart bevorzugen Sie?"
            />
          </FormField>

          <FormField label="Grundfläche in m²">
            <FormInput
              type="number"
              value={formData.squareMeters || ''}
              onChange={value => handleInputChange('squareMeters', Number(value))}
              placeholder="z.B. 120"
            />
          </FormField>

          <FormField label="Länge">
            <FormInput
              type="text"
              value={formData.length || ''}
              onChange={value => handleInputChange('length', value)}
              placeholder="z.B. 12m"
            />
          </FormField>

          <FormField label="Breite">
            <FormInput
              type="text"
              value={formData.width || ''}
              onChange={value => handleInputChange('width', value)}
              placeholder="z.B. 10m"
            />
          </FormField>

          <FormField label="Höhe/Firsthöhe">
            <FormInput
              type="text"
              value={formData.height || ''}
              onChange={value => handleInputChange('height', value)}
              placeholder="z.B. 8m"
            />
          </FormField>

          <FormField label="Budget-Rahmen">
            <FormInput
              type="text"
              value={formData.budgetRange || ''}
              onChange={value => handleInputChange('budgetRange', value)}
              placeholder="z.B. 15.000-30.000 EUR"
            />
          </FormField>

          <FormField label="Projektort">
            <FormInput
              type="text"
              value={formData.location || ''}
              onChange={value => handleInputChange('location', value)}
              placeholder="z.B. Berlin, 10115"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zusätzliche Services">
            <FormCheckboxGroup
              value={formData.additionalServices || []}
              onChange={value => handleInputChange('additionalServices', value)}
              options={[
                { value: 'planung', label: 'Planung/Statik' },
                { value: 'genehmigung', label: 'Baugenehmigung beantragen' },
                { value: 'dämmung', label: 'Dämmung' },
                { value: 'dacheindeckung', label: 'Dacheindeckung' },
                { value: 'dachrinnen', label: 'Dachrinnen' },
                { value: 'fenster', label: 'Dachfenster' },
                { value: 'isolierung', label: 'Isolierung' },
                { value: 'materiallieferung', label: 'Materiallieferung' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Spezielle Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Besondere Anforderungen oder Wünsche..."
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Dachform">
            <FormRadioGroup
              name="roofType"
              value={formData.roofType || ''}
              onChange={value => handleInputChange('roofType', value)}
              options={[
                { value: 'satteldach', label: 'Satteldach' },
                { value: 'walmdach', label: 'Walmdach' },
                { value: 'pultdach', label: 'Pultdach' },
                { value: 'flachdach', label: 'Flachdach' },
                { value: 'mansardendach', label: 'Mansardendach' },
                { value: 'tonnendach', label: 'Tonnendach' },
                { value: 'andere', label: 'Andere Dachform' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Projektbeschreibung" required>
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie Ihr Zimmerer-Projekt im Detail..."
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Herausforderungen">
            <FormTextarea
              value={formData.specialChallenges || ''}
              onChange={value => handleInputChange('specialChallenges', value)}
              placeholder="Besondere Herausforderungen oder Umstände des Projekts..."
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Gebäudeart">
            <FormRadioGroup
              name="buildingType"
              value={formData.buildingType || ''}
              onChange={value => handleInputChange('buildingType', value)}
              options={[
                { value: 'neubau', label: 'Neubau' },
                { value: 'altbau', label: 'Altbau (Sanierung)' },
                { value: 'anbau', label: 'Anbau' },
                { value: 'gartenhaus', label: 'Gartenhaus/Nebengebäude' },
                { value: 'gewerbe', label: 'Gewerbebau' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zugang zur Baustelle">
            <FormRadioGroup
              name="siteAccess"
              value={formData.siteAccess || ''}
              onChange={value => handleInputChange('siteAccess', value)}
              options={[
                { value: 'gut', label: 'Guter Zugang (Kran möglich)' },
                { value: 'eingeschränkt', label: 'Eingeschränkter Zugang' },
                { value: 'schwierig', label: 'Schwieriger Zugang' },
                { value: 'kein_kran', label: 'Kein Kran möglich' },
              ]}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Zimmerer" formData={formData} />
    </div>
  );
};

export default ZimmererForm;
