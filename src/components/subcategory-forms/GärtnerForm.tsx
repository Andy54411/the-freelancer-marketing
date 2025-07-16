import React, { useState, useEffect } from 'react';
import { GärtnerData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
  FormCheckboxGroup,
  FormRadioGroup,
} from './FormComponents';

interface GärtnerFormProps {
  data: GärtnerData;
  onDataChange: (data: GärtnerData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const GärtnerForm: React.FC<GärtnerFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<GärtnerData>(data);

  const serviceTypeOptions = [
    { value: 'gartenpflege', label: 'Gartenpflege' },
    { value: 'gartengestaltung', label: 'Gartengestaltung' },
    { value: 'rasenpflege', label: 'Rasenpflege' },
    { value: 'baumschnitt', label: 'Baumschnitt' },
    { value: 'heckenschnitt', label: 'Heckenschnitt' },
    { value: 'pflanzen', label: 'Pflanzen' },
    { value: 'bewässerung', label: 'Bewässerung' },
    { value: 'unkrautbekämpfung', label: 'Unkrautbekämpfung' },
    { value: 'düngen', label: 'Düngen' },
    { value: 'winterdienst', label: 'Winterdienst' },
    { value: 'teichpflege', label: 'Teichpflege' },
    { value: 'beratung', label: 'Beratung' },
    { value: 'andere', label: 'Andere' },
  ];

  const gardenTypeOptions = [
    { value: 'ziergarten', label: 'Ziergarten' },
    { value: 'nutzgarten', label: 'Nutzgarten' },
    { value: 'kräutergarten', label: 'Kräutergarten' },
    { value: 'gemüsegarten', label: 'Gemüsegarten' },
    { value: 'steingarten', label: 'Steingarten' },
    { value: 'wassergarten', label: 'Wassergarten' },
    { value: 'japangarten', label: 'Japangarten' },
    { value: 'naturgarten', label: 'Naturgarten' },
    { value: 'dachgarten', label: 'Dachgarten' },
    { value: 'balkongarten', label: 'Balkongarten' },
    { value: 'andere', label: 'Andere' },
  ];

  const gardenSizeOptions = [
    { value: 'sehr_klein', label: 'Sehr klein (bis 50 m²)' },
    { value: 'klein', label: 'Klein (50-200 m²)' },
    { value: 'mittel', label: 'Mittel (200-500 m²)' },
    { value: 'gross', label: 'Groß (500-1000 m²)' },
    { value: 'sehr_gross', label: 'Sehr groß (über 1000 m²)' },
  ];

  const frequencyOptions = [
    { value: 'einmalig', label: 'Einmalig' },
    { value: 'wöchentlich', label: 'Wöchentlich' },
    { value: 'zweiwöchentlich', label: 'Alle 2 Wochen' },
    { value: 'monatlich', label: 'Monatlich' },
    { value: 'saisonal', label: 'Saisonal' },
    { value: 'nach_bedarf', label: 'Nach Bedarf' },
  ];

  const seasonOptions = [
    { value: 'frühling', label: 'Frühling' },
    { value: 'sommer', label: 'Sommer' },
    { value: 'herbst', label: 'Herbst' },
    { value: 'winter', label: 'Winter' },
    { value: 'ganzjährig', label: 'Ganzjährig' },
  ];

  const urgencyOptions = [
    { value: 'nicht_eilig', label: 'Nicht eilig' },
    { value: 'normal', label: 'Normal' },
    { value: 'eilig', label: 'Eilig' },
    { value: 'sehr_eilig', label: 'Sehr eilig' },
  ];

  const budgetRangeOptions = [
    { value: 'unter_50', label: 'Unter 50€' },
    { value: '50_100', label: '50€ - 100€' },
    { value: '100_200', label: '100€ - 200€' },
    { value: '200_500', label: '200€ - 500€' },
    { value: '500_1000', label: '500€ - 1000€' },
    { value: '1000_2000', label: '1000€ - 2000€' },
    { value: 'über_2000', label: 'Über 2000€' },
  ];

  const plantTypeOptions = [
    { value: 'bäume', label: 'Bäume' },
    { value: 'sträucher', label: 'Sträucher' },
    { value: 'blumen', label: 'Blumen' },
    { value: 'stauden', label: 'Stauden' },
    { value: 'gräser', label: 'Gräser' },
    { value: 'rosen', label: 'Rosen' },
    { value: 'hecken', label: 'Hecken' },
    { value: 'kletterpflanzen', label: 'Kletterpflanzen' },
    { value: 'gemüse', label: 'Gemüse' },
    { value: 'kräuter', label: 'Kräuter' },
    { value: 'obst', label: 'Obst' },
    { value: 'andere', label: 'Andere' },
  ];

  const additionalServicesOptions = [
    { value: 'beratung', label: 'Beratung' },
    { value: 'planung', label: 'Planung' },
    { value: 'design', label: 'Design' },
    { value: 'erdarbeiten', label: 'Erdarbeiten' },
    { value: 'bewässerungsanlage', label: 'Bewässerungsanlage' },
    { value: 'beleuchtung', label: 'Beleuchtung' },
    { value: 'wege', label: 'Wege' },
    { value: 'terrasse', label: 'Terrasse' },
    { value: 'teich', label: 'Teich' },
    { value: 'brunnen', label: 'Brunnen' },
    { value: 'zaun', label: 'Zaun' },
    { value: 'pergola', label: 'Pergola' },
    { value: 'pavillon', label: 'Pavillon' },
    { value: 'spielplatz', label: 'Spielplatz' },
    { value: 'kompost', label: 'Kompost' },
    { value: 'mulchen', label: 'Mulchen' },
    { value: 'vertikutieren', label: 'Vertikutieren' },
    { value: 'aerifizieren', label: 'Aerifizieren' },
    { value: 'nachsäen', label: 'Nachsäen' },
    { value: 'kalken', label: 'Kalken' },
    { value: 'schädlingsbekämpfung', label: 'Schädlingsbekämpfung' },
    { value: 'pflanzenschutz', label: 'Pflanzenschutz' },
    { value: 'winterschutz', label: 'Winterschutz' },
    { value: 'frühjahrsputz', label: 'Frühjahrsputz' },
    { value: 'herbstputz', label: 'Herbstputz' },
    { value: 'laubentfernung', label: 'Laubentfernung' },
    { value: 'schneeräumung', label: 'Schneeräumung' },
    { value: 'streudienst', label: 'Streudienst' },
    { value: 'entsorgung', label: 'Entsorgung' },
    { value: 'materialbeschaffung', label: 'Materialbeschaffung' },
    { value: 'express_service', label: 'Express-Service' },
    { value: 'wochenend_service', label: 'Wochenend-Service' },
    { value: 'notdienst', label: 'Notdienst' },
    { value: 'garantie', label: 'Garantie' },
    { value: 'nachpflege', label: 'Nachpflege' },
    { value: 'wartung', label: 'Wartung' },
    { value: 'schulung', label: 'Schulung' },
    { value: 'pflegeplan', label: 'Pflegeplan' },
    { value: 'jahreszeitliche_pflege', label: 'Jahreszeitliche Pflege' },
  ];

  const handleInputChange = (field: keyof GärtnerData, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  useEffect(() => {
    const isValid = !!(
      formData.serviceType &&
      formData.gardenType &&
      formData.gardenSize &&
      formData.frequency &&
      formData.season &&
      formData.urgency &&
      formData.budgetRange &&
      formData.projectDescription
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Gärtner-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Art der Gartenarbeit" required>
            <FormSelect
              value={formData.serviceType || ''}
              onChange={value => handleInputChange('serviceType', value)}
              options={serviceTypeOptions}
              placeholder="Wählen Sie die Art der Arbeit"
            />
          </FormField>

          <FormField label="Gartentyp" required>
            <FormCheckboxGroup
              value={formData.gardenType || []}
              onChange={value => handleInputChange('gardenType', value)}
              options={gardenTypeOptions}
            />
          </FormField>

          <FormField label="Gartengröße" required>
            <FormSelect
              value={formData.gardenSize || ''}
              onChange={value => handleInputChange('gardenSize', value)}
              options={gardenSizeOptions}
              placeholder="Wählen Sie die Gartengröße"
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

          <FormField label="Saison" required>
            <FormSelect
              value={formData.season || ''}
              onChange={value => handleInputChange('season', value)}
              options={seasonOptions}
              placeholder="Wählen Sie die Saison"
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

          <FormField label="Gartenfläche (m²)">
            <FormInput
              type="number"
              value={formData.gardenArea?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'gardenArea',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Gartenfläche in m²"
            />
          </FormField>

          <FormField label="Rasenfläche (m²)">
            <FormInput
              type="number"
              value={formData.lawnArea?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'lawnArea',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Rasenfläche in m²"
            />
          </FormField>

          <FormField label="Beetfläche (m²)">
            <FormInput
              type="number"
              value={formData.bedArea?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'bedArea',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Beetfläche in m²"
            />
          </FormField>

          <FormField label="Anzahl Bäume">
            <FormInput
              type="number"
              value={formData.treeCount?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'treeCount',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Anzahl Bäume"
            />
          </FormField>

          <FormField label="Heckenlänge (m)">
            <FormInput
              type="number"
              value={formData.hedgeLength?.toString() || ''}
              onChange={value =>
                handleInputChange(
                  'hedgeLength',
                  typeof value === 'string' ? (value ? parseInt(value) : undefined) : value
                )
              }
              placeholder="Heckenlänge in m"
            />
          </FormField>

          <FormField label="Gewünschter Termin">
            <FormInput
              type="text"
              value={formData.preferredDate || ''}
              onChange={value => handleInputChange('preferredDate', value)}
              placeholder="TT.MM.JJJJ"
            />
          </FormField>

          <FormField label="Gewünschte Uhrzeit">
            <FormInput
              type="text"
              value={formData.preferredTime || ''}
              onChange={value => handleInputChange('preferredTime', value)}
              placeholder="HH:MM"
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

          <FormField label="Telefonnummer">
            <FormInput
              type="text"
              value={formData.phoneNumber || ''}
              onChange={value => handleInputChange('phoneNumber', value)}
              placeholder="Telefonnummer"
            />
          </FormField>

          <FormField label="E-Mail">
            <FormInput
              type="email"
              value={formData.email || ''}
              onChange={value => handleInputChange('email', value)}
              placeholder="E-Mail-Adresse"
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

          <FormField label="Geschätzte Dauer">
            <FormInput
              type="text"
              value={formData.estimatedDuration || ''}
              onChange={value => handleInputChange('estimatedDuration', value)}
              placeholder="Stunden"
            />
          </FormField>

          <FormField label="Wasseranschluss vorhanden">
            <FormRadioGroup
              name="waterConnection"
              value={formData.waterConnection || ''}
              onChange={value => handleInputChange('waterConnection', value)}
              options={[
                { value: 'ja', label: 'Ja' },
                { value: 'nein', label: 'Nein' },
                { value: 'unbekannt', label: 'Unbekannt' },
              ]}
            />
          </FormField>

          <FormField label="Stromanschluss vorhanden">
            <FormRadioGroup
              name="powerConnection"
              value={formData.powerConnection || ''}
              onChange={value => handleInputChange('powerConnection', value)}
              options={[
                { value: 'ja', label: 'Ja' },
                { value: 'nein', label: 'Nein' },
                { value: 'unbekannt', label: 'Unbekannt' },
              ]}
            />
          </FormField>

          <FormField label="Zufahrt möglich">
            <FormRadioGroup
              name="access"
              value={formData.access || ''}
              onChange={value => handleInputChange('access', value)}
              options={[
                { value: 'ja', label: 'Ja' },
                { value: 'nein', label: 'Nein' },
                { value: 'eingeschränkt', label: 'Eingeschränkt' },
              ]}
            />
          </FormField>

          <FormField label="Parkplatz vorhanden">
            <FormRadioGroup
              name="parking"
              value={formData.parking || ''}
              onChange={value => handleInputChange('parking', value)}
              options={[
                { value: 'ja', label: 'Ja' },
                { value: 'nein', label: 'Nein' },
                { value: 'unbekannt', label: 'Unbekannt' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Pflanzentypen">
            <FormCheckboxGroup
              value={formData.plantTypes || []}
              onChange={value => handleInputChange('plantTypes', value)}
              options={plantTypeOptions}
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
              placeholder="Beschreiben Sie Ihr Gartenprojekt detailliert"
              rows={4}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Gartenwünsche">
            <FormTextarea
              value={formData.gardenWishes || ''}
              onChange={value => handleInputChange('gardenWishes', value)}
              placeholder="Besondere Gartenwünsche oder Designvorstellungen"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Problembereiche">
            <FormTextarea
              value={formData.problemAreas || ''}
              onChange={value => handleInputChange('problemAreas', value)}
              placeholder="Problematische Bereiche im Garten"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Bodenbeschaffenheit">
            <FormTextarea
              value={formData.soilCondition || ''}
              onChange={value => handleInputChange('soilCondition', value)}
              placeholder="Bodenbeschaffenheit und -qualität"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Lichtverhältnisse">
            <FormTextarea
              value={formData.lightConditions || ''}
              onChange={value => handleInputChange('lightConditions', value)}
              placeholder="Sonnen- und Schattenbereiche"
              rows={3}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Zugangshinweise">
            <FormTextarea
              value={formData.accessInstructions || ''}
              onChange={value => handleInputChange('accessInstructions', value)}
              placeholder="Hinweise zum Zugang oder zur Anfahrt"
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

        <div className="mt-4">
          <FormField label="Haustiere vorhanden">
            <FormRadioGroup
              name="pets"
              value={formData.pets || ''}
              onChange={value => handleInputChange('pets', value)}
              options={[
                { value: 'ja', label: 'Ja, Haustiere vorhanden' },
                { value: 'nein', label: 'Nein, keine Haustiere' },
                { value: 'geplant', label: 'Geplant' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Kinder vorhanden">
            <FormRadioGroup
              name="children"
              value={formData.children || ''}
              onChange={value => handleInputChange('children', value)}
              options={[
                { value: 'ja', label: 'Ja, Kinder vorhanden' },
                { value: 'nein', label: 'Nein, keine Kinder' },
                { value: 'geplant', label: 'Geplant' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Materiallieferung">
            <FormRadioGroup
              name="materialDelivery"
              value={formData.materialDelivery || ''}
              onChange={value => handleInputChange('materialDelivery', value)}
              options={[
                { value: 'ja', label: 'Ja, Material liefern' },
                { value: 'nein', label: 'Nein, ist vorhanden' },
                { value: 'beratung', label: 'Beratung gewünscht' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Biologisch bewirtschaftet">
            <FormRadioGroup
              name="organic"
              value={formData.organic || ''}
              onChange={value => handleInputChange('organic', value)}
              options={[
                { value: 'ja', label: 'Ja, biologisch' },
                { value: 'nein', label: 'Nein, konventionell' },
                { value: 'bevorzugt', label: 'Bevorzugt' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Nachhaltigkeit wichtig">
            <FormRadioGroup
              name="sustainable"
              value={formData.sustainable || ''}
              onChange={value => handleInputChange('sustainable', value)}
              options={[
                { value: 'ja', label: 'Ja, sehr wichtig' },
                { value: 'nein', label: 'Nein, nicht wichtig' },
                { value: 'teilweise', label: 'Teilweise' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Garantie gewünscht">
            <FormRadioGroup
              name="warranty"
              value={formData.warranty || ''}
              onChange={value => handleInputChange('warranty', value)}
              options={[
                { value: 'ja', label: 'Ja, Garantie gewünscht' },
                { value: 'nein', label: 'Nein, keine Garantie' },
                { value: 'standard', label: 'Standard-Garantie' },
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
                { value: 'ja', label: 'Ja, Kostenvoranschlag gewünscht' },
                { value: 'nein', label: 'Nein, direkt beauftragen' },
                { value: 'abhängig', label: 'Abhängig von Kosten' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Eigenleistung möglich">
            <FormRadioGroup
              name="selfWork"
              value={formData.selfWork || ''}
              onChange={value => handleInputChange('selfWork', value)}
              options={[
                { value: 'ja', label: 'Ja, Eigenleistung möglich' },
                { value: 'nein', label: 'Nein, Vollservice' },
                { value: 'teilweise', label: 'Teilweise' },
              ]}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Wartungsvertrag gewünscht">
            <FormRadioGroup
              name="maintenanceContract"
              value={formData.maintenanceContract || ''}
              onChange={value => handleInputChange('maintenanceContract', value)}
              options={[
                { value: 'ja', label: 'Ja, Wartungsvertrag' },
                { value: 'nein', label: 'Nein, nur einmalig' },
                { value: 'später', label: 'Später entscheiden' },
              ]}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default GärtnerForm;
