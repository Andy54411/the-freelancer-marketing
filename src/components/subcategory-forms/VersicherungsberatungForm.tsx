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
} from './FormComponents';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
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
    { value: 'insurance_analysis', label: 'Versicherungsanalyse' },
    { value: 'insurance_optimization', label: 'Versicherungsoptimierung' },
    { value: 'new_insurance', label: 'Neue Versicherung' },
    { value: 'claims_assistance', label: 'Schadensfallhilfe' },
    { value: 'insurance_comparison', label: 'Versicherungsvergleich' },
    { value: 'risk_assessment', label: 'Risikoanalyse' },
    { value: 'corporate_insurance', label: 'Unternehmensversicherung' },
    { value: 'insurance_consulting', label: 'Versicherungsberatung' },
  ];

  const clientTypeOptions = [
    { value: 'privatperson', label: 'Privatperson' },
    { value: 'familie', label: 'Familie' },
    { value: 'einzelunternehmer', label: 'Einzelunternehmer' },
    { value: 'freiberufler', label: 'Freiberufler' },
    { value: 'kleine_unternehmen', label: 'Kleines Unternehmen' },
    { value: 'mittelstand', label: 'Mittelstand' },
    { value: 'grossunternehmen', label: 'Großunternehmen' },
    { value: 'verein', label: 'Verein' },
  ];

  const insuranceTypeOptions = [
    { value: 'krankenversicherung', label: 'Krankenversicherung' },
    { value: 'lebensversicherung', label: 'Lebensversicherung' },
    { value: 'berufsunfähigkeitsversicherung', label: 'Berufsunfähigkeitsversicherung' },
    { value: 'haftpflichtversicherung', label: 'Haftpflichtversicherung' },
    { value: 'hausratversicherung', label: 'Hausratversicherung' },
    { value: 'wohngebäudeversicherung', label: 'Wohngebäudeversicherung' },
    { value: 'kfz_versicherung', label: 'KFZ-Versicherung' },
    { value: 'rechtsschutzversicherung', label: 'Rechtsschutzversicherung' },
    { value: 'unfallversicherung', label: 'Unfallversicherung' },
    { value: 'pflegeversicherung', label: 'Pflegeversicherung' },
    { value: 'tierhalterhaftpflicht', label: 'Tierhalterhaftpflicht' },
    { value: 'reiseversicherung', label: 'Reiseversicherung' },
    { value: 'betriebshaftpflicht', label: 'Betriebshaftpflicht' },
    { value: 'vermögensschadenhaftpflicht', label: 'Vermögensschadenhaftpflicht' },
    { value: 'cyberversicherung', label: 'Cyberversicherung' },
    { value: 'produkthaftpflicht', label: 'Produkthaftpflicht' },
    { value: 'geschäftsinhalt', label: 'Geschäftsinhaltsversicherung' },
    { value: 'betriebsunterbrechung', label: 'Betriebsunterbrechungsversicherung' },
  ];

  const currentProviderOptions = [
    { value: 'allianz', label: 'Allianz' },
    { value: 'axa', label: 'AXA' },
    { value: 'generali', label: 'Generali' },
    { value: 'huk_coburg', label: 'HUK-COBURG' },
    { value: 'ergo', label: 'ERGO' },
    { value: 'signal_iduna', label: 'Signal Iduna' },
    { value: 'zurich', label: 'Zurich' },
    { value: 'debeka', label: 'Debeka' },
    { value: 'württembergische', label: 'Württembergische' },
    { value: 'cosmos', label: 'Cosmos' },
    { value: 'andere', label: 'Andere' },
    { value: 'keine', label: 'Keine bestehenden Versicherungen' },
  ];

  const communicationOptions = [
    { value: 'email', label: 'E-Mail' },
    { value: 'telefon', label: 'Telefon' },
    { value: 'persoenlich', label: 'Persönlich' },
    { value: 'videokonferenz', label: 'Videokonferenz' },
    { value: 'post', label: 'Post' },
  ];

  const additionalServicesOptions = [
    { value: 'portfolio_analysis', label: 'Portfolio-Analyse' },
    { value: 'annual_review', label: 'Jährliche Überprüfung' },
    { value: 'claims_management', label: 'Schadenmanagement' },
    { value: 'contract_analysis', label: 'Vertragsanalyse' },
    { value: 'cost_optimization', label: 'Kostenoptimierung' },
    { value: 'coverage_optimization', label: 'Deckungsoptimierung' },
    { value: 'risk_consulting', label: 'Risikoberatung' },
    { value: 'documentation', label: 'Dokumentation' },
    { value: 'training', label: 'Schulungen' },
    { value: 'compliance_check', label: 'Compliance-Check' },
  ];

  const handleInputChange = (field: keyof VersicherungsberatungData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(formData.serviceType && formData.clientType && formData.projectDescription);
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(formData.serviceType && formData.clientType && formData.projectDescription);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Versicherungsberatungs-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Dienstleistung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art der Versicherungsberatung"
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

          <FormField label="Beruf">
            <FormInput
              type="text"
              value={formData.profession || ''}
              onChange={value => handleInputChange('profession', value)}
              placeholder="Ihr Beruf"
            />
          </FormField>

          <FormField label="Jahreseinkommen">
            <FormInput
              type="number"
              value={formData.annualIncome?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'annualIncome',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Jahreseinkommen in €"
            />
          </FormField>

          <FormField label="Anzahl Kinder">
            <FormInput
              type="number"
              value={formData.numberOfChildren?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'numberOfChildren',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl der Kinder"
            />
          </FormField>

          <FormField label="Wohnort">
            <FormInput
              type="text"
              value={formData.residence || ''}
              onChange={value => handleInputChange('residence', value)}
              placeholder="Ihr Wohnort"
            />
          </FormField>

          <FormField label="Immobilienwert">
            <FormInput
              type="number"
              value={formData.propertyValue?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'propertyValue',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Immobilienwert in €"
            />
          </FormField>

          <FormField label="Haustiere">
            <FormInput
              type="text"
              value={formData.pets || ''}
              onChange={value => handleInputChange('pets', value)}
              placeholder="Art und Anzahl der Haustiere"
            />
          </FormField>

          <FormField label="Fahrzeuge">
            <FormInput
              type="text"
              value={formData.vehicles || ''}
              onChange={value => handleInputChange('vehicles', value)}
              placeholder="Anzahl und Art der Fahrzeuge"
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

          <FormField label="Bestehende Policen">
            <FormInput
              type="number"
              value={formData.existingPolicies?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'existingPolicies',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl bestehender Policen"
            />
          </FormField>

          <FormField label="Monatliche Beiträge">
            <FormInput
              type="number"
              value={formData.monthlyPremiums?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'monthlyPremiums',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Aktuelle monatliche Beiträge in €"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Versicherungsarten">
            <FormCheckboxGroup
              value={formData.insuranceTypes || []}
              onChange={value => handleInputChange('insuranceTypes', value)}
              options={insuranceTypeOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Aktuelle Versicherer">
            <FormCheckboxGroup
              value={formData.currentProviders || []}
              onChange={value => handleInputChange('currentProviders', value)}
              options={currentProviderOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Kommunikationsart">
            <FormCheckboxGroup
              value={formData.communicationPreference || []}
              onChange={value => handleInputChange('communicationPreference', value)}
              options={communicationOptions}
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
              placeholder="Beschreiben Sie Ihr Versicherungsberatungsanliegen detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Aktuelle Situation">
            <FormTextarea
              value={formData.currentSituation || ''}
              onChange={value => handleInputChange('currentSituation', value)}
              placeholder="Beschreiben Sie Ihre aktuelle Versicherungssituation"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Risiken">
            <FormTextarea
              value={formData.specialRisks || ''}
              onChange={value => handleInputChange('specialRisks', value)}
              placeholder="Beschreiben Sie besondere Risiken oder Umstände"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Schadensfälle">
            <FormTextarea
              value={formData.previousClaims || ''}
              onChange={value => handleInputChange('previousClaims', value)}
              placeholder="Beschreiben Sie frühere Schadensfälle"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Spezielle Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Besondere Anforderungen oder Wünsche"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Gesundheitszustand">
            <FormTextarea
              value={formData.healthStatus || ''}
              onChange={value => handleInputChange('healthStatus', value)}
              placeholder="Relevante Gesundheitsinformationen"
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
          <FormField label="Selbstständig">
            <FormRadioGroup
              name="selfEmployed"
              value={formData.selfEmployed || ''}
              onChange={value => handleInputChange('selfEmployed', value)}
              options={[
                { value: 'ja', label: 'Ja' },
                { value: 'nein', label: 'Nein' },
                { value: 'teilweise', label: 'Teilweise' },
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
                { value: 'niedrig', label: 'Niedrig' },
                { value: 'mittel', label: 'Mittel' },
                { value: 'hoch', label: 'Hoch' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Erfahrung mit Versicherungen">
            <FormRadioGroup
              name="experienceLevel"
              value={formData.experienceLevel || ''}
              onChange={value => handleInputChange('experienceLevel', value)}
              options={[
                { value: 'keine', label: 'Keine Erfahrung' },
                { value: 'wenig', label: 'Wenig Erfahrung' },
                { value: 'mittel', label: 'Mittlere Erfahrung' },
                { value: 'viel', label: 'Viel Erfahrung' },
              ]}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Versicherungsberatung" />
    </div>
  );
}

export default VersicherungsberatungForm;
