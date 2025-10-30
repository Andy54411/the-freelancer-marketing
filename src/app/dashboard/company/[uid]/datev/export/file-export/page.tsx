'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, HelpCircle, ExternalLink, Calendar, Download, FileText, Image as ImageIcon } from 'lucide-react';

export default function DatevFileExportPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = params?.uid as string;

  const [formData, setFormData] = useState({
    accountantNumber: '',
    accountantClientNumber: '',
    periodStart: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // 1. Januar
    periodEnd: new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split('T')[0], // Letzter Tag letzter Monat
    exportType: 'both', // 'booking', 'images', 'both'
    includeLockedData: false,
    includeUnpaidDocuments: false,
    lockDocuments: false,
  });

  const [isExporting, setIsExporting] = useState(false);

  const handleBack = () => {
    router.push(`/dashboard/company/${uid}/datev/export?type=accounting`);
  };

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validierung
    if (!formData.accountantNumber || !formData.accountantClientNumber) {
      alert('Bitte füllen Sie alle Pflichtfelder aus.');
      return;
    }

    if (!formData.periodStart || !formData.periodEnd) {
      alert('Bitte wählen Sie einen Zeitraum aus.');
      return;
    }

    try {
      setIsExporting(true);

      const startDate = new Date(formData.periodStart);
      const endDate = new Date(formData.periodEnd);

      // Firebase Auth Token holen
      const auth = (await import('firebase/auth')).getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        alert('Bitte melden Sie sich an.');
        return;
      }
      const token = await currentUser.getIdToken();

      // API Call zum Export
      const response = await fetch('/api/datev/export/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-company-id': uid,
        },
        body: JSON.stringify({
          exportType: formData.exportType,
          month: startDate.getMonth().toString(),
          year: startDate.getFullYear().toString(),
          periodStart: formData.periodStart,
          periodEnd: formData.periodEnd,
          includeBookingData: formData.exportType === 'booking' || formData.exportType === 'both',
          includeDocumentImages: formData.exportType === 'images' || formData.exportType === 'both',
          includeMasterData: false,
          accountantNumber: formData.accountantNumber,
          accountantClientNumber: formData.accountantClientNumber,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Export fehlgeschlagen');
      }

      // CSV Download erstellen (Buchungsdaten)
      if (data.data.csvContent && (formData.exportType === 'booking' || formData.exportType === 'both')) {
        const blob = new Blob([data.data.csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `DATEV_Buchungen_${formData.accountantNumber}_${formData.accountantClientNumber}_${startDate.toLocaleDateString('de-DE')}_${endDate.toLocaleDateString('de-DE')}.csv`;
        link.click();
      }

      // Belegbilder Download
      if (data.data.documents > 0 && (formData.exportType === 'images' || formData.exportType === 'both')) {
        alert(`${data.data.documents} Belegbilder werden als ZIP-Datei vorbereitet...`);
        // TODO: ZIP-Datei mit Belegbildern erstellen
      }

      alert(`Export erfolgreich!\n\n${data.data.bookings} Buchungen exportiert\n${data.data.documents} Belege verfügbar`);
    } catch (error: any) {
      console.error('Fehler beim Export:', error);
      alert(`Fehler beim Export: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  if (!user || user.uid !== uid) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={handleBack}
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Übertragungsart ändern
        </Button>
      </div>

      <form onSubmit={handleExport}>
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - Summary */}
          <div className="col-span-12 lg:col-span-4">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Übertragungsart</h2>
              
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 flex-shrink-0">
                  {/* Folder Icon SVG from sevDesk */}
                  <svg width="100%" height="100%" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation">
                    <path d="M43.0769 19.2308V38.7692C43.0769 39.3017 42.8655 39.8123 42.4885 40.1893C42.1115 40.5663 41.6009 40.7777 41.0684 40.7777H6.93162C6.39908 40.7777 5.88848 40.5663 5.51149 40.1893C5.1345 39.8123 4.92308 39.3017 4.92308 38.7692V9.23085C4.92308 8.69831 5.1345 8.18771 5.51149 7.81072C5.88848 7.43373 6.39908 7.22232 6.93162 7.22232H18.6154L22.6308 12.2431H41.0684C41.6009 12.2431 42.1115 12.4545 42.4885 12.8315C42.8655 13.2085 43.0769 13.7191 43.0769 14.2516V19.2308Z" fill="#FFD766"/>
                    <path d="M43.0769 19.2308H4.92308V38.7692C4.92308 39.3017 5.1345 39.8123 5.51149 40.1893C5.88848 40.5663 6.39908 40.7777 6.93162 40.7777H41.0684C41.6009 40.7777 42.1115 40.5663 42.4885 40.1893C42.8655 39.8123 43.0769 39.3017 43.0769 38.7692V19.2308Z" fill="#FFC233"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Datei-Export</h3>
                  <p className="text-sm text-gray-600">
                    Export als CSV- und ZIP-Dateien zum manuellen Import in DATEV
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0"></div>
                  <span>Einmalige Exporte</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0"></div>
                  <span>Flexible Zeitraumwahl</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0"></div>
                  <span>Keine DATEV-Anmeldung erforderlich</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Form */}
          <div className="col-span-12 lg:col-span-8">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Datei-Export konfigurieren</h2>
                <p className="text-sm text-gray-600">
                  Exportieren Sie Ihre Buchungsdaten und Belegbilder als Dateien
                </p>
              </div>

              {/* Berater- und Mandantennummer */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="accountantNumber" className="text-sm font-medium mb-2 flex items-center gap-2">
                    Beraternummer
                    <button type="button" className="text-gray-400 hover:text-gray-600">
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  </Label>
                  <Input
                    id="accountantNumber"
                    type="text"
                    placeholder="z.B. 12345"
                    value={formData.accountantNumber}
                    onChange={(e) => setFormData((prev) => ({ ...prev, accountantNumber: e.target.value }))}
                    required
                    className="w-full"
                  />
                </div>

                <div>
                  <Label htmlFor="accountantClientNumber" className="text-sm font-medium mb-2 flex items-center gap-2">
                    Mandantennummer
                    <button type="button" className="text-gray-400 hover:text-gray-600">
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  </Label>
                  <Input
                    id="accountantClientNumber"
                    type="text"
                    placeholder="z.B. 67890"
                    value={formData.accountantClientNumber}
                    onChange={(e) => setFormData((prev) => ({ ...prev, accountantClientNumber: e.target.value }))}
                    required
                    className="w-full"
                  />
                </div>
              </div>

              {/* Zeitraum */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Zeitraum auswählen</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="periodStart" className="text-xs text-gray-600 mb-1 block">
                      Von
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="periodStart"
                        type="date"
                        value={formData.periodStart}
                        onChange={(e) => setFormData((prev) => ({ ...prev, periodStart: e.target.value }))}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="periodEnd" className="text-xs text-gray-600 mb-1 block">
                      Bis
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="periodEnd"
                        type="date"
                        value={formData.periodEnd}
                        onChange={(e) => setFormData((prev) => ({ ...prev, periodEnd: e.target.value }))}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Export-Optionen */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Was möchten Sie exportieren?</Label>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      id="exportBoth"
                      name="exportType"
                      value="both"
                      checked={formData.exportType === 'both'}
                      onChange={(e) => setFormData((prev) => ({ ...prev, exportType: e.target.value }))}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <label htmlFor="exportBoth" className="text-sm font-medium text-gray-900 cursor-pointer flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-500" />
                        Buchungsdaten und Belegbilder
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        CSV-Datei mit Buchungen + ZIP mit Belegbildern
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      id="exportBooking"
                      name="exportType"
                      value="booking"
                      checked={formData.exportType === 'booking'}
                      onChange={(e) => setFormData((prev) => ({ ...prev, exportType: e.target.value }))}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <label htmlFor="exportBooking" className="text-sm font-medium text-gray-900 cursor-pointer flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-500" />
                        Nur Buchungsdaten
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Nur CSV-Datei mit Buchungen
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      id="exportImages"
                      name="exportType"
                      value="images"
                      checked={formData.exportType === 'images'}
                      onChange={(e) => setFormData((prev) => ({ ...prev, exportType: e.target.value }))}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <label htmlFor="exportImages" className="text-sm font-medium text-gray-900 cursor-pointer flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-gray-500" />
                        Nur Belegbilder
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Nur ZIP mit Belegbildern
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Weitere Optionen */}
              <div className="pt-4 border-t border-gray-200 space-y-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="includeLockedData"
                    checked={formData.includeLockedData}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, includeLockedData: checked as boolean }))
                    }
                    className="mt-0.5"
                  />
                  <div className="flex items-center gap-2">
                    <Label htmlFor="includeLockedData" className="text-sm font-normal cursor-pointer">
                      Bereits festgeschriebene Daten exportieren
                    </Label>
                    <button type="button" className="text-gray-400 hover:text-gray-600">
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="includeUnpaidDocuments"
                    checked={formData.includeUnpaidDocuments}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, includeUnpaidDocuments: checked as boolean }))
                    }
                    className="mt-0.5"
                  />
                  <div className="flex items-center gap-2">
                    <Label htmlFor="includeUnpaidDocuments" className="text-sm font-normal cursor-pointer">
                      Auch offene Rechnungen und Belege exportieren
                    </Label>
                    <button type="button" className="text-gray-400 hover:text-gray-600">
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="lockDocuments"
                    checked={formData.lockDocuments}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, lockDocuments: checked as boolean }))
                    }
                    className="mt-0.5"
                  />
                  <div className="flex items-center gap-2">
                    <Label htmlFor="lockDocuments" className="text-sm font-normal cursor-pointer">
                      Dokumente nach dem Export festschreiben
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
                  <h4 className="text-sm font-semibold text-blue-900">Hinweis zum Datei-Export</h4>
                  <p className="text-sm text-blue-800">
                    Die exportierten Dateien können Sie manuell in DATEV importieren. 
                    Eine detaillierte Anleitung finden Sie in unserer Wissensdatenbank.
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
                  disabled={isExporting}
                  className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                >
                  {isExporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Exportiere...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Daten exportieren
                    </>
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
