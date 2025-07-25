'use client';
import React, { useState, useEffect } from 'react';
import { TrockenbauerData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';

interface TrockenbauerFormProps {
  data: TrockenbauerData;
  onDataChange: (data: TrockenbauerData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const TrockenbauerForm: React.FC<TrockenbauerFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<TrockenbauerData>(data);

  const serviceTypeOptions = [
    { value: 'wände_stellen', label: 'Wände stellen' },
    { value: 'decken_abhängen', label: 'Decken abhängen' },
    { value: 'trennwände', label: 'Trennwände errichten' },
    { value: 'schallschutz', label: 'Schallschutz' },
    { value: 'wärmedämmung', label: 'Wärmedämmung' },
    { value: 'brandschutz', label: 'Brandschutz' },
    { value: 'spachteln', label: 'Spachteln/Glätten' },
    { value: 'dämmung', label: 'Dämmarbeiten' },
    { value: 'komplettausbau', label: 'Kompletter Innenausbau' },
  ];

  const areaOptions = [
    { value: 'wohnzimmer', label: 'Wohnzimmer' },
    { value: 'schlafzimmer', label: 'Schlafzimmer' },
    { value: 'küche', label: 'Küche' },
    { value: 'badezimmer', label: 'Badezimmer' },
    { value: 'keller', label: 'Keller' },
    { value: 'dachboden', label: 'Dachboden' },
    { value: 'büro', label: 'Büro' },
    { value: 'gewerbe', label: 'Gewerberaum' },
    { value: 'mehrere_räume', label: 'Mehrere Räume' },
  ];

  const projectSizeOptions = [
    { value: 'klein', label: 'Klein (bis 20m²)' },
    { value: 'mittel', label: 'Mittel (20-50m²)' },
    { value: 'groß', label: 'Groß (50-100m²)' },
    { value: 'sehr_groß', label: 'Sehr groß (über 100m²)' },
  ];

  const urgencyOptions = [
    { value: 'sofort', label: 'Sofort' },
    { value: 'diese_woche', label: 'Diese Woche' },
    { value: 'nächste_woche', label: 'Nächste Woche' },
    { value: 'diesen_monat', label: 'Diesen Monat' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const handleInputChange = (field: keyof TrockenbauerData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.area &&
      formData.projectSize &&
      formData.urgency
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.area &&
      formData.projectSize &&
      formData.urgency
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Trockenbauer Projektdetails
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

          <FormField label="Bereich/Raum" required>
            <FormSelect
              value={formData.area || ''}
              onChange={value => handleInputChange('area', value)}
              options={areaOptions}
              placeholder="In welchem Bereich?"
            />
          </FormField>

          <FormField label="Projektgröße" required>
            <FormSelect
              value={formData.projectSize || ''}
              onChange={value => handleInputChange('projectSize', value)}
              options={projectSizeOptions}
              placeholder="Wie groß ist die Fläche?"
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

          <FormField label="Fläche in m²">
            <FormInput
              type="number"
              value={formData.squareMeters || ''}
              onChange={value => handleInputChange('squareMeters', Number(value))}
              placeholder="z.B. 25"
            />
          </FormField>

          <FormField label="Raumhöhe">
            <FormInput
              type="text"
              value={formData.roomHeight || ''}
              onChange={value => handleInputChange('roomHeight', value)}
              placeholder="z.B. 2,5m"
            />
          </FormField>

          <FormField label="Budget-Rahmen">
            <FormInput
              type="text"
              value={formData.budgetRange || ''}
              onChange={value => handleInputChange('budgetRange', value)}
              placeholder="z.B. 1.500-3.000 EUR"
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
          <FormField label="Materialien">
            <FormCheckboxGroup
              value={formData.materials || []}
              onChange={value => handleInputChange('materials', value)}
              options={[
                { value: 'gipskarton', label: 'Gipskarton' },
                { value: 'gipsfaser', label: 'Gipsfaserplatten' },
                { value: 'zementbauplatten', label: 'Zementbauplatten' },
                { value: 'osb_platten', label: 'OSB-Platten' },
                { value: 'dämmung', label: 'Dämmung' },
                { value: 'metallprofile', label: 'Metallprofile' },
                { value: 'beratung_gewünscht', label: 'Beratung gewünscht' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zusätzliche Services">
            <FormCheckboxGroup
              value={formData.additionalServices || []}
              onChange={value => handleInputChange('additionalServices', value)}
              options={[
                { value: 'spachteln', label: 'Spachteln/Glätten' },
                { value: 'grundierung', label: 'Grundierung' },
                { value: 'anstrich', label: 'Anstrich' },
                { value: 'tapezieren', label: 'Tapezieren' },
                { value: 'dämmung', label: 'Dämmung einbauen' },
                { value: 'elektro_vorbereitung', label: 'Elektro-Vorbereitungen' },
                { value: 'aufräumen', label: 'Aufräumen/Entsorgung' },
                { value: 'materiallieferung', label: 'Materiallieferung' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Spezielle Anforderungen">
            <FormCheckboxGroup
              value={formData.specialRequirements || []}
              onChange={value => handleInputChange('specialRequirements', value)}
              options={[
                { value: 'feuchteschutz', label: 'Feuchteschutz' },
                { value: 'schallschutz', label: 'Schallschutz' },
                { value: 'brandschutz', label: 'Brandschutz' },
                { value: 'wärmedämmung', label: 'Wärmedämmung' },
                { value: 'dampfsperre', label: 'Dampfsperre' },
                { value: 'badsanierung', label: 'Feuchtraumgeeignet' },
                { value: 'abhängung', label: 'Decken-Abhängung' },
                { value: 'installationen', label: 'Installationsebenen' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Projektbeschreibung">
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie Ihr Trockenbau-Projekt im Detail..."
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Hinweise">
            <FormTextarea
              value={formData.specialNotes || ''}
              onChange={value => handleInputChange('specialNotes', value)}
              placeholder="Besondere Umstände, Herausforderungen oder Wünsche..."
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zustand der Wände">
            <FormRadioGroup
              name="wallCondition"
              value={formData.wallCondition || ''}
              onChange={value => handleInputChange('wallCondition', value)}
              options={[
                { value: 'neubau', label: 'Neubau (Rohbau)' },
                { value: 'renovierung', label: 'Renovierung (bestehende Wände)' },
                { value: 'sanierung', label: 'Sanierung (beschädigte Wände)' },
                { value: 'anbau', label: 'Anbau/Erweiterung' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Oberflächenqualität">
            <FormRadioGroup
              name="surfaceQuality"
              value={formData.surfaceQuality || ''}
              onChange={value => handleInputChange('surfaceQuality', value)}
              options={[
                { value: 'q1', label: 'Q1 - Grundspachtelung' },
                { value: 'q2', label: 'Q2 - Standard (Tapete)' },
                { value: 'q3', label: 'Q3 - Fein (Farbe matt)' },
                { value: 'q4', label: 'Q4 - Sehr fein (Farbe glänzend)' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Arbeitszeit">
            <FormRadioGroup
              name="workingTime"
              value={formData.workingTime || ''}
              onChange={value => handleInputChange('workingTime', value)}
              options={[
                { value: 'normal', label: 'Normale Arbeitszeiten' },
                { value: 'abends', label: 'Abends/Wochenende möglich' },
                { value: 'schnell', label: 'Möglichst schnell' },
                { value: 'flexibel', label: 'Zeitlich flexibel' },
              ]}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Trockenbauer" formData={formData} />
    </div>
  );
};

export default TrockenbauerForm;
