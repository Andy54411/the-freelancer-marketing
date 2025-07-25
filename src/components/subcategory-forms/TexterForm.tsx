import React, { useState, useEffect } from 'react';
import { TexterData } from '@/types/subcategory-forms';
import { FormField, FormSelect, FormInput, FormTextarea, FormSubmitButton } from './FormComponents';

interface TexterFormProps {
  data: TexterData;
  onDataChange: (data: TexterData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const TexterForm: React.FC<TexterFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<TexterData>(data);

  const serviceTypeOptions = [
    { value: 'content_writing', label: 'Content Writing' },
    { value: 'copywriting', label: 'Copywriting' },
    { value: 'seo_texte', label: 'SEO-Texte' },
    { value: 'blog_artikel', label: 'Blog-Artikel' },
    { value: 'website_texte', label: 'Website-Texte' },
    { value: 'produktbeschreibungen', label: 'Produktbeschreibungen' },
    { value: 'marketing_texte', label: 'Marketing-Texte' },
    { value: 'newsletter', label: 'Newsletter' },
    { value: 'andere', label: 'Andere' },
  ];

  const wordCountOptions = [
    { value: '100-300', label: '100-300 Wörter' },
    { value: '300-500', label: '300-500 Wörter' },
    { value: '500-1000', label: '500-1000 Wörter' },
    { value: '1000-2000', label: '1000-2000 Wörter' },
    { value: '2000+', label: 'Über 2000 Wörter' },
    { value: 'nach_absprache', label: 'Nach Absprache' },
  ];

  const toneOptions = [
    { value: 'professionell', label: 'Professionell' },
    { value: 'freundlich', label: 'Freundlich' },
    { value: 'informativ', label: 'Informativ' },
    { value: 'werbend', label: 'Werbend' },
    { value: 'unterhaltsam', label: 'Unterhaltsam' },
    { value: 'nach_absprache', label: 'Nach Absprache' },
  ];

  const handleInputChange = (field: keyof TexterData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.wordCount &&
      formData.tone &&
      formData.deadline &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.wordCount &&
      formData.tone &&
      formData.deadline &&
      formData.projectDescription
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Texter-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art des Textes" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art des Textes"
            />
          </FormField>

          <FormField label="Wortanzahl" required>
            <FormSelect
              value={formData.wordCount || ''}
              onChange={value => handleInputChange('wordCount', value)}
              options={wordCountOptions}
              placeholder="Wählen Sie die Wortanzahl"
            />
          </FormField>

          <FormField label="Ton/Stil" required>
            <FormSelect
              value={formData.tone || ''}
              onChange={value => handleInputChange('tone', value)}
              options={toneOptions}
              placeholder="Wählen Sie den Ton/Stil"
            />
          </FormField>

          <FormField label="Gewünschter Liefertermin" required>
            <FormInput
              type="text"
              value={formData.deadline || ''}
              onChange={value => handleInputChange('deadline', value)}
              placeholder="TT.MM.JJJJ"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Projektbeschreibung" required>
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie Ihr Textprojekt detailliert"
              rows={4}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Texter" formData={formData} />
    </div>
  );
}

export default TexterForm;
