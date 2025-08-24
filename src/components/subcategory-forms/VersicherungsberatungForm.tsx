'use client';
import React, { useState, useEffect } from 'react';
import { VersicherungsberatungData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';

interface VersicherungsberatungFormProps {
  data: VersicherungsberatungData;
  onDataChange: (data: VersicherungsberatungData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const VersicherungsberatungForm: React.FC<VersicherungsberatungFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<VersicherungsberatungData>(data);

  const serviceTypeOptions = [
    { value: 'beratung', label: 'Allgemeine Versicherungsberatung' },
    { value: 'analyse', label: 'Versicherungsanalyse' },
    { value: 'optimierung', label: 'Optimierung bestehender Verträge' },
    { value: 'neuabschluss', label: 'Neuabschluss von Versicherungen' },
    { value: 'schadensfall', label: 'Hilfe bei Schadensfall' },
    { value: 'kündigung', label: 'Kündigungsberatung' },
    { value: 'wechsel', label: 'Versicherungswechsel' },
    { value: 'vergleich', label: 'Versicherungsvergleich' },
  ];

  const clientTypeOptions = [
    { value: 'privatperson', label: 'Privatperson' },
    { value: 'familie', label: 'Familie' },
    { value: 'selbstständiger', label: 'Selbstständiger' },
    { value: 'freiberufler', label: 'Freiberufler' },
    { value: 'kleinunternehmen', label: 'Kleinunternehmen' },
    { value: 'mittelstand', label: 'Mittelständisches Unternehmen' },
    { value: 'konzern', label: 'Großunternehmen' },
  ];

  const insuranceTypesOptions = [
    { value: 'krankenversicherung', label: 'Krankenversicherung' },
    { value: 'lebensversicherung', label: 'Lebensversicherung' },
    { value: 'berufsunfähigkeit', label: 'Berufsunfähigkeitsversicherung' },
    { value: 'haftpflicht', label: 'Haftpflichtversicherung' },
    { value: 'hausrat', label: 'Hausratversicherung' },
    { value: 'wohngebäude', label: 'Wohngebäudeversicherung' },
    { value: 'kfz', label: 'KFZ-Versicherung' },
    { value: 'rechtsschutz', label: 'Rechtsschutzversicherung' },
    { value: 'unfallversicherung', label: 'Unfallversicherung' },
    { value: 'riester', label: 'Riester-Rente' },
    { value: 'rürup', label: 'Rürup-Rente' },
    { value: 'betriebshaftpflicht', label: 'Betriebshaftpflichtversicherung' },
  ];

  const urgencyOptions = [
    { value: 'sofort', label: 'Sofort' },
    { value: 'diese_woche', label: 'Diese Woche' },
    { value: 'nächste_woche', label: 'Nächste Woche' },
    { value: 'diesen_monat', label: 'Diesen Monat' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const handleInputChange = (field: keyof VersicherungsberatungData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(formData.serviceType && formData.clientType && formData.urgency);
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const isFormValid = () => {
    return !!(formData.serviceType && formData.clientType && formData.urgency);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Versicherungsberatung Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Dienstleistung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Welcher Service wird benötigt?"
            />
          </FormField>

          <FormField label="Kundentyp" required>
            <FormSelect
              value={formData.clientType || ''}
              onChange={value => handleInputChange('clientType', value)}
              options={clientTypeOptions}
              placeholder="Für wen ist die Beratung?"
            />
          </FormField>

          <FormField label="Zeitrahmen" required>
            <FormSelect
              value={formData.urgency || ''}
              onChange={value => handleInputChange('urgency', value)}
              options={urgencyOptions}
              placeholder="Wann wird die Beratung benötigt?"
            />
          </FormField>

          <FormField label="Alter des Hauptversicherten">
            <FormInput
              type="number"
              value={formData.age || ''}
              onChange={value => handleInputChange('age', Number(value))}
              placeholder="z.B. 35"
            />
          </FormField>

          <FormField label="Familienstand">
            <FormSelect
              value={formData.familyStatus || ''}
              onChange={value => handleInputChange('familyStatus', value)}
              options={[
                { value: 'ledig', label: 'Ledig' },
                { value: 'verheiratet', label: 'Verheiratet' },
                { value: 'geschieden', label: 'Geschieden' },
                { value: 'verwitwet', label: 'Verwitwet' },
                { value: 'lebenspartnerschaft', label: 'Eingetragene Lebenspartnerschaft' },
              ]}
              placeholder="Familienstand"
            />
          </FormField>

          <FormField label="Anzahl Kinder">
            <FormInput
              type="number"
              value={formData.numberOfChildren || ''}
              onChange={value => handleInputChange('numberOfChildren', Number(value))}
              placeholder="0"
            />
          </FormField>

          <FormField label="Monatliches Bruttoeinkommen">
            <FormInput
              type="text"
              value={formData.monthlyIncome || ''}
              onChange={value => handleInputChange('monthlyIncome', value)}
              placeholder="z.B. 3.500 EUR"
            />
          </FormField>

          <FormField label="Beruf">
            <FormInput
              type="text"
              value={formData.profession || ''}
              onChange={value => handleInputChange('profession', value)}
              placeholder="z.B. Software-Entwickler"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Interessante Versicherungsarten">
            <FormCheckboxGroup
              value={formData.insuranceTypes || []}
              onChange={value => handleInputChange('insuranceTypes', value)}
              options={insuranceTypesOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Besondere Anforderungen oder Wünsche..."
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Aktuelle Situation">
            <FormTextarea
              value={formData.currentSituation || ''}
              onChange={value => handleInputChange('currentSituation', value)}
              placeholder="Beschreiben Sie Ihre aktuelle Versicherungssituation..."
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Beratungsziele">
            <FormTextarea
              value={formData.consultingGoals || ''}
              onChange={value => handleInputChange('consultingGoals', value)}
              placeholder="Was möchten Sie durch die Beratung erreichen?"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Budget für Versicherungen monatlich">
            <FormInput
              type="text"
              value={formData.monthlyBudget || ''}
              onChange={value => handleInputChange('monthlyBudget', value)}
              placeholder="z.B. 200-400 EUR"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Art der Beratung">
            <FormRadioGroup
              name="consultingType"
              value={formData.consultingType || ''}
              onChange={value => handleInputChange('consultingType', value)}
              options={[
                { value: 'vor_ort', label: 'Vor Ort beim Kunden' },
                { value: 'büro', label: 'Im Büro des Beraters' },
                { value: 'telefon', label: 'Telefonberatung' },
                { value: 'video', label: 'Videoberatung' },
                { value: 'online', label: 'Online/E-Mail' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Vorerfahrung mit Versicherungen">
            <FormRadioGroup
              name="experience"
              value={formData.experience || ''}
              onChange={value => handleInputChange('experience', value)}
              options={[
                { value: 'keine', label: 'Keine Erfahrung' },
                { value: 'wenig', label: 'Wenig Erfahrung' },
                { value: 'gut', label: 'Gute Kenntnisse' },
                { value: 'experte', label: 'Sehr erfahren' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Präferierte Versicherungsgesellschaften">
            <FormTextarea
              value={formData.preferredCompanies || ''}
              onChange={value => handleInputChange('preferredCompanies', value)}
              placeholder="Gibt es Versicherungsgesellschaften, die Sie bevorzugen oder meiden?"
              rows={2}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Lebensumstände">
            <FormTextarea
              value={formData.specialCircumstances || ''}
              onChange={value => handleInputChange('specialCircumstances', value)}
              placeholder="Besondere Umstände, die bei der Beratung berücksichtigt werden sollten..."
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Projektbeschreibung">
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie Ihr Versicherungsberatungs-Anliegen..."
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Risikoneigung">
            <FormRadioGroup
              name="riskTolerance"
              value={formData.riskTolerance || ''}
              onChange={value => handleInputChange('riskTolerance', value)}
              options={[
                { value: 'konservativ', label: 'Konservativ (Sicherheit ist wichtig)' },
                { value: 'ausgewogen', label: 'Ausgewogen' },
                { value: 'risikofreudig', label: 'Risikofreudig (höhere Rendite)' },
              ]}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton
        isValid={isFormValid()}
        subcategory="Versicherungsberatung"
        formData={formData}
      />
    </div>
  );
};

export default VersicherungsberatungForm;
