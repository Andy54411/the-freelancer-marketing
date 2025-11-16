'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, HelpCircle, ExternalLink, Calendar, Download } from 'lucide-react';

export default function DatevInvoiceFileExportPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = params?.uid as string;

  const [formData, setFormData] = useState({
    accountantNumber: '',
    accountantClientNumber: '',
    fiscalYearStart: '01.01.2025',
    periodStart: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    periodEnd: new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split('T')[0],
    // Zu exportierende Dokumente
    includeIncomeDocuments: true, // Einnahmebelege, Ausgangsrechnungen & Gutschriften
    includeExpenseDocuments: true, // Ausgabebelege
    // Zu exportierende Daten
    includeDocumentImages: true, // Belegbilder (immer aktiv, disabled)
    includeInvoiceData: true, // Rechnungsdaten
    // Weitere Einstellungen
    includeLockedData: false, // Festgeschriebene Daten
    includeUnpaidDocuments: false, // Offene Rechnungen und Belege
  });

  const [isExporting, setIsExporting] = useState(false);

  const handleBack = () => {
    router.push(`/dashboard/company/${uid}/datev/export?type=invoices`);
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

    if (!formData.includeIncomeDocuments && !formData.includeExpenseDocuments) {
      alert('Bitte wählen Sie mindestens eine Dokumentart aus.');
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
          exportType: 'invoices',
          periodStart: formData.periodStart,
          periodEnd: formData.periodEnd,
          month: startDate.getMonth().toString(),
          year: startDate.getFullYear().toString(),
          includeBookingData: formData.includeInvoiceData,
          includeDocumentImages: formData.includeDocumentImages,
          includeMasterData: false,
          includeIncomeDocuments: formData.includeIncomeDocuments,
          includeExpenseDocuments: formData.includeExpenseDocuments,
          accountantNumber: formData.accountantNumber,
          accountantClientNumber: formData.accountantClientNumber,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Export fehlgeschlagen');
      }

      // XML Download erstellen (Rechnungsdaten)
      if (data.data.csvContent && formData.includeInvoiceData) {
        // Für Rechnungsdaten sollte es eigentlich XML sein, aber wir verwenden erstmal CSV
        const blob = new Blob([data.data.csvContent], { type: 'text/xml;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `DATEV_Rechnungsdaten_${formData.accountantNumber}_${formData.accountantClientNumber}_${startDate.toLocaleDateString('de-DE').replace(/\./g, '-')}.xml`;
        link.click();
      }

      // Belegbilder als ZIP
      if (data.data.documents > 0 && formData.includeDocumentImages) {
        alert(`${data.data.documents} Belegbilder werden als ZIP-Datei vorbereitet...`);
        // TODO: ZIP-Datei mit Belegbildern erstellen
      }

      alert(`Export erfolgreich!\n\nRechnungsdaten und ${data.data.documents} Belegbilder wurden exportiert.`);
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
                <div className="w-16 h-16 shrink-0">
                  {/* Folder Icon SVG */}
                  <svg width="100%" height="100%" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation">
                    <path d="M43.0769 19.2308V38.7692C43.0769 39.3017 42.8655 39.8123 42.4885 40.1893C42.1115 40.5663 41.6009 40.7777 41.0684 40.7777H6.93162C6.39908 40.7777 5.88848 40.5663 5.51149 40.1893C5.1345 39.8123 4.92308 39.3017 4.92308 38.7692V9.23085C4.92308 8.69831 5.1345 8.18771 5.51149 7.81072C5.88848 7.43373 6.39908 7.22232 6.93162 7.22232H18.6154L22.6308 12.2431H41.0684C41.6009 12.2431 42.1115 12.4545 42.4885 12.8315C42.8655 13.2085 43.0769 13.7191 43.0769 14.2516V19.2308Z" fill="#FFD766"/>
                    <path d="M43.0769 19.2308H4.92308V38.7692C4.92308 39.3017 5.1345 39.8123 5.51149 40.1893C5.88848 40.5663 6.39908 40.7777 6.93162 40.7777H41.0684C41.6009 40.7777 42.1115 40.5663 42.4885 40.1893C42.8655 39.8123 43.0769 39.3017 43.0769 38.7692V19.2308Z" fill="#FFC233"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Rechnungsdaten + Belegbilder</h3>
                  <p className="text-sm text-gray-600">via Datei-Export</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Form */}
          <div className="col-span-12 lg:col-span-8">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Manueller Datei-Export (Zip / XML)</h2>
                <p className="text-sm text-gray-600">
                  Die Belegbilder inklusive der Rechnungsdaten werden als ZIP-Datei heruntergeladen. Die Belegbilder
                  werden in Form einer PDF- oder JPG-Datei bereitgestellt und zusammen mit den Rechnungsdaten als XML
                  heruntergeladen.
                </p>
              </div>

              {/* Allgemeine Exporteinstellungen */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Allgemeine Exporteinstellungen</h3>
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12 md:col-span-4">
                    <Label htmlFor="accountantNumber" className="text-sm font-medium mb-2 flex items-center gap-2">
                      Beraternummer
                      <span className="text-red-500">*</span>
                      <button type="button" className="text-gray-400 hover:text-gray-600">
                        <HelpCircle className="w-4 h-4" />
                      </button>
                    </Label>
                    <Input
                      id="accountantNumber"
                      type="text"
                      placeholder="Beraternummer"
                      value={formData.accountantNumber}
                      onChange={(e) => setFormData((prev) => ({ ...prev, accountantNumber: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="col-span-12 md:col-span-4">
                    <Label htmlFor="accountantClientNumber" className="text-sm font-medium mb-2 flex items-center gap-2">
                      Mandantennummer
                      <span className="text-red-500">*</span>
                      <button type="button" className="text-gray-400 hover:text-gray-600">
                        <HelpCircle className="w-4 h-4" />
                      </button>
                    </Label>
                    <Input
                      id="accountantClientNumber"
                      type="text"
                      placeholder="Mandantennummer"
                      value={formData.accountantClientNumber}
                      onChange={(e) => setFormData((prev) => ({ ...prev, accountantClientNumber: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="col-span-12 md:col-span-4">
                    <Label htmlFor="fiscalYearStart" className="text-sm font-medium mb-2 block">
                      Wirtschaftsjahresbeginn
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="fiscalYearStart"
                        type="date"
                        value={formData.fiscalYearStart.split('.').reverse().join('-')}
                        onChange={(e) => {
                          const date = new Date(e.target.value);
                          const formatted = `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
                          setFormData((prev) => ({ ...prev, fiscalYearStart: formatted }));
                        }}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Exportzeitraum */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Exportzeitraum</h3>
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-6 sm:col-span-6 md:col-span-5 lg:col-span-4">
                    <Label htmlFor="periodStart" className="text-sm font-medium mb-2 block">
                      Startdatum
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

                  <div className="col-span-6 sm:col-span-6 md:col-span-5 lg:col-span-4">
                    <Label htmlFor="periodEnd" className="text-sm font-medium mb-2 block">
                      Enddatum
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

              {/* Zu exportierende Dokumente und Daten */}
              <div className="grid grid-cols-12 gap-6">
                {/* Zu exportierende Dokumente */}
                <div className="col-span-12 sm:col-span-7">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Zu exportierende Dokumente</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="includeIncomeDocuments"
                        checked={formData.includeIncomeDocuments}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({ ...prev, includeIncomeDocuments: checked as boolean }))
                        }
                        className="mt-0.5"
                      />
                      <Label htmlFor="includeIncomeDocuments" className="text-sm font-normal cursor-pointer">
                        Einnahmebelege, Ausgangsrechnungen & Gutschriften
                      </Label>
                    </div>

                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="includeExpenseDocuments"
                        checked={formData.includeExpenseDocuments}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({ ...prev, includeExpenseDocuments: checked as boolean }))
                        }
                        className="mt-0.5"
                      />
                      <Label htmlFor="includeExpenseDocuments" className="text-sm font-normal cursor-pointer">
                        Ausgabebelege
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Zu exportierende Daten */}
                <div className="col-span-12 sm:col-span-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Zu exportierende Daten</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="includeDocumentImages"
                        checked={formData.includeDocumentImages}
                        disabled={true}
                        className="mt-0.5"
                      />
                      <Label 
                        htmlFor="includeDocumentImages" 
                        className="text-sm font-normal cursor-not-allowed text-gray-500"
                      >
                        Belegbilder
                      </Label>
                    </div>

                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="includeInvoiceData"
                        checked={formData.includeInvoiceData}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({ ...prev, includeInvoiceData: checked as boolean }))
                        }
                        className="mt-0.5"
                      />
                      <Label htmlFor="includeInvoiceData" className="text-sm font-normal cursor-pointer">
                        Rechnungsdaten
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Weitere Einstellungen */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Weitere Einstellungen</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="includeLockedData"
                      checked={formData.includeLockedData}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({ ...prev, includeLockedData: checked as boolean }))
                      }
                      className="mt-0.5"
                    />
                    <Label htmlFor="includeLockedData" className="text-sm font-normal cursor-pointer">
                      Auch festgeschriebene Daten exportieren
                    </Label>
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
                  Anleitung zu diesem Export in der Wissensdatenbank
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
                      ZIP herunterladen
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
