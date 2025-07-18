import React, { useState, useEffect } from 'react';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';

interface TelefonserviceData {
  subcategory: string;
  serviceType: string;
  callVolume: string;
  callType: string[];
  languages: string[];
  schedule: string;
  recording: boolean;
  crm: boolean;
  crmSystem: string;
  scripts: boolean;
  description?: string;
}

interface TelefonserviceFormProps {
  data: TelefonserviceData;
  onDataChange: (data: TelefonserviceData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const TelefonserviceForm: React.FC<TelefonserviceFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<TelefonserviceData>(data);

  const serviceTypeOptions = [
    { value: 'anrufannahme', label: 'Anrufannahme/Rezeption' },
    { value: 'ausgehende_anrufe', label: 'Ausgehende Anrufe' },
    { value: 'terminvereinbarung', label: 'Terminvereinbarung' },
    { value: 'kundendienst', label: 'Kundendienst/Support' },
    { value: 'bestellannahme', label: 'Bestellannahme' },
    { value: 'umfragen', label: 'Telefonische Umfragen' },
    { value: 'notdienst', label: 'Notdienst/24-Stunden-Service' },
    { value: 'andere', label: 'Andere' },
  ];

  const callVolumeOptions = [
    { value: 'gering', label: 'Gering (1-5 Anrufe pro Tag)' },
    { value: 'mittel', label: 'Mittel (6-20 Anrufe pro Tag)' },
    { value: 'hoch', label: 'Hoch (21-50 Anrufe pro Tag)' },
    { value: 'sehr_hoch', label: 'Sehr hoch (über 50 Anrufe pro Tag)' },
    { value: 'unbekannt', label: 'Unbekannt/Variabel' },
  ];

  const callTypeOptions = [
    { value: 'allgemeine_anfragen', label: 'Allgemeine Anfragen' },
    { value: 'technischer_support', label: 'Technischer Support' },
    { value: 'bestellungen', label: 'Bestellungen' },
    { value: 'beschwerden', label: 'Beschwerden/Reklamationen' },
    { value: 'termine', label: 'Terminvereinbarungen' },
    { value: 'beratung', label: 'Beratungsgespräche' },
    { value: 'notfaelle', label: 'Notfälle' },
    { value: 'verkauf', label: 'Verkaufsgespräche' },
    { value: 'andere', label: 'Andere' },
  ];

  const languageOptions = [
    { value: 'deutsch', label: 'Deutsch' },
    { value: 'englisch', label: 'Englisch' },
    { value: 'franzoesisch', label: 'Französisch' },
    { value: 'spanisch', label: 'Spanisch' },
    { value: 'italienisch', label: 'Italienisch' },
    { value: 'tuerkisch', label: 'Türkisch' },
    { value: 'russisch', label: 'Russisch' },
    { value: 'arabisch', label: 'Arabisch' },
    { value: 'andere', label: 'Andere' },
  ];

  const scheduleOptions = [
    { value: 'geschaeftszeiten', label: 'Normale Geschäftszeiten (Mo-Fr, 9-17 Uhr)' },
    { value: 'erweitert', label: 'Erweiterte Geschäftszeiten (z.B. 8-20 Uhr)' },
    { value: '24_7', label: '24/7 Service' },
    { value: 'wochenende', label: 'Inkl. Wochenende' },
    { value: 'individuell', label: 'Individueller Zeitplan' },
  ];

  const recordingOptions = [
    { value: 'true', label: 'Ja, Anrufaufzeichnung gewünscht' },
    { value: 'false', label: 'Nein, keine Aufzeichnung' },
  ];

  const crmOptions = [
    { value: 'true', label: 'Ja, CRM-System vorhanden' },
    { value: 'false', label: 'Nein, kein CRM-System' },
  ];

  const scriptsOptions = [
    { value: 'true', label: 'Ja, Gesprächsleitfäden sind verfügbar' },
    { value: 'false', label: 'Nein, keine Leitfäden vorhanden' },
  ];

  useEffect(() => {
    onDataChange(formData);
  }, [formData, onDataChange]);

  const handleChange = (field: keyof TelefonserviceData, value: string | string[] | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.callVolume &&
      formData.callType &&
      formData.callType.length > 0 &&
      formData.schedule
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.callVolume &&
      formData.callType &&
      formData.callType.length > 0 &&
      formData.schedule
    );
  };

  return (
    <div className="space-y-6">
      <FormField label="Art des Telefonservice" required>
        <FormSelect
          value={formData.serviceType}
          onChange={value => handleChange('serviceType', value)}
          options={serviceTypeOptions}
        />
      </FormField>

      <FormField label="Anrufvolumen" required>
        <FormSelect
          value={formData.callVolume}
          onChange={value => handleChange('callVolume', value)}
          options={callVolumeOptions}
        />
      </FormField>

      <FormField label="Art der Anrufe" required>
        <FormCheckboxGroup
          value={formData.callType || []}
          onChange={value => handleChange('callType', value)}
          options={callTypeOptions}
        />
      </FormField>

      <FormField label="Benötigte Sprachen">
        <FormCheckboxGroup
          value={formData.languages || []}
          onChange={value => handleChange('languages', value)}
          options={languageOptions}
        />
      </FormField>

      <FormField label="Servicezeiten" required>
        <FormSelect
          value={formData.schedule}
          onChange={value => handleChange('schedule', value)}
          options={scheduleOptions}
        />
      </FormField>

      <FormField label="Anrufaufzeichnung gewünscht?">
        <FormRadioGroup
          name="recording"
          value={formData.recording ? 'true' : 'false'}
          onChange={value => handleChange('recording', value === 'true')}
          options={recordingOptions}
        />
      </FormField>

      <FormField label="CRM-System vorhanden?">
        <FormRadioGroup
          name="crm"
          value={formData.crm ? 'true' : 'false'}
          onChange={value => handleChange('crm', value === 'true')}
          options={crmOptions}
        />
      </FormField>

      {formData.crm && (
        <FormField label="Welches CRM-System?">
          <FormInput
            value={formData.crmSystem || ''}
            onChange={value => handleChange('crmSystem', value.toString())}
            placeholder="z.B. Salesforce, HubSpot, etc."
          />
        </FormField>
      )}

      <FormField label="Gesprächsleitfäden vorhanden?">
        <FormRadioGroup
          name="scripts"
          value={formData.scripts ? 'true' : 'false'}
          onChange={value => handleChange('scripts', value === 'true')}
          options={scriptsOptions}
        />
      </FormField>

      <FormField label="Weitere Details und Anforderungen">
        <FormTextarea
          value={formData.description || ''}
          onChange={value => handleChange('description', value)}
          placeholder="Beschreiben Sie Ihre genauen Anforderungen an den Telefonservice, spezifische Anweisungen, Besonderheiten oder sonstige relevante Informationen."
        />
      </FormField>

      <FormSubmitButton isValid={isFormValid()} subcategory="Telefonservice" />
    </div>
  );
};

export default TelefonserviceForm;
