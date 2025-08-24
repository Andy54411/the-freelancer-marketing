'use client';
import React, { useState, useEffect } from 'react';
import { HandwerkerData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
} from './FormComponents';

interface HandwerkerFormProps {
  data: HandwerkerData;
  onDataChange: (data: HandwerkerData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const HandwerkerForm: React.FC<HandwerkerFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<HandwerkerData>(data);

  const serviceTypeOptions = [
    { value: 'reparatur', label: 'Reparatur/Instandsetzung' },
    { value: 'installation', label: 'Installation/Montage' },
    { value: 'wartung', label: 'Wartung/Service' },
    { value: 'umbau', label: 'Umbau/Renovierung' },
    { value: 'neubau', label: 'Neubau/Erstinstallation' },
    { value: 'beratung', label: 'Beratung/Gutachten' },
    { value: 'notdienst', label: 'Notdienst' },
    { value: 'sonstiges', label: 'Sonstiges' },
  ];

  const tradeTypeOptions = [
    { value: 'elektriker', label: 'Elektriker' },
    { value: 'klempner', label: 'Klempner/Sanitär' },
    { value: 'heizung', label: 'Heizung/Lüftung' },
    { value: 'maler', label: 'Maler/Lackierer' },
    { value: 'tischler', label: 'Tischler/Schreiner' },
    { value: 'fliesenleger', label: 'Fliesenleger' },
    { value: 'maurer', label: 'Maurer' },
    { value: 'dachdecker', label: 'Dachdecker' },
    { value: 'zimmermann', label: 'Zimmermann' },
    { value: 'estrichleger', label: 'Estrichleger' },
    { value: 'trockenbau', label: 'Trockenbau' },
    { value: 'parkettleger', label: 'Parkettleger' },
    { value: 'jalousien', label: 'Rollladen/Jalousien' },
    { value: 'fenster', label: 'Fenster/Türen' },
    { value: 'allround', label: 'Allround-Handwerker' },
  ];

  const priorityOptions = [
    { value: 'notfall', label: 'Notfall (sofort)' },
    { value: 'dringend', label: 'Dringend (24-48h)' },
    { value: 'normal', label: 'Normal (1-2 Wochen)' },
    { value: 'geplant', label: 'Geplant (flexibel)' },
  ];

  const projectSizeOptions = [
    { value: 'klein', label: 'Klein (1-3 Stunden)' },
    { value: 'mittel', label: 'Mittel (halber bis ganzer Tag)' },
    { value: 'groß', label: 'Groß (mehrere Tage)' },
    { value: 'sehr_groß', label: 'Sehr groß (Wochen/Monate)' },
  ];

  const locationTypeOptions = [
    { value: 'wohnung', label: 'Privatwohnung' },
    { value: 'haus', label: 'Einfamilienhaus' },
    { value: 'büro', label: 'Büro/Gewerbe' },
    { value: 'werkstatt', label: 'Werkstatt/Lager' },
    { value: 'baustelle', label: 'Baustelle' },
    { value: 'außenbereich', label: 'Außenbereich' },
  ];

  const experienceRequiredOptions = [
    { value: 'einsteiger', label: 'Einsteiger (einfache Arbeiten)' },
    { value: 'erfahren', label: 'Erfahren (mittlere Komplexität)' },
    { value: 'profi', label: 'Profi (komplexe Arbeiten)' },
    { value: 'spezialist', label: 'Spezialist (sehr spezielle Arbeiten)' },
  ];

  const handleInputChange = (field: keyof HandwerkerData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.tradeType &&
      formData.priority &&
      formData.workDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const isFormValid = () => {
    return !!(
      formData.serviceType &&
      formData.tradeType &&
      formData.priority &&
      formData.workDescription
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Handwerker Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Dienstleistung" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Was soll gemacht werden?"
            />
          </FormField>

          <FormField label="Gewerk/Fachbereich" required>
            <FormSelect
              value={formData.tradeType || ''}
              onChange={value => handleInputChange('tradeType', value)}
              options={tradeTypeOptions}
              placeholder="Welcher Handwerker wird benötigt?"
            />
          </FormField>

          <FormField label="Dringlichkeit" required>
            <FormSelect
              value={formData.priority || ''}
              onChange={value => handleInputChange('priority', value)}
              options={priorityOptions}
              placeholder="Wie dringend ist es?"
            />
          </FormField>

          <FormField label="Projektumfang">
            <FormSelect
              value={formData.projectSize || ''}
              onChange={value => handleInputChange('projectSize', value)}
              options={projectSizeOptions}
              placeholder="Wie umfangreich ist das Projekt?"
            />
          </FormField>

          <FormField label="Ort der Arbeit">
            <FormSelect
              value={formData.locationType || ''}
              onChange={value => handleInputChange('locationType', value)}
              options={locationTypeOptions}
              placeholder="Wo soll gearbeitet werden?"
            />
          </FormField>

          <FormField label="Erforderliche Erfahrung">
            <FormSelect
              value={formData.experienceRequired || ''}
              onChange={value => handleInputChange('experienceRequired', value)}
              options={experienceRequiredOptions}
              placeholder="Welche Erfahrung wird benötigt?"
            />
          </FormField>

          <FormField label="Budget-Rahmen">
            <FormInput
              type="text"
              value={formData.budgetRange || ''}
              onChange={value => handleInputChange('budgetRange', value)}
              placeholder="z.B. 200-500 EUR"
            />
          </FormField>

          <FormField label="Wunschtermin">
            <FormInput
              type="text"
              value={formData.preferredDate || ''}
              onChange={value => handleInputChange('preferredDate', value)}
              placeholder="TT.MM.JJJJ"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Detaillierte Arbeitsbeschreibung" required>
            <FormTextarea
              value={formData.workDescription || ''}
              onChange={value => handleInputChange('workDescription', value)}
              placeholder="Beschreiben Sie genau, was gemacht werden soll..."
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Vorhandene Materialien/Werkzeuge">
            <FormTextarea
              value={formData.existingMaterials || ''}
              onChange={value => handleInputChange('existingMaterials', value)}
              placeholder="Was ist bereits vorhanden? Was muss beschafft werden?"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Benötigte Leistungen">
            <FormCheckboxGroup
              value={formData.requiredServices || []}
              onChange={value => handleInputChange('requiredServices', value)}
              options={[
                { value: 'materialbeschaffung', label: 'Materialbeschaffung' },
                { value: 'werkzeug', label: 'Werkzeug/Maschinen mitbringen' },
                { value: 'entsorgung', label: 'Entsorgung von Abfall' },
                { value: 'aufräumen', label: 'Aufräumen nach der Arbeit' },
                { value: 'beratung', label: 'Beratung vor Ort' },
                { value: 'kostenvoranschlag', label: 'Kostenvoranschlag' },
                { value: 'garantie', label: 'Garantie/Gewährleistung' },
                { value: 'rechnung', label: 'Offizielle Rechnung' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Arbeitszeit">
            <FormRadioGroup
              name="workingHours"
              value={formData.workingHours || ''}
              onChange={value => handleInputChange('workingHours', value)}
              options={[
                { value: 'werktags', label: 'Werktags (Mo-Fr)' },
                { value: 'wochenende', label: 'Auch Wochenende möglich' },
                { value: 'abends', label: 'Auch abends möglich' },
                { value: 'flexibel', label: 'Völlig flexibel' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Materialbeschaffung">
            <FormRadioGroup
              name="materialSupply"
              value={formData.materialSupply || ''}
              onChange={value => handleInputChange('materialSupply', value)}
              options={[
                { value: 'handwerker', label: 'Handwerker beschafft Material' },
                { value: 'kunde', label: 'Kunde beschafft Material' },
                { value: 'gemeinsam', label: 'Gemeinsame Beschaffung' },
                { value: 'beratung', label: 'Beratung bei Beschaffung gewünscht' },
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
                { value: 'meisterbrief', label: 'Meisterbrief' },
                { value: 'versicherung', label: 'Haftpflichtversicherung' },
                { value: 'gewerbeschein', label: 'Gewerbeschein' },
                { value: 'referenzen', label: 'Referenzen' },
                { value: 'zertifikate', label: 'Spezielle Zertifikate' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Sicherheitsanforderungen">
            <FormTextarea
              value={formData.safetyRequirements || ''}
              onChange={value => handleInputChange('safetyRequirements', value)}
              placeholder="Besondere Sicherheitsanforderungen, Schutzausrüstung, etc."
              rows={2}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Handwerker" formData={formData} />
    </div>
  );
};

export default HandwerkerForm;
