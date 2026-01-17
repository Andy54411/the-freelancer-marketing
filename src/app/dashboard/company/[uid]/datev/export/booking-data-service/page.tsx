'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, HelpCircle, ExternalLink, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';

interface DatevSettings {
  beraternummer: string;
  mandantennummer: string;
  wirtschaftsjahresbeginn: string;
  kontenrahmen: 'SKR03' | 'SKR04';
  sachkontenlänge: number;
  personenkontenlänge: number;
  festschreibung: boolean;
  exportType: 'both' | 'bookings-only' | 'documents-only';
  withUnpaidDocuments: boolean;
}

export default function DatevBookingDataServicePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = params?.uid as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState<DatevSettings>({
    beraternummer: '',
    mandantennummer: '',
    wirtschaftsjahresbeginn: '01.01.2025',
    kontenrahmen: 'SKR03',
    sachkontenlänge: 4,
    personenkontenlänge: 5,
    festschreibung: false,
    exportType: 'both',
    withUnpaidDocuments: false,
  });

  // Lade bestehende DATEV-Einstellungen
  const loadDatevSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const companyRef = doc(db, 'companies', uid);
      const companySnap = await getDoc(companyRef);
      
      if (companySnap.exists()) {
        const data = companySnap.data();
        if (data.datevSettings) {
          setFormData(prev => ({
            ...prev,
            beraternummer: data.datevSettings.beraternummer ?? '',
            mandantennummer: data.datevSettings.mandantennummer ?? '',
            wirtschaftsjahresbeginn: data.datevSettings.wirtschaftsjahresbeginn ?? '01.01.2025',
            kontenrahmen: data.datevSettings.kontenrahmen ?? 'SKR03',
            sachkontenlänge: data.datevSettings.sachkontenlänge ?? 4,
            personenkontenlänge: data.datevSettings.personenkontenlänge ?? 5,
            festschreibung: data.datevSettings.festschreibung ?? false,
            exportType: data.datevSettings.exportType ?? 'both',
            withUnpaidDocuments: data.datevSettings.withUnpaidDocuments ?? false,
          }));
        }
      }
    } catch {
      setSaveMessage({ type: 'error', text: 'Fehler beim Laden der Einstellungen' });
    } finally {
      setIsLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    loadDatevSettings();
  }, [loadDatevSettings]);

  const handleBack = () => {
    router.push(`/dashboard/company/${uid}/datev/export?type=accounting`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validierung
    if (!formData.beraternummer || !formData.mandantennummer) {
      setSaveMessage({ type: 'error', text: 'Bitte füllen Sie alle Pflichtfelder aus.' });
      return;
    }

    // Beraternummer validieren (5-7 Ziffern)
    if (!/^\d{5,7}$/.test(formData.beraternummer)) {
      setSaveMessage({ type: 'error', text: 'Die Beraternummer muss 5-7 Ziffern enthalten.' });
      return;
    }

    // Mandantennummer validieren (1-5 Ziffern)
    if (!/^\d{1,5}$/.test(formData.mandantennummer)) {
      setSaveMessage({ type: 'error', text: 'Die Mandantennummer muss 1-5 Ziffern enthalten.' });
      return;
    }

    try {
      setIsSaving(true);
      setSaveMessage(null);
      
      // DATEV-Einstellungen in Firebase speichern
      const companyRef = doc(db, 'companies', uid);
      await updateDoc(companyRef, {
        datevSettings: {
          ...formData,
          updatedAt: new Date().toISOString(),
        },
      });

      setSaveMessage({ type: 'success', text: 'Einstellungen erfolgreich gespeichert!' });

      // Nach kurzer Verzögerung zur Transfer-Seite weiterleiten
      setTimeout(() => {
        router.push(`/dashboard/company/${uid}/datev/export/booking-data-service/transfer`);
      }, 1000);
    } catch {
      setSaveMessage({ type: 'error', text: 'Fehler beim Speichern der Einstellungen.' });
    } finally {
      setIsSaving(false);
    }
  };

  const isOwner = user?.uid === uid;
  const isEmployee = user?.user_type === 'mitarbeiter' && user?.companyId === uid;

  if (!user || (!isOwner && !isEmployee)) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#14ad9f] mx-auto mb-4"></div>
          <p className="text-gray-600">Lade DATEV-Einstellungen...</p>
        </div>
      </div>
    );
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

      {/* Meldungen */}
      {saveMessage && (
        <div className={`p-4 rounded-lg flex items-start gap-3 ${
          saveMessage.type === 'success' 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          {saveMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <p className={`text-sm ${saveMessage.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
            {saveMessage.text}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - Summary */}
          <div className="col-span-12 lg:col-span-4">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Übertragungsart</h2>
              
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 shrink-0">
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
                    via DATEV EXTF-Format
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
                    Buchungsstapel inkl. Stammdaten und Belegbilder werden im DATEV EXTF-Format exportiert. 
                    Die CSV-Datei kann direkt in DATEV Kanzlei-Rechnungswesen importiert werden.
                  </p>
                  <a 
                    href="https://developer.datev.de/datev/platform/de/dtvf" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-sm text-[#14ad9f] hover:underline inline-flex items-center gap-1"
                  >
                    DATEV Format-Dokumentation
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Allgemeine Exporteinstellungen */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  DATEV-Zugangsdaten
                </h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Beraternummer */}
                  <div className="space-y-2">
                    <Label htmlFor="beraternummer" className="text-sm font-medium flex items-center gap-1">
                      Beraternummer <span className="text-red-500">*</span>
                      <button type="button" className="text-gray-400 hover:text-gray-600">
                        <HelpCircle className="w-3 h-3" />
                      </button>
                    </Label>
                    <Input
                      id="beraternummer"
                      type="text"
                      placeholder="z.B. 12345"
                      value={formData.beraternummer}
                      onChange={(e) => setFormData({...formData, beraternummer: e.target.value.replace(/\D/g, '')})}
                      maxLength={7}
                      required
                    />
                    <p className="text-xs text-gray-500">5-7 Ziffern</p>
                  </div>

                  {/* Mandantennummer */}
                  <div className="space-y-2">
                    <Label htmlFor="mandantennummer" className="text-sm font-medium flex items-center gap-1">
                      Mandantennummer <span className="text-red-500">*</span>
                      <button type="button" className="text-gray-400 hover:text-gray-600">
                        <HelpCircle className="w-3 h-3" />
                      </button>
                    </Label>
                    <Input
                      id="mandantennummer"
                      type="text"
                      placeholder="z.B. 67890"
                      value={formData.mandantennummer}
                      onChange={(e) => setFormData({...formData, mandantennummer: e.target.value.replace(/\D/g, '')})}
                      maxLength={5}
                      required
                    />
                    <p className="text-xs text-gray-500">1-5 Ziffern</p>
                  </div>

                  {/* Wirtschaftsjahresbeginn */}
                  <div className="space-y-2">
                    <Label htmlFor="wirtschaftsjahresbeginn" className="text-sm font-medium">
                      Wirtschaftsjahresbeginn <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="wirtschaftsjahresbeginn"
                        type="text"
                        placeholder="dd.MM.yyyy"
                        value={formData.wirtschaftsjahresbeginn}
                        onChange={(e) => setFormData({...formData, wirtschaftsjahresbeginn: e.target.value})}
                        required
                        className="pr-10"
                      />
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Kontenrahmen */}
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="kontenrahmen" className="text-sm font-medium">
                      Kontenrahmen
                    </Label>
                    <select
                      id="kontenrahmen"
                      value={formData.kontenrahmen}
                      onChange={(e) => setFormData({...formData, kontenrahmen: e.target.value as 'SKR03' | 'SKR04'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent text-sm"
                    >
                      <option value="SKR03">SKR03 (Standard)</option>
                      <option value="SKR04">SKR04</option>
                    </select>
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
                      <div className="shrink-0 mt-0.5">
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
                          DATEV EXTF-Datei mit Buchungen + ZIP mit Belegbildern
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
                      <div className="shrink-0 mt-0.5">
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
                          Nur DATEV EXTF-Datei mit Buchungen
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
                      <div className="shrink-0 mt-0.5">
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
                
                <div className="space-y-3">
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

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="festschreibung"
                      checked={formData.festschreibung}
                      onCheckedChange={(checked) => 
                        setFormData({...formData, festschreibung: checked as boolean})
                      }
                    />
                    <div className="flex items-center gap-2">
                      <Label 
                        htmlFor="festschreibung" 
                        className="text-sm font-normal cursor-pointer"
                      >
                        Festschreibung aktivieren (Buchungen als unveränderbar kennzeichnen)
                      </Label>
                      <button type="button" className="text-gray-400 hover:text-gray-600">
                        <HelpCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info Banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-blue-900">
                    Hinweis zum DATEV-Export
                  </h4>
                  <p className="text-sm text-blue-800">
                    Der Export erfolgt im DATEV EXTF-Format (Extended Transfer Format), das direkt in
                    DATEV Kanzlei-Rechnungswesen importiert werden kann. Die Beraternummer und 
                    Mandantennummer erhalten Sie von Ihrem Steuerberater.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <a 
                  href="https://developer.datev.de/datev/platform/de/dtvf"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-[#14ad9f] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  DATEV-Formatdokumentation
                  <ExternalLink className="w-3 h-3" />
                </a>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-[#14ad9f] hover:bg-teal-700 text-white"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Speichere...
                    </>
                  ) : (
                    'Einstellungen speichern & weiter'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
