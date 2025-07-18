'use client';
import React, { useState, useEffect } from 'react';
import { LagerlogistikData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';
import { useRouter } from 'next/navigation';

interface LagerlogistikFormProps {
  data: LagerlogistikData;
  onDataChange: (data: LagerlogistikData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const LagerlogistikForm: React.FC<LagerlogistikFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<LagerlogistikData>(data);
  const router = useRouter();

  // Lokale FormSubmitButton Komponente
  const FormSubmitButton = ({
    isValid,
    subcategory,
  }: {
    isValid: boolean;
    subcategory: string;
  }) => {
    const handleNextClick = () => {
      if (!isValid) {
        return;
      }

      const encodedSubcategory = encodeURIComponent(subcategory);
      router.push(`/auftrag/get-started/${encodedSubcategory}/adresse`);
    };

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
    { value: 'lagerung', label: 'Lagerung' },
    { value: 'kommissionierung', label: 'Kommissionierung' },
    { value: 'versand', label: 'Versand' },
    { value: 'fulfillment', label: 'Fulfillment' },
    { value: 'crossdocking', label: 'Cross-Docking' },
    { value: 'distribution', label: 'Distribution' },
  ];

  const storageTypeOptions = [
    { value: 'standard', label: 'Standard-Lagerung' },
    { value: 'kühl', label: 'Kühllagerung' },
    { value: 'tiefkühl', label: 'Tiefkühllagerung' },
    { value: 'trocken', label: 'Trockenlagerung' },
    { value: 'gefährlich', label: 'Gefahrstofflagerung' },
    { value: 'hochregal', label: 'Hochregallagerung' },
    { value: 'blocklager', label: 'Blocklagerung' },
  ];

  const goodsTypeOptions = [
    { value: 'standard', label: 'Standard-Güter' },
    { value: 'lebensmittel', label: 'Lebensmittel' },
    { value: 'elektronik', label: 'Elektronik' },
    { value: 'textilien', label: 'Textilien' },
    { value: 'möbel', label: 'Möbel' },
    { value: 'chemikalien', label: 'Chemikalien' },
    { value: 'medikamente', label: 'Medikamente' },
    { value: 'sperrig', label: 'Sperrige Güter' },
  ];

  const durationOptions = [
    { value: 'kurz', label: 'Kurzfristig (bis 1 Monat)' },
    { value: 'mittel', label: 'Mittelfristig (1-6 Monate)' },
    { value: 'lang', label: 'Langfristig (über 6 Monate)' },
    { value: 'permanent', label: 'Permanent' },
  ];

  const temperatureOptions = [
    { value: 'ambient', label: 'Raumtemperatur' },
    { value: 'kühl', label: 'Kühl (2-8°C)' },
    { value: 'tiefkühl', label: 'Tiefkühl (-18°C)' },
    { value: 'spezial', label: 'Spezialtemperatur' },
  ];

  const additionalServicesOptions = [
    { value: 'versicherung', label: 'Lagerversicherung' },
    { value: 'inventory', label: 'Bestandsmanagement' },
    { value: 'quality', label: 'Qualitätskontrolle' },
    { value: 'labeling', label: 'Etikettierung' },
    { value: 'repackaging', label: 'Umverpackung' },
    { value: 'returns', label: 'Retourenabwicklung' },
    { value: 'reporting', label: 'Reporting' },
    { value: 'tracking', label: 'Tracking' },
  ];

  const handleInputChange = (field: keyof LagerlogistikData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.storageType &&
      formData.goodsType &&
      formData.duration &&
      formData.quantity &&
      formData.location
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.storageType &&
      formData.goodsType &&
      formData.duration &&
      formData.quantity &&
      formData.location
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Lagerlogistik-Projektdetails
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

          <FormField label="Lagerart" required>
            <FormSelect
              value={formData.storageType || ''}
              onChange={value => handleInputChange('storageType', value)}
              options={storageTypeOptions}
              placeholder="Wählen Sie die Lagerart"
            />
          </FormField>

          <FormField label="Art der Güter" required>
            <FormSelect
              value={formData.goodsType || ''}
              onChange={value => handleInputChange('goodsType', value)}
              options={goodsTypeOptions}
              placeholder="Wählen Sie die Art der Güter"
            />
          </FormField>

          <FormField label="Lagerdauer" required>
            <FormSelect
              value={formData.duration || ''}
              onChange={value => handleInputChange('duration', value)}
              options={durationOptions}
              placeholder="Wählen Sie die Lagerdauer"
            />
          </FormField>

          <FormField label="Menge/Volumen" required>
            <FormInput
              type="text"
              value={formData.quantity || ''}
              onChange={value => handleInputChange('quantity', value)}
              placeholder="z.B. 100 Paletten, 500 m³"
            />
          </FormField>

          <FormField label="Standort" required>
            <FormInput
              type="text"
              value={formData.location || ''}
              onChange={value => handleInputChange('location', value)}
              placeholder="Gewünschter Standort"
            />
          </FormField>

          <FormField label="Gewicht (kg)">
            <FormInput
              type="number"
              value={formData.weight?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'weight',
                  typeof value === 'string' ? (value ? parseFloat(value) : undefined) : value
                )
              }
              placeholder="Gesamtgewicht in kg"
            />
          </FormField>

          <FormField label="Temperaturanforderung">
            <FormSelect
              value={formData.temperatureRequirement || ''}
              onChange={value => handleInputChange('temperatureRequirement', value)}
              options={temperatureOptions}
              placeholder="Wählen Sie die Temperaturanforderung"
            />
          </FormField>

          <FormField label="Einlagerdatum">
            <FormInput
              type="text"
              value={formData.inboundDate || ''}
              onChange={value => handleInputChange('inboundDate', value)}
              placeholder="TT.MM.JJJJ"
            />
          </FormField>

          <FormField label="Auslagerdatum">
            <FormInput
              type="text"
              value={formData.outboundDate || ''}
              onChange={value => handleInputChange('outboundDate', value)}
              placeholder="TT.MM.JJJJ"
            />
          </FormField>

          <FormField label="Versicherungswert">
            <FormInput
              type="number"
              value={formData.insuranceValue?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'insuranceValue',
                  typeof value === 'string' ? (value ? parseFloat(value) : undefined) : value
                )
              }
              placeholder="Wert in €"
            />
          </FormField>

          <FormField label="Zugangszeiten">
            <FormInput
              type="text"
              value={formData.accessTimes || ''}
              onChange={value => handleInputChange('accessTimes', value)}
              placeholder="z.B. Mo-Fr 8-18 Uhr"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zusätzliche Dienstleistungen">
            <FormCheckboxGroup
              value={formData.additionalServices || []}
              onChange={value => handleInputChange('additionalServices', value)}
              options={additionalServicesOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Beschreibung der Güter">
            <FormTextarea
              value={formData.goodsDescription || ''}
              onChange={value => handleInputChange('goodsDescription', value)}
              placeholder="Detaillierte Beschreibung der zu lagernden Güter"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Besondere Lager- oder Handhabungsanforderungen"
              rows={3}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Lagerlogistik" />
    </div>
  );
};

export default LagerlogistikForm;
