'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Building2, FileText, Image, CheckCircle2, AlertCircle, Download, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import JSZip from 'jszip';

interface Company {
  id: string;
  name: string;
  legalName?: string;
  accountantNumber?: string;
  accountantClientNumber?: string;
  wirtschaftsjahresbeginn?: string;
  kontenrahmen?: 'SKR03' | 'SKR04';
  datevSettings?: DatevSettings;
}

interface DatevSettings {
  beraternummer: string;
  mandantennummer: string;
  wirtschaftsjahresbeginn: string;
  kontenrahmen: 'SKR03' | 'SKR04';
  sachkontenlänge: number;
  personenkontenlänge: number;
  festschreibung: boolean;
  lastExportDate?: string;
}

interface TransferData {
  companyId: string;
  month: string;
  year: string;
  includeBookingData: boolean;
  includeDocumentImages: boolean;
  includeMasterData: boolean;
  allowDuplicates: boolean;
  includeUnpaid: boolean;
}

export default function DatevBDSTransferPage() {
  const params = useParams();
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const uid = params?.uid as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransferring, setIsTransferring] = useState(false);
  const [exportResult, setExportResult] = useState<{
    success: boolean;
    recordCount?: number;
    invoiceCount?: number;
    expenseCount?: number;
    documentCount?: number;
    warnings?: string[];
    filename?: string;
  } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const [datevSettings, setDatevSettings] = useState<DatevSettings>({
    beraternummer: '',
    mandantennummer: '',
    wirtschaftsjahresbeginn: '01.01.2025',
    kontenrahmen: 'SKR03',
    sachkontenlänge: 4,
    personenkontenlänge: 5,
    festschreibung: false,
  });

  const [transferData, setTransferData] = useState<TransferData>({
    companyId: uid,
    month: new Date().getMonth().toString(),
    year: new Date().getFullYear().toString(),
    includeBookingData: true,
    includeDocumentImages: true,
    includeMasterData: false,
    allowDuplicates: false,
    includeUnpaid: false,
  });

  // Monate für Dropdown
  const months = [
    { value: '0', label: 'Januar' },
    { value: '1', label: 'Februar' },
    { value: '2', label: 'März' },
    { value: '3', label: 'April' },
    { value: '4', label: 'Mai' },
    { value: '5', label: 'Juni' },
    { value: '6', label: 'Juli' },
    { value: '7', label: 'August' },
    { value: '8', label: 'September' },
    { value: '9', label: 'Oktober' },
    { value: '10', label: 'November' },
    { value: '11', label: 'Dezember' },
  ];

  // Jahre für Dropdown (aktuelles Jahr + 2 Jahre zurück)
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2].map((year) => ({
    value: year.toString(),
    label: year.toString(),
  }));

  // Lade Firmendaten aus Firebase
  const loadCompanyData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const companyRef = doc(db, 'companies', uid);
      const companySnap = await getDoc(companyRef);
      
      if (!companySnap.exists()) {
        setSettingsError('Firma nicht gefunden');
        return;
      }
      
      const data = companySnap.data();
      
      const companyData: Company = {
        id: uid,
        name: data.name ?? data.legalName ?? data.companyName ?? 'Unbekannte Firma',
        legalName: data.legalName,
        accountantNumber: data.datevSettings?.beraternummer ?? data.accountantNumber,
        accountantClientNumber: data.datevSettings?.mandantennummer ?? data.accountantClientNumber,
        wirtschaftsjahresbeginn: data.datevSettings?.wirtschaftsjahresbeginn ?? '01.01.2025',
        kontenrahmen: data.datevSettings?.kontenrahmen ?? 'SKR03',
        datevSettings: data.datevSettings,
      };
      
      setCompany(companyData);
      
      // DATEV-Einstellungen laden, wenn vorhanden
      if (data.datevSettings) {
        setDatevSettings({
          beraternummer: data.datevSettings.beraternummer ?? '',
          mandantennummer: data.datevSettings.mandantennummer ?? '',
          wirtschaftsjahresbeginn: data.datevSettings.wirtschaftsjahresbeginn ?? '01.01.2025',
          kontenrahmen: data.datevSettings.kontenrahmen ?? 'SKR03',
          sachkontenlänge: data.datevSettings.sachkontenlänge ?? 4,
          personenkontenlänge: data.datevSettings.personenkontenlänge ?? 5,
          festschreibung: data.datevSettings.festschreibung ?? false,
        });
      }
      
      // Prüfe ob DATEV-Einstellungen fehlen
      if (!data.datevSettings?.beraternummer || !data.datevSettings?.mandantennummer) {
        setShowSettings(true);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setSettingsError(`Fehler beim Laden der Firmendaten: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    loadCompanyData();
  }, [loadCompanyData]);

  // DATEV-Einstellungen speichern
  const saveSettings = async () => {
    if (!datevSettings.beraternummer || !datevSettings.mandantennummer) {
      setSettingsError('Bitte Beraternummer und Mandantennummer eingeben');
      return false;
    }
    
    try {
      const companyRef = doc(db, 'companies', uid);
      await updateDoc(companyRef, {
        datevSettings: {
          ...datevSettings,
          updatedAt: new Date().toISOString(),
        },
      });
      
      setShowSettings(false);
      setSettingsError(null);
      
      // Company-Daten aktualisieren
      setCompany(prev => prev ? {
        ...prev,
        accountantNumber: datevSettings.beraternummer,
        accountantClientNumber: datevSettings.mandantennummer,
        datevSettings: datevSettings,
      } : null);
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setSettingsError(`Fehler beim Speichern: ${errorMessage}`);
      return false;
    }
  };

  // Export durchführen
  const handleTransfer = async () => {
    try {
      setIsTransferring(true);
      setExportResult(null);

      // Validierung: DATEV-Einstellungen prüfen
      if (!datevSettings.beraternummer || !datevSettings.mandantennummer) {
        setShowSettings(true);
        setSettingsError('Bitte zuerst DATEV-Einstellungen konfigurieren');
        return;
      }

      if (!transferData.includeBookingData && !transferData.includeDocumentImages && !transferData.includeMasterData) {
        setSettingsError('Bitte wählen Sie mindestens eine zu übertragende Datenart aus.');
        return;
      }

      if (!firebaseUser) {
        setSettingsError('Bitte melden Sie sich an.');
        return;
      }

      const token = await firebaseUser.getIdToken();

      // Export-Typ bestimmen
      let exportType: 'both' | 'bookings-only' | 'documents-only';
      if (transferData.includeBookingData && transferData.includeDocumentImages) {
        exportType = 'both';
      } else if (transferData.includeBookingData) {
        exportType = 'bookings-only';
      } else {
        exportType = 'documents-only';
      }

      // API Call zum Export
      const response = await fetch('/api/datev/export/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-company-id': uid,
        },
        body: JSON.stringify({
          exportType,
          month: (parseInt(transferData.month) + 1).toString(), // API erwartet 1-12
          year: transferData.year,
          includeBookingData: transferData.includeBookingData,
          includeDocumentImages: transferData.includeDocumentImages,
          includeUnpaid: transferData.includeUnpaid,
          datevSettings: {
            beraternummer: datevSettings.beraternummer,
            mandantennummer: datevSettings.mandantennummer,
            wirtschaftsjahresbeginn: datevSettings.wirtschaftsjahresbeginn,
            kontenrahmen: datevSettings.kontenrahmen,
            sachkontenlänge: datevSettings.sachkontenlänge,
            personenkontenlänge: datevSettings.personenkontenlänge,
            festschreibung: datevSettings.festschreibung,
          },
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.details ?? data.error ?? 'Export fehlgeschlagen');
      }

      setExportResult({
        success: true,
        recordCount: data.data.recordCount,
        invoiceCount: data.data.invoiceCount,
        expenseCount: data.data.expenseCount,
        documentCount: data.data.documentCount,
        warnings: data.data.warnings,
        filename: data.data.filename,
      });

      // CSV-Download erstellen
      if (data.data.csvContent && transferData.includeBookingData) {
        // DATEV erwartet Windows-1252 (ANSI) Encoding
        const encoder = new TextEncoder();
        const csvBytes = encoder.encode(data.data.csvContent);
        const blob = new Blob([csvBytes], { type: 'text/csv;charset=windows-1252' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = data.data.filename ?? `DATEV_Export_${transferData.year}_${months[parseInt(transferData.month)].label}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
      }

      // Belegbilder als ZIP herunterladen (wenn vorhanden)
      if (data.data.documentUrls && data.data.documentUrls.length > 0 && transferData.includeDocumentImages) {
        await downloadDocumentsAsZip(data.data.documentUrls, transferData.year, transferData.month);
      }

      // DATEV-Einstellungen mit letztem Exportdatum aktualisieren
      const companyRef = doc(db, 'companies', uid);
      await updateDoc(companyRef, {
        'datevSettings.lastExportDate': new Date().toISOString(),
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setSettingsError(`Fehler bei der Übertragung: ${errorMessage}`);
      setExportResult({
        success: false,
      });
    } finally {
      setIsTransferring(false);
    }
  };

  // Belegbilder als ZIP herunterladen
  const downloadDocumentsAsZip = async (urls: string[], year: string, month: string) => {
    try {
      const zip = new JSZip();
      const documentsFolder = zip.folder('Belege');
      
      if (!documentsFolder) return;

      let downloadedCount = 0;
      const failedUrls: string[] = [];

      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        try {
          const response = await fetch(url);
          if (!response.ok) {
            failedUrls.push(url);
            continue;
          }
          
          const blob = await response.blob();
          const extension = url.split('.').pop()?.split('?')[0] ?? 'pdf';
          const filename = `Beleg_${String(i + 1).padStart(4, '0')}.${extension}`;
          
          documentsFolder.file(filename, blob);
          downloadedCount++;
        } catch {
          failedUrls.push(url);
        }
      }

      if (downloadedCount > 0) {
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipBlob);
        link.download = `DATEV_Belege_${year}_${months[parseInt(month)].label}.zip`;
        link.click();
        URL.revokeObjectURL(link.href);
      }

      if (failedUrls.length > 0) {
        setExportResult(prev => prev ? {
          ...prev,
          warnings: [...(prev.warnings ?? []), `${failedUrls.length} Belege konnten nicht heruntergeladen werden`],
        } : null);
      }
    } catch {
      setSettingsError('Fehler beim Erstellen der ZIP-Datei');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#14ad9f] mx-auto mb-4"></div>
          <p className="text-gray-600">Lade Firmendaten...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Zurück
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <h1 className="text-xl font-semibold text-gray-900">
                DATEV Buchungsdatenservice - Daten übertragen
              </h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="text-gray-600 hover:text-gray-900"
            >
              <Settings className="w-4 h-4 mr-2" />
              DATEV-Einstellungen
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Fehleranzeige */}
        {settingsError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Fehler</p>
              <p className="text-sm text-red-700">{settingsError}</p>
            </div>
            <button 
              onClick={() => setSettingsError(null)} 
              className="ml-auto text-red-400 hover:text-red-600"
            >
              &times;
            </button>
          </div>
        )}

        {/* Export-Ergebnis */}
        {exportResult?.success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">Export erfolgreich!</p>
                <ul className="text-sm text-green-700 mt-2 space-y-1">
                  <li>{exportResult.recordCount} Buchungssätze exportiert</li>
                  <li>{exportResult.invoiceCount} Rechnungen, {exportResult.expenseCount} Ausgaben</li>
                  {exportResult.documentCount && exportResult.documentCount > 0 && (
                    <li>{exportResult.documentCount} Belege als ZIP heruntergeladen</li>
                  )}
                </ul>
                {exportResult.warnings && exportResult.warnings.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-green-200">
                    <p className="text-xs font-medium text-amber-700">Warnungen:</p>
                    <ul className="text-xs text-amber-600 mt-1 list-disc list-inside">
                      {exportResult.warnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* DATEV-Einstellungen (wenn geöffnet oder keine vorhanden) */}
        {showSettings && (
          <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">DATEV-Einstellungen</h2>
              <p className="text-sm text-gray-600 mt-1">
                Diese Daten werden für den DATEV-Export benötigt
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="beraternummer" className="text-sm font-medium">
                    Beraternummer <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="beraternummer"
                    type="text"
                    value={datevSettings.beraternummer}
                    onChange={(e) => setDatevSettings({...datevSettings, beraternummer: e.target.value})}
                    placeholder="z.B. 12345"
                    maxLength={7}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">5-7 Ziffern von Ihrem Steuerberater</p>
                </div>
                <div>
                  <Label htmlFor="mandantennummer" className="text-sm font-medium">
                    Mandantennummer <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="mandantennummer"
                    type="text"
                    value={datevSettings.mandantennummer}
                    onChange={(e) => setDatevSettings({...datevSettings, mandantennummer: e.target.value})}
                    placeholder="z.B. 67890"
                    maxLength={5}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Ihre Mandantennummer beim Steuerberater</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="wirtschaftsjahresbeginn" className="text-sm font-medium">
                    Wirtschaftsjahresbeginn
                  </Label>
                  <Input
                    id="wirtschaftsjahresbeginn"
                    type="text"
                    value={datevSettings.wirtschaftsjahresbeginn}
                    onChange={(e) => setDatevSettings({...datevSettings, wirtschaftsjahresbeginn: e.target.value})}
                    placeholder="01.01.2025"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="kontenrahmen" className="text-sm font-medium">
                    Kontenrahmen
                  </Label>
                  <select
                    id="kontenrahmen"
                    value={datevSettings.kontenrahmen}
                    onChange={(e) => setDatevSettings({...datevSettings, kontenrahmen: e.target.value as 'SKR03' | 'SKR04'})}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent text-sm"
                  >
                    <option value="SKR03">SKR03 (Standard)</option>
                    <option value="SKR04">SKR04</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Checkbox
                  id="festschreibung"
                  checked={datevSettings.festschreibung}
                  onCheckedChange={(checked) => setDatevSettings({...datevSettings, festschreibung: checked as boolean})}
                />
                <Label htmlFor="festschreibung" className="text-sm cursor-pointer">
                  Festschreibung (Buchungen als unveränderbar kennzeichnen)
                </Label>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => setShowSettings(false)}
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={saveSettings}
                  className="bg-[#14ad9f] hover:bg-teal-700 text-white"
                >
                  Einstellungen speichern
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Info Banner */}
          {datevSettings.beraternummer && datevSettings.mandantennummer ? (
            <div className="bg-blue-50 border-b border-blue-100 px-6 py-4">
              <div className="flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">DATEV-Verbindung konfiguriert</p>
                  <p className="text-blue-700">
                    Beraternummer: {datevSettings.beraternummer} / Mandantennummer: {datevSettings.mandantennummer}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border-b border-amber-100 px-6 py-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900">
                  <p className="font-medium mb-1">DATEV-Einstellungen fehlen</p>
                  <p className="text-amber-700">
                    Bitte konfigurieren Sie zuerst Ihre DATEV-Zugangsdaten (Beraternummer und Mandantennummer).
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="p-6 space-y-6">
            {/* Mandant anzeigen */}
            <div>
              <Label htmlFor="company" className="text-sm font-medium text-gray-700 mb-2 block">
                Mandant
              </Label>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <Building2 className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{company?.name}</p>
                  {company?.accountantNumber && company?.accountantClientNumber && (
                    <p className="text-xs text-gray-500">
                      Beraternummer: {company.accountantNumber} / Mandantennummer: {company.accountantClientNumber}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Zeitraum auswählen */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="month" className="text-sm font-medium text-gray-700 mb-2 block">
                  Monat
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    id="month"
                    value={transferData.month}
                    onChange={(e) => setTransferData((prev) => ({ ...prev, month: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent text-sm"
                  >
                    {months.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="year" className="text-sm font-medium text-gray-700 mb-2 block">
                  Jahr
                </Label>
                <select
                  id="year"
                  value={transferData.year}
                  onChange={(e) => setTransferData((prev) => ({ ...prev, year: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent text-sm"
                >
                  {years.map((year) => (
                    <option key={year.value} value={year.value}>
                      {year.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Zu übertragende Daten */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">Zu übertragende Daten</Label>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-md hover:bg-gray-50 transition-colors">
                  <Checkbox
                    id="bookingData"
                    checked={transferData.includeBookingData}
                    onCheckedChange={(checked) =>
                      setTransferData((prev) => ({ ...prev, includeBookingData: checked as boolean }))
                    }
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="bookingData"
                      className="text-sm font-medium text-gray-900 cursor-pointer flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4 text-gray-500" />
                      Buchungsstapel (EXTF-Format)
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Alle Buchungen im DATEV-ASCII-Format exportieren
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-md hover:bg-gray-50 transition-colors">
                  <Checkbox
                    id="documentImages"
                    checked={transferData.includeDocumentImages}
                    onCheckedChange={(checked) =>
                      setTransferData((prev) => ({ ...prev, includeDocumentImages: checked as boolean }))
                    }
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="documentImages"
                      className="text-sm font-medium text-gray-900 cursor-pointer flex items-center gap-2"
                    >
                      <Image className="w-4 h-4 text-gray-500" />
                      Belegbilder als ZIP
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      PDF-Dokumente und Bilder der Belege als ZIP-Archiv herunterladen
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-md hover:bg-gray-50 transition-colors">
                  <Checkbox
                    id="includeUnpaid"
                    checked={transferData.includeUnpaid}
                    onCheckedChange={(checked) =>
                      setTransferData((prev) => ({ ...prev, includeUnpaid: checked as boolean }))
                    }
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="includeUnpaid"
                      className="text-sm font-medium text-gray-900 cursor-pointer flex items-center gap-2"
                    >
                      <Download className="w-4 h-4 text-gray-500" />
                      Auch offene Belege exportieren
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Unbezahlte Rechnungen und Ausgaben mit exportieren
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Weitere Optionen */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-start gap-3 p-3 rounded-md hover:bg-gray-50 transition-colors">
                <Checkbox
                  id="allowDuplicates"
                  checked={transferData.allowDuplicates}
                  onCheckedChange={(checked) =>
                    setTransferData((prev) => ({ ...prev, allowDuplicates: checked as boolean }))
                  }
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <label htmlFor="allowDuplicates" className="text-sm font-medium text-gray-900 cursor-pointer">
                    Dubletten übertragen
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Auch bereits exportierte Daten erneut herunterladen
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => router.back()}
                disabled={isTransferring}
                className="px-6"
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleTransfer}
                disabled={isTransferring || !datevSettings.beraternummer || !datevSettings.mandantennummer}
                className="px-8 bg-[#14ad9f] hover:bg-teal-700 text-white"
              >
                {isTransferring ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Exportiere...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    DATEV-Export starten
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Hinweis zum Import in DATEV</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Die CSV-Datei ist im DATEV EXTF-Format (Extended Transfer Format)</li>
            <li>Importieren Sie die Datei in DATEV Kanzlei-Rechnungswesen unter &quot;Datei → Import → Stapelverarbeitung&quot;</li>
            <li>Belegbilder können über DATEV Unternehmen online archiviert werden</li>
            <li>Bei Fragen wenden Sie sich an Ihren Steuerberater</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
