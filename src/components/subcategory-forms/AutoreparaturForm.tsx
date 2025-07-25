import React, { useState, useEffect } from 'react';
import { AutoreparaturData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
  FormSubmitButton,
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
    const isValid = !!(formData.serviceType && formData.vehicleType && formData.problemDescription);
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(formData.serviceType && formData.vehicleType && formData.problemDescription);
  };

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

          <FormField label="Marke">
            <FormInput
              type="text"
              value={formData.brand || ''}
              onChange={value => handleInputChange('brand', value)}
              placeholder="Fahrzeugmarke"
            />
          </FormField>

          <FormField label="Baujahr">
            <FormInput
              type="number"
              value={formData.buildYear?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'buildYear',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Baujahr"
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
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Autoreparatur" />
    </div>
  );
}

export default AutoreparaturForm;
