import React, { useState, useEffect } from 'react';
import { MontageserviceData } from '@/types/subcategory-forms';
import { FormField, FormSelect, FormTextarea } from './FormComponents';

interface MontageserviceFormProps {
  data: MontageserviceData;
  onDataChange: (data: MontageserviceData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const MontageserviceForm: React.FC<MontageserviceFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<MontageserviceData>(data);

  const serviceTypeOptions = [
    { value: 'möbel', label: 'Möbel' },
    { value: 'küche', label: 'Küche' },
    { value: 'elektro', label: 'Elektrogeräte' },
    { value: 'tv', label: 'TV/Elektronik' },
    { value: 'sonstiges', label: 'Sonstiges' },
  ];

  const complexityOptions = [
    { value: 'einfach', label: 'Einfach' },
    { value: 'mittel', label: 'Mittel' },
    { value: 'komplex', label: 'Komplex' },
  ];

  const roomTypeOptions = [
    { value: 'wohnzimmer', label: 'Wohnzimmer' },
    { value: 'küche', label: 'Küche' },
    { value: 'schlafzimmer', label: 'Schlafzimmer' },
    { value: 'badezimmer', label: 'Badezimmer' },
    { value: 'sonstiges', label: 'Sonstiges' },
  ];

  const handleInputChange = (field: keyof MontageserviceData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.complexity &&
      formData.roomType &&
      formData.productDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Art der Montage" required>
          <FormSelect
            value={formData.serviceType || ''}
            onChange={value => handleInputChange('serviceType', value)}
            options={serviceTypeOptions}
            placeholder="Wählen Sie die Art"
          />
        </FormField>

        <FormField label="Komplexität" required>
          <FormSelect
            value={formData.complexity || ''}
            onChange={value => handleInputChange('complexity', value)}
            options={complexityOptions}
            placeholder="Wählen Sie die Komplexität"
          />
        </FormField>

        <FormField label="Raum" required>
          <FormSelect
            value={formData.roomType || ''}
            onChange={value => handleInputChange('roomType', value)}
            options={roomTypeOptions}
            placeholder="Wählen Sie den Raum"
          />
        </FormField>
      </div>

      <FormField label="Produktbeschreibung" required>
        <FormTextarea
          value={formData.productDescription || ''}
          onChange={value => handleInputChange('productDescription', value)}
          placeholder="Beschreiben Sie die zu montierenden Produkte"
          rows={3}
        />
      </FormField>
    </div>
  );
};

export default MontageserviceForm;
