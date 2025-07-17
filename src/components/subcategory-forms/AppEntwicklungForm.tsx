import React, { useState, useEffect } from 'react';
import { AppEntwicklungData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface AppEntwicklungFormProps {
  data: AppEntwicklungData;
  onDataChange: (data: AppEntwicklungData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const AppEntwicklungForm: React.FC<AppEntwicklungFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<AppEntwicklungData>(data);

  const appTypeOptions = [
    { value: 'native_ios', label: 'Native iOS App' },
    { value: 'native_android', label: 'Native Android App' },
    { value: 'cross_platform', label: 'Cross-Platform App' },
    { value: 'hybrid', label: 'Hybrid App' },
    { value: 'pwa', label: 'Progressive Web App' },
  ];

  const categoryOptions = [
    { value: 'business', label: 'Business' },
    { value: 'lifestyle', label: 'Lifestyle' },
    { value: 'productivity', label: 'Produktivität' },
    { value: 'entertainment', label: 'Unterhaltung' },
    { value: 'education', label: 'Bildung' },
    { value: 'health', label: 'Gesundheit' },
    { value: 'finance', label: 'Finanzen' },
    { value: 'social', label: 'Social' },
    { value: 'gaming', label: 'Gaming' },
    { value: 'ecommerce', label: 'E-Commerce' },
    { value: 'food', label: 'Essen & Trinken' },
    { value: 'travel', label: 'Reisen' },
  ];

  const technologyOptions = [
    { value: 'swift', label: 'Swift (iOS)' },
    { value: 'kotlin', label: 'Kotlin (Android)' },
    { value: 'java', label: 'Java (Android)' },
    { value: 'react_native', label: 'React Native' },
    { value: 'flutter', label: 'Flutter' },
    { value: 'xamarin', label: 'Xamarin' },
    { value: 'ionic', label: 'Ionic' },
    { value: 'phonegap', label: 'PhoneGap' },
  ];

  const featuresOptions = [
    { value: 'user_authentication', label: 'Benutzer-Authentifizierung' },
    { value: 'push_notifications', label: 'Push-Benachrichtigungen' },
    { value: 'offline_mode', label: 'Offline-Modus' },
    { value: 'camera_integration', label: 'Kamera-Integration' },
    { value: 'gps_location', label: 'GPS/Standort' },
    { value: 'payment_integration', label: 'Zahlungsintegration' },
    { value: 'social_media', label: 'Social Media Integration' },
    { value: 'cloud_sync', label: 'Cloud-Synchronisation' },
    { value: 'analytics', label: 'Analytics' },
    { value: 'chat', label: 'Chat-Funktion' },
    { value: 'video_audio', label: 'Video/Audio' },
    { value: 'ar_vr', label: 'AR/VR' },
  ];
  const timelineOptions = [
    { value: 'unter_3_monate', label: 'Unter 3 Monate' },
    { value: '3_6_monate', label: '3-6 Monate' },
    { value: '6_12_monate', label: '6-12 Monate' },
    { value: 'über_1_jahr', label: 'Über 1 Jahr' },
  ];

  const additionalServicesOptions = [
    { value: 'ui_ux_design', label: 'UI/UX Design' },
    { value: 'app_store_optimization', label: 'App Store Optimization' },
    { value: 'testing', label: 'Testing' },
    { value: 'app_store_submission', label: 'App Store Einreichung' },
    { value: 'maintenance', label: 'Wartung' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'analytics_setup', label: 'Analytics Setup' },
    { value: 'backend_development', label: 'Backend-Entwicklung' },
  ];

  const handleInputChange = (field: keyof AppEntwicklungData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.appType &&
      formData.category &&
      formData.technology &&
      formData.features &&
      formData.timeline &&
      formData.appDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          App-Entwicklung-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="App-Typ" required>
            <FormSelect
              value={formData.appType || ''}
              onChange={value => handleInputChange('appType', value)}
              options={appTypeOptions}
              placeholder="Wählen Sie den App-Typ"
            />
          </FormField>

          <FormField label="Kategorie" required>
            <FormSelect
              value={formData.category || ''}
              onChange={value => handleInputChange('category', value)}
              options={categoryOptions}
              placeholder="Wählen Sie die App-Kategorie"
            />
          </FormField>

          <FormField label="Technologie" required>
            <FormSelect
              value={formData.technology || ''}
              onChange={value => handleInputChange('technology', value)}
              options={technologyOptions}
              placeholder="Wählen Sie die Technologie"
            />
          </FormField>
          <FormField label="Zeitrahmen" required>
            <FormSelect
              value={formData.timeline || ''}
              onChange={value => handleInputChange('timeline', value)}
              options={timelineOptions}
              placeholder="Wählen Sie den Zeitrahmen"
            />
          </FormField>

          <FormField label="App-Name">
            <FormInput
              type="text"
              value={formData.appName || ''}
              onChange={value => handleInputChange('appName', value)}
              placeholder="Name der App"
            />
          </FormField>

          <FormField label="Zielgruppe">
            <FormInput
              type="text"
              value={formData.targetAudience || ''}
              onChange={value => handleInputChange('targetAudience', value)}
              placeholder="Beschreibung der Zielgruppe"
            />
          </FormField>

          <FormField label="Erwartete Downloads">
            <FormInput
              type="number"
              value={formData.expectedDownloads?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'expectedDownloads',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Erwartete Anzahl der Downloads"
            />
          </FormField>

          <FormField label="Monetarisierung">
            <FormInput
              type="text"
              value={formData.monetization || ''}
              onChange={value => handleInputChange('monetization', value)}
              placeholder="Kostenlos, Paid, Freemium, etc."
            />
          </FormField>

          <FormField label="Startdatum">
            <FormInput
              type="text"
              value={formData.startDate || ''}
              onChange={value => handleInputChange('startDate', value)}
              placeholder="TT.MM.JJJJ"
            />
          </FormField>

          <FormField label="Launch-Datum">
            <FormInput
              type="text"
              value={formData.launchDate || ''}
              onChange={value => handleInputChange('launchDate', value)}
              placeholder="TT.MM.JJJJ"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Gewünschte Features" required>
            <FormCheckboxGroup
              value={formData.features || []}
              onChange={value => handleInputChange('features', value)}
              options={featuresOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zusätzliche Services">
            <FormCheckboxGroup
              value={formData.additionalServices || []}
              onChange={value => handleInputChange('additionalServices', value)}
              options={additionalServicesOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="App-Beschreibung" required>
            <FormTextarea
              value={formData.appDescription || ''}
              onChange={value => handleInputChange('appDescription', value)}
              placeholder="Beschreiben Sie Ihre App-Idee detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Competitor-Analyse">
            <FormTextarea
              value={formData.competitorAnalysis || ''}
              onChange={value => handleInputChange('competitorAnalysis', value)}
              placeholder="Ähnliche Apps oder Konkurrenten"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Spezielle technische oder funktionale Anforderungen"
              rows={3}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default AppEntwicklungForm;
