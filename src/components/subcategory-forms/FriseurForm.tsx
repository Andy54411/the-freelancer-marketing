'use client';
import React, { useState, useEffect } from 'react';
import { FriseurData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';

interface FriseurFormProps {
  data: FriseurData;
  onDataChange: (data: FriseurData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const FriseurForm: React.FC<FriseurFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<FriseurData>(data);

  const serviceTypeOptions = [
    { value: 'herrenhaarschnitt', label: 'Herrenhaarschnitt' },
    { value: 'damenhaarschnitt', label: 'Damenhaarschnitt' },
    { value: 'kinderhaarschnitt', label: 'Kinderhaarschnitt' },
    { value: 'färbung', label: 'Färbung/Tönung' },
    { value: 'strähnen', label: 'Strähnen/Highlights' },
    { value: 'dauerwelle', label: 'Dauerwelle' },
    { value: 'glätten', label: 'Glättung/Keratin' },
    { value: 'styling', label: 'Styling/Hochsteckfrisur' },
    { value: 'bartpflege', label: 'Bartpflege' },
    { value: 'haarverlängerung', label: 'Haarverlängerung' },
    { value: 'perücke', label: 'Perücken-Service' },
    { value: 'beratung', label: 'Typberatung' },
  ];

  const genderOptions = [
    { value: 'weiblich', label: 'Weiblich' },
    { value: 'männlich', label: 'Männlich' },
    { value: 'divers', label: 'Divers' },
    { value: 'kind', label: 'Kind' },
  ];

  const hairLengthOptions = [
    { value: 'kurz', label: 'Kurz (bis Kinn)' },
    { value: 'mittel', label: 'Mittel (bis Schulter)' },
    { value: 'lang', label: 'Lang (über Schulter)' },
    { value: 'sehr_lang', label: 'Sehr lang (bis Taille)' },
  ];

  const hairTypeOptions = [
    { value: 'glatt', label: 'Glatt' },
    { value: 'wellig', label: 'Wellig' },
    { value: 'lockig', label: 'Lockig' },
    { value: 'kraus', label: 'Kraus' },
    { value: 'dünn', label: 'Dünn/Fein' },
    { value: 'dick', label: 'Dick/Kräftig' },
  ];

  const occasionOptions = [
    { value: 'alltag', label: 'Alltag' },
    { value: 'hochzeit', label: 'Hochzeit' },
    { value: 'party', label: 'Party/Event' },
    { value: 'business', label: 'Business/Beruf' },
    { value: 'abschlussball', label: 'Abschlussball' },
    { value: 'fotoshooting', label: 'Fotoshooting' },
  ];

  const appointmentTypeOptions = [
    { value: 'salon', label: 'Im Salon' },
    { value: 'mobil', label: 'Mobiler Service' },
    { value: 'online_beratung', label: 'Online-Beratung' },
  ];

  const urgencyOptions = [
    { value: 'heute', label: 'Heute' },
    { value: 'morgen', label: 'Morgen' },
    { value: 'diese_woche', label: 'Diese Woche' },
    { value: 'nächste_woche', label: 'Nächste Woche' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const handleInputChange = (field: keyof FriseurData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.gender &&
      formData.appointmentType &&
      formData.urgency
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.gender &&
      formData.appointmentType &&
      formData.urgency
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Friseur Service Details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Gewünschte Dienstleistung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die gewünschte Dienstleistung"
            />
          </FormField>

          <FormField label="Geschlecht/Zielgruppe" required>
            <FormSelect
              value={formData.gender || ''}
              onChange={value => handleInputChange('gender', value)}
              options={genderOptions}
              placeholder="Für wen ist der Service?"
            />
          </FormField>

          <FormField label="Aktuelle Haarlänge">
            <FormSelect
              value={formData.hairLength || ''}
              onChange={value => handleInputChange('hairLength', value)}
              options={hairLengthOptions}
              placeholder="Wie lang sind die Haare aktuell?"
            />
          </FormField>

          <FormField label="Haartyp">
            <FormSelect
              value={formData.hairType || ''}
              onChange={value => handleInputChange('hairType', value)}
              options={hairTypeOptions}
              placeholder="Welcher Haartyp?"
            />
          </FormField>

          <FormField label="Anlass" required>
            <FormSelect
              value={formData.occasion || ''}
              onChange={value => handleInputChange('occasion', value)}
              options={occasionOptions}
              placeholder="Für welchen Anlass?"
            />
          </FormField>

          <FormField label="Art des Termins" required>
            <FormSelect
              value={formData.appointmentType || ''}
              onChange={value => handleInputChange('appointmentType', value)}
              options={appointmentTypeOptions}
              placeholder="Wo soll der Service stattfinden?"
            />
          </FormField>

          <FormField label="Zeitwunsch" required>
            <FormSelect
              value={formData.urgency || ''}
              onChange={value => handleInputChange('urgency', value)}
              options={urgencyOptions}
              placeholder="Wann benötigen Sie den Termin?"
            />
          </FormField>

          <FormField label="Budget-Rahmen">
            <FormInput
              type="text"
              value={formData.budgetRange || ''}
              onChange={value => handleInputChange('budgetRange', value)}
              placeholder="z.B. 50-100 EUR"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Gewünschte Farbe (bei Färbung)">
            <FormInput
              type="text"
              value={formData.desiredColor || ''}
              onChange={value => handleInputChange('desiredColor', value)}
              placeholder="z.B. Blond, Braun, Rot, etc."
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Detaillierte Beschreibung">
            <FormTextarea
              value={formData.serviceDescription || ''}
              onChange={value => handleInputChange('serviceDescription', value)}
              placeholder="Beschreiben Sie genau, was Sie sich vorstellen..."
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Allergien/Besonderheiten">
            <FormTextarea
              value={formData.allergies || ''}
              onChange={value => handleInputChange('allergies', value)}
              placeholder="Haben Sie Allergien oder besondere Anforderungen?"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Vorherige Behandlungen">
            <FormCheckboxGroup
              value={formData.previousTreatments || []}
              onChange={value => handleInputChange('previousTreatments', value)}
              options={[
                { value: 'färbung_letzte_6_monate', label: 'Färbung in den letzten 6 Monaten' },
                { value: 'dauerwelle_letztes_jahr', label: 'Dauerwelle im letzten Jahr' },
                { value: 'blondierung', label: 'Blondierung/Bleaching' },
                { value: 'chemische_glättung', label: 'Chemische Glättung' },
                { value: 'extensions', label: 'Extensions/Haarverlängerung' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Geschlecht des Friseurs">
            <FormRadioGroup
              name="preferredGender"
              value={formData.preferredGender || ''}
              onChange={value => handleInputChange('preferredGender', value)}
              options={[
                { value: 'egal', label: 'Egal' },
                { value: 'weiblich', label: 'Weiblich bevorzugt' },
                { value: 'männlich', label: 'Männlich bevorzugt' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Haarpflege-Beratung gewünscht">
            <FormRadioGroup
              name="careAdvice"
              value={formData.careAdvice || ''}
              onChange={value => handleInputChange('careAdvice', value)}
              options={[
                { value: 'ja', label: 'Ja, Pflegetipps und Produktempfehlungen' },
                { value: 'nein', label: 'Nein, nur Service' },
                { value: 'optional', label: 'Falls Zeit vorhanden' },
              ]}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Friseur" formData={formData} />
    </div>
  );
};

export default FriseurForm;
