'use client';
import React, { useState, useEffect } from 'react';
import { HausmeisterData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';

interface HausmeisterFormProps {
  data: HausmeisterData;
  onDataChange: (data: HausmeisterData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const HausmeisterForm: React.FC<HausmeisterFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<HausmeisterData>(data);

  const serviceTypeOptions = [
    { value: 'hausmeistertätigkeit', label: 'Allgemeine Hausmeistertätigkeit' },
    { value: 'reinigung', label: 'Reinigung (Treppenhaus, Hof)' },
    { value: 'gartenpflege', label: 'Gartenpflege' },
    { value: 'winterdienst', label: 'Winterdienst' },
    { value: 'kleinreparaturen', label: 'Kleinreparaturen' },
    { value: 'wartung', label: 'Wartung (Heizung, Lüftung)' },
    { value: 'überwachung', label: 'Gebäudeüberwachung' },
    { value: 'schlüsseldienst', label: 'Schlüsseldienst' },
    { value: 'postdienst', label: 'Postdienst' },
    { value: 'müllentsorgung', label: 'Müllentsorgung' },
    { value: 'hausverwaltung', label: 'Hausverwaltungsaufgaben' },
    { value: 'notdienst', label: 'Notdienst' },
  ];

  const buildingTypeOptions = [
    { value: 'mehrfamilienhaus', label: 'Mehrfamilienhaus' },
    { value: 'wohnanlage', label: 'Wohnanlage' },
    { value: 'bürogebäude', label: 'Bürogebäude' },
    { value: 'gewerbeobjekt', label: 'Gewerbeobjekt' },
    { value: 'einfamilienhaus', label: 'Einfamilienhaus' },
    { value: 'schule', label: 'Schule/Bildungseinrichtung' },
    { value: 'krankenhaus', label: 'Krankenhaus/Pflegeheim' },
    { value: 'hotel', label: 'Hotel/Pension' },
    { value: 'industriegebäude', label: 'Industriegebäude' },
  ];

  const frequencyOptions = [
    { value: 'täglich', label: 'Täglich' },
    { value: 'wöchentlich', label: 'Wöchentlich' },
    { value: '14_tägig', label: '14-tägig' },
    { value: 'monatlich', label: 'Monatlich' },
    { value: 'quartalsweise', label: 'Quartalsweise' },
    { value: 'saisonal', label: 'Saisonal' },
    { value: 'nach_bedarf', label: 'Nach Bedarf' },
    { value: 'einmalig', label: 'Einmalig' },
  ];

  const workingSizeOptions = [
    { value: 'bis_10_einheiten', label: 'Bis 10 Wohneinheiten' },
    { value: '10_30_einheiten', label: '10-30 Wohneinheiten' },
    { value: '30_50_einheiten', label: '30-50 Wohneinheiten' },
    { value: 'über_50_einheiten', label: 'Über 50 Wohneinheiten' },
    { value: 'gewerbefläche_klein', label: 'Gewerbefläche bis 500m²' },
    { value: 'gewerbefläche_groß', label: 'Gewerbefläche über 500m²' },
  ];

  const urgencyOptions = [
    { value: 'sofort', label: 'Sofort' },
    { value: 'diese_woche', label: 'Diese Woche' },
    { value: 'nächste_woche', label: 'Nächste Woche' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const workingTimeOptions = [
    { value: 'vollzeit', label: 'Vollzeit' },
    { value: 'teilzeit', label: 'Teilzeit' },
    { value: 'aushilfe', label: 'Aushilfe' },
    { value: 'stunden_basis', label: 'Auf Stundenbasis' },
    { value: 'bereitschaft', label: 'Bereitschaftsdienst' },
  ];

  const handleInputChange = (field: keyof HausmeisterData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.buildingType &&
      formData.frequency &&
      formData.workingSize &&
      formData.urgency
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.buildingType &&
      formData.frequency &&
      formData.workingSize &&
      formData.urgency
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Hausmeister Service Details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Dienstleistung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Welche Hausmeistertätigkeit wird benötigt?"
            />
          </FormField>

          <FormField label="Gebäudetyp" required>
            <FormSelect
              value={formData.buildingType || ''}
              onChange={value => handleInputChange('buildingType', value)}
              options={buildingTypeOptions}
              placeholder="Was für ein Gebäude ist zu betreuen?"
            />
          </FormField>

          <FormField label="Häufigkeit" required>
            <FormSelect
              value={formData.frequency || ''}
              onChange={value => handleInputChange('frequency', value)}
              options={frequencyOptions}
              placeholder="Wie oft wird der Service benötigt?"
            />
          </FormField>

          <FormField label="Größe des Objekts" required>
            <FormSelect
              value={formData.workingSize || ''}
              onChange={value => handleInputChange('workingSize', value)}
              options={workingSizeOptions}
              placeholder="Wie groß ist das zu betreuende Objekt?"
            />
          </FormField>

          <FormField label="Zeitrahmen" required>
            <FormSelect
              value={formData.urgency || ''}
              onChange={value => handleInputChange('urgency', value)}
              options={urgencyOptions}
              placeholder="Wann wird der Service benötigt?"
            />
          </FormField>

          <FormField label="Arbeitszeit">
            <FormSelect
              value={formData.workingTime || ''}
              onChange={value => handleInputChange('workingTime', value)}
              options={workingTimeOptions}
              placeholder="Wie soll der Service erbracht werden?"
            />
          </FormField>

          <FormField label="Stunden pro Woche (falls Teilzeit)">
            <FormInput
              type="number"
              value={formData.hoursPerWeek || ''}
              onChange={value => handleInputChange('hoursPerWeek', value)}
              placeholder="z.B. 20"
            />
          </FormField>

          <FormField label="Budget-Rahmen">
            <FormInput
              type="text"
              value={formData.budgetRange || ''}
              onChange={value => handleInputChange('budgetRange', value)}
              placeholder="z.B. 15-20 EUR/Stunde"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Erforderliche Tätigkeiten">
            <FormCheckboxGroup
              value={formData.requiredTasks || []}
              onChange={value => handleInputChange('requiredTasks', value)}
              options={[
                { value: 'treppenreinigung', label: 'Treppenhaus-Reinigung' },
                { value: 'hof_reinigung', label: 'Hof-/Gehwegreinigung' },
                { value: 'mülltonnen', label: 'Mülltonnen-Service' },
                { value: 'briefkasten', label: 'Briefkasten-Betreuung' },
                { value: 'gartenpflege', label: 'Gartenpflege' },
                { value: 'winterdienst', label: 'Winterdienst/Streuen' },
                { value: 'kleinreparaturen', label: 'Kleinreparaturen' },
                { value: 'wartung_heizung', label: 'Heizungswartung' },
                { value: 'lüftung', label: 'Lüftungsanlagen' },
                { value: 'aufzug', label: 'Aufzugsbetreuung' },
                { value: 'sicherheit', label: 'Sicherheitskontrolle' },
                { value: 'schlüsseldienst', label: 'Schlüsseldienst' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Detaillierte Beschreibung">
            <FormTextarea
              value={formData.serviceDescription || ''}
              onChange={value => handleInputChange('serviceDescription', value)}
              placeholder="Beschreiben Sie detailliert, welche Hausmeistertätigkeiten benötigt werden..."
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Besondere Qualifikationen, Werkzeuge, Arbeitszeiten, etc."
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Wohnung/Arbeitsplatz vor Ort">
            <FormRadioGroup
              name="onSiteAccommodation"
              value={formData.onSiteAccommodation || ''}
              onChange={value => handleInputChange('onSiteAccommodation', value)}
              options={[
                { value: 'ja_verfügbar', label: 'Ja, Hausmeisterwohnung verfügbar' },
                { value: 'gewünscht', label: 'Ja, wird gewünscht' },
                { value: 'nicht_möglich', label: 'Nicht möglich' },
                { value: 'nicht_nötig', label: 'Nicht nötig' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Werkzeuge/Ausrüstung">
            <FormRadioGroup
              name="toolsAndEquipment"
              value={formData.toolsAndEquipment || ''}
              onChange={value => handleInputChange('toolsAndEquipment', value)}
              options={[
                {
                  value: 'hausmeister_mitbringen',
                  label: 'Hausmeister bringt eigene Werkzeuge mit',
                },
                { value: 'gestellt', label: 'Werkzeuge werden gestellt' },
                { value: 'teilweise', label: 'Teilweise gestellt, teilweise eigene' },
                { value: 'nach_absprache', label: 'Nach Absprache' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Qualifikationen erwünscht">
            <FormCheckboxGroup
              value={formData.requiredQualifications || []}
              onChange={value => handleInputChange('requiredQualifications', value)}
              options={[
                { value: 'erfahrung', label: 'Hausmeister-Erfahrung' },
                { value: 'handwerklich', label: 'Handwerkliche Kenntnisse' },
                { value: 'führerschein', label: 'Führerschein' },
                { value: 'erste_hilfe', label: 'Erste-Hilfe-Kurs' },
                { value: 'sicherheit', label: 'Sicherheitstechnik-Kenntnisse' },
                { value: 'garten', label: 'Gartenpflege-Kenntnisse' },
                { value: 'mehrsprachig', label: 'Mehrsprachigkeit' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Vertragsdauer">
            <FormRadioGroup
              name="contractDuration"
              value={formData.contractDuration || ''}
              onChange={value => handleInputChange('contractDuration', value)}
              options={[
                { value: 'unbefristet', label: 'Unbefristet' },
                { value: 'befristet', label: 'Befristet' },
                { value: 'projekt', label: 'Projektbasis' },
                { value: 'vertretung', label: 'Vertretung/Urlaub' },
              ]}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Hausmeister" formData={formData} />
    </div>
  );
};

export default HausmeisterForm;
