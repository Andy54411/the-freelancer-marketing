import React, { useState, useEffect } from 'react';
import { PhysiotherapieData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface PhysiotherapieFormProps {
  data: PhysiotherapieData;
  onDataChange: (data: PhysiotherapieData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const PhysiotherapieForm: React.FC<PhysiotherapieFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<PhysiotherapieData>(data);

  const treatmentTypeOptions = [
    { value: 'krankengymnastik', label: 'Krankengymnastik' },
    { value: 'manuelle_therapie', label: 'Manuelle Therapie' },
    { value: 'massage', label: 'Massage' },
    { value: 'lymphdrainage', label: 'Lymphdrainage' },
    { value: 'elektrotherapie', label: 'Elektrotherapie' },
    { value: 'ultraschall', label: 'Ultraschalltherapie' },
    { value: 'wärmetherapie', label: 'Wärmetherapie' },
    { value: 'kältetherapie', label: 'Kältetherapie' },
    { value: 'atemtherapie', label: 'Atemtherapie' },
    { value: 'rückenschule', label: 'Rückenschule' },
    { value: 'sportphysiotherapie', label: 'Sportphysiotherapie' },
    { value: 'neurologie', label: 'Neurologie' },
    { value: 'orthopädie', label: 'Orthopädie' },
    { value: 'geriatrie', label: 'Geriatrie' },
    { value: 'pädiatrie', label: 'Pädiatrie' },
    { value: 'hausbesuch', label: 'Hausbesuch' },
  ];

  const bodyAreaOptions = [
    { value: 'rücken', label: 'Rücken' },
    { value: 'nacken', label: 'Nacken' },
    { value: 'schulter', label: 'Schulter' },
    { value: 'arm', label: 'Arm' },
    { value: 'hand', label: 'Hand' },
    { value: 'hüfte', label: 'Hüfte' },
    { value: 'bein', label: 'Bein' },
    { value: 'knie', label: 'Knie' },
    { value: 'fuß', label: 'Fuß' },
    { value: 'wirbelsäule', label: 'Wirbelsäule' },
    { value: 'kopf', label: 'Kopf' },
    { value: 'ganzkörper', label: 'Ganzkörper' },
  ];

  const conditionOptions = [
    { value: 'rückenschmerzen', label: 'Rückenschmerzen' },
    { value: 'bandscheibenvorfall', label: 'Bandscheibenvorfall' },
    { value: 'arthrose', label: 'Arthrose' },
    { value: 'rheuma', label: 'Rheuma' },
    { value: 'verletzung', label: 'Verletzung' },
    { value: 'operation', label: 'Nach Operation' },
    { value: 'schlaganfall', label: 'Schlaganfall' },
    { value: 'multiple_sklerose', label: 'Multiple Sklerose' },
    { value: 'parkinson', label: 'Parkinson' },
    { value: 'sportverletzung', label: 'Sportverletzung' },
    { value: 'migräne', label: 'Migräne' },
    { value: 'verspannungen', label: 'Verspannungen' },
    { value: 'haltungsschäden', label: 'Haltungsschäden' },
    { value: 'andere', label: 'Andere' },
  ];

  const treatmentGoalOptions = [
    { value: 'schmerzlinderung', label: 'Schmerzlinderung' },
    { value: 'beweglichkeit', label: 'Beweglichkeit verbessern' },
    { value: 'kraftaufbau', label: 'Kraftaufbau' },
    { value: 'koordination', label: 'Koordination' },
    { value: 'balance', label: 'Balance' },
    { value: 'ausdauer', label: 'Ausdauer' },
    { value: 'entspannung', label: 'Entspannung' },
    { value: 'rehabilitation', label: 'Rehabilitation' },
    { value: 'prävention', label: 'Prävention' },
    { value: 'haltungsverbesserung', label: 'Haltungsverbesserung' },
  ];

  const frequencyOptions = [
    { value: 'einmalig', label: 'Einmalig' },
    { value: 'wöchentlich', label: 'Wöchentlich' },
    { value: 'zweimal_woche', label: '2x pro Woche' },
    { value: 'dreimal_woche', label: '3x pro Woche' },
    { value: 'täglich', label: 'Täglich' },
    { value: 'nach_bedarf', label: 'Nach Bedarf' },
    { value: 'kur', label: 'Kur (mehrere Wochen)' },
  ];

  const sessionDurationOptions = [
    { value: '30', label: '30 Minuten' },
    { value: '45', label: '45 Minuten' },
    { value: '60', label: '60 Minuten' },
    { value: '90', label: '90 Minuten' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const locationOptions = [
    { value: 'praxis', label: 'Praxis' },
    { value: 'zuhause', label: 'Beim Patienten zu Hause' },
    { value: 'online', label: 'Online-Beratung' },
    { value: 'outdoor', label: 'Outdoor (Park, etc.)' },
    { value: 'fitnessstudio', label: 'Fitnessstudio' },
    { value: 'krankenhaus', label: 'Krankenhaus' },
    { value: 'reha', label: 'Reha-Zentrum' },
  ];
  const experienceOptions = [
    { value: 'student', label: 'Student' },
    { value: 'berufsanfänger', label: 'Berufsanfänger' },
    { value: 'erfahren', label: 'Erfahren' },
    { value: 'spezialist', label: 'Spezialist' },
    { value: 'egal', label: 'Egal' },
  ];

  const availabilityOptions = [
    { value: 'vormittag', label: 'Vormittag' },
    { value: 'nachmittag', label: 'Nachmittag' },
    { value: 'abend', label: 'Abend' },
    { value: 'wochenende', label: 'Wochenende' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  const insuranceOptions = [
    { value: 'gesetzlich', label: 'Gesetzlich versichert' },
    { value: 'privat', label: 'Privat versichert' },
    { value: 'beihilfe', label: 'Beihilfe' },
    { value: 'selbstzahler', label: 'Selbstzahler' },
    { value: 'berufsgenossenschaft', label: 'Berufsgenossenschaft' },
  ];

  const handleInputChange = (field: keyof PhysiotherapieData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.treatmentType &&
      formData.bodyArea &&
      formData.condition &&
      formData.treatmentGoal &&
      formData.frequency &&
      formData.sessionDuration &&
      formData.location &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Physiotherapie-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Behandlungsart" required>
            <FormSelect
              value={formData.treatmentType || ''}
              onChange={value => handleInputChange('treatmentType', value)}
              options={treatmentTypeOptions}
              placeholder="Wählen Sie die Behandlungsart"
            />
          </FormField>

          <FormField label="Körperbereich" required>
            <FormSelect
              value={formData.bodyArea || ''}
              onChange={value => handleInputChange('bodyArea', value)}
              options={bodyAreaOptions}
              placeholder="Wählen Sie den Körperbereich"
            />
          </FormField>

          <FormField label="Krankheitsbild" required>
            <FormSelect
              value={formData.condition || ''}
              onChange={value => handleInputChange('condition', value)}
              options={conditionOptions}
              placeholder="Wählen Sie das Krankheitsbild"
            />
          </FormField>

          <FormField label="Behandlungsziel" required>
            <FormSelect
              value={formData.treatmentGoal || ''}
              onChange={value => handleInputChange('treatmentGoal', value)}
              options={treatmentGoalOptions}
              placeholder="Wählen Sie das Behandlungsziel"
            />
          </FormField>

          <FormField label="Häufigkeit" required>
            <FormSelect
              value={formData.frequency || ''}
              onChange={value => handleInputChange('frequency', value)}
              options={frequencyOptions}
              placeholder="Wählen Sie die Häufigkeit"
            />
          </FormField>

          <FormField label="Dauer pro Einheit" required>
            <FormSelect
              value={formData.sessionDuration || ''}
              onChange={value => handleInputChange('sessionDuration', value)}
              options={sessionDurationOptions}
              placeholder="Wählen Sie die Dauer"
            />
          </FormField>

          <FormField label="Ort der Behandlung" required>
            <FormSelect
              value={formData.location || ''}
              onChange={value => handleInputChange('location', value)}
              options={locationOptions}
              placeholder="Wählen Sie den Ort"
            />
          </FormField>
          <FormField label="Gewünschte Erfahrung">
            <FormSelect
              value={formData.experienceLevel || ''}
              onChange={value => handleInputChange('experienceLevel', value)}
              options={experienceOptions}
              placeholder="Wählen Sie die Erfahrung"
            />
          </FormField>

          <FormField label="Versicherung">
            <FormSelect
              value={formData.insurance || ''}
              onChange={value => handleInputChange('insurance', value)}
              options={insuranceOptions}
              placeholder="Wählen Sie die Versicherung"
            />
          </FormField>

          <FormField label="Name des Patienten">
            <FormInput
              type="text"
              value={formData.patientName || ''}
              onChange={value => handleInputChange('patientName', value)}
              placeholder="Name des Patienten"
            />
          </FormField>

          <FormField label="Alter des Patienten">
            <FormInput
              type="number"
              value={formData.patientAge?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'patientAge',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Alter des Patienten"
            />
          </FormField>

          <FormField label="Adresse">
            <FormInput
              type="text"
              value={formData.address || ''}
              onChange={value => handleInputChange('address', value)}
              placeholder="Straße, PLZ, Ort"
            />
          </FormField>

          <FormField label="Gewünschter Starttermin">
            <FormInput
              type="text"
              value={formData.preferredStartDate || ''}
              onChange={value => handleInputChange('preferredStartDate', value)}
              placeholder="TT.MM.JJJJ"
            />
          </FormField>

          <FormField label="Arzt/Ärztin">
            <FormInput
              type="text"
              value={formData.doctor || ''}
              onChange={value => handleInputChange('doctor', value)}
              placeholder="Name des behandelnden Arztes"
            />
          </FormField>

          <FormField label="Rezept vorhanden">
            <FormInput
              type="text"
              value={formData.prescription || ''}
              onChange={value => handleInputChange('prescription', value)}
              placeholder="Ja/Nein, Rezept-Details"
            />
          </FormField>

          <FormField label="Vorerfahrung">
            <FormInput
              type="text"
              value={formData.previousExperience || ''}
              onChange={value => handleInputChange('previousExperience', value)}
              placeholder="Vorerfahrung mit Physiotherapie"
            />
          </FormField>

          <FormField label="Gewünschtes Geschlecht">
            <FormInput
              type="text"
              value={formData.preferredGender || ''}
              onChange={value => handleInputChange('preferredGender', value)}
              placeholder="Männlich, Weiblich, Egal"
            />
          </FormField>

          <FormField label="Praxisstandort">
            <FormInput
              type="text"
              value={formData.preferredLocation || ''}
              onChange={value => handleInputChange('preferredLocation', value)}
              placeholder="Gewünschter Praxisstandort"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Verfügbarkeit">
            <FormCheckboxGroup
              value={formData.availability || []}
              onChange={value => handleInputChange('availability', value)}
              options={availabilityOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Projektbeschreibung" required>
            <FormTextarea
              value={formData.projectDescription || ''}
              onChange={value => handleInputChange('projectDescription', value)}
              placeholder="Beschreiben Sie Ihre Physiotherapie-Anforderungen detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Symptome">
            <FormTextarea
              value={formData.symptoms || ''}
              onChange={value => handleInputChange('symptoms', value)}
              placeholder="Beschreiben Sie Ihre Symptome detailliert"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Krankheitsgeschichte">
            <FormTextarea
              value={formData.medicalHistory || ''}
              onChange={value => handleInputChange('medicalHistory', value)}
              placeholder="Relevante Krankheitsgeschichte"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Aktuelle Medikamente">
            <FormTextarea
              value={formData.currentMedications || ''}
              onChange={value => handleInputChange('currentMedications', value)}
              placeholder="Aktuell eingenommene Medikamente"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Vorherige Behandlungen">
            <FormTextarea
              value={formData.previousTreatments || ''}
              onChange={value => handleInputChange('previousTreatments', value)}
              placeholder="Vorherige Behandlungen und deren Erfolg"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Arbeitsplatz/Alltag">
            <FormTextarea
              value={formData.dailyActivities || ''}
              onChange={value => handleInputChange('dailyActivities', value)}
              placeholder="Beschreibung des Arbeitsplatzes und Alltags"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Sportliche Aktivitäten">
            <FormTextarea
              value={formData.sportsActivities || ''}
              onChange={value => handleInputChange('sportsActivities', value)}
              placeholder="Sportliche Aktivitäten und Hobbys"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Wünsche">
            <FormTextarea
              value={formData.specialRequests || ''}
              onChange={value => handleInputChange('specialRequests', value)}
              placeholder="Besondere Wünsche oder Anforderungen"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4"></div>

        <div className="mt-4">
          <FormField label="Geschlecht des Patienten">
            <FormRadioGroup
              name="patientGender"
              value={formData.patientGender || ''}
              onChange={value => handleInputChange('patientGender', value)}
              options={[
                { value: 'männlich', label: 'Männlich' },
                { value: 'weiblich', label: 'Weiblich' },
                { value: 'divers', label: 'Divers' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Langfristige Behandlung">
            <FormRadioGroup
              name="longTermTreatment"
              value={formData.longTermTreatment || ''}
              onChange={value => handleInputChange('longTermTreatment', value)}
              options={[
                { value: 'ja', label: 'Ja, langfristige Behandlung' },
                { value: 'nein', label: 'Nein, kurzfristig' },
                { value: 'unbekannt', label: 'Noch unbekannt' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Schmerzlevel (1-10)">
            <FormRadioGroup
              name="painLevel"
              value={formData.painLevel || ''}
              onChange={value => handleInputChange('painLevel', value)}
              options={[
                { value: '1-3', label: '1-3 (leicht)' },
                { value: '4-6', label: '4-6 (mittel)' },
                { value: '7-8', label: '7-8 (stark)' },
                { value: '9-10', label: '9-10 (sehr stark)' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Mobilität">
            <FormRadioGroup
              name="mobility"
              value={formData.mobility || ''}
              onChange={value => handleInputChange('mobility', value)}
              options={[
                { value: 'uneingeschränkt', label: 'Uneingeschränkt' },
                { value: 'leicht_eingeschränkt', label: 'Leicht eingeschränkt' },
                { value: 'stark_eingeschränkt', label: 'Stark eingeschränkt' },
                { value: 'rollstuhl', label: 'Rollstuhl' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Hausbesuch erforderlich">
            <FormRadioGroup
              name="homeVisitRequired"
              value={formData.homeVisitRequired || ''}
              onChange={value => handleInputChange('homeVisitRequired', value)}
              options={[
                { value: 'ja', label: 'Ja, Hausbesuch erforderlich' },
                { value: 'nein', label: 'Nein, Praxisbesuch möglich' },
                { value: 'beides', label: 'Beides möglich' },
              ]}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default PhysiotherapieForm;
