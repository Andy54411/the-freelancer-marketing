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
} from './FormComponents';
import { useRouter } from 'next/navigation';

interface ZimmererFormProps {
  data: ZimmererData;
  onDataChange: (data: ZimmererData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const ZimmererForm: React.FC<ZimmererFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<ZimmererData>(data);
  const router = useRouter();
    return (
      <div className="space-y-6 mt-8">
        {!isValid && (
          <div className="text-center">
            <div className="inline-flex items-center py-3 px-5 bg-gradient-to-r from-teal-50 to-cyan-50 border border-[#14ad9f]/20 rounded-xl shadow-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-3 text-[#14ad9f]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-gray-700 font-medium">
                Bitte füllen Sie alle Pflichtfelder aus, um fortzufahren.
              </span>
            </div>
          </div>
        )}
        {isValid && (
          <div className="text-center">
            <button
              className="bg-[#14ad9f] hover:bg-teal-700 text-white font-medium py-3 px-6 rounded-lg shadow transition-colors duration-200"
              onClick={handleNextClick}
            >
              Weiter zur Adresseingabe
            </button>
          </div>
        )}
      </div>
    );
  };

  const serviceTypeOptions = [
    { value: 'neubau', label: 'Neubau' },
    { value: 'sanierung', label: 'Sanierung' },
    { value: 'reparatur', label: 'Reparatur' },
    { value: 'anbau', label: 'Anbau' },
    { value: 'umbau', label: 'Umbau' },
  ];

  const workTypeOptions = [
    { value: 'dachstuhl', label: 'Dachstuhl' },
    { value: 'carport', label: 'Carport' },
    { value: 'wintergarten', label: 'Wintergarten' },
    { value: 'terrasse', label: 'Terrasse' },
    { value: 'balkon', label: 'Balkon' },
    { value: 'holzhaus', label: 'Holzhaus' },
    { value: 'fachwerk', label: 'Fachwerk' },
  ];

  const woodTypeOptions = [
    { value: 'fichte', label: 'Fichte' },
    { value: 'tanne', label: 'Tanne' },
    { value: 'kiefer', label: 'Kiefer' },
    { value: 'lärche', label: 'Lärche' },
    { value: 'douglasie', label: 'Douglasie' },
    { value: 'eiche', label: 'Eiche' },
    { value: 'bsh', label: 'Brettschichtholz (BSH)' },
  ];

  const constructionTypeOptions = [
    { value: 'traditionell', label: 'Traditioneller Holzbau' },
    { value: 'modern', label: 'Moderner Holzbau' },
    { value: 'fertigbau', label: 'Fertigbau' },
    { value: 'blockbau', label: 'Blockbau' },
  ];

  const roofTypeOptions = [
    { value: 'satteldach', label: 'Satteldach' },
    { value: 'walmdach', label: 'Walmdach' },
    { value: 'pultdach', label: 'Pultdach' },
    { value: 'sheddach', label: 'Sheddach' },
    { value: 'mansarddach', label: 'Mansarddach' },
  ];

  const treatmentOptions = [
    { value: 'kesseldruckimprägniert', label: 'Kesseldruckimprägniert' },
    { value: 'thermisch_behandelt', label: 'Thermisch behandelt' },
    { value: 'natur', label: 'Natur (unbehandelt)' },
    { value: 'lasiert', label: 'Lasiert' },
    { value: 'geölt', label: 'Geölt' },
  ];

  const handleInputChange = (field: keyof ZimmererData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  // Validierung
  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.workType &&
      formData.woodType &&
      formData.constructionType &&
      formData.roofType &&
      formData.treatment &&
      typeof formData.staticCalculation === 'boolean'
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.workType &&
      formData.woodType &&
      formData.constructionType &&
      formData.roofType &&
      formData.treatment &&
      typeof formData.staticCalculation === 'boolean'
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Zimmerer-Projektdetails
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

          <FormField label="Art der Zimmererarbeit" required>
            <FormSelect
              value={formData.workType || ''}
              onChange={value => handleInputChange('workType', value)}
              options={workTypeOptions}
              placeholder="Wählen Sie die Art der Zimmererarbeit"
            />
          </FormField>

          <FormField label="Holzart" required>
            <FormSelect
              value={formData.woodType || ''}
              onChange={value => handleInputChange('woodType', value)}
              options={woodTypeOptions}
              placeholder="Wählen Sie die Holzart"
            />
          </FormField>

          <FormField label="Bauweise" required>
            <FormSelect
              value={formData.constructionType || ''}
              onChange={value => handleInputChange('constructionType', value)}
              options={constructionTypeOptions}
              placeholder="Wählen Sie die Bauweise"
            />
          </FormField>

          <FormField label="Dachform" required>
            <FormSelect
              value={formData.roofType || ''}
              onChange={value => handleInputChange('roofType', value)}
              options={roofTypeOptions}
              placeholder="Wählen Sie die Dachform"
            />
          </FormField>

          <FormField label="Holzbehandlung" required>
            <FormSelect
              value={formData.treatment || ''}
              onChange={value => handleInputChange('treatment', value)}
              options={treatmentOptions}
              placeholder="Wählen Sie die Holzbehandlung"
            />
          </FormField>

          <FormField label="Grundfläche (m²)">
            <FormInput
              type="number"
              value={formData.area?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'area',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Grundfläche in m²"
            />
          </FormField>

          <FormField label="Firsthöhe (m)">
            <FormInput
              type="number"
              value={formData.ridgeHeight?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'ridgeHeight',
                  typeof value === 'string' ? (value ? parseFloat(value) : undefined) : value
                )
              }
              placeholder="Firsthöhe in Metern"
            />
          </FormField>

          <FormField label="Dachneigung (°)">
            <FormInput
              type="number"
              value={formData.roofPitch?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'roofPitch',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Dachneigung in Grad"
            />
          </FormField>

          <FormField label="Holzstärke (cm)">
            <FormInput
              type="number"
              value={formData.woodThickness?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'woodThickness',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Holzstärke in cm"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Statische Berechnung erforderlich">
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="staticCalculation"
                  checked={formData.staticCalculation === true}
                  onChange={() => handleInputChange('staticCalculation', true)}
                  className="mr-2"
                />
                Ja, statische Berechnung erforderlich
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="staticCalculation"
                  checked={formData.staticCalculation === false}
                  onChange={() => handleInputChange('staticCalculation', false)}
                  className="mr-2"
                />
                Nein, keine statische Berechnung erforderlich
              </label>
            </div>
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Beschreiben Sie besondere Wünsche, Anforderungen oder Besonderheiten des Auftrags"
              rows={3}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Zimmerer" />
    </div>
  );
}

export default ZimmererForm;
