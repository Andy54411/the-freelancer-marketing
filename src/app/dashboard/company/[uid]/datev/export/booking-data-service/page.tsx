'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, HelpCircle, ExternalLink, Calendar } from 'lucide-react';

export default function DatevBookingDataServicePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = params?.uid as string;

  const [formData, setFormData] = useState({
    accountantNumber: '',
    accountantClientNumber: '',
    fiscalYearStart: '01.01.2025',
    withUnpaidDocuments: false,
    exportType: 'both', // 'both', 'bookings-only', 'documents-only'
  });

  const handleBack = () => {
    router.push(`/dashboard/company/${uid}/datev/export?type=accounting`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validierung
    if (!formData.accountantNumber || !formData.accountantClientNumber) {
      alert('Bitte füllen Sie alle Pflichtfelder aus.');
      return;
    }

    // TODO: Save DATEV connection to Firebase
    console.log('DATEV Verbindung:', formData);

    // Weiter zur Transfer-Seite
    router.push(`/dashboard/company/${uid}/datev/export/booking-data-service/transfer`);
  };

  if (!user || user.uid !== uid) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">DATEV Buchungsdatenservice</h1>
        <Button
          variant="ghost"
          onClick={handleBack}
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Übertragungsart ändern
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - Summary */}
          <div className="col-span-12 lg:col-span-4">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Übertragungsart</h2>
              
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 flex-shrink-0">
                  <svg width="100%" height="100%" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation">
                    <mask id="a" maskUnits="userSpaceOnUse" x="2" y="5" width="43" height="26">
                      <path d="M17.1662 13.3331L16.962 14.0702L16.4583 13.7921C15.308 13.1234 14.0322 12.711 12.7147 12.5821C11.5391 12.4818 10.3556 12.6192 9.23207 12.9866C8.1085 13.3539 7.06686 13.944 6.16675 14.7231C5.26664 15.5021 4.52571 16.4548 3.98638 17.5267C3.44704 18.5986 3.11987 19.7686 3.02359 20.9697C2.92731 22.1709 3.0638 23.3797 3.42527 24.5269C3.78673 25.6742 4.36607 26.7373 5.13013 27.6556C5.8942 28.5739 6.82799 29.3292 7.87809 29.8784C8.92819 30.4276 10.074 30.7599 11.2499 30.8563C11.4936 30.8772 11.7373 30.8869 11.9796 30.8869H38.6205C39.4279 30.89 40.2279 30.7306 40.9748 30.4177C41.7218 30.1048 42.4011 29.6446 42.9739 29.0634C43.5467 28.4822 44.0019 27.7914 44.3132 27.0305C44.6246 26.2695 44.7862 25.4534 44.7887 24.6286C44.79 24.4192 44.7805 24.2098 44.7601 24.0014C44.4606 20.8862 41.8605 18.4663 38.7975 18.3828C38.5292 18.3773 38.2608 18.3912 37.9943 18.4246L37.232 18.508L37.3409 17.7292C37.4198 17.2045 37.4608 16.6746 37.4634 16.1438C37.4633 13.5892 36.5567 11.1213 34.9116 9.19752C33.2664 7.27372 30.9944 6.02447 28.5165 5.68135C26.0386 5.33823 23.523 5.92449 21.436 7.33148C19.3489 8.73847 17.8319 10.8708 17.1662 13.3331Z" fill="white"/>
                    </mask>
                    <g mask="url(#a)">
                      <path d="M27.8253 3H20.869V10.1066H27.8253V3Z" fill="#A1D752"/>
                      <path d="M34.7816 3H27.8253V10.1066H34.7816V3Z" fill="#90CD2C"/>
                      <path d="M41.7379 3H34.7816V10.1066H41.7379V3Z" fill="#74BD29"/>
                      <path d="M6.95632 10.1066H0V17.2133H6.95632V10.1066Z" fill="#74C7C7"/>
                      <path d="M13.9126 10.1066H6.9563V17.2133H13.9126V10.1066Z" fill="#8ED2D2"/>
                      <path d="M20.8689 10.1066H13.9126V17.2133H20.8689V10.1066Z" fill="#C7E799"/>
                      <path d="M27.8253 10.1066H20.869V17.2133H27.8253V10.1066Z" fill="#B7E07A"/>
                      <path d="M34.7816 10.1066H27.8253V17.2133H34.7816V10.1066Z" fill="#A1D752"/>
                      <path d="M41.7379 10.1066H34.7816V17.2133H41.7379V10.1066Z" fill="#90CD2C"/>
                      <path d="M6.95632 17.2132H0V24.3199H6.95632V17.2132Z" fill="#42B3B3"/>
                      <path d="M13.9126 17.2132H6.9563V24.3199H13.9126V17.2132Z" fill="#74C7C7"/>
                      <path d="M20.8689 17.2132H13.9126V24.3199H20.8689V17.2132Z" fill="#8ED2D2"/>
                      <path d="M27.8253 17.2132H20.869V24.3199H27.8253V17.2132Z" fill="#C7E799"/>
                      <path d="M34.7816 17.2132H27.8253V24.3199H34.7816V17.2132Z" fill="#B7E07A"/>
                      <path d="M41.7379 17.2132H34.7816V24.3199H41.7379V17.2132Z" fill="#A1D752"/>
                      <path d="M48 17.2132H41.7379V24.3199H48V17.2132Z" fill="#90CD2C"/>
                      <path d="M6.95632 24.3199H0V31.4265H6.95632V24.3199Z" fill="#109F9F"/>
                      <path d="M13.9126 24.3199H6.9563V31.4265H13.9126V24.3199Z" fill="#42B3B3"/>
                      <path d="M20.8689 24.3199H13.9126V31.4265H20.8689V24.3199Z" fill="#74C7C7"/>
                      <path d="M27.8253 24.3199H20.869V31.4265H27.8253V24.3199Z" fill="#8ED2D2"/>
                      <path d="M34.7816 24.3199H27.8253V31.4265H34.7816V24.3199Z" fill="#C7E799"/>
                      <path d="M41.7379 24.3199H34.7816V31.4265H41.7379V24.3199Z" fill="#B7E07A"/>
                      <path d="M48 24.3199H41.7379V31.4265H48V24.3199Z" fill="#A1D752"/>
                      <path d="M20.8689 3H13.9126V10.1066H20.8689V3Z" fill="#BCDF73"/>
                    </g>
                    <path d="M15.8879 18.5483V22.943H7.9514L1.60767 29.4238L8.38566 36.3358V31.9411H16.3085L22.6522 25.4603L15.8879 18.5483Z" fill="white"/>
                    <path d="M7.33886 25.0848L3.09155 29.4238L7.33886 33.7629V30.8702H15.8729V27.9775H7.33886V25.0848Z" fill="#039A9A"/>
                    <path d="M16.9212 21.1212L21.1685 25.4603L16.9212 29.7993V26.9066H8.38574V24.0139H16.9212V21.1212Z" fill="#039A9A"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M6.2076 43.4146H7.25581C8.86216 43.4146 10.1826 42.3437 10.2507 40.355C10.3188 38.4358 9.27056 37.2954 7.74588 37.2954H6.2076V43.4146ZM4.32898 35.7238H7.88201C10.3188 35.7238 12.0613 37.5735 12.1429 40.4245C12.1429 42.9834 10.0465 44.9861 7.60975 44.9861H4.32898V35.7238ZM28.2473 35.7238H34.3188V37.2954H30.2076V39.3676H34.0465V40.9391H30.2076V43.498H34.5366V45H28.2609V35.7238H28.2473ZM16.186 44.9861V43.4841H18.6909L16.4583 37.6431L13.7357 44.9861H11.789L15.2753 35.7238H17.644L21.197 44.9861H16.186ZM19.671 37.2954V35.7238H27.485V37.2954H24.6262V44.9861H22.5978V37.2954H19.671ZM39.2059 35.7238V37.2954H41.5065L39.4101 42.9278L36.8236 35.7238H34.7952L38.3483 44.9861H40.5128L43.9991 35.7238H39.2059Z" fill="#039A9A"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    Buchungsdaten + Belegbilder
                  </p>
                  <p className="text-xs text-gray-600">
                    via DATEV Schnittstelle
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Form */}
          <div className="col-span-12 lg:col-span-8">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-3">
                  DATEV Buchungsdatenservice
                </h1>
                <div className="space-y-4">
                  <p className="text-sm text-gray-700">
                    Buchungsstapel inkl. Stammdaten und Belegbilder werden per Knopfdruck an DATEV Rechenzentrum übertragen. 
                    Die Daten stehen anschließend zum Abruf in DATEV Kanzlei-Rechnungswesen zur Verfügung.
                  </p>
                  <p className="text-xs text-amber-700 font-medium">
                    Bitte beachte, dass dieser Service kostenpflichtig bei DATEV gebucht werden muss.
                  </p>
                  <a 
                    href="https://www.datev.de/web/de/datev-shop/91000-buchungsdatenservice/" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-sm text-[#14ad9f] hover:underline inline-flex items-center gap-1"
                  >
                    Mehr Informationen
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Allgemeine Exporteinstellungen */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Allgemeine Exporteinstellungen
                </h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Beraternummer */}
                  <div className="space-y-2">
                    <Label htmlFor="accountantNumber" className="text-sm font-medium flex items-center gap-1">
                      Beraternummer <span className="text-red-500">*</span>
                      <button type="button" className="text-gray-400 hover:text-gray-600">
                        <HelpCircle className="w-3 h-3" />
                      </button>
                    </Label>
                    <Input
                      id="accountantNumber"
                      type="number"
                      placeholder="Beraternummer"
                      value={formData.accountantNumber}
                      onChange={(e) => setFormData({...formData, accountantNumber: e.target.value})}
                      required
                    />
                  </div>

                  {/* Mandantennummer */}
                  <div className="space-y-2">
                    <Label htmlFor="accountantClientNumber" className="text-sm font-medium flex items-center gap-1">
                      Mandantennummer <span className="text-red-500">*</span>
                      <button type="button" className="text-gray-400 hover:text-gray-600">
                        <HelpCircle className="w-3 h-3" />
                      </button>
                    </Label>
                    <Input
                      id="accountantClientNumber"
                      type="number"
                      placeholder="Mandantennummer"
                      value={formData.accountantClientNumber}
                      onChange={(e) => setFormData({...formData, accountantClientNumber: e.target.value})}
                      required
                    />
                  </div>

                  {/* Wirtschaftsjahresbeginn */}
                  <div className="space-y-2">
                    <Label htmlFor="fiscalYearStart" className="text-sm font-medium">
                      Wirtschaftsjahresbeginn <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="fiscalYearStart"
                        type="text"
                        placeholder="dd.MM.yyyy"
                        value={formData.fiscalYearStart}
                        onChange={(e) => setFormData({...formData, fiscalYearStart: e.target.value})}
                        required
                        className="pr-10"
                      />
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Export-Typ Auswahl */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Was möchtest du exportieren?
                </h3>
                
                <div className="space-y-3">
                  {/* Buchungsdaten und Belegbilder */}
                  <div 
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      formData.exportType === 'both' 
                        ? 'border-[#14ad9f] bg-[#14ad9f]/5' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setFormData({...formData, exportType: 'both'})}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          formData.exportType === 'both'
                            ? 'border-[#14ad9f] bg-[#14ad9f]'
                            : 'border-gray-300'
                        }`}>
                          {formData.exportType === 'both' && (
                            <div className="w-2 h-2 bg-white rounded-full" />
                          )}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">
                          Buchungsdaten und Belegbilder
                        </h4>
                        <p className="text-sm text-gray-600">
                          CSV-Datei mit Buchungen + ZIP mit Belegbildern
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Nur Buchungsdaten */}
                  <div 
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      formData.exportType === 'bookings-only' 
                        ? 'border-[#14ad9f] bg-[#14ad9f]/5' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setFormData({...formData, exportType: 'bookings-only'})}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          formData.exportType === 'bookings-only'
                            ? 'border-[#14ad9f] bg-[#14ad9f]'
                            : 'border-gray-300'
                        }`}>
                          {formData.exportType === 'bookings-only' && (
                            <div className="w-2 h-2 bg-white rounded-full" />
                          )}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">
                          Nur Buchungsdaten
                        </h4>
                        <p className="text-sm text-gray-600">
                          Nur CSV-Datei mit Buchungen
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Nur Belegbilder */}
                  <div 
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      formData.exportType === 'documents-only' 
                        ? 'border-[#14ad9f] bg-[#14ad9f]/5' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setFormData({...formData, exportType: 'documents-only'})}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          formData.exportType === 'documents-only'
                            ? 'border-[#14ad9f] bg-[#14ad9f]'
                            : 'border-gray-300'
                        }`}>
                          {formData.exportType === 'documents-only' && (
                            <div className="w-2 h-2 bg-white rounded-full" />
                          )}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">
                          Nur Belegbilder
                        </h4>
                        <p className="text-sm text-gray-600">
                          Nur ZIP mit Belegbildern
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Weitere Einstellungen */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Weitere Einstellungen
                </h3>
                
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="withUnpaidDocuments"
                    checked={formData.withUnpaidDocuments}
                    onCheckedChange={(checked) => 
                      setFormData({...formData, withUnpaidDocuments: checked as boolean})
                    }
                  />
                  <div className="flex items-center gap-2">
                    <Label 
                      htmlFor="withUnpaidDocuments" 
                      className="text-sm font-normal cursor-pointer"
                    >
                      Auch offene Rechnungen und Belege exportieren
                    </Label>
                    <button type="button" className="text-gray-400 hover:text-gray-600">
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Info Banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-blue-900">
                    Um den Export durchzuführen, melde dich bitte bei DATEV an.
                  </h4>
                  <p className="text-sm text-blue-800">
                    Nach erstmaliger Anmeldung wird eine Verknüpfung zwischen Taskilo und DATEV hergestellt. 
                    Diese Verknüpfung ist dank des DATEV Langzeit Tokens für 2 Jahre aktiv. 
                    Bei jedem erfolgreichen Export wird die Verknüpfung erneut um 2 Jahre verlängert.
                    <br /><br />
                    <strong>Wichtig:</strong> Hast du einen Steuerberater, braucht jeder von euch einen eigenen DATEV-Zugang.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <a 
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Wissensdatenbank wird bald verfügbar sein!');
                  }}
                  className="text-sm text-[#14ad9f] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  Anleitung zum Export und Import in der Wissensdatenbank
                  <ExternalLink className="w-3 h-3" />
                </a>
                <Button
                  type="submit"
                  className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                >
                  Zur Anmeldung
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
