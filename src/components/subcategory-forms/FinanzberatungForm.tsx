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
} from './FormComponents';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();

  // Lokale FormSubmitButton Komponente
  const FormSubmitButton = ({
    isValid,
    subcategory,
  }: {
    isValid: boolean;
    subcategory: string;
  }) => {
    const handleNextClick = () => {
      if (!isValid) {
        return;
      }

      const encodedSubcategory = encodeURIComponent(subcategory);
      router.push(`/auftrag/get-started/${encodedSubcategory}/adresse`);
    };

    return (
      <div className="space-y-6 mt-8">
        {!isValid && (
          <div className="text-center">
            <div className="inline-flex items-center py-3 px-5 bg-gradient-to-r from-teal-50 to-cyan-50 border border-[#14ad9f]/20 rounded-xl shadow-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-3 text-[#14ad9f]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-gray-700 font-medium">
                Bitte füllen Sie alle Pflichtfelder aus, um fortzufahren.
              </span>
            </div>
          </div>
        )}
        {isValid && (
          <div className="text-center">
            <button
              className="bg-[#14ad9f] hover:bg-teal-700 text-white font-medium py-3 px-6 rounded-lg shadow transition-colors duration-200"
              onClick={handleNextClick}
            >
              Weiter zur Adresseingabe
            </button>
          </div>
        )}
      </div>
    );
  };

  const serviceTypeOptions = [
    { value: 'investment_advisory', label: 'Anlageberatung' },
    { value: 'financial_planning', label: 'Finanzplanung' },
    { value: 'retirement_planning', label: 'Altersvorsorge' },
    { value: 'insurance_consulting', label: 'Versicherungsberatung' },
    { value: 'loan_consulting', label: 'Kreditberatung' },
    { value: 'tax_optimization', label: 'Steueroptimierung' },
    { value: 'estate_planning', label: 'Vermögensnachfolge' },
    { value: 'business_financing', label: 'Unternehmensfinanzierung' },
    { value: 'real_estate_financing', label: 'Immobilienfinanzierung' },
    { value: 'risk_management', label: 'Risikomanagement' },
  ];

  const clientTypeOptions = [
    { value: 'privatperson', label: 'Privatperson' },
    { value: 'familie', label: 'Familie' },
    { value: 'rentner', label: 'Rentner' },
    { value: 'berufseinsteiger', label: 'Berufseinsteiger' },
    { value: 'selbstständig', label: 'Selbstständig' },
    { value: 'freiberufler', label: 'Freiberufler' },
    { value: 'unternehmen', label: 'Unternehmen' },
    { value: 'startup', label: 'Startup' },
  ];

  const incomeRangeOptions = [
    { value: 'unter_30000', label: 'Unter 30.000€' },
    { value: '30000_50000', label: '30.000€ - 50.000€' },
    { value: '50000_80000', label: '50.000€ - 80.000€' },
    { value: '80000_120000', label: '80.000€ - 120.000€' },
    { value: '120000_200000', label: '120.000€ - 200.000€' },
    { value: 'über_200000', label: 'Über 200.000€' },
  ];

  const assetRangeOptions = [
    { value: 'unter_10000', label: 'Unter 10.000€' },
    { value: '10000_50000', label: '10.000€ - 50.000€' },
    { value: '50000_100000', label: '50.000€ - 100.000€' },
    { value: '100000_500000', label: '100.000€ - 500.000€' },
    { value: '500000_1000000', label: '500.000€ - 1.000.000€' },
    { value: 'über_1000000', label: 'Über 1.000.000€' },
  ];

  const investmentGoalOptions = [
    { value: 'capital_growth', label: 'Kapitalwachstum' },
    { value: 'regular_income', label: 'Regelmäßiges Einkommen' },
    { value: 'capital_preservation', label: 'Kapitalerhalt' },
    { value: 'retirement_provision', label: 'Altersvorsorge' },
    { value: 'tax_savings', label: 'Steuerersparnis' },
    { value: 'real_estate_purchase', label: 'Immobilienkauf' },
    { value: 'education_funding', label: 'Bildungsfinanzierung' },
    { value: 'emergency_fund', label: 'Notgroschen' },
  ];

  const riskToleranceOptions = [
    { value: 'sehr_konservativ', label: 'Sehr konservativ' },
    { value: 'konservativ', label: 'Konservativ' },
    { value: 'ausgewogen', label: 'Ausgewogen' },
    { value: 'wachstumsorientiert', label: 'Wachstumsorientiert' },
    { value: 'sehr_risikoreich', label: 'Sehr risikoreich' },
  ];

  const timeHorizonOptions = [
    { value: 'kurzfristig', label: 'Kurzfristig (< 2 Jahre)' },
    { value: 'mittelfristig', label: 'Mittelfristig (2-5 Jahre)' },
    { value: 'langfristig', label: 'Langfristig (5-10 Jahre)' },
    { value: 'sehr_langfristig', label: 'Sehr langfristig (> 10 Jahre)' },
  ];
  const investmentExperienceOptions = [
    { value: 'keine', label: 'Keine Erfahrung' },
    { value: 'wenig', label: 'Wenig Erfahrung' },
    { value: 'mittel', label: 'Mittlere Erfahrung' },
    { value: 'viel', label: 'Viel Erfahrung' },
    { value: 'profi', label: 'Professionell' },
  ];

  const investmentProductOptions = [
    { value: 'aktien', label: 'Aktien' },
    { value: 'anleihen', label: 'Anleihen' },
    { value: 'fonds', label: 'Investmentfonds' },
    { value: 'etf', label: 'ETFs' },
    { value: 'immobilien', label: 'Immobilien' },
    { value: 'rohstoffe', label: 'Rohstoffe' },
    { value: 'kryptowährungen', label: 'Kryptowährungen' },
    { value: 'derivate', label: 'Derivate' },
    { value: 'festgeld', label: 'Festgeld' },
    { value: 'tagesgeld', label: 'Tagesgeld' },
    { value: 'versicherungen', label: 'Versicherungen' },
    { value: 'edelmetalle', label: 'Edelmetalle' },
  ];

  const additionalServicesOptions = [
    { value: 'portfolio_analysis', label: 'Portfolio-Analyse' },
    { value: 'tax_planning', label: 'Steuerplanung' },
    { value: 'insurance_check', label: 'Versicherungscheck' },
    { value: 'loan_optimization', label: 'Kredit-Optimierung' },
    { value: 'estate_planning', label: 'Nachlassplanung' },
    { value: 'business_succession', label: 'Unternehmensnachfolge' },
    { value: 'cash_flow_analysis', label: 'Cashflow-Analyse' },
    { value: 'budgeting', label: 'Budgetplanung' },
    { value: 'debt_management', label: 'Schuldenmanagement' },
    { value: 'financial_education', label: 'Finanzbildung' },
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
      formData.incomeRange &&
      formData.assetRange &&
      formData.riskTolerance &&
      formData.timeHorizon &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.clientType &&
      formData.incomeRange &&
      formData.assetRange &&
      formData.riskTolerance &&
      formData.timeHorizon &&
      formData.projectDescription
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Finanzberatungs-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Dienstleistung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art der Finanzberatung"
            />
          </FormField>

          <FormField label="Kundentyp" required>
            <FormSelect
              value={formData.clientType || ''}
              onChange={value => handleInputChange('clientType', value)}
              options={clientTypeOptions}
              placeholder="Wählen Sie den Kundentyp"
            />
          </FormField>

          <FormField label="Einkommensbereich" required>
            <FormSelect
              value={formData.incomeRange || ''}
              onChange={value => handleInputChange('incomeRange', value)}
              options={incomeRangeOptions}
              placeholder="Wählen Sie den Einkommensbereich"
            />
          </FormField>

          <FormField label="Vermögensbereich" required>
            <FormSelect
              value={formData.assetRange || ''}
              onChange={value => handleInputChange('assetRange', value)}
              options={assetRangeOptions}
              placeholder="Wählen Sie den Vermögensbereich"
            />
          </FormField>

          <FormField label="Risikobereitschaft" required>
            <FormSelect
              value={formData.riskTolerance || ''}
              onChange={value => handleInputChange('riskTolerance', value)}
              options={riskToleranceOptions}
              placeholder="Wählen Sie die Risikobereitschaft"
            />
          </FormField>

          <FormField label="Anlagehorizont" required>
            <FormSelect
              value={formData.timeHorizon || ''}
              onChange={value => handleInputChange('timeHorizon', value)}
              options={timeHorizonOptions}
              placeholder="Wählen Sie den Anlagehorizont"
            />
          </FormField>
          <FormField label="Anlageerfahrung">
            <FormSelect
              value={formData.investmentExperience || ''}
              onChange={value => handleInputChange('investmentExperience', value)}
              options={investmentExperienceOptions}
              placeholder="Wählen Sie die Anlageerfahrung"
            />
          </FormField>

          <FormField label="Name/Unternehmen">
            <FormInput
              type="text"
              value={formData.clientName || ''}
              onChange={value => handleInputChange('clientName', value)}
              placeholder="Ihr Name oder Unternehmen"
            />
          </FormField>

          <FormField label="Alter">
            <FormInput
              type="number"
              value={formData.age?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'age',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Ihr Alter"
            />
          </FormField>

          <FormField label="Monatliches Einkommen">
            <FormInput
              type="number"
              value={formData.monthlyIncome?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'monthlyIncome',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Monatliches Nettoeinkommen in €"
            />
          </FormField>

          <FormField label="Monatliche Ausgaben">
            <FormInput
              type="number"
              value={formData.monthlyExpenses?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'monthlyExpenses',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Monatliche Ausgaben in €"
            />
          </FormField>

          <FormField label="Verfügbares Kapital">
            <FormInput
              type="number"
              value={formData.availableCapital?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'availableCapital',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Verfügbares Kapital in €"
            />
          </FormField>

          <FormField label="Monatliche Sparrate">
            <FormInput
              type="number"
              value={formData.monthlySavings?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'monthlySavings',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Monatliche Sparrate in €"
            />
          </FormField>

          <FormField label="Gewünschte Rendite">
            <FormInput
              type="number"
              value={formData.desiredReturn?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'desiredReturn',
                  typeof value === 'string' ? (value ? parseFloat(value) : undefined) : value
                )
              }
              placeholder="Gewünschte Rendite in %"
            />
          </FormField>

          <FormField label="Beratungstermin">
            <FormInput
              type="text"
              value={formData.consultationDate || ''}
              onChange={value => handleInputChange('consultationDate', value)}
              placeholder="Gewünschter Beratungstermin"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Anlageziele">
            <FormCheckboxGroup
              value={formData.investmentGoals || []}
              onChange={value => handleInputChange('investmentGoals', value)}
              options={investmentGoalOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Interessante Anlageprodukte">
            <FormCheckboxGroup
              value={formData.investmentProducts || []}
              onChange={value => handleInputChange('investmentProducts', value)}
              options={investmentProductOptions}
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
          <FormField label="Projektbeschreibung" required>
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie Ihr Finanzberatungsanliegen detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Finanzielle Situation">
            <FormTextarea
              value={formData.financialSituation || ''}
              onChange={value => handleInputChange('financialSituation', value)}
              placeholder="Beschreiben Sie Ihre aktuelle finanzielle Situation"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Finanzielle Ziele">
            <FormTextarea
              value={formData.financialGoals || ''}
              onChange={value => handleInputChange('financialGoals', value)}
              placeholder="Was sind Ihre finanziellen Ziele?"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Bestehende Anlagen">
            <FormTextarea
              value={formData.existingInvestments || ''}
              onChange={value => handleInputChange('existingInvestments', value)}
              placeholder="Welche Anlagen haben Sie bereits?"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Wünsche">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Besondere Wünsche oder Anforderungen"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Lebenssituation">
            <FormTextarea
              value={formData.lifeSituation || ''}
              onChange={value => handleInputChange('lifeSituation', value)}
              placeholder="Beschreiben Sie Ihre Lebenssituation (Familie, Beruf, etc.)"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Familienstand">
            <FormRadioGroup
              name="maritalStatus"
              value={formData.maritalStatus || ''}
              onChange={value => handleInputChange('maritalStatus', value)}
              options={[
                { value: 'ledig', label: 'Ledig' },
                { value: 'verheiratet', label: 'Verheiratet' },
                { value: 'geschieden', label: 'Geschieden' },
                { value: 'verwitwet', label: 'Verwitwet' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Kinder">
            <FormRadioGroup
              name="hasChildren"
              value={formData.hasChildren || ''}
              onChange={value => handleInputChange('hasChildren', value)}
              options={[
                { value: 'ja', label: 'Ja' },
                { value: 'nein', label: 'Nein' },
                { value: 'geplant', label: 'Geplant' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Immobilieneigentum">
            <FormRadioGroup
              name="realEstateOwnership"
              value={formData.realEstateOwnership || ''}
              onChange={value => handleInputChange('realEstateOwnership', value)}
              options={[
                { value: 'ja', label: 'Ja, ich besitze Immobilien' },
                { value: 'nein', label: 'Nein, ich besitze keine Immobilien' },
                { value: 'geplant', label: 'Immobilienkauf geplant' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Nachhaltige Investments">
            <FormRadioGroup
              name="sustainableInvestments"
              value={formData.sustainableInvestments || ''}
              onChange={value => handleInputChange('sustainableInvestments', value)}
              options={[
                { value: 'ja', label: 'Ja, nur nachhaltige Investments' },
                { value: 'teilweise', label: 'Teilweise interessiert' },
                { value: 'nein', label: 'Nein, nicht wichtig' },
              ]}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Finanzberatung" />
    </div>
  );
};

export default FinanzberatungForm;
