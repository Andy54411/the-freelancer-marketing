// Pfad könnte sein: src/components/allgemein.tsx
'use client';

import React from 'react';
// KORREKTUR 1: GoogleMap und Circle bleiben, aber useJsApiLoader wird nicht mehr gebraucht.
import { GoogleMap, Circle } from '@react-google-maps/api';
import { UserDataForSettings } from '@/types/settings';
import { HelpCircle } from 'lucide-react';

// KORREKTUR 2: Wir importieren unseren eigenen Hook.
import { useGoogleMaps } from '@/contexts/GoogleMapsLoaderContext';

// Liste der Rechtsformen
const RECHTSFORMEN = [
  'Einzelunternehmen',
  'Freiberufler:in',
  'GbR (Gesellschaft bürgerlichen Rechts)',
  'GmbH (Gesellschaft mit beschränkter Haftung)',
  'UG (haftungsbeschränkt)',
  'AG (Aktiengesellschaft)',
  'OHG (Offene Handelsgesellschaft)',
  'KG (Kommanditgesellschaft)',
  'GmbH & Co. KG',
  'e.K. (eingetragener Kaufmann)',
  'PartG (Partnerschaftsgesellschaft)',
  'Sonstige',
];

// Hilfe-Texte für alle Felder
const HELP_TEXTS: Record<string, { title: string; content: string }> = {
  companyName: {
    title: 'Firmenname',
    content: 'Der offizielle Name deines Unternehmens, wie er im Handelsregister oder Gewerbeschein eingetragen ist.',
  },
  companySuffix: {
    title: 'Firmenzusatz',
    content: 'Ergänzende Bezeichnung zu deinem Firmennamen, z.B. die Rechtsform (GmbH, UG) oder eine Branchenbezeichnung.',
  },
  legalForm: {
    title: 'Rechtsform',
    content: 'Die juristische Organisationsform deines Unternehmens. Diese beeinflusst Haftung, Steuern und Buchführungspflichten.',
  },
  foundingDate: {
    title: 'Gründungsdatum',
    content: 'Das Datum, an dem dein Unternehmen offiziell gegründet wurde. Wichtig für steuerliche Zwecke und Förderungen.',
  },
  taxNumber: {
    title: 'Steuernummer',
    content: 'Die Steuernummer wird vom Finanzamt vergeben und besteht aus Zahlen im Format XXX/XXX/XXXXX. Du findest sie auf deinem Steuerbescheid.',
  },
  vatId: {
    title: 'Umsatzsteuer-ID',
    content: 'Die USt-IdNr. (z.B. DE123456789) benötigst du für Geschäfte mit EU-Unternehmen. Du kannst sie beim Bundeszentralamt für Steuern beantragen.',
  },
  address: {
    title: 'Straße',
    content: 'Die Geschäftsadresse deines Unternehmens, wie sie auf Rechnungen und offiziellen Dokumenten erscheint.',
  },
  postalCode: {
    title: 'Postleitzahl',
    content: 'Die 5-stellige Postleitzahl deines Geschäftssitzes.',
  },
  city: {
    title: 'Stadt',
    content: 'Der Ort, an dem dein Unternehmen seinen Sitz hat.',
  },
  phone: {
    title: 'Telefon',
    content: 'Die geschäftliche Telefonnummer für Kundenanfragen und auf Rechnungen.',
  },
  fax: {
    title: 'FAX',
    content: 'Optionale Faxnummer für den Geschäftsverkehr.',
  },
  email: {
    title: 'E-Mail-Adresse',
    content: 'Die geschäftliche E-Mail-Adresse für Korrespondenz und auf Rechnungen.',
  },
  dateOfBirth: {
    title: 'Geburtsdatum',
    content: 'Dein Geburtsdatum wird für steuerliche Zwecke und die Identifizierung beim Finanzamt benötigt.',
  },
  website: {
    title: 'Webseite',
    content: 'Die URL deiner Unternehmenswebsite, falls vorhanden.',
  },
  languages: {
    title: 'Gesprochene Sprachen',
    content: 'Sprachen, in denen du Kunden beraten kannst.',
  },
  industry: {
    title: 'Branche',
    content: 'Der Wirtschaftszweig, in dem dein Unternehmen hauptsächlich tätig ist.',
  },
  employees: {
    title: 'Mitarbeiterzahl',
    content: 'Die Anzahl der Mitarbeiter in deinem Unternehmen.',
  },
  radius: {
    title: 'Einzugsgebiet',
    content: 'Der geografische Bereich, in dem du deine Dienstleistungen anbietest.',
  },
};

// HelpTooltip Komponente
const HelpTooltip: React.FC<{ fieldKey: string }> = ({ fieldKey }) => {
  const helpText = HELP_TEXTS[fieldKey];

  if (!helpText) return null;

  return (
    <div className="relative inline-block ml-1 group">
      <span
        className="text-gray-400 hover:text-[#14ad9f] transition-colors cursor-help"
        aria-label="Hilfe anzeigen"
      >
        <HelpCircle className="w-4 h-4" />
      </span>
      <div className="absolute z-50 left-0 top-6 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
        <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{helpText.title}</h4>
        <p className="text-xs text-gray-600 dark:text-gray-400">{helpText.content}</p>
      </div>
    </div>
  );
};

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
        <span className="min-w-12">{radiusKm} km</span>
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
  const { step1, step2, step3, lat, lng, radiusKm } = formData;

  // Debug-Ausgaben für Formularwerte

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 space-y-6">
      {/* ... gesamter Inhalt von GeneralForm bleibt unverändert ... */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="flex flex-col">
          <label className="flex mb-1 font-medium items-center">
            Firma
            <HelpTooltip fieldKey="companyName" />
          </label>
          <input
            value={step2?.companyName || ''}
            onChange={e => handleChange('step2.companyName', e.target.value)}
            className="input dark:bg-gray-800 dark:text-white dark:border-gray-700"
          />
        </div>
        <div className="flex flex-col">
          <label className="flex mb-1 font-medium items-center">
            Firmenzusatz
            <HelpTooltip fieldKey="companySuffix" />
          </label>
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
          <label className="flex mb-1 font-medium items-center">
            Rechtsform
            <HelpTooltip fieldKey="legalForm" />
          </label>
          <select
            value={formData.legalForm || ''}
            onChange={e => handleChange('legalForm', e.target.value)}
            className="input dark:bg-gray-800 dark:text-white dark:border-gray-700"
          >
            <option value="">Bitte wählen...</option>
            {RECHTSFORMEN.map(form => (
              <option key={form} value={form}>{form}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="flex mb-1 font-medium items-center">
            Gründungsdatum
            <HelpTooltip fieldKey="foundingDate" />
          </label>
          <input
            type="date"
            value={step2?.foundingDate || ''}
            onChange={e => handleChange('step2.foundingDate', e.target.value)}
            className="input dark:bg-gray-800 dark:text-white dark:border-gray-700"
          />
        </div>
        <div className="flex flex-col">
          <label className="flex mb-1 font-medium items-center">
            Straße
            <HelpTooltip fieldKey="address" />
          </label>
          <input
            value={step2?.address || step2?.street || step1?.personalStreet || ''}
            onChange={e => handleChange('step2.address', e.target.value)}
            className="input dark:bg-gray-800 dark:text-white dark:border-gray-700"
            placeholder="Straße und Hausnummer"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label className="flex mb-1 font-medium items-center">
              PLZ
              <HelpTooltip fieldKey="postalCode" />
            </label>
            <input
              value={step2?.postalCode || step1?.personalPostalCode || ''}
              onChange={e => handleChange('step2.postalCode', e.target.value)}
              className="input dark:bg-gray-800 dark:text-white dark:border-gray-700"
            />
          </div>
          <div className="flex flex-col">
            <label className="flex mb-1 font-medium items-center">
              Stadt
              <HelpTooltip fieldKey="city" />
            </label>
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
          <label className="flex mb-1 font-medium items-center">
            Telefon
            <HelpTooltip fieldKey="phone" />
          </label>
          <input
            value={step2?.companyPhoneNumber || step1?.phoneNumber || ''}
            onChange={e => handleChange('step2.companyPhoneNumber', e.target.value)}
            className="input dark:bg-gray-800 dark:text-white dark:border-gray-700"
          />
        </div>
        <div className="flex flex-col">
          <label className="flex mb-1 font-medium items-center">
            FAX
            <HelpTooltip fieldKey="fax" />
          </label>
          <input
            value={step2?.fax || ''}
            onChange={e => handleChange('step2.fax', e.target.value)}
            className="input dark:bg-gray-800 dark:text-white dark:border-gray-700"
          />
        </div>
        <div className="flex flex-col">
          <label className="flex mb-1 font-medium items-center">
            E-Mail-Adresse
            <HelpTooltip fieldKey="email" />
          </label>
          <input
            value={step1?.email || ''}
            onChange={e => handleChange('step1.email', e.target.value)}
            className="input dark:bg-gray-800 dark:text-white dark:border-gray-700"
          />
        </div>
        <div className="flex flex-col">
          <label className="flex mb-1 font-medium items-center">
            Geburtsdatum
            <HelpTooltip fieldKey="dateOfBirth" />
          </label>
          <input
            type="date"
            value={step1?.personalData?.dateOfBirth || step2?.contactPerson?.dateOfBirth || ''}
            onChange={e => handleChange('step1.personalData.dateOfBirth', e.target.value)}
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
            <label className="flex mb-1 font-medium items-center">
              Mitarbeiterzahl
              <HelpTooltip fieldKey="employees" />
            </label>
            <input
              value={step2?.employees || ''}
              onChange={e => handleChange('step2.employees', e.target.value)}
              className="input dark:bg-gray-800 dark:text-white dark:border-gray-700"
            />
          </div>
          <div className="flex flex-col">
            <label className="flex mb-1 font-medium items-center">
              Einzugsgebiet Radius (km)
              <HelpTooltip fieldKey="radius" />
            </label>
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
