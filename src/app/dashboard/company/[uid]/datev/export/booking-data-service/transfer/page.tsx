'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Building2, FileText, Image, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';

interface Company {
  id: string;
  name: string;
  accountantNumber?: string;
  accountantClientNumber?: string;
}

interface TransferData {
  companyId: string;
  month: string;
  year: string;
  includeBookingData: boolean;
  includeDocumentImages: boolean;
  includeMasterData: boolean;
  allowDuplicates: boolean;
}

export default function DatevBDSTransferPage() {
  const params = useParams();
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const uid = params?.uid as string;

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isTransferring, setIsTransferring] = useState(false);

  const [transferData, setTransferData] = useState<TransferData>({
    companyId: '',
    month: new Date().getMonth().toString(),
    year: new Date().getFullYear().toString(),
    includeBookingData: true,
    includeDocumentImages: true,
    includeMasterData: false,
    allowDuplicates: false,
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

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      setIsLoading(true);
      // TODO: Load companies from Firebase
      // Für jetzt Mock-Daten
      const mockCompanies: Company[] = [
        {
          id: uid,
          name: 'Meine Firma GmbH',
          accountantNumber: '12345',
          accountantClientNumber: '67890',
        },
      ];
      setCompanies(mockCompanies);
      if (mockCompanies.length > 0) {
        setSelectedCompanyId(mockCompanies[0].id);
        setTransferData((prev) => ({ ...prev, companyId: mockCompanies[0].id }));
      }
    } catch (error) {
      console.error('Fehler beim Laden der Firmen:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransfer = async () => {
    try {
      setIsTransferring(true);

      // Validierung
      if (!transferData.companyId) {
        alert('Bitte wählen Sie einen Mandanten aus.');
        return;
      }

      if (!transferData.includeBookingData && !transferData.includeDocumentImages && !transferData.includeMasterData) {
        alert('Bitte wählen Sie mindestens eine zu übertragende Datenart aus.');
        return;
      }

      if (!firebaseUser) {
        alert('Bitte melden Sie sich an.');
        return;
      }

      const token = await firebaseUser.getIdToken();

      // API Call zum Export
      const response = await fetch('/api/datev/export/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-company-id': uid,
        },
        body: JSON.stringify({
          exportType: transferData.includeBookingData && transferData.includeDocumentImages ? 'both' : 
                     transferData.includeBookingData ? 'bookings-only' : 'documents-only',
          month: transferData.month,
          year: transferData.year,
          includeBookingData: transferData.includeBookingData,
          includeDocumentImages: transferData.includeDocumentImages,
          includeMasterData: transferData.includeMasterData,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Export fehlgeschlagen');
      }

      // CSV Download erstellen
      if (data.data.csvContent && (transferData.includeBookingData)) {
        const blob = new Blob([data.data.csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `DATEV_Buchungen_${transferData.year}_${months[parseInt(transferData.month)].label}.csv`;
        link.click();
      }

      // Dokumente als ZIP herunterladen (wenn vorhanden)
      if (data.data.documents > 0 && transferData.includeDocumentImages) {
        // Hier könnte man eine ZIP-Datei erstellen oder die Dokumente einzeln herunterladen
        console.log('Dokumente zum Download:', data.data.documentUrls);
      }

      alert(`Export erfolgreich!\n\n${data.data.bookings} Buchungen exportiert\n${data.data.documents} Belege exportiert`);
      router.push(`/dashboard/company/${uid}/datev`);
    } catch (error: any) {
      console.error('Fehler bei der Übertragung:', error);
      alert(`Fehler bei der Übertragung: ${error.message}`);
    } finally {
      setIsTransferring(false);
    }
  };

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#14ad9f] mx-auto mb-4"></div>
          <p className="text-gray-600">Lade Mandanten...</p>
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
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Info Banner */}
          <div className="bg-blue-50 border-b border-blue-100 px-6 py-4">
            <div className="flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Verbindung erfolgreich hergestellt</p>
                <p className="text-blue-700">
                  Ihre DATEV-Verbindung ist aktiv. Wählen Sie nun den Zeitraum und die zu übertragenden Daten aus.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Mandant auswählen */}
            <div>
              <Label htmlFor="company" className="text-sm font-medium text-gray-700 mb-2 block">
                Mandant auswählen
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  id="company"
                  value={selectedCompanyId}
                  onChange={(e) => {
                    setSelectedCompanyId(e.target.value);
                    setTransferData((prev) => ({ ...prev, companyId: e.target.value }));
                  }}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent text-sm"
                >
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                      {company.accountantNumber && company.accountantClientNumber
                        ? ` (${company.accountantNumber}/${company.accountantClientNumber})`
                        : ''}
                    </option>
                  ))}
                </select>
              </div>
              {selectedCompany && (selectedCompany.accountantNumber || selectedCompany.accountantClientNumber) && (
                <p className="text-xs text-gray-500 mt-2">
                  Beraternummer: {selectedCompany.accountantNumber || '-'} / Mandantennummer:{' '}
                  {selectedCompany.accountantClientNumber || '-'}
                </p>
              )}
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
                      Buchungsstapel
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Alle Buchungen des ausgewählten Zeitraums übertragen
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
                      Belegbilder
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      PDF-Dokumente und Bilder der Belege übertragen
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-md hover:bg-gray-50 transition-colors">
                  <Checkbox
                    id="masterData"
                    checked={transferData.includeMasterData}
                    onCheckedChange={(checked) =>
                      setTransferData((prev) => ({ ...prev, includeMasterData: checked as boolean }))
                    }
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="masterData"
                      className="text-sm font-medium text-gray-900 cursor-pointer flex items-center gap-2"
                    >
                      <Building2 className="w-4 h-4 text-gray-500" />
                      Stammdaten (RZ)
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Debitoren, Kreditoren und weitere Stammdaten übertragen
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
                    Auch bereits übertragene Daten erneut an DATEV senden
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
                disabled={isTransferring}
                className="px-8 bg-[#14ad9f] hover:bg-[#129488] text-white"
              >
                {isTransferring ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Übertrage...
                  </>
                ) : (
                  'Daten übertragen'
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Hinweis zur Übertragung</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Die Übertragung kann je nach Datenmenge einige Minuten dauern</li>
            <li>Sie können den Übertragungsstatus in DATEV unter "Bestand → Daten holen" überprüfen</li>
            <li>Nach erfolgreicher Übertragung müssen Sie die Daten in DATEV importieren</li>
            <li>Gehen Sie dazu zu "Bestand → Importieren → Stapelverarbeitung"</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
