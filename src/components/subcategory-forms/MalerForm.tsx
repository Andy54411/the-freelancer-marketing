'use client';
// Maler-spezifisches Formular
import React, { useState, useEffect } from 'react';
import { MalerData } from '@/types/subcategory-forms';
import {
  FormField,
  FormSelect,
  FormInput,
  FormCheckboxGroup,
  FormTextarea,
  SelectOption,
  FormSubmitButton,
} from './FormComponents';

interface Farbe {
  name: string;
  baseColor: string;
  intensitaet: {
    hell: string;
    mittel: string;
    dunkel: string;
  };
  qualitaet: 'Standard' | 'Premium' | 'Profi';
  glanz: 'Matt' | 'Seidenmatt' | 'Seidenglanz' | 'Glänzend';
  preis: number;
}

interface MalerFormProps {
  data: MalerData;
  onDataChange: (data: MalerData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const MalerForm: React.FC<MalerFormProps> = ({ data, onDataChange, onValidationChange }) => {
  const [formData, setFormData] = useState<MalerData>(data);
  const [selectedFarbe, setSelectedFarbe] = useState<Farbe | null>(null);

  const FARBEN_PALETTE: Farbe[] = [
    {
      name: 'Schneeweiß',
      baseColor: '#FFFFFF',
      intensitaet: {
        hell: '#FFFFFF',
        mittel: '#F8F8F8',
        dunkel: '#F0F0F0',
      },
      qualitaet: 'Premium',
      glanz: 'Matt',
      preis: 24.9,
    },
    {
      name: 'Warmgrau',
      baseColor: '#8B8680',
      intensitaet: {
        hell: '#D3D0CC',
        mittel: '#8B8680',
        dunkel: '#5A5651',
      },
      qualitaet: 'Standard',
      glanz: 'Seidenmatt',
      preis: 19.5,
    },
    {
      name: 'Himmelblau',
      baseColor: '#87CEEB',
      intensitaet: {
        hell: '#E0F6FF',
        mittel: '#87CEEB',
        dunkel: '#4682B4',
      },
      qualitaet: 'Profi',
      glanz: 'Seidenglanz',
      preis: 32.0,
    },
    {
      name: 'Waldgrün',
      baseColor: '#228B22',
      intensitaet: {
        hell: '#90EE90',
        mittel: '#228B22',
        dunkel: '#006400',
      },
      qualitaet: 'Premium',
      glanz: 'Matt',
      preis: 28.75,
    },
    {
      name: 'Terrakotta',
      baseColor: '#E2725B',
      intensitaet: {
        hell: '#F4A291',
        mittel: '#E2725B',
        dunkel: '#CD5C2F',
      },
      qualitaet: 'Standard',
      glanz: 'Glänzend',
      preis: 22.3,
    },
    {
      name: 'Anthrazit',
      baseColor: '#36454F',
      intensitaet: {
        hell: '#708090',
        mittel: '#36454F',
        dunkel: '#2F4F4F',
      },
      qualitaet: 'Profi',
      glanz: 'Matt',
      preis: 35.8,
    },
  ];

  const GLANZ_EIGENSCHAFTEN = {
    Matt: {
      beschreibung: 'Keine Reflexion, verbirgt Unebenheiten',
      anwendung: 'Wohnzimmer, Schlafzimmer',
      haltbarkeit: 'Mittel',
    },
    Seidenmatt: {
      beschreibung: 'Leichter Glanz, pflegeleicht',
      anwendung: 'Flur, Kinderzimmer',
      haltbarkeit: 'Gut',
    },
    Seidenglanz: {
      beschreibung: 'Mittlerer Glanz, abwaschbar',
      anwendung: 'Küche, Bad',
      haltbarkeit: 'Sehr gut',
    },
    Glänzend: {
      beschreibung: 'Hoher Glanz, sehr strapazierfähig',
      anwendung: 'Türen, Fenster, Möbel',
      haltbarkeit: 'Excellent',
    },
  };

  const updateData = (updates: Partial<MalerData>) => {
    const updatedData = { ...formData, ...updates };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  const selectFarbe = (farbe: Farbe) => {
    setSelectedFarbe(farbe);
    updateData({
      paintColor: farbe.name,
      selectedFarbeName: farbe.name as
        | 'Schneeweiß'
        | 'Warmgrau'
        | 'Himmelblau'
        | 'Waldgrün'
        | 'Terrakotta'
        | 'Anthrazit',
      paintQuality: farbe.qualitaet.toLowerCase() as 'standard' | 'premium' | 'profi',
      glossLevel: farbe.glanz.toLowerCase().replace('ä', 'ae').replace('ß', 'ss') as
        | 'matt'
        | 'seidenmatt'
        | 'seidenglanz'
        | 'glaenzend',
    });
  };

  const getFarbwert = (farbe: Farbe, intensitaet: 'hell' | 'mittel' | 'dunkel') => {
    return farbe.intensitaet[intensitaet];
  };

  // Validierung
  useEffect(() => {
    const isValid = !!(
      formData.roomType &&
      formData.paintType &&
      formData.materialProvided &&
      formData.surfaceCondition &&
      formData.additionalServices &&
      formData.timeframe
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);
  const isFormValid = () => {
    return !!(
      formData.roomType &&
      formData.paintType &&
      formData.materialProvided &&
      formData.surfaceCondition &&
      formData.additionalServices &&
      formData.timeframe
    );
  };

  const roomTypeOptions: SelectOption[] = [
    { value: 'zimmer', label: 'Zimmer' },
    { value: 'treppe', label: 'Treppe' },
    { value: 'aussenwand', label: 'Außenwand' },
    { value: 'garage', label: 'Garage' },
    { value: 'keller', label: 'Keller' },
    { value: 'bad', label: 'Bad' },
    { value: 'kueche', label: 'Küche' },
    { value: 'wohnzimmer', label: 'Wohnzimmer' },
    { value: 'schlafzimmer', label: 'Schlafzimmer' },
    { value: 'flur', label: 'Flur' },
    { value: 'sonstiges', label: 'Sonstiges' },
  ];

  const paintTypeOptions: SelectOption[] = [
    { value: 'innenfarbe', label: 'Innenfarbe' },
    { value: 'aussenfarbe', label: 'Außenfarbe' },
    { value: 'spezialfarbe', label: 'Spezialfarbe' },
  ];

  const materialProvidedOptions: SelectOption[] = [
    { value: 'kunde', label: 'Kunde stellt Material bereit' },
    { value: 'handwerker', label: 'Handwerker bringt Material mit' },
    { value: 'gemeinsam', label: 'Gemeinsame Beschaffung' },
  ];

  const surfaceConditionOptions: SelectOption[] = [
    { value: 'gut', label: 'Gut (nur streichen)' },
    { value: 'renovierungsbedürftig', label: 'Renovierungsbedürftig' },
    { value: 'stark_beschädigt', label: 'Stark beschädigt' },
  ];

  const additionalServicesOptions: SelectOption[] = [
    { value: 'tapezieren', label: 'Tapezieren' },
    { value: 'spachteln', label: 'Spachteln' },
    { value: 'grundierung', label: 'Grundierung' },
    { value: 'farbberatung', label: 'Farbberatung' },
    { value: 'abkleben', label: 'Abkleben' },
    { value: 'bodenSchutz', label: 'Bodenschutz' },
  ];

  const timeframeOptions: SelectOption[] = [
    { value: 'sofort', label: 'Sofort' },
    { value: 'innerhalb_woche', label: 'Innerhalb einer Woche' },
    { value: 'innerhalb_monat', label: 'Innerhalb eines Monats' },
    { value: 'flexibel', label: 'Flexibel' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Maler-Projektdetails
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Raumtyp" required>
            <FormSelect
              value={formData.roomType || ''}
              onChange={value => updateData({ roomType: value as MalerData['roomType'] })}
              options={roomTypeOptions}
              placeholder="Wählen Sie den Raumtyp"
            />
          </FormField>

          <FormField label="Anzahl Räume">
            <FormInput
              type="number"
              value={formData.roomCount?.toString() || ''}
              onChange={value =>
                updateData({
                  roomCount:
                    typeof value === 'string' ? (value ? parseInt(value) : undefined) : value,
                })
              }
              placeholder="Anzahl der Räume"
            />
          </FormField>

          <FormField label="Quadratmeter">
            <FormInput
              type="number"
              value={formData.squareMeters?.toString() || ''}
              onChange={value =>
                updateData({
                  squareMeters:
                    typeof value === 'string' ? (value ? parseInt(value) : undefined) : value,
                })
              }
              placeholder="Fläche in m²"
            />
          </FormField>

          <FormField label="Wandhöhe (cm)">
            <FormInput
              type="number"
              value={formData.wallHeight?.toString() || ''}
              onChange={value =>
                updateData({
                  wallHeight:
                    typeof value === 'string' ? (value ? parseInt(value) : undefined) : value,
                })
              }
              placeholder="Höhe der Wände in cm"
            />
          </FormField>

          <FormField label="Farbart" required>
            <FormSelect
              value={formData.paintType || ''}
              onChange={value => updateData({ paintType: value as MalerData['paintType'] })}
              options={paintTypeOptions}
              placeholder="Wählen Sie die Farbart"
            />
          </FormField>

          <FormField label="Farbwunsch">
            <FormInput
              value={formData.paintColor || ''}
              onChange={value => updateData({ paintColor: String(value) })}
              placeholder="Gewünschte Farbe"
            />
          </FormField>

          <FormField label="Farbintensität">
            <FormSelect
              value={formData.colorIntensity || ''}
              onChange={value =>
                updateData({ colorIntensity: value as 'hell' | 'mittel' | 'dunkel' })
              }
              options={[
                { value: 'hell', label: 'Hell - Helle, dezente Töne' },
                { value: 'mittel', label: 'Mittel - Standard Farbintensität' },
                { value: 'dunkel', label: 'Dunkel - Kräftige, intensive Farben' },
              ]}
              placeholder="Wählen Sie die Farbintensität"
            />
          </FormField>

          <FormField label="Farbqualität">
            <FormSelect
              value={formData.paintQuality || ''}
              onChange={value =>
                updateData({ paintQuality: value as 'standard' | 'premium' | 'profi' })
              }
              options={[
                { value: 'standard', label: 'Standard - Gutes Preis-Leistungs-Verhältnis' },
                { value: 'premium', label: 'Premium - Hochwertige Farbe mit besserer Deckkraft' },
                { value: 'profi', label: 'Profi - Professionelle Qualität für höchste Ansprüche' },
              ]}
              placeholder="Wählen Sie die Farbqualität"
            />
          </FormField>

          <FormField label="Glanzgrad">
            <FormSelect
              value={formData.glossLevel || ''}
              onChange={value =>
                updateData({
                  glossLevel: value as 'matt' | 'seidenmatt' | 'seidenglanz' | 'glaenzend',
                })
              }
              options={[
                { value: 'matt', label: 'Matt - Keine Reflexion, versteckt Unebenheiten' },
                { value: 'seidenmatt', label: 'Seidenmatt - Leichter Glanz, pflegeleicht' },
                { value: 'seidenglanz', label: 'Seidenglanz - Mittlerer Glanz, abwaschbar' },
                { value: 'glaenzend', label: 'Glänzend - Hoher Glanz, sehr strapazierfähig' },
              ]}
              placeholder="Wählen Sie den Glanzgrad"
            />
          </FormField>

          <FormField label="Materialbereitstellung" required>
            <FormSelect
              value={formData.materialProvided || ''}
              onChange={value =>
                updateData({ materialProvided: value as MalerData['materialProvided'] })
              }
              options={materialProvidedOptions}
              placeholder="Wer stellt das Material bereit?"
            />
          </FormField>

          <FormField label="Oberflächenzustand" required>
            <FormSelect
              value={formData.surfaceCondition || ''}
              onChange={value =>
                updateData({ surfaceCondition: value as MalerData['surfaceCondition'] })
              }
              options={surfaceConditionOptions}
              placeholder="Zustand der Oberfläche"
            />
          </FormField>

          <FormField label="Zeitrahmen" required>
            <FormSelect
              value={formData.timeframe || ''}
              onChange={value => updateData({ timeframe: value as MalerData['timeframe'] })}
              options={timeframeOptions}
              placeholder="Wann soll gearbeitet werden?"
            />
          </FormField>
        </div>

        {/* Professionelle Farbauswahl */}
        <div className="mt-8">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            🎨 Professionelle Farbpalette
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FARBEN_PALETTE.map((farbe, index) => (
              <div
                key={index}
                onClick={() => selectFarbe(farbe)}
                className={`bg-white dark:bg-gray-700 rounded-lg shadow-md overflow-hidden cursor-pointer transition-all hover:scale-105 ${
                  selectedFarbe?.name === farbe.name ? 'ring-4 ring-blue-500' : 'hover:shadow-lg'
                }`}
              >
                {/* Farbvorschau */}
                <div className="h-24 flex">
                  <div
                    className="flex-1"
                    style={{ backgroundColor: farbe.intensitaet.hell }}
                    title="Hell"
                  />
                  <div
                    className="flex-1 border-l-2 border-r-2 border-white"
                    style={{ backgroundColor: farbe.intensitaet.mittel }}
                    title="Mittel"
                  />
                  <div
                    className="flex-1"
                    style={{ backgroundColor: farbe.intensitaet.dunkel }}
                    title="Dunkel"
                  />
                </div>

                {/* Farb-Info */}
                <div className="p-3">
                  <h5 className="font-semibold text-gray-800 dark:text-white text-sm mb-1">
                    {farbe.name}
                  </h5>
                  <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                    <div className="flex justify-between">
                      <span>Qualität:</span>
                      <span
                        className={`font-medium ${
                          farbe.qualitaet === 'Profi'
                            ? 'text-purple-600'
                            : farbe.qualitaet === 'Premium'
                              ? 'text-blue-600'
                              : 'text-green-600'
                        }`}
                      >
                        {farbe.qualitaet}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Glanz:</span>
                      <span className="font-medium">{farbe.glanz}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Preis:</span>
                      <span className="font-bold text-gray-800 dark:text-white">
                        {farbe.preis.toFixed(2)} €/L
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Farbdetails */}
        {selectedFarbe && (
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h5 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
              Ausgewählte Farbe: {selectedFarbe.name}
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Farbmuster */}
              <div>
                <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Farbintensitäten
                </h6>
                <div className="space-y-2">
                  {(['hell', 'mittel', 'dunkel'] as const).map(intensitaet => (
                    <div key={intensitaet} className="flex items-center space-x-3">
                      <div
                        className="w-8 h-8 rounded border-2 border-gray-300"
                        style={{ backgroundColor: getFarbwert(selectedFarbe, intensitaet) }}
                      />
                      <div className="text-sm">
                        <div className="font-medium text-gray-800 dark:text-white capitalize">
                          {intensitaet}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          {getFarbwert(selectedFarbe, intensitaet)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Eigenschaften */}
              <div>
                <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Eigenschaften
                </h6>
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>Glanzgrad:</strong> {selectedFarbe.glanz}
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {GLANZ_EIGENSCHAFTEN[selectedFarbe.glanz].beschreibung}
                    </div>
                  </div>
                  <div>
                    <strong>Anwendung:</strong> {GLANZ_EIGENSCHAFTEN[selectedFarbe.glanz].anwendung}
                  </div>
                  <div>
                    <strong>Haltbarkeit:</strong>{' '}
                    {GLANZ_EIGENSCHAFTEN[selectedFarbe.glanz].haltbarkeit}
                  </div>
                  <div className="text-lg font-bold text-green-600">
                    {selectedFarbe.preis.toFixed(2)} € / Liter
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Farbvorschau */}
        {(formData.paintColor || formData.colorIntensity || formData.glossLevel) && (
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
              Farbauswahl Übersicht
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {formData.paintColor && (
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Farbwunsch
                  </div>
                  <div className="bg-white dark:bg-gray-600 p-3 rounded border text-gray-900 dark:text-white">
                    {formData.paintColor}
                  </div>
                </div>
              )}

              {formData.colorIntensity && (
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Intensität
                  </div>
                  <div
                    className={`p-3 rounded border text-white font-medium ${
                      formData.colorIntensity === 'hell'
                        ? 'bg-blue-300'
                        : formData.colorIntensity === 'mittel'
                          ? 'bg-blue-500'
                          : 'bg-blue-700'
                    }`}
                  >
                    {formData.colorIntensity?.charAt(0).toUpperCase() +
                      formData.colorIntensity?.slice(1)}
                  </div>
                </div>
              )}

              {formData.glossLevel && (
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Glanzgrad
                  </div>
                  <div
                    className={`p-3 rounded border text-gray-900 font-medium ${
                      formData.glossLevel === 'matt'
                        ? 'bg-gray-200'
                        : formData.glossLevel === 'seidenmatt'
                          ? 'bg-gray-100 shadow-sm'
                          : formData.glossLevel === 'seidenglanz'
                            ? 'bg-white shadow-md'
                            : 'bg-white shadow-lg'
                    }`}
                  >
                    {formData.glossLevel === 'glaenzend'
                      ? 'Glänzend'
                      : formData.glossLevel?.charAt(0).toUpperCase() +
                        formData.glossLevel?.slice(1)}
                  </div>
                </div>
              )}
            </div>

            {formData.paintQuality && (
              <div className="mt-4 text-center">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Qualität
                </div>
                <div
                  className={`inline-block px-4 py-2 rounded-full text-white font-medium ${
                    formData.paintQuality === 'standard'
                      ? 'bg-green-500'
                      : formData.paintQuality === 'premium'
                        ? 'bg-blue-500'
                        : 'bg-purple-500'
                  }`}
                >
                  {formData.paintQuality === 'profi'
                    ? 'Profi'
                    : formData.paintQuality?.charAt(0).toUpperCase() +
                      formData.paintQuality?.slice(1)}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-4">
          <FormField label="Zusätzliche Services">
            <FormCheckboxGroup
              value={formData.additionalServices || []}
              onChange={value => updateData({ additionalServices: value })}
              options={additionalServicesOptions}
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Besondere Anforderungen">
            <FormTextarea
              value={formData.specialRequirements || ''}
              onChange={value => updateData({ specialRequirements: value })}
              placeholder="Beschreiben Sie besondere Wünsche oder Anforderungen"
              rows={3}
            />
          </FormField>
        </div>
      </div>

      <FormSubmitButton isValid={isFormValid()} subcategory="Maler" formData={formData} />
    </div>
  );
};

export default MalerForm;
