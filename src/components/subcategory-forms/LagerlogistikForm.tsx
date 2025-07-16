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
    </div>
  );
};

export default LagerlogistikForm;
