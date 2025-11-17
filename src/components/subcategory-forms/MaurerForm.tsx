'use client';
import React, { useState, useEffect } from 'react';
import { MaurerData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';
import { useRouter } from 'next/navigation';
import { useRegistration } from '@/contexts/Registration-Context';

interface MaurerFormProps {
  data: MaurerData;
  onDataChange: (data: MaurerData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const MaurerForm: React.FC<MaurerFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<MaurerData>(data);
  const router = useRouter();

  // Lokale FormSubmitButton Komponente
  const FormSubmitButton = ({
    isValid,
    subcategory,
    formData: passedFormData,
  }: {
    isValid: boolean;
    subcategory: string;
    formData?: any;
  }) => {
    const { setDescription, setSubcategoryData } = useRegistration();

    const handleNextClick = () => {
      if (!isValid) {
        return;
      }

      // Speichere die Formulardaten im localStorage
      if (formData && setSubcategoryData) {
        setSubcategoryData(formData);
      }

      // Extrahiere die Beschreibung aus den Formulardaten
      if (formData && setDescription) {
        let description = '';

        // Versuche verschiedene Felder, die als Beschreibung dienen könnten
        if (formData.specialRequirements) {
          description = formData.specialRequirements;
        } else if (formData.projectDescription) {
          description = formData.projectDescription;
        } else if (formData.description) {
          description = formData.description;
        } else if (formData.additionalInfo) {
          description = formData.additionalInfo;
        } else if (formData.notes) {
          description = formData.notes;
        }

        // Setze die Beschreibung im Registration-Context
        if (description && description.trim()) {
          setDescription(description.trim());
        }
      }

      const encodedSubcategory = encodeURIComponent(subcategory);
      router.push(`/auftrag/get-started/${encodedSubcategory}/adresse`);
    };

    return (
      <div className="space-y-6 mt-8">
        {!isValid && (
          <div className="text-center">
            <div className="inline-flex items-center py-3 px-5 bg-linear-to-r from-teal-50 to-cyan-50 border border-[#14ad9f]/20 rounded-xl shadow-sm">
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
    { value: 'renovierung', label: 'Renovierung' },
    { value: 'reparatur', label: 'Reparatur' },
    { value: 'sanierung', label: 'Sanierung' },
    { value: 'anbau', label: 'Anbau' },
  ];

  const workTypeOptions = [
    { value: 'außenmauerwerk', label: 'Außenmauerwerk' },
    { value: 'innenmauerwerk', label: 'Innenmauerwerk' },
    { value: 'fundament', label: 'Fundament' },
    { value: 'kellermauerwerk', label: 'Kellermauerwerk' },
    { value: 'trennwand', label: 'Trennwand' },
    { value: 'verputz', label: 'Verputz' },
  ];

  const materialOptions = [
    { value: 'ziegel', label: 'Ziegel' },
    { value: 'kalksandstein', label: 'Kalksandstein' },
    { value: 'porenbeton', label: 'Porenbeton' },
    { value: 'beton', label: 'Beton' },
    { value: 'naturstein', label: 'Naturstein' },
    { value: 'nach_absprache', label: 'Nach Absprache' },
  ];

  const buildingTypeOptions = [
    { value: 'einfamilienhaus', label: 'Einfamilienhaus' },
    { value: 'mehrfamilienhaus', label: 'Mehrfamilienhaus' },
    { value: 'gewerbe', label: 'Gewerbegebäude' },
    { value: 'industrie', label: 'Industriegebäude' },
    { value: 'landwirtschaft', label: 'Landwirtschaftsgebäude' },
  ];

  const wallThicknessOptions = [
    { value: '11.5', label: '11,5 cm' },
    { value: '17.5', label: '17,5 cm' },
    { value: '24', label: '24 cm' },
    { value: '30', label: '30 cm' },
    { value: '36.5', label: '36,5 cm' },
    { value: 'nach_absprache', label: 'Nach Absprache' },
  ];

  const foundationOptions = [
    { value: 'benötigt', label: 'Fundament erforderlich' },
    { value: 'vorhanden', label: 'Fundament vorhanden' },
    { value: 'nicht_nötig', label: 'Nicht erforderlich' },
  ];

  const insulationOptions = [
    { value: 'benötigt', label: 'Dämmung erforderlich' },
    { value: 'vorhanden', label: 'Dämmung vorhanden' },
    { value: 'nicht_nötig', label: 'Nicht erforderlich' },
  ];

  const handleInputChange = (field: keyof MaurerData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  // Validierung
  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.workType &&
      formData.material &&
      formData.buildingType &&
      formData.wallThickness &&
      formData.foundation &&
      formData.insulation &&
      typeof formData.reinforcement === 'boolean'
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.workType &&
      formData.material &&
      formData.buildingType &&
      formData.wallThickness &&
      formData.foundation &&
      formData.insulation &&
      typeof formData.reinforcement === 'boolean'
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Maurer-Projektdetails
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

          <FormField label="Art der Maurerarbeit" required>
            <FormSelect
              value={formData.workType || ''}
              onChange={value => handleInputChange('workType', value)}
              options={workTypeOptions}
              placeholder="Wählen Sie die Art der Maurerarbeit"
            />
          </FormField>

          <FormField label="Fläche (m²)">
            <FormInput
              type="number"
              value={formData.area?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'area',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Fläche in m²"
            />
          </FormField>

          <FormField label="Wandhöhe (m)">
            <FormInput
              type="number"
              value={formData.wallHeight?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'wallHeight',
                  typeof value === 'string' ? (value ? parseFloat(value) : undefined) : value
                )
              }
              placeholder="Wandhöhe in Metern"
            />
          </FormField>

          <FormField label="Material" required>
            <FormSelect
              value={formData.material || ''}
              onChange={value => handleInputChange('material', value)}
              options={materialOptions}
              placeholder="Wählen Sie das Material"
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

          <FormField label="Wandstärke" required>
            <FormSelect
              value={formData.wallThickness || ''}
              onChange={value => handleInputChange('wallThickness', value)}
              options={wallThicknessOptions}
              placeholder="Wählen Sie die Wandstärke"
            />
          </FormField>

          <FormField label="Fundament" required>
            <FormSelect
              value={formData.foundation || ''}
              onChange={value => handleInputChange('foundation', value)}
              options={foundationOptions}
              placeholder="Fundament-Status"
            />
          </FormField>

          <FormField label="Dämmung" required>
            <FormSelect
              value={formData.insulation || ''}
              onChange={value => handleInputChange('insulation', value)}
              options={insulationOptions}
              placeholder="Dämmung-Status"
            />
          </FormField>

          <FormField label="Anzahl Öffnungen">
            <FormInput
              type="number"
              value={formData.openings?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'openings',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl Türen/Fenster"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Bewehrung erforderlich">
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="reinforcement"
                  checked={formData.reinforcement === true}
                  onChange={() => handleInputChange('reinforcement', true)}
                  className="mr-2"
                />
                Ja, Bewehrung erforderlich
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="reinforcement"
                  checked={formData.reinforcement === false}
                  onChange={() => handleInputChange('reinforcement', false)}
                  className="mr-2"
                />
                Nein, keine Bewehrung erforderlich
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

      <FormSubmitButton isValid={isFormValid()} subcategory="Maurer" formData={formData} />
    </div>
  );
};

export default MaurerForm;
