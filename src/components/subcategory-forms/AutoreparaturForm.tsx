import React, { useState, useEffect } from 'react';
import { AutoreparaturData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface AutoreparaturFormProps {
  data: AutoreparaturData;
  onDataChange: (data: AutoreparaturData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const AutoreparaturForm: React.FC<AutoreparaturFormProps> = ({
  data,
  onDataChange,
  onValidationChange,
}) => {
  const [formData, setFormData] = useState<AutoreparaturData>(data);

  const serviceTypeOptions = [
    { value: 'inspektion', label: 'Inspektion' },
    { value: 'wartung', label: 'Wartung' },
    { value: 'reparatur', label: 'Reparatur' },
    { value: 'bremsservice', label: 'Bremsservice' },
    { value: 'ölwechsel', label: 'Ölwechsel' },
    { value: 'reifenwechsel', label: 'Reifenwechsel' },
    { value: 'klimaservice', label: 'Klimaservice' },
    { value: 'batterie', label: 'Batterie' },
    { value: 'lichttest', label: 'Lichttest' },
    { value: 'hauptuntersuchung', label: 'Hauptuntersuchung (HU)' },
    { value: 'abgasuntersuchung', label: 'Abgasuntersuchung (AU)' },
    { value: 'karosserie', label: 'Karosserie' },
    { value: 'lack', label: 'Lack' },
    { value: 'motor', label: 'Motor' },
    { value: 'getriebe', label: 'Getriebe' },
    { value: 'auspuff', label: 'Auspuff' },
    { value: 'elektronik', label: 'Elektronik' },
    { value: 'diagnose', label: 'Diagnose' },
    { value: 'unfallreparatur', label: 'Unfallreparatur' },
    { value: 'andere', label: 'Andere' },
  ];

  const vehicleTypeOptions = [
    { value: 'pkw', label: 'PKW' },
    { value: 'kombi', label: 'Kombi' },
    { value: 'suv', label: 'SUV' },
    { value: 'transporter', label: 'Transporter' },
    { value: 'lkw', label: 'LKW' },
    { value: 'motorrad', label: 'Motorrad' },
    { value: 'wohnmobil', label: 'Wohnmobil' },
    { value: 'oldtimer', label: 'Oldtimer' },
    { value: 'cabrio', label: 'Cabrio' },
    { value: 'sportwagen', label: 'Sportwagen' },
    { value: 'hybrid', label: 'Hybrid' },
    { value: 'elektro', label: 'Elektro' },
    { value: 'andere', label: 'Andere' },
  ];

  const urgencyOptions = [
    { value: 'nicht_eilig', label: 'Nicht eilig' },
    { value: 'normal', label: 'Normal' },
    { value: 'eilig', label: 'Eilig' },
    { value: 'sehr_eilig', label: 'Sehr eilig' },
    { value: 'notfall', label: 'Notfall' },
  ];

  const problemAreaOptions = [
    { value: 'motor', label: 'Motor' },
    { value: 'getriebe', label: 'Getriebe' },
    { value: 'bremsen', label: 'Bremsen' },
    { value: 'reifen', label: 'Reifen' },
    { value: 'lenkung', label: 'Lenkung' },
    { value: 'fahrwerk', label: 'Fahrwerk' },
    { value: 'auspuff', label: 'Auspuff' },
    { value: 'elektronik', label: 'Elektronik' },
    { value: 'licht', label: 'Licht' },
    { value: 'klimaanlage', label: 'Klimaanlage' },
    { value: 'heizung', label: 'Heizung' },
    { value: 'batterie', label: 'Batterie' },
    { value: 'karosserie', label: 'Karosserie' },
    { value: 'lack', label: 'Lack' },
    { value: 'scheiben', label: 'Scheiben' },
    { value: 'innenraum', label: 'Innenraum' },
    { value: 'türen', label: 'Türen' },
    { value: 'schlösser', label: 'Schlösser' },
    { value: 'andere', label: 'Andere' },
  ];

  const budgetRangeOptions = [
    { value: 'unter_100', label: 'Unter 100€' },
    { value: '100_250', label: '100€ - 250€' },
    { value: '250_500', label: '250€ - 500€' },
    { value: '500_1000', label: '500€ - 1000€' },
    { value: '1000_2000', label: '1000€ - 2000€' },
    { value: '2000_5000', label: '2000€ - 5000€' },
    { value: 'über_5000', label: 'Über 5000€' },
  ];

  const warrantyOptions = [
    { value: 'ja', label: 'Ja, Garantie erwünscht' },
    { value: 'nein', label: 'Nein, keine Garantie' },
    { value: 'herstellergarantie', label: 'Herstellergarantie' },
    { value: 'werkstattgarantie', label: 'Werkstattgarantie' },
  ];

  const serviceLocationOptions = [
    { value: 'werkstatt', label: 'In der Werkstatt' },
    { value: 'vor_ort', label: 'Vor Ort beim Kunden' },
    { value: 'abholung', label: 'Abholung und Rückbringung' },
    { value: 'andere', label: 'Andere' },
  ];

  const paymentMethodOptions = [
    { value: 'rechnung', label: 'Rechnung' },
    { value: 'bar', label: 'Bar' },
    { value: 'karte', label: 'Karte' },
    { value: 'überweisung', label: 'Überweisung' },
    { value: 'versicherung', label: 'Versicherung' },
    { value: 'andere', label: 'Andere' },
  ];

  const additionalServicesOptions = [
    { value: 'kostenvoranschlag', label: 'Kostenvoranschlag' },
    { value: 'diagnose', label: 'Diagnose' },
    { value: 'ersatzfahrzeug', label: 'Ersatzfahrzeug' },
    { value: 'abholung', label: 'Abholung' },
    { value: 'rückbringung', label: 'Rückbringung' },
    { value: 'terminvereinbarung', label: 'Terminvereinbarung' },
    { value: 'notdienst', label: 'Notdienst' },
    { value: 'wochenend_service', label: 'Wochenend-Service' },
    { value: 'express_service', label: 'Express-Service' },
    { value: 'originalteile', label: 'Originalteile' },
    { value: 'ersatzteile', label: 'Ersatzteile' },
    { value: 'gebrauchtteile', label: 'Gebrauchtteile' },
    { value: 'teilegutachten', label: 'Teilegutachten' },
    { value: 'unfallgutachten', label: 'Unfallgutachten' },
    { value: 'wertgutachten', label: 'Wertgutachten' },
    { value: 'hauptuntersuchung', label: 'Hauptuntersuchung' },
    { value: 'abgasuntersuchung', label: 'Abgasuntersuchung' },
    { value: 'ölentsorgung', label: 'Ölentsorgung' },
    { value: 'batterieentsorgung', label: 'Batterieentsorgung' },
    { value: 'reifenentsorgung', label: 'Reifenentsorgung' },
    { value: 'fahrzeugaufbereitung', label: 'Fahrzeugaufbereitung' },
    { value: 'innenreinigung', label: 'Innenreinigung' },
    { value: 'außenreinigung', label: 'Außenreinigung' },
    { value: 'motorwäsche', label: 'Motorwäsche' },
    { value: 'unterbodenschutz', label: 'Unterbodenschutz' },
    { value: 'rostschutz', label: 'Rostschutz' },
    { value: 'lackschutz', label: 'Lackschutz' },
    { value: 'polsterreinigung', label: 'Polsterreinigung' },
    { value: 'lederreinigung', label: 'Lederreinigung' },
    { value: 'geruchsbeseitigung', label: 'Geruchsbeseitigung' },
    { value: 'ozonbehandlung', label: 'Ozonbehandlung' },
  ];

  const handleInputChange = (field: keyof AutoreparaturData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.vehicleType &&
      formData.urgency &&
      formData.budgetRange &&
      formData.problemDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Autoreparatur-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Reparatur" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art der Reparatur"
            />
          </FormField>

          <FormField label="Fahrzeugtyp" required>
            <FormSelect
              value={formData.vehicleType || ''}
              onChange={value => handleInputChange('vehicleType', value)}
              options={vehicleTypeOptions}
              placeholder="Wählen Sie den Fahrzeugtyp"
            />
          </FormField>

          <FormField label="Dringlichkeit" required>
            <FormSelect
              value={formData.urgency || ''}
              onChange={value => handleInputChange('urgency', value)}
              options={urgencyOptions}
              placeholder="Wählen Sie die Dringlichkeit"
            />
          </FormField>

          <FormField label="Budget-Rahmen" required>
            <FormSelect
              value={formData.budgetRange || ''}
              onChange={value => handleInputChange('budgetRange', value)}
              options={budgetRangeOptions}
              placeholder="Wählen Sie den Budget-Rahmen"
            />
          </FormField>

          <FormField label="Marke">
            <FormInput
              type="text"
              value={formData.brand || ''}
              onChange={value => handleInputChange('brand', value)}
              placeholder="Fahrzeugmarke"
            />
          </FormField>

          <FormField label="Modell">
            <FormInput
              type="text"
              value={formData.model || ''}
              onChange={value => handleInputChange('model', value)}
              placeholder="Fahrzeugmodell"
            />
          </FormField>

          <FormField label="Baujahr">
            <FormInput
              type="number"
              value={formData.year?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'year',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Baujahr"
            />
          </FormField>

          <FormField label="Kilometerstand">
            <FormInput
              type="number"
              value={formData.mileage?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'mileage',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Kilometerstand"
            />
          </FormField>

          <FormField label="Kennzeichen">
            <FormInput
              type="text"
              value={formData.licensePlate || ''}
              onChange={value => handleInputChange('licensePlate', value)}
              placeholder="Kennzeichen"
            />
          </FormField>

          <FormField label="Fahrgestellnummer">
            <FormInput
              type="text"
              value={formData.vinNumber || ''}
              onChange={value => handleInputChange('vinNumber', value)}
              placeholder="Fahrgestellnummer (VIN)"
            />
          </FormField>

          <FormField label="Motorcode">
            <FormInput
              type="text"
              value={formData.engineCode || ''}
              onChange={value => handleInputChange('engineCode', value)}
              placeholder="Motorcode"
            />
          </FormField>

          <FormField label="Getriebeart">
            <FormSelect
              value={formData.transmissionType || ''}
              onChange={value => handleInputChange('transmissionType', value)}
              options={[
                { value: 'manuell', label: 'Manuell' },
                { value: 'automatik', label: 'Automatik' },
                { value: 'cvt', label: 'CVT' },
                { value: 'dsg', label: 'DSG' },
                { value: 'andere', label: 'Andere' },
              ]}
              placeholder="Wählen Sie die Getriebeart"
            />
          </FormField>

          <FormField label="Kraftstoffart">
            <FormSelect
              value={formData.fuelType || ''}
              onChange={value => handleInputChange('fuelType', value)}
              options={[
                { value: 'benzin', label: 'Benzin' },
                { value: 'diesel', label: 'Diesel' },
                { value: 'hybrid', label: 'Hybrid' },
                { value: 'elektro', label: 'Elektro' },
                { value: 'gas', label: 'Gas' },
                { value: 'andere', label: 'Andere' },
              ]}
              placeholder="Wählen Sie die Kraftstoffart"
            />
          </FormField>

          <FormField label="Kontaktperson">
            <FormInput
              type="text"
              value={formData.contactPerson || ''}
              onChange={value => handleInputChange('contactPerson', value)}
              placeholder="Name der Kontaktperson"
            />
          </FormField>

          <FormField label="Geschätzte Reparaturdauer">
            <FormInput
              type="text"
              value={formData.estimatedDuration || ''}
              onChange={value => handleInputChange('estimatedDuration', value)}
              placeholder="Stunden/Tage"
            />
          </FormField>

          <FormField label="Versicherungsnummer">
            <FormInput
              type="text"
              value={formData.insuranceNumber || ''}
              onChange={value => handleInputChange('insuranceNumber', value)}
              placeholder="Versicherungsnummer"
            />
          </FormField>

          <FormField label="Schadennummer">
            <FormInput
              type="text"
              value={formData.damageNumber || ''}
              onChange={value => handleInputChange('damageNumber', value)}
              placeholder="Schadennummer"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Problembereiche">
            <FormCheckboxGroup
              value={formData.problemAreas || []}
              onChange={value => handleInputChange('problemAreas', value)}
              options={problemAreaOptions}
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
          <FormField label="Problembeschreibung" required>
            <FormTextarea
              value={formData.problemDescription || ''}
              onChange={value => handleInputChange('problemDescription', value)}
              placeholder="Beschreiben Sie das Problem oder die benötigte Reparatur detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Symptome">
            <FormTextarea
              value={formData.symptoms || ''}
              onChange={value => handleInputChange('symptoms', value)}
              placeholder="Welche Symptome sind aufgetreten?"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Vorherige Reparaturen">
            <FormTextarea
              value={formData.previousRepairs || ''}
              onChange={value => handleInputChange('previousRepairs', value)}
              placeholder="Wurden bereits Reparaturen durchgeführt?"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => handleInputChange('specialRequirements', value)}
              placeholder="Besondere Anforderungen oder Wünsche"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Garantie gewünscht">
            <FormRadioGroup
              name="warranty"
              value={formData.warranty || ''}
              onChange={value => handleInputChange('warranty', value)}
              options={warrantyOptions.map(option => ({
                value: option.value,
                label: option.label,
              }))}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Service-Standort">
            <FormRadioGroup
              name="serviceLocation"
              value={formData.serviceLocation || ''}
              onChange={value => handleInputChange('serviceLocation', value)}
              options={serviceLocationOptions.map(option => ({
                value: option.value,
                label: option.label,
              }))}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zahlungsart">
            <FormRadioGroup
              name="paymentMethod"
              value={formData.paymentMethod || ''}
              onChange={value => handleInputChange('paymentMethod', value)}
              options={paymentMethodOptions.map(option => ({
                value: option.value,
                label: option.label,
              }))}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Originalteile gewünscht">
            <FormRadioGroup
              name="originalParts"
              value={formData.originalParts || ''}
              onChange={value => handleInputChange('originalParts', value)}
              options={[
                { value: 'ja', label: 'Ja, nur Originalteile' },
                { value: 'nein', label: 'Nein, Ersatzteile ok' },
                { value: 'egal', label: 'Egal' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Kostenvoranschlag gewünscht">
            <FormRadioGroup
              name="estimate"
              value={formData.estimate || ''}
              onChange={value => handleInputChange('estimate', value)}
              options={[
                { value: 'ja', label: 'Ja, Kostenvoranschlag erst' },
                { value: 'nein', label: 'Nein, direkt reparieren' },
                { value: 'abhängig', label: 'Abhängig von Kosten' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Fahrzeug fahrtüchtig">
            <FormRadioGroup
              name="roadworthy"
              value={formData.roadworthy || ''}
              onChange={value => handleInputChange('roadworthy', value)}
              options={[
                { value: 'ja', label: 'Ja, fahrtüchtig' },
                { value: 'nein', label: 'Nein, nicht fahrtüchtig' },
                { value: 'eingeschränkt', label: 'Eingeschränkt fahrtüchtig' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Versicherungsfall">
            <FormRadioGroup
              name="insuranceCase"
              value={formData.insuranceCase || ''}
              onChange={value => handleInputChange('insuranceCase', value)}
              options={[
                { value: 'ja', label: 'Ja, Versicherungsfall' },
                { value: 'nein', label: 'Nein, privat' },
                { value: 'unbekannt', label: 'Unbekannt' },
              ]}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default AutoreparaturForm;
