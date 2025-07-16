// Elektriker-spezifisches Formular
import React, { useState, useEffect } from 'react';
import { ElektrikerData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormCheckboxGroup,
  FormRadioGroup,
  FormTextarea,
  SelectOption,
} from './FormComponents';

interface ElektrikerFormProps {
  data: ElektrikerData;
  onDataChange: (data: ElektrikerData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const ElektrikerForm: React.FC<ElektrikerFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<ElektrikerData>(data);

  const updateData = (updates: Partial<ElektrikerData>) => {
    const updatedData = { ...formData, ...updates };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  // Validierung
  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.workType &&
      formData.urgency &&
      formData.buildingType &&
      formData.existingInstallation &&
      formData.materialProvided &&
      typeof formData.certificationNeeded === 'boolean'
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const serviceTypeOptions: SelectOption[] = [
    { value: 'installation', label: 'Installation' },
    { value: 'reparatur', label: 'Reparatur' },
    { value: 'wartung', label: 'Wartung' },
    { value: 'neubau', label: 'Neubau' },
  ];

  const workTypeOptions: SelectOption[] = [
    { value: 'steckdosen', label: 'Steckdosen' },
    { value: 'schalter', label: 'Schalter' },
    { value: 'beleuchtung', label: 'Beleuchtung' },
    { value: 'sicherungskasten', label: 'Sicherungskasten' },
    { value: 'verkabelung', label: 'Verkabelung' },
    { value: 'smart_home', label: 'Smart Home' },
    { value: 'sonstiges', label: 'Sonstiges' },
  ];

  const urgencyOptions: SelectOption[] = [
    { value: 'notfall', label: 'Notfall (sofort)' },
    { value: 'dringend', label: 'Dringend (heute)' },
    { value: 'normal', label: 'Normal (diese Woche)' },
    { value: 'kann_warten', label: 'Kann warten' },
  ];

  const buildingTypeOptions: SelectOption[] = [
    { value: 'einfamilienhaus', label: 'Einfamilienhaus' },
    { value: 'wohnung', label: 'Wohnung' },
    { value: 'gewerbe', label: 'Gewerbe' },
    { value: 'neubau', label: 'Neubau' },
  ];

  const existingInstallationOptions: SelectOption[] = [
    { value: 'vorhanden', label: 'Komplett vorhanden' },
    { value: 'teilweise', label: 'Teilweise vorhanden' },
    { value: 'nicht_vorhanden', label: 'Nicht vorhanden' },
  ];

  const materialProvidedOptions: SelectOption[] = [
    { value: 'kunde', label: 'Kunde stellt Material bereit' },
    { value: 'handwerker', label: 'Handwerker bringt Material mit' },
    { value: 'gemeinsam', label: 'Gemeinsame Beschaffung' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Elektriker-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Dienstleistung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value =>
                updateData({ serviceType: value as ElektrikerData['serviceType'] })
              }
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art der Dienstleistung"
            />
          </FormField>

          <FormField label="Arbeitstyp" required>
            <FormSelect
              value={formData.workType || ''}
              onChange={value => updateData({ workType: value as ElektrikerData['workType'] })}
              options={workTypeOptions}
              placeholder="Wählen Sie den Arbeitstyp"
            />
          </FormField>

          <FormField label="Dringlichkeit" required>
            <FormSelect
              value={formData.urgency || ''}
              onChange={value => updateData({ urgency: value as ElektrikerData['urgency'] })}
              options={urgencyOptions}
              placeholder="Wie dringend ist der Auftrag?"
            />
          </FormField>

          <FormField label="Gebäudeart" required>
            <FormSelect
              value={formData.buildingType || ''}
              onChange={value =>
                updateData({ buildingType: value as ElektrikerData['buildingType'] })
              }
              options={buildingTypeOptions}
              placeholder="Wählen Sie die Gebäudeart"
            />
          </FormField>

          <FormField label="Bestehende Installation" required>
            <FormSelect
              value={formData.existingInstallation || ''}
              onChange={value =>
                updateData({
                  existingInstallation: value as ElektrikerData['existingInstallation'],
                })
              }
              options={existingInstallationOptions}
              placeholder="Zustand der bestehenden Installation"
            />
          </FormField>

          <FormField label="Materialbereitstellung" required>
            <FormSelect
              value={formData.materialProvided || ''}
              onChange={value =>
                updateData({ materialProvided: value as ElektrikerData['materialProvided'] })
              }
              options={materialProvidedOptions}
              placeholder="Wer stellt das Material bereit?"
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
              placeholder="Anzahl der betroffenen Räume"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zertifizierung erforderlich">
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="certificationNeeded"
                  checked={formData.certificationNeeded === true}
                  onChange={() => updateData({ certificationNeeded: true })}
                  className="mr-2"
                />
                Ja, Zertifizierung erforderlich
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="certificationNeeded"
                  checked={formData.certificationNeeded === false}
                  onChange={() => updateData({ certificationNeeded: false })}
                  className="mr-2"
                />
                Nein, keine Zertifizierung erforderlich
              </label>
            </div>
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => updateData({ specialRequirements: value })}
              placeholder="Beschreiben Sie besondere Wünsche, Sicherheitsanforderungen oder Besonderheiten"
              rows={3}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default ElektrikerForm;
