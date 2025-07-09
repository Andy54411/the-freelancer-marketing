'use client';

import {
  Calendar as FiCalendar,
  Clock as FiClock,
  User as FiUser,
  Truck as FiTruck,
  Loader2 as FiLoader,
} from 'lucide-react';
import Image from 'next/image';
import type {
  Company as AnbieterDetails,
  TaskDetails,
} from '@/types/types';
import { TRUST_AND_SUPPORT_FEE_EUR } from '@/lib/constants';
import { getFirebaseImageUrl } from '@/lib/getFirebaseImageUrl';

export interface OrderSummaryProps {
  anbieterDetails: AnbieterDetails | null;
  taskDetails: TaskDetails | null;
  dateFrom: string | null;
  dateTo: string | null;
  time: string | null;
  onEditTask: () => void;
}

export function OrderSummary({
  anbieterDetails,
  taskDetails,
  dateFrom,
  dateTo,
  time,
  onEditTask,
}: OrderSummaryProps) {
  const displayDate = dateFrom
    ? `${new Date(dateFrom).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })}${dateTo && dateTo !== dateFrom
      ? ` - ${new Date(dateTo).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })}`
      : ''
    }`
    : 'Datum nicht spezifiziert';

  if (!anbieterDetails) {
    return (
      <div className="bg-gray-50 rounded-xl p-6 flex items-center justify-center min-h-[200px] h-full">
        <FiLoader className="animate-spin text-2xl text-[#14ad9f]" />
        <span className="ml-3 text-gray-600 text-sm">Lade Auftragsdetails...</span>
      </div>
    );
  }

  const displayHourlyRate =
    typeof anbieterDetails.hourlyRate === 'number'
      ? `${anbieterDetails.hourlyRate.toFixed(2)} €/Std.`
      : anbieterDetails.hourlyRate?.toString() || 'Preis n/a';

  // Debug: Logge die Bild-URL und den Wert von profilePictureURL für Fehlersuche
  // Bild-URL: Immer vollständige URL an <Image> übergeben
  const imageUrl =
    anbieterDetails.profilePictureURL && anbieterDetails.profilePictureURL.startsWith('http')
      ? anbieterDetails.profilePictureURL
      : getFirebaseImageUrl(anbieterDetails.profilePictureURL ?? '');
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.log('Image-URL:', imageUrl);
    // eslint-disable-next-line no-console
    console.log('profilePictureURL:', anbieterDetails.profilePictureURL, typeof anbieterDetails.profilePictureURL);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 lg:p-8 space-y-6 text-sm text-gray-700 h-full flex flex-col justify-between">
      {/* Anbieter Info */}
      <div>
        <div className="flex items-center mb-4">
          <Image
            src={imageUrl}
            alt={anbieterDetails.companyName || 'Anbieter'}
            className="w-12 h-12 rounded-full border object-cover mr-4"
            width={48}
            height={48}
            onError={(e) => {
              // eslint-disable-next-line no-console
              console.error('Image-Load-Error:', imageUrl, e);
              const img = e.target as HTMLImageElement;
              if (img && img.style) {
                img.style.border = '2px solid red';
              }
            }}
            onLoad={() => {
              // eslint-disable-next-line no-console
              console.log('Image loaded successfully:', imageUrl);
            }}
          />
          <div>
            <p className="text-xs text-gray-500 mb-0.5">
              {anbieterDetails.selectedSubcategory || 'Dienstleistung'}
            </p>
            <p className="text-base font-semibold text-gray-900">
              {anbieterDetails.companyName || 'Unbekannter Anbieter'}
            </p>
          </div>
        </div>

        {/* Auftragsdetails */}
        <div className="space-y-2">
          <div className="flex items-center">
            <FiCalendar className="w-4 h-4 mr-2 text-gray-500" />
            <span>{displayDate}</span>
          </div>
          {time && (
            <div className="flex items-center">
              <FiClock className="w-4 h-4 mr-2 text-gray-500" />
              <span>{time} Uhr</span>
            </div>
          )}
          {anbieterDetails.location && anbieterDetails.location !== 'Ort nicht spezifiziert' && (
            <div className="flex items-center">
              <FiUser className="w-4 h-4 mr-2 text-gray-500" />
              <span>{anbieterDetails.location}</span>
            </div>
          )}
          {anbieterDetails.estimatedDuration && (
            <div className="flex items-center">
              <FiClock className="w-4 h-4 mr-2 text-gray-500" />
              <span>Dauer: {anbieterDetails.estimatedDuration}</span>
            </div>
          )}
          {anbieterDetails.taskRequiresCar && (
            <div className="flex items-center">
              <FiTruck className="w-4 h-4 mr-2 text-gray-500" />
              <span>Auto erforderlich</span>
            </div>
          )}
        </div>

        {/* Task bearbeiten */}
        <div className="mt-4">
          <button
            onClick={onEditTask}
            className="w-full text-sm text-[#14ad9f] font-medium py-2.5 border border-[#14ad9f] rounded-md hover:bg-[#e0f7f5] transition-colors"
          >
            Task bearbeiten
          </button>
        </div>

        {/* Taskbeschreibung */}
        {taskDetails?.description && (
          <div className="mt-6">
            <p className="text-sm font-medium text-gray-600 mb-1">Deine Beschreibung</p>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-sm whitespace-pre-wrap text-gray-800 leading-snug">
              {taskDetails.description}
            </div>
          </div>
        )}

        {/* Preisübersicht */}
        <div className="pt-4 border-t border-gray-200 space-y-3 mt-6 text-sm">
          <div className="flex justify-between">
            <span>Stundensatz</span>
            <span className="font-medium text-gray-900">{displayHourlyRate}</span>
          </div>
          {anbieterDetails.estimatedDuration && (
            <div className="flex justify-between">
              <span>Berechnete Dauer</span>
              <span>{anbieterDetails.estimatedDuration}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Vertrauens- & Hilfsgebühr</span>
            <span>{TRUST_AND_SUPPORT_FEE_EUR.toFixed(2)} €</span>
          </div>
          {anbieterDetails.totalCalculatedPrice !== undefined && (
            <div className="flex justify-between text-base font-semibold text-gray-900 pt-3 border-t border-gray-100 mt-3">
              <span>Gesamtpreis (inkl. MwSt)</span>
              <span>{anbieterDetails.totalCalculatedPrice.toFixed(2)} €</span>
            </div>
          )}
        </div>
      </div>

      {/* Hinweis */}
      <p className="text-xs text-gray-500 leading-snug mt-4">
        Die Zahlung erfolgt erst nach Abschluss des Tasks. Du erhältst dann eine Rechnung mit ausgewiesener Mehrwertsteuer.
        <br />
        <a
          href="#"
          className="text-[#14ad9f] hover:underline inline-block mt-1"
        >
          Mehr zu unseren Stornierungsbedingungen
        </a>
      </p>
    </div>
  );
}
