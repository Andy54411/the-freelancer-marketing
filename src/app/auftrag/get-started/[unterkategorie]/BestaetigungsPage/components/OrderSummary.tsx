'use client';

import {
  Calendar as FiCalendar,
  Clock as FiClock,
  Truck as FiTruck,
  Loader2 as FiLoader,
  Edit3,
  MapPin,
} from 'lucide-react';
import Image from 'next/image';
import type { Company as AnbieterDetails, TaskDetails } from '@/types/types';
import { TRUST_AND_SUPPORT_FEE_EUR } from '@/lib/constants';

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
      })}${
        dateTo && dateTo !== dateFrom
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
      <div className="flex items-center justify-center py-12">
        <FiLoader className="animate-spin text-3xl text-[#14ad9f]" />
        <span className="ml-3 text-gray-600">Lade Auftragsdetails...</span>
      </div>
    );
  }

  const displayHourlyRate =
    typeof anbieterDetails.hourlyRate === 'number'
      ? `${anbieterDetails.hourlyRate.toFixed(2)} EUR/Std.`
      : anbieterDetails.hourlyRate?.toString() || 'Preis n/a';

  // Bild-URL: Immer vollstaendige URL an <Image> uebergeben
  const imageUrl = anbieterDetails.profilePictureURL
    ? decodeURIComponent(anbieterDetails.profilePictureURL)
    : null;

  return (
    <div className="space-y-6">
      {/* Anbieter Info Card */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={anbieterDetails.companyName || 'Anbieter'}
            className="w-16 h-16 rounded-xl border-2 border-white shadow-md object-cover"
            width={64}
            height={64}
            onError={e => {
              const img = e.target as HTMLImageElement;
              img.style.display = 'none';
              const parent = img.parentElement;
              if (parent) {
                const fallback = document.createElement('div');
                fallback.className =
                  'w-16 h-16 rounded-xl bg-linear-to-br from-[#14ad9f] to-teal-600 flex items-center justify-center text-white text-xl font-bold shadow-md';
                fallback.textContent = (anbieterDetails.companyName || 'A')
                  .charAt(0)
                  .toUpperCase();
                parent.appendChild(fallback);
              }
            }}
            priority
          />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-linear-to-br from-[#14ad9f] to-teal-600 flex items-center justify-center text-white text-xl font-bold shadow-md">
            {(anbieterDetails.companyName || 'A').charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
            {anbieterDetails.selectedSubcategory || 'Dienstleistung'}
          </p>
          <p className="text-lg font-bold text-gray-900">
            {anbieterDetails.companyName || 'Unbekannter Anbieter'}
          </p>
          <p className="text-sm text-[#14ad9f] font-semibold">{displayHourlyRate}</p>
        </div>
      </div>

      {/* Auftragsdetails Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <FiCalendar className="w-4 h-4 text-[#14ad9f]" />
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Datum</span>
          </div>
          <p className="text-sm font-semibold text-gray-900">{displayDate}</p>
        </div>

        {time && (
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <FiClock className="w-4 h-4 text-[#14ad9f]" />
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Uhrzeit</span>
            </div>
            <p className="text-sm font-semibold text-gray-900">{time} Uhr</p>
          </div>
        )}

        {anbieterDetails.location && anbieterDetails.location !== 'Ort nicht spezifiziert' && (
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-[#14ad9f]" />
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Ort</span>
            </div>
            <p className="text-sm font-semibold text-gray-900">{anbieterDetails.location}</p>
          </div>
        )}

        {anbieterDetails.estimatedDuration && (
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <FiClock className="w-4 h-4 text-[#14ad9f]" />
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Dauer</span>
            </div>
            <p className="text-sm font-semibold text-gray-900">{anbieterDetails.estimatedDuration}</p>
          </div>
        )}

        {anbieterDetails.taskRequiresCar && (
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <FiTruck className="w-4 h-4 text-[#14ad9f]" />
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Fahrzeug</span>
            </div>
            <p className="text-sm font-semibold text-gray-900">Auto erforderlich</p>
          </div>
        )}
      </div>

      {/* Task bearbeiten Button */}
      <button
        onClick={onEditTask}
        className="w-full flex items-center justify-center gap-2 text-sm text-[#14ad9f] font-semibold py-3 border-2 border-[#14ad9f] rounded-xl hover:bg-teal-50 transition-colors"
      >
        <Edit3 className="w-4 h-4" />
        Details bearbeiten
      </button>

      {/* Taskbeschreibung */}
      {taskDetails?.description && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Ihre Beschreibung</p>
          <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {taskDetails.description}
          </div>
        </div>
      )}

      {/* Preisuebersicht */}
      <div className="bg-gray-50 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Kostenaufstellung</h3>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Stundensatz</span>
          <span className="font-medium text-gray-900">{displayHourlyRate}</span>
        </div>
        {anbieterDetails.estimatedDuration && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Berechnete Dauer</span>
            <span className="text-gray-900">{anbieterDetails.estimatedDuration}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Vertrauens- & Hilfsgebuehr</span>
          <span className="text-gray-900">{TRUST_AND_SUPPORT_FEE_EUR.toFixed(2)} EUR</span>
        </div>
        {anbieterDetails.totalCalculatedPrice !== undefined && (
          <div className="flex justify-between pt-3 border-t border-gray-200 mt-3">
            <span className="font-bold text-gray-900">Gesamtpreis (inkl. MwSt)</span>
            <span className="text-xl font-bold text-[#14ad9f]">{anbieterDetails.totalCalculatedPrice.toFixed(2)} EUR</span>
          </div>
        )}
      </div>

      {/* Hinweis */}
      <p className="text-xs text-gray-500 leading-relaxed">
        Die Zahlung erfolgt erst nach Abschluss des Tasks. Sie erhalten eine Rechnung mit
        ausgewiesener Mehrwertsteuer.
        <a href="#" className="text-[#14ad9f] hover:underline ml-1">
          Mehr zu unseren Stornierungsbedingungen
        </a>
      </p>
    </div>
  );
}
