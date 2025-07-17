import React, { useState, useEffect } from 'react';
import { RechtsberatungData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface RechtsberatungFormProps {
  data: RechtsberatungData;
  onDataChange: (data: RechtsberatungData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const RechtsberatungForm: React.FC<RechtsberatungFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<RechtsberatungData>(data);

  const serviceTypeOptions = [
    { value: 'contract_review', label: 'Vertragsüberprüfung' },
    { value: 'contract_drafting', label: 'Vertragserstellung' },
    { value: 'legal_advice', label: 'Rechtsberatung' },
    { value: 'dispute_resolution', label: 'Streitbeilegung' },
    { value: 'litigation', label: 'Gerichtsverfahren' },
    { value: 'compliance', label: 'Compliance-Beratung' },
    { value: 'corporate_law', label: 'Gesellschaftsrecht' },
    { value: 'intellectual_property', label: 'Gewerblicher Rechtsschutz' },
    { value: 'labor_law', label: 'Arbeitsrecht' },
    { value: 'real_estate_law', label: 'Immobilienrecht' },
  ];

  const legalAreaOptions = [
    { value: 'civil_law', label: 'Zivilrecht' },
    { value: 'commercial_law', label: 'Handelsrecht' },
    { value: 'corporate_law', label: 'Gesellschaftsrecht' },
    { value: 'labor_law', label: 'Arbeitsrecht' },
    { value: 'intellectual_property', label: 'Gewerblicher Rechtsschutz' },
    { value: 'real_estate_law', label: 'Immobilienrecht' },
    { value: 'family_law', label: 'Familienrecht' },
    { value: 'criminal_law', label: 'Strafrecht' },
    { value: 'administrative_law', label: 'Verwaltungsrecht' },
    { value: 'tax_law', label: 'Steuerrecht' },
    { value: 'data_protection', label: 'Datenschutzrecht' },
    { value: 'bankruptcy_law', label: 'Insolvenzrecht' },
  ];

  const clientTypeOptions = [
    { value: 'privatperson', label: 'Privatperson' },
    { value: 'einzelunternehmen', label: 'Einzelunternehmen' },
    { value: 'kleine_unternehmen', label: 'Kleines Unternehmen' },
    { value: 'mittelstand', label: 'Mittelstand' },
    { value: 'grossunternehmen', label: 'Großunternehmen' },
    { value: 'startup', label: 'Startup' },
    { value: 'verein', label: 'Verein' },
    { value: 'stiftung', label: 'Stiftung' },
  ];

  const complexityOptions = [
    { value: 'einfach', label: 'Einfach' },
    { value: 'mittel', label: 'Mittel' },
    { value: 'komplex', label: 'Komplex' },
    { value: 'sehr_komplex', label: 'Sehr komplex' },
  ];
  const caseStageOptions = [
    { value: 'praevention', label: 'Prävention' },
    { value: 'beratung', label: 'Beratung' },
    { value: 'verhandlung', label: 'Verhandlung' },
    { value: 'gerichtlich', label: 'Gerichtlich' },
    { value: 'vollstreckung', label: 'Vollstreckung' },
  ];

  const communicationOptions = [
    { value: 'email', label: 'E-Mail' },
    { value: 'telefon', label: 'Telefon' },
    { value: 'persoenlich', label: 'Persönlich' },
    { value: 'videokonferenz', label: 'Videokonferenz' },
    { value: 'post', label: 'Post' },
  ];

  const additionalServicesOptions = [
    { value: 'document_review', label: 'Dokumentenprüfung' },
    { value: 'negotiation', label: 'Verhandlungsführung' },
    { value: 'mediation', label: 'Mediation' },
    { value: 'arbitration', label: 'Schiedsverfahren' },
    { value: 'notarization', label: 'Beurkundung' },
    { value: 'translation', label: 'Übersetzung' },
    { value: 'research', label: 'Rechtliche Recherche' },
    { value: 'training', label: 'Schulungen' },
    { value: 'compliance_monitoring', label: 'Compliance-Überwachung' },
    { value: 'risk_assessment', label: 'Risikobewertung' },
  ];

  const handleInputChange = (field: keyof RechtsberatungData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.legalArea &&
      formData.clientType &&
      formData.complexity &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Rechtsberatungs-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Dienstleistung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art der Rechtsberatung"
            />
          </FormField>

          <FormField label="Rechtsgebiet" required>
            <FormCheckboxGroup
              value={formData.legalArea || []}
              onChange={value => handleInputChange('legalArea', value)}
              options={legalAreaOptions}
            />
          </FormField>

          <FormField label="Mandantentyp" required>
            <FormSelect
              value={formData.clientType || ''}
              onChange={value => handleInputChange('clientType', value)}
              options={clientTypeOptions}
              placeholder="Wählen Sie den Mandantentyp"
            />
          </FormField>

          <FormField label="Komplexität" required>
            <FormSelect
              value={formData.complexity || ''}
              onChange={value => handleInputChange('complexity', value)}
              options={complexityOptions}
              placeholder="Wählen Sie die Komplexität"
            />
          </FormField>
          <FormField label="Fallstadium">
            <FormSelect
              value={formData.caseStage || ''}
              onChange={value => handleInputChange('caseStage', value)}
              options={caseStageOptions}
              placeholder="Wählen Sie das Fallstadium"
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

          <FormField label="Streitwert">
            <FormInput
              type="number"
              value={formData.disputeValue?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'disputeValue',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Streitwert in €"
            />
          </FormField>

          <FormField label="Frist">
            <FormInput
              type="text"
              value={formData.deadline || ''}
              onChange={value => handleInputChange('deadline', value)}
              placeholder="TT.MM.JJJJ"
            />
          </FormField>

          <FormField label="Gegenseite">
            <FormInput
              type="text"
              value={formData.opposingParty || ''}
              onChange={value => handleInputChange('opposingParty', value)}
              placeholder="Name der Gegenseite"
            />
          </FormField>

          <FormField label="Aktenzeichen">
            <FormInput
              type="text"
              value={formData.caseNumber || ''}
              onChange={value => handleInputChange('caseNumber', value)}
              placeholder="Aktenzeichen (falls vorhanden)"
            />
          </FormField>

          <FormField label="Gericht">
            <FormInput
              type="text"
              value={formData.court || ''}
              onChange={value => handleInputChange('court', value)}
              placeholder="Zuständiges Gericht"
            />
          </FormField>

          <FormField label="Vorheriger Anwalt">
            <FormInput
              type="text"
              value={formData.previousLawyer || ''}
              onChange={value => handleInputChange('previousLawyer', value)}
              placeholder="Vorheriger Anwalt (falls vorhanden)"
            />
          </FormField>

          <FormField label="Versicherung">
            <FormInput
              type="text"
              value={formData.insurance || ''}
              onChange={value => handleInputChange('insurance', value)}
              placeholder="Rechtsschutzversicherung"
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
              placeholder="Beschreiben Sie Ihr rechtliches Anliegen detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Sachverhalt">
            <FormTextarea
              value={formData.caseDetails || ''}
              onChange={value => handleInputChange('caseDetails', value)}
              placeholder="Beschreiben Sie den Sachverhalt detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Gewünschtes Ergebnis">
            <FormTextarea
              value={formData.desiredOutcome || ''}
              onChange={value => handleInputChange('desiredOutcome', value)}
              placeholder="Was möchten Sie erreichen?"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Dokumente vorhanden">
            <FormTextarea
              value={formData.availableDocuments || ''}
              onChange={value => handleInputChange('availableDocuments', value)}
              placeholder="Welche Dokumente/Unterlagen haben Sie bereits?"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Bisherige Maßnahmen">
            <FormTextarea
              value={formData.previousActions || ''}
              onChange={value => handleInputChange('previousActions', value)}
              placeholder="Was haben Sie bereits unternommen?"
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
          <FormField label="Zeitrahmen">
            <FormTextarea
              value={formData.timeframe || ''}
              onChange={value => handleInputChange('timeframe', value)}
              placeholder="Gewünschter Zeitrahmen für die Bearbeitung"
              rows={2}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Erfahrung mit Rechtsberatung">
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

        <div className="mt-4">
          <FormField label="Laufendes Verfahren">
            <FormRadioGroup
              name="ongoingProcedure"
              value={formData.ongoingProcedure || ''}
              onChange={value => handleInputChange('ongoingProcedure', value)}
              options={[
                { value: 'ja', label: 'Ja, laufendes Verfahren' },
                { value: 'nein', label: 'Nein, kein Verfahren' },
                { value: 'geplant', label: 'Verfahren geplant' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Vertretung vor Gericht">
            <FormRadioGroup
              name="courtRepresentation"
              value={formData.courtRepresentation || ''}
              onChange={value => handleInputChange('courtRepresentation', value)}
              options={[
                { value: 'ja', label: 'Ja, Vertretung vor Gericht gewünscht' },
                { value: 'nein', label: 'Nein, nur Beratung' },
                { value: 'bei_bedarf', label: 'Bei Bedarf' },
              ]}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default RechtsberatungForm;
