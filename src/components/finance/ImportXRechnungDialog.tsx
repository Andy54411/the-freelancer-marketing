'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, CheckCircle, AlertCircle, X, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { XRechnungParserService } from '@/services/xrechnungParserService';
import { FirestoreInvoiceService } from '@/services/firestoreInvoiceService';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface ImportXRechnungDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onSuccess?: () => void;
  defaultType?: 'income' | 'expense'; // 🎯 Optional: Default-Type basierend auf Kontext
}

export function ImportXRechnungDialog({
  open,
  onOpenChange,
  companyId,
  onSuccess,
  defaultType,
}: ImportXRechnungDialogProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [importType, setImportType] = useState<'income' | 'expense' | null>(null); // 🎯 Einnahme oder Ausgabe?
  const [companyData, setCompanyData] = useState<any>(null); // Für Auto-Detection

  // 🏢 Company-Daten laden für Auto-Detection
  useEffect(() => {
    const loadCompanyData = async () => {
      try {
        const { db } = await import('@/firebase/clients');
        const { doc, getDoc } = await import('firebase/firestore');
        const companyDoc = await getDoc(doc(db, 'companies', companyId));
        if (companyDoc.exists()) {
          setCompanyData(companyDoc.data());
        }
      } catch (err) {
        console.error('Fehler beim Laden der Firmendaten:', err);
      }
    };
    loadCompanyData();
  }, [companyId]);

  // 🎯 Auto-Detection: Sobald Preview-Daten vorhanden, Type setzen
  useEffect(() => {
    if (previewData?.isOwnInvoice !== undefined) {
      setImportType(previewData.isOwnInvoice ? 'income' : 'expense');
    } else if (defaultType && !previewData) {
      // Fallback: Wenn kein Preview aber defaultType gesetzt, verwende defaultType
      setImportType(defaultType);
    }
  }, [previewData, defaultType]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.name.endsWith('.xml')) {
      setError('Bitte wählen Sie eine XML-Datei aus');
      return;
    }

    setFile(selectedFile);
    setError(null);

    // Parse XML for preview (mit Company-Name für Auto-Detection)
    try {
      const xmlText = await selectedFile.text();
      const parsedData = await XRechnungParserService.parseXML(
        xmlText,
        companyData?.companyName || companyData?.name // 🎯 Firmenname für Auto-Detection
      );
      setPreviewData(parsedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Lesen der Datei');
      setPreviewData(null);
    }
  };

  const handleImport = async () => {
    if (!file || !previewData || !importType) {
      toast.error('Bitte wählen Sie den Dokumenttyp (Einnahme oder Ausgabe)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (importType === 'income') {
        // � EINNAHME: Eigene Rechnung (Taskilo ist Verkäufer)
        // �🔍 STEP 1: Customer Matching
        const { CustomerMatchingService } = await import('@/services/customerMatchingService');
        
        const matchedCustomer = await CustomerMatchingService.findMatchingCustomer(
          companyId,
          previewData.buyerName,
          previewData.buyerEmail,
          previewData.buyerReference
        );
        
        if (matchedCustomer) {
          toast.success(`Kunde "${matchedCustomer.name}" gefunden (${matchedCustomer.matchReason})`);
        } else {
          toast.info('Kein passender Kunde gefunden. Bitte Kunde nach Import anlegen.');
        }
        
        // 🔧 STEP 2: Convert to InvoiceData
        const invoiceData = XRechnungParserService.convertToInvoiceData(
          previewData,
          companyId
        );

        // 💾 STEP 3: Save invoice
        const invoiceId = await FirestoreInvoiceService.saveInvoice(invoiceData as any);

        toast.success('📈 Einnahme erfolgreich importiert!');
        
        // Reset & Redirect
        setFile(null);
        setPreviewData(null);
        setImportType(null);
        onOpenChange(false);

        router.push(`/dashboard/company/${companyId}/finance/invoices/${invoiceId}/edit`);
        
      } else {
        // 📉 AUSGABE: Lieferantenrechnung (Taskilo ist Käufer)
        const expenseData = XRechnungParserService.convertToExpenseData(
          previewData,
          companyId
        );

        // 💾 Save expense via API
        const response = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(expenseData),
        });

        if (!response.ok) {
          throw new Error('Fehler beim Speichern der Ausgabe');
        }

        const _result = await response.json();

        toast.success('📉 Ausgabe erfolgreich importiert!');
        
        // Reset & Redirect
        setFile(null);
        setPreviewData(null);
        setImportType(null);
        onOpenChange(false);

        router.push(`/dashboard/company/${companyId}/finance/expenses`);
      }
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Import Error:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Importieren');
      toast.error('Fehler beim Importieren der E-Rechnung');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreviewData(null);
    setError(null);
    setImportType(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#14ad9f]" />
            E-Rechnung importieren
          </DialogTitle>
          <DialogDescription>
            {defaultType === 'expense' 
              ? 'Laden Sie eine E-Rechnung hoch, um sie als Ausgabe (Lieferantenrechnung) zu importieren.'
              : 'Laden Sie eine XRechnung oder ZUGFeRD XML-Datei hoch, um sie als Rechnung zu importieren.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="xml-file">XML-Datei auswählen</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => document.getElementById('xml-file')?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                {file ? file.name : 'XML-Datei hochladen'}
              </Button>
              {file && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setFile(null);
                    setPreviewData(null);
                    setError(null);
                    setImportType(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <input
              id="xml-file"
              type="file"
              accept=".xml"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Fehler</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}

          {/* Preview Data */}
          {previewData && !error && (
            <div className="space-y-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">E-Rechnung erfolgreich erkannt</span>
              </div>

              {/* 🎯 Type Selection: Einnahme oder Ausgabe */}
              {importType && (
                <Alert className={`${importType === 'income' ? 'bg-green-50 border-green-500' : 'bg-amber-50 border-amber-500'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {importType === 'income' ? (
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-amber-600" />
                      )}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={importType === 'income' ? 'bg-green-600' : 'bg-amber-600'}>
                            {importType === 'income' ? '📈 Einnahme' : '📉 Ausgabe'}
                          </Badge>
                          <span className="text-xs text-gray-500">Automatisch erkannt</span>
                        </div>
                        <AlertDescription className="text-sm">
                          {importType === 'income' 
                            ? 'Eigene Rechnung erkannt (Sie sind der Verkäufer)'
                            : 'Lieferantenrechnung erkannt (Sie sind der Käufer)'}
                        </AlertDescription>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setImportType(prev => prev === 'income' ? 'expense' : 'income')}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Korrigieren
                    </Button>
                  </div>
                </Alert>
              )}

              <div className="space-y-4">{/* Basic Info */}
                {/* Basic Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 mb-1">Rechnungsnummer</p>
                    <p className="font-medium break-all">{previewData.invoiceNumber}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Datum</p>
                    <p className="font-medium">{previewData.issueDate}</p>
                  </div>
                </div>

                {/* Seller Info */}
                <div className="p-3 bg-white rounded border border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-2">Lieferant</p>
                  <p className="font-medium">{previewData.sellerName}</p>
                  <p className="text-sm text-gray-600">
                    {previewData.sellerAddress.street}<br />
                    {previewData.sellerAddress.postalCode} {previewData.sellerAddress.city}<br />
                    {previewData.sellerAddress.country}
                  </p>
                  {previewData.sellerEmail && (
                    <p className="text-sm text-gray-600 mt-1">
                      📧 {previewData.sellerEmail}
                    </p>
                  )}
                  {previewData.sellerTaxId && (
                    <p className="text-sm text-gray-600">
                      USt-IdNr.: {previewData.sellerTaxId}
                    </p>
                  )}
                </div>

                {/* Buyer Info */}
                <div className="p-3 bg-white rounded border border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-2">Kunde</p>
                  <p className="font-medium">{previewData.buyerName}</p>
                  <p className="text-sm text-gray-600">
                    {previewData.buyerAddress.street}<br />
                    {previewData.buyerAddress.postalCode} {previewData.buyerAddress.city}<br />
                    {previewData.buyerAddress.country}
                  </p>
                  {previewData.buyerEmail && (
                    <p className="text-sm text-gray-600 mt-1">
                      📧 {previewData.buyerEmail}
                    </p>
                  )}
                </div>

                {/* Payment Info */}
                {previewData.iban && (
                  <div className="p-3 bg-white rounded border border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-2">Zahlungsinformationen</p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">IBAN:</span> {previewData.iban}
                    </p>
                    {previewData.bic && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">BIC:</span> {previewData.bic}
                      </p>
                    )}
                    {previewData.accountHolder && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Kontoinhaber:</span> {previewData.accountHolder}
                      </p>
                    )}
                    {previewData.paymentTerms && (
                      <p className="text-sm text-gray-600 mt-1">
                        {previewData.paymentTerms}
                      </p>
                    )}
                  </div>
                )}

                {/* Amounts */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Netto</p>
                    <p className="font-medium">
                      {previewData.subtotal.toFixed(2)} {previewData.currency}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">MwSt.</p>
                    <p className="font-medium">
                      {previewData.taxAmount.toFixed(2)} {previewData.currency} ({previewData.taxRate}%)
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500">Gesamt</p>
                    <p className="text-lg font-bold text-[#14ad9f]">
                      {previewData.total.toFixed(2)} {previewData.currency}
                    </p>
                  </div>
                </div>
              </div>

              {/* Line Items Preview */}
              {previewData.lineItems && previewData.lineItems.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Positionen ({previewData.lineItems.length})
                  </p>
                  <div className="space-y-2">
                    {previewData.lineItems.map((item: any, index: number) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-2 bg-white rounded border border-gray-200"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium">{item.description}</p>
                          <p className="text-xs text-gray-500">
                            {item.quantity} × {item.unitPrice.toFixed(2)} {previewData.currency}
                          </p>
                        </div>
                        <p className="text-sm font-medium">
                          {item.totalAmount.toFixed(2)} {previewData.currency}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Abbrechen
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={!previewData || !!error || loading || !importType}
            className={`${
              importType === 'income' 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-amber-600 hover:bg-amber-700'
            } text-white`}
          >
            {loading 
              ? 'Wird importiert...' 
              : `Als ${importType === 'income' ? 'Einnahme' : 'Ausgabe'} importieren`
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
