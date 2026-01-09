'use client';
import React, { useState, useEffect } from 'react';
import { ElektrikerData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormRadioGroup,
  FormSubmitButton,
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

  const serviceTypeOptions = [
    { value: 'installation', label: 'Installation' },
    { value: 'reparatur', label: 'Reparatur' },
    { value: 'wartung', label: 'Wartung' },
    { value: 'notfall', label: 'Notfall' },
    { value: 'sanierung', label: 'Elektrosanierung' },
    { value: 'smart_home', label: 'Smart Home Installation' },
    { value: 'sicherheitstechnik', label: 'Sicherheitstechnik' },
  ];

  const problemTypeOptions = [
    { value: 'stromausfall', label: 'Stromausfall' },
    { value: 'kurzschluss', label: 'Kurzschluss' },
    { value: 'defekte_steckdose', label: 'Defekte Steckdose' },
    { value: 'defekte_beleuchtung', label: 'Defekte Beleuchtung' },
    { value: 'sicherung_fliegt', label: 'Sicherung fliegt raus' },
    { value: 'neue_installation', label: 'Neue Installation' },
    { value: 'erweiterung', label: 'Erweiterung bestehender Anlage' },
    { value: 'sonstiges', label: 'Sonstiges' },
  ];

  const roomTypeOptions = [
    { value: 'wohnzimmer', label: 'Wohnzimmer' },
    { value: 'kueche', label: 'Küche' },
    { value: 'bad', label: 'Bad' },
    { value: 'schlafzimmer', label: 'Schlafzimmer' },
    { value: 'keller', label: 'Keller' },
    { value: 'dachboden', label: 'Dachboden' },
    { value: 'garage', label: 'Garage' },
    { value: 'buero', label: 'Büro' },
    { value: 'garten', label: 'Garten/Außenbereich' },
    { value: 'mehrere_raeume', label: 'Mehrere Räume' },
  ];

  const buildingTypeOptions = [
    { value: 'einfamilienhaus', label: 'Einfamilienhaus' },
    { value: 'wohnung', label: 'Wohnung' },
    { value: 'gewerbe', label: 'Gewerbe' },
    { value: 'buero', label: 'Büro' },
  ];

  const urgencyOptions = [
    { value: 'notfall', label: 'Notfall (sofort)' },
    { value: 'dringend', label: 'Dringend (heute)' },
    { value: 'normal', label: 'Normal (1-3 Tage)' },
    { value: 'geplant', label: 'Geplant (flexibel)' },
  ];

  const handleInputChange = (field: keyof ElektrikerData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.problemType &&
      formData.roomType &&
      formData.buildingType &&
      formData.urgency &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.problemType &&
      formData.roomType &&
      formData.buildingType &&
      formData.urgency &&
      formData.projectDescription
    );
  };

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
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art der Elektroarbeit"
            />
          </FormField>

          <FormField label="Problem/Aufgabe" required>
            <FormSelect
              value={formData.problemType || ''}
              onChange={value => handleInputChange('problemType', value)}
              options={problemTypeOptions}
              placeholder="Was ist das Problem oder die Aufgabe?"
            />
          </FormField>

          <FormField label="Betroffener Raum" required>
            <FormSelect
              value={formData.roomType || ''}
              onChange={value => handleInputChange('roomType', value)}
              options={roomTypeOptions}
              placeholder="In welchem Raum liegt das Problem?"
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
              placeholder="Wie dringend ist das Problem?"
            />
          </FormField>

          <FormField label="Anzahl betroffener Punkte">
            <FormInput
              type="number"
              value={formData.numberOfPoints || ''}
              onChange={value => handleInputChange('numberOfPoints', value)}
              placeholder="z.B. 5 Steckdosen"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Projektbeschreibung" required>
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie das elektrische Problem oder Projekt detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Besondere Anforderungen oder Sicherheitsaspekte"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Materiallieferung">
            <FormRadioGroup
              name="materialSupply"
              value={formData.materialSupply || ''}
              onChange={value => handleInputChange('materialSupply', value)}
              options={[
                { value: 'elektriker', label: 'Elektriker bringt Material mit' },
                { value: 'kunde', label: 'Kunde beschafft Material' },
                { value: 'gemeinsam', label: 'Gemeinsame Beschaffung' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Sicherungskasten zugänglich">
            <FormRadioGroup
              name="fuseBoxAccess"
              value={formData.fuseBoxAccess || ''}
              onChange={value => handleInputChange('fuseBoxAccess', value)}
              options={[
                { value: 'ja', label: 'Ja, leicht zugänglich' },
                { value: 'eingeschränkt', label: 'Eingeschränkt zugänglich' },
                { value: 'nein', label: 'Nein, nicht zugänglich' },
                { value: 'unbekannt', label: 'Weiß ich nicht' },
              ]}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Elektriker" formData={formData} />
    </div>
  );
};

export default ElektrikerForm;
