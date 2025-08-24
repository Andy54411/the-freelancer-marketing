'use client';
import React, { useState, useEffect } from 'react';
import { FinanzberatungData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';

interface FinanzberatungFormProps {
  data: FinanzberatungData;
  onDataChange: (data: FinanzberatungData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const FinanzberatungForm: React.FC<FinanzberatungFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<FinanzberatungData>(data);

  const serviceTypeOptions = [
    { value: 'vermögensberatung', label: 'Vermögensberatung' },
    { value: 'altersvorsorge', label: 'Altersvorsorge-Planung' },
    { value: 'versicherungsberatung', label: 'Versicherungsberatung' },
    { value: 'finanzplanung', label: 'Finanzplanung' },
    { value: 'steuerberatung', label: 'Steuerberatung' },
    { value: 'investment', label: 'Investment-Beratung' },
    { value: 'immobilienfinanzierung', label: 'Immobilienfinanzierung' },
    { value: 'kredit', label: 'Kredit-/Darlehens-Beratung' },
    { value: 'unternehmensgründung', label: 'Unternehmensgründung' },
    { value: 'nachfolgeplanung', label: 'Nachfolgeplanung' },
    { value: 'risikomanagement', label: 'Risikomanagement' },
    { value: 'portfolio_analyse', label: 'Portfolio-Analyse' },
  ];

  const clientTypeOptions = [
    { value: 'privatperson', label: 'Privatperson' },
    { value: 'familie', label: 'Familie' },
    { value: 'selbständig', label: 'Selbständiger' },
    { value: 'freiberufler', label: 'Freiberufler' },
    { value: 'unternehmen', label: 'Unternehmen' },
    { value: 'startup', label: 'Startup' },
    { value: 'verein', label: 'Verein/Organisation' },
  ];

  const incomeRangeOptions = [
    { value: 'bis_30k', label: 'Bis 30.000 EUR' },
    { value: '30k_50k', label: '30.000-50.000 EUR' },
    { value: '50k_75k', label: '50.000-75.000 EUR' },
    { value: '75k_100k', label: '75.000-100.000 EUR' },
    { value: '100k_150k', label: '100.000-150.000 EUR' },
    { value: 'über_150k', label: 'Über 150.000 EUR' },
    { value: 'variabel', label: 'Variabel/Unregelmäßig' },
  ];

  const assetRangeOptions = [
    { value: 'bis_10k', label: 'Bis 10.000 EUR' },
    { value: '10k_50k', label: '10.000-50.000 EUR' },
    { value: '50k_100k', label: '50.000-100.000 EUR' },
    { value: '100k_250k', label: '100.000-250.000 EUR' },
    { value: '250k_500k', label: '250.000-500.000 EUR' },
    { value: 'über_500k', label: 'Über 500.000 EUR' },
    { value: 'keine_angabe', label: 'Keine Angabe' },
  ];

  const urgencyOptions = [
    { value: 'sofort', label: 'Sofort' },
    { value: 'diese_woche', label: 'Diese Woche' },
    { value: 'nächste_woche', label: 'Nächste Woche' },
    { value: 'diesen_monat', label: 'Diesen Monat' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const consultationTypeOptions = [
    { value: 'persönlich', label: 'Persönliches Gespräch' },
    { value: 'online', label: 'Online-Beratung' },
    { value: 'telefon', label: 'Telefon-Beratung' },
    { value: 'hybrid', label: 'Flexibel/Hybrid' },
  ];

  const handleInputChange = (field: keyof FinanzberatungData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.clientType &&
      formData.urgency &&
      formData.consultationGoals
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.clientType &&
      formData.urgency &&
      formData.consultationGoals
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Finanzberatung Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Beratung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Welche Art der Finanzberatung wird benötigt?"
            />
          </FormField>

          <FormField label="Kundentyp" required>
            <FormSelect
              value={formData.clientType || ''}
              onChange={value => handleInputChange('clientType', value)}
              options={clientTypeOptions}
              placeholder="Wer benötigt die Beratung?"
            />
          </FormField>

          <FormField label="Jahreseinkommen (optional)">
            <FormSelect
              value={formData.incomeRange || ''}
              onChange={value => handleInputChange('incomeRange', value)}
              options={incomeRangeOptions}
              placeholder="Ungefähres Jahreseinkommen"
            />
          </FormField>

          <FormField label="Vorhandenes Vermögen (optional)">
            <FormSelect
              value={formData.assetRange || ''}
              onChange={value => handleInputChange('assetRange', value)}
              options={assetRangeOptions}
              placeholder="Ungefähre Vermögenssituation"
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

          <FormField label="Art der Beratung">
            <FormSelect
              value={formData.consultationType || ''}
              onChange={value => handleInputChange('consultationType', value)}
              options={consultationTypeOptions}
              placeholder="Wie soll die Beratung stattfinden?"
            />
          </FormField>

          <FormField label="Budget für Beratung">
            <FormInput
              type="text"
              value={formData.consultationBudget || ''}
              onChange={value => handleInputChange('consultationBudget', value)}
              placeholder="z.B. 200-500 EUR"
            />
          </FormField>

          <FormField label="Alter (für Altersvorsorge)">
            <FormInput
              type="number"
              value={formData.age || ''}
              onChange={value => handleInputChange('age', value)}
              placeholder="Alter in Jahren"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Beratungsziele" required>
            <FormTextarea
              value={formData.consultationGoals || ''}
              onChange={value => handleInputChange('consultationGoals', value)}
              placeholder="Was möchten Sie mit der Finanzberatung erreichen?"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Aktuelle Finanzsituation">
            <FormTextarea
              value={formData.currentSituation || ''}
              onChange={value => handleInputChange('currentSituation', value)}
              placeholder="Beschreiben Sie Ihre aktuelle finanzielle Situation..."
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Interessensgebiete">
            <FormCheckboxGroup
              value={formData.areasOfInterest || []}
              onChange={value => handleInputChange('areasOfInterest', value)}
              options={[
                { value: 'sparen', label: 'Sparen & Anlegen' },
                { value: 'aktien', label: 'Aktien & ETFs' },
                { value: 'immobilien', label: 'Immobilien-Investment' },
                { value: 'rente', label: 'Altersvorsorge' },
                { value: 'versicherungen', label: 'Versicherungen' },
                { value: 'steuern', label: 'Steueroptimierung' },
                { value: 'kredite', label: 'Kredite & Finanzierungen' },
                { value: 'unternehmen', label: 'Unternehmensfinanzen' },
                { value: 'erbschaft', label: 'Erbschaft & Nachfolge' },
                { value: 'ausland', label: 'Internationale Finanzen' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Risikobereitschaft">
            <FormRadioGroup
              name="riskTolerance"
              value={formData.riskTolerance || ''}
              onChange={value => handleInputChange('riskTolerance', value)}
              options={[
                { value: 'sehr_niedrig', label: 'Sehr niedrig (Sicherheit steht im Vordergrund)' },
                { value: 'niedrig', label: 'Niedrig (wenig Risiko)' },
                { value: 'mittel', label: 'Mittel (ausgewogenes Risiko)' },
                { value: 'hoch', label: 'Hoch (für höhere Renditen)' },
                { value: 'sehr_hoch', label: 'Sehr hoch (maximale Rendite)' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Anlagehorizont">
            <FormRadioGroup
              name="investmentHorizon"
              value={formData.investmentHorizon || ''}
              onChange={value => handleInputChange('investmentHorizon', value)}
              options={[
                { value: 'kurzfristig', label: 'Kurzfristig (unter 2 Jahre)' },
                { value: 'mittelfristig', label: 'Mittelfristig (2-10 Jahre)' },
                { value: 'langfristig', label: 'Langfristig (über 10 Jahre)' },
                { value: 'gemischt', label: 'Gemischte Ziele' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Erfahrung mit Finanzprodukten">
            <FormRadioGroup
              name="financialExperience"
              value={formData.financialExperience || ''}
              onChange={value => handleInputChange('financialExperience', value)}
              options={[
                { value: 'keine', label: 'Keine Erfahrung' },
                { value: 'wenig', label: 'Wenig Erfahrung' },
                { value: 'grundlagen', label: 'Grundkenntnisse' },
                { value: 'erfahren', label: 'Erfahren' },
                { value: 'experte', label: 'Experte' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Bereits vorhandene Finanzprodukte">
            <FormCheckboxGroup
              value={formData.existingProducts || []}
              onChange={value => handleInputChange('existingProducts', value)}
              options={[
                { value: 'girokonto', label: 'Girokonto' },
                { value: 'sparbuch', label: 'Sparbuch/Tagesgeld' },
                { value: 'festgeld', label: 'Festgeld' },
                { value: 'aktien', label: 'Aktien/ETFs' },
                { value: 'fonds', label: 'Investmentfonds' },
                { value: 'riester', label: 'Riester-Rente' },
                { value: 'rürup', label: 'Rürup-Rente' },
                { value: 'betriebsrente', label: 'Betriebliche Altersvorsorge' },
                { value: 'immobilien', label: 'Immobilien' },
                { value: 'versicherungen', label: 'Lebensversicherungen' },
                { value: 'bausparvertrag', label: 'Bausparvertrag' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Bevorzugte Qualifikationen des Beraters">
            <FormCheckboxGroup
              value={formData.advisorQualifications || []}
              onChange={value => handleInputChange('advisorQualifications', value)}
              options={[
                { value: 'zertifiziert', label: 'Zertifizierter Finanzberater' },
                { value: 'steuerberater', label: 'Steuerberater' },
                { value: 'bankausbildung', label: 'Bank-/Finanzausbildung' },
                { value: 'versicherungsmakler', label: 'Versicherungsmakler' },
                { value: 'immobilienerfahrung', label: 'Immobilien-Erfahrung' },
                { value: 'unabhängig', label: 'Unabhängige Beratung' },
              ]}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Finanzberatung" formData={formData} />
    </div>
  );
};

export default FinanzberatungForm;
