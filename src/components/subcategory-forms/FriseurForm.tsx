import React, { useState, useEffect } from 'react';
import { FriseurData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface FriseurFormProps {
  data: FriseurData;
  onDataChange: (data: FriseurData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const FriseurForm: React.FC<FriseurFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<FriseurData>(data);

  const serviceTypeOptions = [
    { value: 'haarschnitt', label: 'Haarschnitt' },
    { value: 'färben', label: 'Färben' },
    { value: 'tönen', label: 'Tönen' },
    { value: 'strähnchen', label: 'Strähnchen' },
    { value: 'dauerwelle', label: 'Dauerwelle' },
    { value: 'glätten', label: 'Glätten' },
    { value: 'styling', label: 'Styling' },
    { value: 'hochsteckfrisur', label: 'Hochsteckfrisur' },
    { value: 'bartpflege', label: 'Bartpflege' },
    { value: 'augenbrauen', label: 'Augenbrauen' },
    { value: 'haarverlängerung', label: 'Haarverlängerung' },
    { value: 'haarpflege', label: 'Haarpflege' },
  ];

  const hairLengthOptions = [
    { value: 'kurz', label: 'Kurz' },
    { value: 'mittel', label: 'Mittel' },
    { value: 'lang', label: 'Lang' },
    { value: 'sehr_lang', label: 'Sehr lang' },
  ];

  const hairTypeOptions = [
    { value: 'glatt', label: 'Glatt' },
    { value: 'wellig', label: 'Wellig' },
    { value: 'lockig', label: 'Lockig' },
    { value: 'kraus', label: 'Kraus' },
  ];
  const occasionOptions = [
    { value: 'alltag', label: 'Alltag' },
    { value: 'hochzeit', label: 'Hochzeit' },
    { value: 'party', label: 'Party' },
    { value: 'business', label: 'Business' },
    { value: 'date', label: 'Date' },
    { value: 'fotoshooting', label: 'Fotoshooting' },
    { value: 'special_event', label: 'Besonderer Anlass' },
  ];

  const handleInputChange = (field: keyof FriseurData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(formData.serviceType && formData.hairLength && formData.hairType);
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Friseur-Projektdetails
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

          <FormField label="Haarlänge" required>
            <FormSelect
              value={formData.hairLength || ''}
              onChange={value => handleInputChange('hairLength', value)}
              options={hairLengthOptions}
              placeholder="Wählen Sie die Haarlänge"
            />
          </FormField>

          <FormField label="Haartyp" required>
            <FormSelect
              value={formData.hairType || ''}
              onChange={value => handleInputChange('hairType', value)}
              options={hairTypeOptions}
              placeholder="Wählen Sie den Haartyp"
            />
          </FormField>

          <FormField label="Anlass">
            <FormSelect
              value={formData.occasion || ''}
              onChange={value => handleInputChange('occasion', value)}
              options={occasionOptions}
              placeholder="Wählen Sie den Anlass"
            />
          </FormField>

          <FormField label="Wunschtermin">
            <FormInput
              type="text"
              value={formData.preferredDate || ''}
              onChange={value => handleInputChange('preferredDate', value)}
              placeholder="TT.MM.JJJJ"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Ort der Behandlung">
            <FormRadioGroup
              name="location"
              value={formData.location || ''}
              onChange={value => handleInputChange('location', value)}
              options={[
                { value: 'salon', label: 'Im Salon' },
                { value: 'zuhause', label: 'Bei mir zu Hause' },
                { value: 'flexibel', label: 'Flexibel' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Geschlecht des Friseurs">
            <FormRadioGroup
              name="gender"
              value={formData.gender || ''}
              onChange={value => handleInputChange('gender', value)}
              options={[
                { value: 'weiblich', label: 'Weiblich' },
                { value: 'männlich', label: 'Männlich' },
                { value: 'egal', label: 'Egal' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Bevorzugte Uhrzeit">
            <FormRadioGroup
              name="timePreference"
              value={formData.timePreference || ''}
              onChange={value => handleInputChange('timePreference', value)}
              options={[
                { value: 'vormittags', label: 'Vormittags' },
                { value: 'nachmittags', label: 'Nachmittags' },
                { value: 'abends', label: 'Abends' },
                { value: 'wochenende', label: 'Wochenende' },
                { value: 'flexibel', label: 'Flexibel' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Wünsche/Vorstellungen">
            <FormTextarea
              value={formData.wishes || ''}
              onChange={value => handleInputChange('wishes', value)}
              placeholder="Beschreiben Sie Ihre Wünsche und Vorstellungen"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Allergien/Unverträglichkeiten">
            <FormTextarea
              value={formData.allergies || ''}
              onChange={value => handleInputChange('allergies', value)}
              placeholder="Bekannte Allergien oder Unverträglichkeiten"
              rows={2}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Weitere Informationen">
            <FormTextarea
              value={formData.additionalInfo || ''}
              onChange={value => handleInputChange('additionalInfo', value)}
              placeholder="Weitere wichtige Informationen"
              rows={3}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default FriseurForm;
