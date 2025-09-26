// Pfad könnte sein: src/components/allgemein.tsx
'use client';

import React from 'react';
// KORREKTUR 1: GoogleMap und Circle bleiben, aber useJsApiLoader wird nicht mehr gebraucht.
import { GoogleMap, Circle } from '@react-google-maps/api';
import { UserDataForSettings } from '@/types/settings';

// KORREKTUR 2: Wir importieren unseren eigenen Hook.
import { useGoogleMaps } from '@/contexts/GoogleMapsLoaderContext';

export interface GeneralFormProps {
  formData: UserDataForSettings;
  handleChange: (path: string, value: string | number) => void;
  onOpenManagingDirectorPersonalModal: () => void;
}

const mapContainerStyle = {
  width: '100%',
  height: '300px',
};

const GoogleMapComponent: React.FC<{
  lat: number | null;
  lng: number | null;
  radiusKm: number;
  onRadiusChange: (radius: number) => void;
}> = ({ lat, lng, radiusKm, onRadiusChange }) => {
  // KORREKTUR 3: useJsApiLoader wird durch unseren zentralen Hook ersetzt.
  const { isLoaded } = useGoogleMaps();

  // Der Rest der Komponente bleibt fast identisch.
  // Er wartet jetzt auf den globalen Ladezustand.
  if (!isLoaded) return <p>Lade Karte...</p>;

  const center = lat && lng ? { lat, lng } : { lat: 48.1351, lng: 11.582 };

  return (
    <div>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={10}
        options={{
          fullscreenControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          clickableIcons: false,
          zoomControl: true,
        }}
      >
        <Circle
          center={center}
          radius={radiusKm * 1000}
          options={{
            fillColor: '#14ad9f80',
            strokeColor: '#14ad9f',
            strokeWeight: 2,
            clickable: false,
            draggable: false,
            editable: false,
            visible: true,
          }}
        />
      </GoogleMap>
      <div className="mt-4 flex gap-4 items-center">
        <label className="font-medium text-gray-900 dark:text-gray-200">Radius anpassen:</label>
        <input
          type="range"
          min={1}
          max={100}
          value={radiusKm}
          onChange={e => onRadiusChange(Number(e.target.value))}
          className="w-full"
        />
        <span className="min-w-[3rem]">{radiusKm} km</span>
      </div>
    </div>
  );
};

// Die GeneralForm Komponente muss nicht geändert werden, da sie nur die
// korrigierte GoogleMapComponent verwendet.
const GeneralForm: React.FC<GeneralFormProps> = ({
  formData,
  handleChange,
  onOpenManagingDirectorPersonalModal,
}) => {
  const { step1, step2, lat, lng, radiusKm } = formData;

  // Debug-Ausgaben für Formularwerte

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 space-y-6">
      {/* ... gesamter Inhalt von GeneralForm bleibt unverändert ... */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="flex flex-col">
          <label className="block mb-1 font-medium">Firma</label>
          <input
            value={step2?.companyName || ''}
            onChange={e => handleChange('step2.companyName', e.target.value)}
            className="input dark:bg-gray-800 dark:text-white dark:border-gray-700"
          />
        </div>
        <div className="flex flex-col">
          <label className="block mb-1 font-medium">Firmenzusatz</label>
          <input
            value={step2?.companySuffix || ''}
            onChange={e => handleChange('step2.companySuffix', e.target.value)}
            className="input dark:bg-gray-800 dark:text-white dark:border-gray-700"
            placeholder="z.B. GmbH, UG, e.K."
          />
        </div>

        <div className="md:col-span-2 mb-4">
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-teal-800">Geschäftsführer-Daten</h3>
                <p className="text-xs text-teal-600 mt-1">
                  Verwalten Sie die persönlichen Daten aller Geschäftsführer
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenManagingDirectorPersonalModal}
                className="inline-flex items-center px-3 py-2 border border-teal-300 shadow-sm text-sm leading-4 font-medium rounded-md text-teal-700 bg-white hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Bearbeiten
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col">
          <label className="block mb-1 font-medium">Rechtsform</label>
          <input
            value={formData.legalForm || ''}
            onChange={e => handleChange('legalForm', e.target.value)}
            className="input dark:bg-gray-800 dark:text-white dark:border-gray-700"
            placeholder="z.B. Einzelunternehmen, GmbH, UG"
          />
        </div>
        <div className="flex flex-col">
          <label className="block mb-1 font-medium">Straße</label>
          <input
            value={step2?.address || step2?.street || step1?.personalStreet || ''}
            onChange={e => handleChange('step2.address', e.target.value)}
            className="input dark:bg-gray-800 dark:text-white dark:border-gray-700"
            placeholder="Straße und Hausnummer"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label className="block mb-1 font-medium">PLZ</label>
            <input
              value={step2?.postalCode || step1?.personalPostalCode || ''}
              onChange={e => handleChange('step2.postalCode', e.target.value)}
              className="input dark:bg-gray-800 dark:text-white dark:border-gray-700"
            />
          </div>
          <div className="flex flex-col">
            <label className="block mb-1 font-medium">Stadt</label>
            <input
              value={step2?.city || ''}
              onChange={e => handleChange('step2.city', e.target.value)}
              className="input dark:bg-gray-800 dark:text-white dark:border-gray-700"
            />
          </div>
        </div>
        <div className="flex flex-col">
          <label className="block mb-1 font-medium">Land</label>
          <input
            value="Deutschland"
            disabled
            className="input bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-not-allowed"
          />
        </div>
        <div className="flex flex-col">
          <label className="block mb-1 font-medium">Telefon</label>
          <input
            value={step2?.companyPhoneNumber || step1?.phoneNumber || ''}
            onChange={e => handleChange('step2.companyPhoneNumber', e.target.value)}
            className="input dark:bg-gray-800 dark:text-white dark:border-gray-700"
          />
        </div>
        <div className="flex flex-col">
          <label className="block mb-1 font-medium">FAX</label>
          <input
            value={step2?.fax || ''}
            onChange={e => handleChange('step2.fax', e.target.value)}
            className="input dark:bg-gray-800 dark:text-white dark:border-gray-700"
          />
        </div>
        <div className="flex flex-col">
          <label className="block mb-1 font-medium">E-Mail-Adresse</label>
          <input
            value={step1?.email || ''}
            onChange={e => handleChange('step1.email', e.target.value)}
            className="input dark:bg-gray-800 dark:text-white dark:border-gray-700"
          />
        </div>
        <div className="flex flex-col">
          <label className="block mb-1 font-medium">Webseite</label>
          <input
            value={step2?.website || ''}
            onChange={e => handleChange('step2.website', e.target.value)}
            className="input dark:bg-gray-800 dark:text-white dark:border-gray-700"
          />
        </div>
        <div className="flex flex-col">
          <label className="block mb-1 font-medium">Gesprochene Sprachen</label>
          <input
            value={step2?.languages || ''}
            onChange={e => handleChange('step2.languages', e.target.value)}
            className="input dark:bg-gray-800 dark:text-white dark:border-gray-700"
            placeholder="z. B. Deutsch, Englisch, Türkisch"
          />
        </div>
        <div className="flex flex-col">
          <label className="block mb-1 font-medium">Branche</label>
          <select
            value={step2?.industry || ''}
            onChange={e => handleChange('step2.industry', e.target.value)}
            className="input dark:bg-gray-800 dark:text-white dark:border-gray-700"
          >
            <option value="">Bitte wählen</option>
            <option value="Handwerk">Handwerk</option>
            <option value="Haushalt & Reinigung">Haushalt & Reinigung</option>
            <option value="Transport & Logistik">Transport & Logistik</option>
            <option value="Hotel & Gastronomie">Hotel & Gastronomie</option>
            <option value="IT & Technik">IT & Technik</option>
            <option value="Marketing & Vertrieb">Marketing & Vertrieb</option>
            <option value="Finanzen & Recht">Finanzen & Recht</option>
            <option value="Gesundheit & Wellness">Gesundheit & Wellness</option>
            <option value="Bildung & Nachhilfe">Bildung & Nachhilfe</option>
            <option value="Kunst & Kultur">Kunst & Kultur</option>
            <option value="Veranstaltungen & Events">Veranstaltungen & Events</option>
            <option value="Tiere & Pflanzen">Tiere & Pflanzen</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4 col-span-2">
          <div className="flex flex-col">
            <label className="block mb-1 font-medium">Mitarbeiterzahl</label>
            <input
              value={step2?.employees || ''}
              onChange={e => handleChange('step2.employees', e.target.value)}
              className="input dark:bg-gray-800 dark:text-white dark:border-gray-700"
            />
          </div>
          <div className="flex flex-col">
            <label className="block mb-1 font-medium">Einzugsgebiet Radius (km)</label>
            <input
              type="number"
              min={1}
              max={100}
              value={radiusKm ?? 30}
              onChange={e => handleChange('radiusKm', Number(e.target.value))}
              className="input dark:bg-gray-800 dark:text-white dark:border-gray-700"
            />
          </div>
        </div>
        <div className="flex flex-col col-span-2 mt-4">
          <label className="block mb-2 font-medium">Einzugsgebiet auf der Karte</label>
          {typeof window !== 'undefined' && (
            <GoogleMapComponent
              lat={lat ?? null}
              lng={lng ?? null}
              radiusKm={radiusKm ?? 30}
              onRadiusChange={newRadius => handleChange('radiusKm', newRadius)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default GeneralForm;
