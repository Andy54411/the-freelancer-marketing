import React, { useState, useEffect } from 'react';
import { ITBeratungData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface ITBeratungFormProps {
  data: ITBeratungData;
  onDataChange: (data: ITBeratungData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const ITBeratungForm: React.FC<ITBeratungFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<ITBeratungData>(data);

  const consultingTypeOptions = [
    { value: 'strategy', label: 'IT-Strategie' },
    { value: 'digital_transformation', label: 'Digitale Transformation' },
    { value: 'infrastructure', label: 'Infrastruktur-Beratung' },
    { value: 'security', label: 'IT-Sicherheit' },
    { value: 'cloud', label: 'Cloud-Beratung' },
    { value: 'software_architecture', label: 'Software-Architektur' },
    { value: 'process_optimization', label: 'Prozess-Optimierung' },
    { value: 'vendor_selection', label: 'Anbieter-Auswahl' },
    { value: 'compliance', label: 'Compliance & Governance' },
  ];

  const companySizeOptions = [
    { value: 'startup', label: 'Startup (1-10 Mitarbeiter)' },
    { value: 'small', label: 'Klein (11-50 Mitarbeiter)' },
    { value: 'medium', label: 'Mittel (51-200 Mitarbeiter)' },
    { value: 'large', label: 'Groß (201-1000 Mitarbeiter)' },
    { value: 'enterprise', label: 'Enterprise (1000+ Mitarbeiter)' },
  ];

  const industryOptions = [
    { value: 'technology', label: 'Technologie' },
    { value: 'finance', label: 'Finanzwesen' },
    { value: 'healthcare', label: 'Gesundheitswesen' },
    { value: 'manufacturing', label: 'Fertigung' },
    { value: 'retail', label: 'Einzelhandel' },
    { value: 'education', label: 'Bildung' },
    { value: 'government', label: 'Öffentlicher Sektor' },
    { value: 'consulting', label: 'Beratung' },
    { value: 'media', label: 'Medien' },
    { value: 'other', label: 'Andere' },
  ];

  const timelineOptions = [
    { value: 'sofort', label: 'Sofort' },
    { value: 'unter_1_monat', label: 'Unter 1 Monat' },
    { value: '1_3_monate', label: '1-3 Monate' },
    { value: '3_6_monate', label: '3-6 Monate' },
    { value: 'über_6_monate', label: 'Über 6 Monate' },
  ];

  const expertiseAreasOptions = [
    { value: 'cloud_migration', label: 'Cloud Migration' },
    { value: 'cybersecurity', label: 'Cybersicherheit' },
    { value: 'data_analytics', label: 'Datenanalyse' },
    { value: 'ai_ml', label: 'KI & Machine Learning' },
    { value: 'devops', label: 'DevOps' },
    { value: 'agile', label: 'Agile Methoden' },
    { value: 'erp', label: 'ERP-Systeme' },
    { value: 'crm', label: 'CRM-Systeme' },
    { value: 'ecommerce', label: 'E-Commerce' },
    { value: 'mobile', label: 'Mobile Solutions' },
  ];

  const deliverableOptions = [
    { value: 'strategy_document', label: 'Strategie-Dokument' },
    { value: 'technical_specification', label: 'Technische Spezifikation' },
    { value: 'implementation_plan', label: 'Umsetzungsplan' },
    { value: 'risk_assessment', label: 'Risikoanalyse' },
    { value: 'cost_analysis', label: 'Kostenanalyse' },
    { value: 'vendor_recommendation', label: 'Anbieter-Empfehlung' },
    { value: 'training_materials', label: 'Schulungsmaterialien' },
    { value: 'documentation', label: 'Dokumentation' },
  ];

  const handleInputChange = (field: keyof ITBeratungData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.consultingType &&
      formData.companySize &&
      formData.industry &&
      formData.timeline &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          IT-Beratung-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Beratung" required>
            <FormSelect
              value={formData.consultingType || ''}
              onChange={value => handleInputChange('consultingType', value)}
              options={consultingTypeOptions}
              placeholder="Wählen Sie die Art der Beratung"
            />
          </FormField>

          <FormField label="Unternehmensgröße" required>
            <FormSelect
              value={formData.companySize || ''}
              onChange={value => handleInputChange('companySize', value)}
              options={companySizeOptions}
              placeholder="Wählen Sie die Unternehmensgröße"
            />
          </FormField>

          <FormField label="Branche" required>
            <FormSelect
              value={formData.industry || ''}
              onChange={value => handleInputChange('industry', value)}
              options={industryOptions}
              placeholder="Wählen Sie Ihre Branche"
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

          <FormField label="Unternehmen">
            <FormInput
              type="text"
              value={formData.company || ''}
              onChange={value => handleInputChange('company', value)}
              placeholder="Name Ihres Unternehmens"
            />
          </FormField>

          <FormField label="Position">
            <FormInput
              type="text"
              value={formData.position || ''}
              onChange={value => handleInputChange('position', value)}
              placeholder="Position im Unternehmen"
            />
          </FormField>

          <FormField label="Standort">
            <FormInput
              type="text"
              value={formData.location || ''}
              onChange={value => handleInputChange('location', value)}
              placeholder="Standort des Unternehmens"
            />
          </FormField>

          <FormField label="Gewünschtes Startdatum">
            <FormInput
              type="text"
              value={formData.startDate || ''}
              onChange={value => handleInputChange('startDate', value)}
              placeholder="TT.MM.JJJJ"
            />
          </FormField>

          <FormField label="Gewünschtes Abschlussdatum">
            <FormInput
              type="text"
              value={formData.completionDate || ''}
              onChange={value => handleInputChange('completionDate', value)}
              placeholder="TT.MM.JJJJ"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Fachgebiete">
            <FormCheckboxGroup
              value={formData.expertiseAreas || []}
              onChange={value => handleInputChange('expertiseAreas', value)}
              options={expertiseAreasOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Gewünschte Ergebnisse">
            <FormCheckboxGroup
              value={formData.deliverables || []}
              onChange={value => handleInputChange('deliverables', value)}
              options={deliverableOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Projektbeschreibung" required>
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie Ihr Beratungsprojekt detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Aktuelle Herausforderungen">
            <FormTextarea
              value={formData.currentChallenges || ''}
              onChange={value => handleInputChange('currentChallenges', value)}
              placeholder="Welche IT-Herausforderungen haben Sie derzeit?"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Gewünschte Ziele">
            <FormTextarea
              value={formData.desiredOutcomes || ''}
              onChange={value => handleInputChange('desiredOutcomes', value)}
              placeholder="Was möchten Sie durch die Beratung erreichen?"
              rows={3}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default ITBeratungForm;
