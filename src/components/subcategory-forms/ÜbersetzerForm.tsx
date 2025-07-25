'use client';
import React, { useState, useEffect } from 'react';
import { ÜbersetzerData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';

interface ÜbersetzerFormProps {
  data: ÜbersetzerData;
  onDataChange: (data: ÜbersetzerData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const ÜbersetzerForm: React.FC<ÜbersetzerFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<ÜbersetzerData>(data);

  const serviceTypeOptions = [
    { value: 'document_translation', label: 'Dokumentübersetzung' },
    { value: 'website_translation', label: 'Website-Übersetzung' },
    { value: 'certified_translation', label: 'Beglaubigte Übersetzung' },
    { value: 'technical_translation', label: 'Fachübersetzung' },
    { value: 'marketing_translation', label: 'Marketing-Übersetzung' },
    { value: 'legal_translation', label: 'Rechtsübersetzung' },
    { value: 'medical_translation', label: 'Medizinische Übersetzung' },
    { value: 'literary_translation', label: 'Literarische Übersetzung' },
  ];

  const sourceLanguageOptions = [
    { value: 'deutsch', label: 'Deutsch' },
    { value: 'englisch', label: 'Englisch' },
    { value: 'spanisch', label: 'Spanisch' },
    { value: 'französisch', label: 'Französisch' },
    { value: 'italienisch', label: 'Italienisch' },
    { value: 'portugiesisch', label: 'Portugiesisch' },
    { value: 'russisch', label: 'Russisch' },
    { value: 'chinesisch', label: 'Chinesisch' },
    { value: 'japanisch', label: 'Japanisch' },
    { value: 'arabisch', label: 'Arabisch' },
    { value: 'andere', label: 'Andere Sprache' },
  ];

  const targetLanguageOptions = [
    { value: 'deutsch', label: 'Deutsch' },
    { value: 'englisch', label: 'Englisch' },
    { value: 'spanisch', label: 'Spanisch' },
    { value: 'französisch', label: 'Französisch' },
    { value: 'italienisch', label: 'Italienisch' },
    { value: 'portugiesisch', label: 'Portugiesisch' },
    { value: 'russisch', label: 'Russisch' },
    { value: 'chinesisch', label: 'Chinesisch' },
    { value: 'japanisch', label: 'Japanisch' },
    { value: 'arabisch', label: 'Arabisch' },
    { value: 'andere', label: 'Andere Sprache' },
  ];

  const qualityLevelOptions = [
    { value: 'standard', label: 'Standard' },
    { value: 'premium', label: 'Premium' },
    { value: 'professional', label: 'Professionell' },
    { value: 'native_speaker', label: 'Native Speaker' },
  ];

  const urgencyOptions = [
    { value: 'sofort', label: 'Sofort' },
    { value: 'heute', label: 'Heute' },
    { value: 'morgen', label: 'Morgen' },
    { value: 'diese_woche', label: 'Diese Woche' },
    { value: 'nächste_woche', label: 'Nächste Woche' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const handleInputChange = (field: keyof ÜbersetzerData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.sourceLanguage &&
      formData.targetLanguage &&
      formData.qualityLevel &&
      formData.urgency
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.sourceLanguage &&
      formData.targetLanguage &&
      formData.qualityLevel &&
      formData.urgency
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Übersetzer Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Übersetzung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Welche Art von Übersetzung?"
            />
          </FormField>

          <FormField label="Ausgangssprache" required>
            <FormSelect
              value={formData.sourceLanguage || ''}
              onChange={value => handleInputChange('sourceLanguage', value)}
              options={sourceLanguageOptions}
              placeholder="Von welcher Sprache?"
            />
          </FormField>

          <FormField label="Zielsprache" required>
            <FormSelect
              value={formData.targetLanguage || ''}
              onChange={value => handleInputChange('targetLanguage', value)}
              options={targetLanguageOptions}
              placeholder="In welche Sprache?"
            />
          </FormField>

          <FormField label="Qualitätslevel" required>
            <FormSelect
              value={formData.qualityLevel || ''}
              onChange={value => handleInputChange('qualityLevel', value)}
              options={qualityLevelOptions}
              placeholder="Welche Qualität wird benötigt?"
            />
          </FormField>

          <FormField label="Zeitrahmen" required>
            <FormSelect
              value={formData.urgency || ''}
              onChange={value => handleInputChange('urgency', value)}
              options={urgencyOptions}
              placeholder="Wann wird die Übersetzung benötigt?"
            />
          </FormField>

          <FormField label="Wortanzahl (ca.)">
            <FormInput
              type="number"
              value={formData.wordCount || ''}
              onChange={value => handleInputChange('wordCount', Number(value))}
              placeholder="z.B. 5000"
            />
          </FormField>

          <FormField label="Fachgebiet">
            <FormInput
              type="text"
              value={formData.specialty || ''}
              onChange={value => handleInputChange('specialty', value)}
              placeholder="z.B. Medizin, Technik, Recht"
            />
          </FormField>

          <FormField label="Dokumenttyp">
            <FormInput
              type="text"
              value={formData.documentType || ''}
              onChange={value => handleInputChange('documentType', value)}
              placeholder="z.B. Vertrag, Handbuch, Website"
            />
          </FormField>

          <FormField label="Dateiformat">
            <FormInput
              type="text"
              value={formData.fileFormat || ''}
              onChange={value => handleInputChange('fileFormat', value)}
              placeholder="z.B. PDF, Word, Excel"
            />
          </FormField>

          <FormField label="Gewünschter Liefertermin">
            <FormInput
              type="text"
              value={formData.deliveryDate || ''}
              onChange={value => handleInputChange('deliveryDate', value)}
              placeholder="TT.MM.JJJJ"
            />
          </FormField>

          <FormField label="Budget-Rahmen">
            <FormInput
              type="text"
              value={formData.budgetRange || ''}
              onChange={value => handleInputChange('budgetRange', value)}
              placeholder="z.B. 0,15-0,25 EUR pro Wort"
            />
          </FormField>

          <FormField label="Zielgruppe">
            <FormInput
              type="text"
              value={formData.targetAudience || ''}
              onChange={value => handleInputChange('targetAudience', value)}
              placeholder="z.B. Fachpersonal, Endkunden"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zusätzliche Services">
            <FormCheckboxGroup
              value={formData.additionalServices || []}
              onChange={value => handleInputChange('additionalServices', value)}
              options={[
                { value: 'korrekturlesen', label: 'Korrekturlesen' },
                { value: 'lektorat', label: 'Lektorat' },
                { value: 'formatierung', label: 'Formatierung' },
                { value: 'lokalisierung', label: 'Lokalisierung' },
                { value: 'beglaubigung', label: 'Beglaubigung' },
                { value: 'express_service', label: 'Express-Service' },
                { value: 'revision', label: 'Revision' },
                { value: 'qualitätsprüfung', label: 'Qualitätsprüfung' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Spezielle Anforderungen">
            <FormCheckboxGroup
              value={formData.specialRequirements || []}
              onChange={value => handleInputChange('specialRequirements', value)}
              options={[
                { value: 'vertraulichkeit', label: 'Vertraulichkeit/NDA' },
                { value: 'terminologie', label: 'Spezielle Terminologie' },
                { value: 'style_guide', label: 'Style Guide vorhanden' },
                { value: 'glossar', label: 'Glossar vorhanden' },
                { value: 'cat_tools', label: 'CAT-Tools gewünscht' },
                { value: 'native_speaker', label: 'Native Speaker erforderlich' },
                { value: 'fachübersetzer', label: 'Fachübersetzer erforderlich' },
                { value: 'iso_zertifiziert', label: 'ISO-zertifiziert' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Projektbeschreibung">
            <FormTextarea
              value={formData.description || ''}
              onChange={value => handleInputChange('description', value)}
              placeholder="Beschreiben Sie Ihr Übersetzungsprojekt im Detail..."
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Kontext und Hintergrundinformationen">
            <FormTextarea
              value={formData.context || ''}
              onChange={value => handleInputChange('context', value)}
              placeholder="Zusätzliche Informationen zum Kontext..."
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Beglaubigung erforderlich">
            <FormRadioGroup
              name="certification"
              value={formData.certification || ''}
              onChange={value => handleInputChange('certification', value)}
              options={[
                { value: 'ja', label: 'Ja, beglaubigte Übersetzung' },
                { value: 'nein', label: 'Nein, einfache Übersetzung' },
                { value: 'vereidigt', label: 'Vereidigte Übersetzung' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Verwendungszweck">
            <FormRadioGroup
              name="purpose"
              value={formData.purpose || ''}
              onChange={value => handleInputChange('purpose', value)}
              options={[
                { value: 'behörden', label: 'Für Behörden/Ämter' },
                { value: 'geschäftlich', label: 'Geschäftlich' },
                { value: 'privat', label: 'Privat' },
                { value: 'marketing', label: 'Marketing/Werbung' },
                { value: 'website', label: 'Website/Online' },
                { value: 'publikation', label: 'Publikation' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Referenzmaterialien vorhanden">
            <FormRadioGroup
              name="referenceMaterials"
              value={formData.referenceMaterials || ''}
              onChange={value => handleInputChange('referenceMaterials', value)}
              options={[
                { value: 'ja', label: 'Ja, Referenzmaterialien vorhanden' },
                { value: 'nein', label: 'Nein, keine Referenzen' },
                { value: 'teilweise', label: 'Teilweise vorhanden' },
              ]}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Übersetzer" formData={formData} />
    </div>
  );
};

export default ÜbersetzerForm;
