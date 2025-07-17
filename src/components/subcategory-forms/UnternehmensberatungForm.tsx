import React, { useState, useEffect } from 'react';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface UnternehmensberatungData {
  subcategory: string;
  consultingType: string;
  companySize: string;
  industryType: string;
  consultingGoals: string[];
  consultingDuration: string;
  preferredFormat: string;
  consultingFrequency: string;
  budget?: string;
  description?: string;
}

interface UnternehmensberatungFormProps {
  data: UnternehmensberatungData;
  onDataChange: (data: UnternehmensberatungData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const UnternehmensberatungForm: React.FC<UnternehmensberatungFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<UnternehmensberatungData>(data);

  const consultingTypeOptions = [
    { value: 'strategie', label: 'Strategieberatung' },
    { value: 'prozess', label: 'Prozessoptimierung' },
    { value: 'restrukturierung', label: 'Restrukturierung' },
    { value: 'digital', label: 'Digitalisierung' },
    { value: 'marketing', label: 'Marketing & Vertriebsberatung' },
    { value: 'finanzen', label: 'Finanz- & Controllingberatung' },
    { value: 'hr', label: 'HR & Organisationsentwicklung' },
    { value: 'risiko', label: 'Risikomanagement & Compliance' },
    { value: 'internationalisierung', label: 'Internationalisierung' },
    { value: 'nachhaltigkeit', label: 'Nachhaltigkeitsberatung' },
    { value: 'andere', label: 'Andere' },
  ];

  const companySizeOptions = [
    { value: 'startup', label: 'Startup/Gründung' },
    { value: 'kleinst', label: 'Kleinstunternehmen (bis 9 Mitarbeiter)' },
    { value: 'klein', label: 'Kleinunternehmen (10-49 Mitarbeiter)' },
    { value: 'mittel', label: 'Mittelständisches Unternehmen (50-249 Mitarbeiter)' },
    { value: 'gross', label: 'Großunternehmen (250+ Mitarbeiter)' },
  ];

  const industryTypeOptions = [
    { value: 'handel', label: 'Handel & Konsumgüter' },
    { value: 'produktion', label: 'Produktion & Fertigung' },
    { value: 'it', label: 'IT & Telekommunikation' },
    { value: 'finanzen', label: 'Finanzen & Versicherungen' },
    { value: 'gesundheit', label: 'Gesundheitswesen' },
    { value: 'logistik', label: 'Logistik & Transport' },
    { value: 'bauwesen', label: 'Bauwesen & Immobilien' },
    { value: 'energie', label: 'Energie & Versorgung' },
    { value: 'tourismus', label: 'Tourismus & Gastronomie' },
    { value: 'bildung', label: 'Bildung & Forschung' },
    { value: 'medien', label: 'Medien & Kreativwirtschaft' },
    { value: 'oeffentlich', label: 'Öffentlicher Sektor' },
    { value: 'andere', label: 'Andere' },
  ];

  const consultingGoalsOptions = [
    { value: 'umsatzsteigerung', label: 'Umsatzsteigerung' },
    { value: 'kostenreduktion', label: 'Kostenreduktion' },
    { value: 'effizienzverbesserung', label: 'Effizienzverbesserung' },
    { value: 'marktausweitung', label: 'Marktausweitung' },
    { value: 'digitalisierung', label: 'Digitalisierung' },
    { value: 'prozessoptimierung', label: 'Prozessoptimierung' },
    { value: 'innovationsförderung', label: 'Innovationsförderung' },
    { value: 'restrukturierung', label: 'Restrukturierung' },
    { value: 'krisenbewältigung', label: 'Krisenbewältigung' },
    { value: 'nachfolgeplanung', label: 'Nachfolgeplanung' },
    { value: 'change_management', label: 'Change Management' },
    { value: 'finanzierungsfragen', label: 'Finanzierungsfragen' },
    { value: 'andere', label: 'Andere' },
  ];

  const consultingDurationOptions = [
    { value: 'kurzfristig', label: 'Kurzfristig (1-3 Monate)' },
    { value: 'mittelfristig', label: 'Mittelfristig (3-12 Monate)' },
    { value: 'langfristig', label: 'Langfristig (über 12 Monate)' },
    { value: 'einmalig', label: 'Einmalige Beratung' },
  ];

  const preferredFormatOptions = [
    { value: 'vor_ort', label: 'Vor-Ort-Beratung' },
    { value: 'remote', label: 'Remote/Online-Beratung' },
    { value: 'hybrid', label: 'Hybrides Format' },
    { value: 'workshops', label: 'Workshops' },
    { value: 'coaching', label: 'Coaching' },
  ];

  const consultingFrequencyOptions = [
    { value: 'taeglich', label: 'Täglich' },
    { value: 'woechentlich', label: 'Wöchentlich' },
    { value: 'monatlich', label: 'Monatlich' },
    { value: 'quartal', label: 'Quartalsweise' },
    { value: 'nach_bedarf', label: 'Nach Bedarf' },
    { value: 'einmalig', label: 'Einmalig' },
  ];

  useEffect(() => {
    onDataChange(formData);
  }, [formData, onDataChange]);

  const handleChange = (field: keyof UnternehmensberatungData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const isValid = !!(
      formData.consultingType &&
      formData.companySize &&
      formData.industryType &&
      formData.consultingGoals &&
      formData.consultingGoals.length > 0 &&
      formData.consultingDuration
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <FormField label="Art der Unternehmensberatung" required>
        <FormSelect
          value={formData.consultingType}
          onChange={value => handleChange('consultingType', value)}
          options={consultingTypeOptions}
        />
      </FormField>

      <FormField label="Unternehmensgröße" required>
        <FormSelect
          value={formData.companySize}
          onChange={value => handleChange('companySize', value)}
          options={companySizeOptions}
        />
      </FormField>

      <FormField label="Branche" required>
        <FormSelect
          value={formData.industryType}
          onChange={value => handleChange('industryType', value)}
          options={industryTypeOptions}
        />
      </FormField>

      <FormField label="Beratungsziele" required>
        <FormCheckboxGroup
          value={formData.consultingGoals || []}
          onChange={value => handleChange('consultingGoals', value)}
          options={consultingGoalsOptions}
        />
      </FormField>

      <FormField label="Dauer der Beratung" required>
        <FormSelect
          value={formData.consultingDuration}
          onChange={value => handleChange('consultingDuration', value)}
          options={consultingDurationOptions}
        />
      </FormField>

      <FormField label="Bevorzugtes Format">
        <FormSelect
          value={formData.preferredFormat || ''}
          onChange={value => handleChange('preferredFormat', value)}
          options={preferredFormatOptions}
        />
      </FormField>

      <FormField label="Häufigkeit der Beratung">
        <FormSelect
          value={formData.consultingFrequency || ''}
          onChange={value => handleChange('consultingFrequency', value)}
          options={consultingFrequencyOptions}
        />
      </FormField>

      <FormField label="Budget (optional)">
        <FormInput
          value={formData.budget || ''}
          onChange={value => handleChange('budget', value.toString())}
          placeholder="z.B. '5.000 € - 10.000 €', 'nach Aufwand', etc."
        />
      </FormField>

      <FormField label="Detaillierte Beschreibung Ihrer Anforderungen">
        <FormTextarea
          value={formData.description || ''}
          onChange={value => handleChange('description', value)}
          placeholder="Beschreiben Sie detailliert Ihre Situation, Herausforderungen und was Sie mit der Beratung erreichen möchten. Je mehr Details, desto besser kann ein passender Berater gefunden werden."
        />
      </FormField>
    </div>
  );
};

export default UnternehmensberatungForm;
