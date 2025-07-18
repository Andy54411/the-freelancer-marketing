'use client';
// Maler-spezifisches Formular
import React, { useState, useEffect } from 'react';
import { MalerData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormCheckboxGroup,
  FormRadioGroup,
  FormTextarea,
  SelectOption,
  FormSubmitButton,
} from './FormComponents';

interface MalerFormProps {
  data: MalerData;
  onDataChange: (data: MalerData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const MalerForm: React.FC<MalerFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<MalerData>(data);

  const updateData = (updates: Partial<MalerData>) => {
    const updatedData = { ...formData, ...updates };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  // Validierung
  useEffect(() => {
    const isValid = !!(
      formData.roomType &&
      formData.paintType &&
      formData.materialProvided &&
      formData.surfaceCondition &&
      formData.additionalServices &&
      formData.timeframe
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.roomType &&
      formData.paintType &&
      formData.materialProvided &&
      formData.surfaceCondition &&
      formData.additionalServices &&
      formData.timeframe
    );
  };

  const roomTypeOptions: SelectOption[] = [
    { value: 'zimmer', label: 'Zimmer' },
    { value: 'treppe', label: 'Treppe' },
    { value: 'aussenwand', label: 'Außenwand' },
    { value: 'garage', label: 'Garage' },
    { value: 'keller', label: 'Keller' },
    { value: 'bad', label: 'Bad' },
    { value: 'kueche', label: 'Küche' },
    { value: 'wohnzimmer', label: 'Wohnzimmer' },
    { value: 'schlafzimmer', label: 'Schlafzimmer' },
    { value: 'flur', label: 'Flur' },
    { value: 'sonstiges', label: 'Sonstiges' },
  ];

  const paintTypeOptions: SelectOption[] = [
    { value: 'innenfarbe', label: 'Innenfarbe' },
    { value: 'aussenfarbe', label: 'Außenfarbe' },
    { value: 'spezialfarbe', label: 'Spezialfarbe' },
  ];

  const materialProvidedOptions: SelectOption[] = [
    { value: 'kunde', label: 'Kunde stellt Material bereit' },
    { value: 'handwerker', label: 'Handwerker bringt Material mit' },
    { value: 'gemeinsam', label: 'Gemeinsame Beschaffung' },
  ];

  const surfaceConditionOptions: SelectOption[] = [
    { value: 'gut', label: 'Gut (nur streichen)' },
    { value: 'renovierungsbedürftig', label: 'Renovierungsbedürftig' },
    { value: 'stark_beschädigt', label: 'Stark beschädigt' },
  ];

  const additionalServicesOptions: SelectOption[] = [
    { value: 'tapezieren', label: 'Tapezieren' },
    { value: 'spachteln', label: 'Spachteln' },
    { value: 'grundierung', label: 'Grundierung' },
    { value: 'farbberatung', label: 'Farbberatung' },
    { value: 'abkleben', label: 'Abkleben' },
    { value: 'bodenSchutz', label: 'Bodenschutz' },
  ];

  const timeframeOptions: SelectOption[] = [
    { value: 'sofort', label: 'Sofort' },
    { value: 'innerhalb_woche', label: 'Innerhalb einer Woche' },
    { value: 'innerhalb_monat', label: 'Innerhalb eines Monats' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Maler-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Raumtyp" required>
            <FormSelect
              value={formData.roomType || ''}
              onChange={value => updateData({ roomType: value as MalerData['roomType'] })}
              options={roomTypeOptions}
              placeholder="Wählen Sie den Raumtyp"
            />
          </FormField>

          <FormField label="Anzahl Räume">
            <FormInput
              type="number"
              value={formData.roomCount?.toString() || ''}
              onChange={value =>
                updateData({
                  roomCount:
                    typeof value === 'string' ? (value ? parseInt(value) : undefined) : value,
                })
              }
              placeholder="Anzahl der Räume"
            />
          </FormField>

          <FormField label="Quadratmeter">
            <FormInput
              type="number"
              value={formData.squareMeters?.toString() || ''}
              onChange={value =>
                updateData({
                  squareMeters:
                    typeof value === 'string' ? (value ? parseInt(value) : undefined) : value,
                })
              }
              placeholder="Fläche in m²"
            />
          </FormField>

          <FormField label="Wandhöhe (cm)">
            <FormInput
              type="number"
              value={formData.wallHeight?.toString() || ''}
              onChange={value =>
                updateData({
                  wallHeight:
                    typeof value === 'string' ? (value ? parseInt(value) : undefined) : value,
                })
              }
              placeholder="Höhe der Wände in cm"
            />
          </FormField>

          <FormField label="Farbart" required>
            <FormSelect
              value={formData.paintType || ''}
              onChange={value => updateData({ paintType: value as MalerData['paintType'] })}
              options={paintTypeOptions}
              placeholder="Wählen Sie die Farbart"
            />
          </FormField>

          <FormField label="Farbwunsch">
            <FormInput
              value={formData.paintColor || ''}
              onChange={value => updateData({ paintColor: String(value) })}
              placeholder="Gewünschte Farbe"
            />
          </FormField>

          <FormField label="Materialbereitstellung" required>
            <FormSelect
              value={formData.materialProvided || ''}
              onChange={value =>
                updateData({ materialProvided: value as MalerData['materialProvided'] })
              }
              options={materialProvidedOptions}
              placeholder="Wer stellt das Material bereit?"
            />
          </FormField>

          <FormField label="Oberflächenzustand" required>
            <FormSelect
              value={formData.surfaceCondition || ''}
              onChange={value =>
                updateData({ surfaceCondition: value as MalerData['surfaceCondition'] })
              }
              options={surfaceConditionOptions}
              placeholder="Zustand der Oberfläche"
            />
          </FormField>

          <FormField label="Zeitrahmen" required>
            <FormSelect
              value={formData.timeframe || ''}
              onChange={value => updateData({ timeframe: value as MalerData['timeframe'] })}
              options={timeframeOptions}
              placeholder="Wann soll gearbeitet werden?"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zusätzliche Services">
            <FormCheckboxGroup
              value={formData.additionalServices || []}
              onChange={value => updateData({ additionalServices: value })}
              options={additionalServicesOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => updateData({ specialRequirements: value })}
              placeholder="Beschreiben Sie besondere Wünsche oder Anforderungen"
              rows={3}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Maler" />
    </div>
  );
};

export default MalerForm;
