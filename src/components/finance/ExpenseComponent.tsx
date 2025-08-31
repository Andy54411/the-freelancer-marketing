'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Upload, FileText, Edit, Trash2, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { PdfPreview } from './PdfPreview';

interface ExpenseData {
  id?: string;
  title: string;
  amount: number | null;
  category: string;
  date: string;
  description: string;
  vendor?: string;
  invoiceNumber?: string;
  vatAmount?: number | null;
  netAmount?: number | null;
  vatRate?: number | null;
  companyName?: string;
  companyAddress?: string;
  companyVatNumber?: string;
  contactEmail?: string;
  contactPhone?: string;
  receipt?: {
    fileName: string;
    downloadURL: string;
    uploadDate: string;
  } | null;
  taxDeductible?: boolean;
}

interface ExpenseFormData {
  title: string;
  amount: string;
  category: string;
  date: string;
  description: string;
  vendor: string;
  invoiceNumber: string;
  vatAmount: string;
  netAmount: string;
  vatRate: string;
  companyName: string;
  companyAddress: string;
  companyVatNumber: string;
  contactEmail: string;
  contactPhone: string;
  taxDeductible: boolean;
}

interface ExpenseComponentProps {
  companyId: string;
  expenses: ExpenseData[];
  onSave?: (expense: ExpenseData) => Promise<boolean>;
  onRefresh?: () => Promise<void>;
}

export function ExpenseComponent({
  companyId,
  expenses,
  onSave,
  onRefresh,
}: ExpenseComponentProps) {
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<ExpenseFormData>({
    title: '',
    amount: '',
    category: 'Sonstiges',
    date: new Date().toISOString().split('T')[0],
    description: '',
    vendor: '',
    invoiceNumber: '',
    vatAmount: '',
    netAmount: '',
    vatRate: '19',
    companyName: '',
    companyAddress: '',
    companyVatNumber: '',
    contactEmail: '',
    contactPhone: '',
    taxDeductible: false,
  });

  const [currentReceipt, setCurrentReceipt] = useState<File | null>(null);

  const categories = [
    'Büromaterial',
    'Software/Lizenzen',
    'Marketing/Werbung',
    'Reisekosten',
    'Kommunikation',
    'Beratung',
    'IT/Hosting',
    'Miete/Nebenkosten',
    'Versicherungen',
    'Steuern/Abgaben',
    'Fortbildung',
    'Bewirtung',
    'Fahrzeugkosten',
    'Reparaturen',
    'Sonstiges',
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const cleanCompanyAddress = (address: string, vatNumber?: string, invoiceNumber?: string) => {
    if (!address) return '';

    let cleanedAddress = address;

    // Entferne VAT-Nummer und verwandte Begriffe
    if (vatNumber) {
      cleanedAddress = cleanedAddress.replace(new RegExp(vatNumber, 'gi'), '');
    }
    cleanedAddress = cleanedAddress.replace(/Umsatzsteuer-Identifikationsnummer:?\s*/gi, '');
    cleanedAddress = cleanedAddress.replace(/VAT Number:?\s*/gi, '');
    cleanedAddress = cleanedAddress.replace(/USt-IdNr:?\s*/gi, '');

    // Entferne Rechnungsinformationen
    if (invoiceNumber) {
      cleanedAddress = cleanedAddress.replace(new RegExp(invoiceNumber, 'gi'), '');
    }
    cleanedAddress = cleanedAddress.replace(/Rechnungsnummer:?\s*/gi, '');
    cleanedAddress = cleanedAddress.replace(/Invoice Number:?\s*/gi, '');
    cleanedAddress = cleanedAddress.replace(/Rechnungsdatum:?\s*/gi, '');
    cleanedAddress = cleanedAddress.replace(/Invoice Date:?\s*/gi, '');

    // Entferne Betragsangaben
    cleanedAddress = cleanedAddress.replace(/Gesamtsumme\s+in\s+\w+:?\s*/gi, '');
    cleanedAddress = cleanedAddress.replace(/Total\s+in\s+\w+:?\s*/gi, '');
    cleanedAddress = cleanedAddress.replace(/\d+[.,]\d+\s*€/g, '');

    // Entferne weitere Details
    cleanedAddress = cleanedAddress.replace(/Details\s*/gi, '');
    cleanedAddress = cleanedAddress.replace(/Abrechnungs-ID:?\s*/gi, '');
    cleanedAddress = cleanedAddress.replace(/Billing ID:?\s*/gi, '');

    // Bereinige Datumsangaben (Format: XX. Monat YYYY)
    cleanedAddress = cleanedAddress.replace(/\d{1,2}\.\s*\w+\.?\s*\d{4}/g, '');

    // Entferne mehrfache Zeilenumbrüche und Leerzeichen
    cleanedAddress = cleanedAddress
      .replace(/\\n+/g, '\n')
      .replace(/\n\s*\n/g, '\n')
      .replace(/^\s+|\s+$/g, '')
      .replace(/\n\s*/g, '\n');

    // Entferne leere Zeilen am Anfang und Ende
    const lines = cleanedAddress.split('\n').filter(line => line.trim().length > 0);

    return lines.join('\n');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;

    setUploadingFile(true);
    toast.info('OCR-Extraktion startet...', {
      description: 'Analysiere PDF-Inhalt mit KI',
    });

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('companyId', companyId);

      const response = await fetch('/api/expenses/extract-receipt', {
        method: 'POST',
        body: formDataUpload,
      });

      const result = await response.json();

      if (result.success) {
        const data = result.data;

        // Bereinige die Firmenadresse vor der Verwendung
        const cleanedAddress = cleanCompanyAddress(
          data.companyAddress,
          data.companyVatNumber,
          data.invoiceNumber
        );

        // Update form with extracted data
        setFormData(prev => ({
          ...prev,
          title: data.title || prev.title,
          amount: data.amount ? data.amount.toString() : prev.amount,
          category: data.category || prev.category,
          description: data.description || prev.description,
          vendor: data.vendor || prev.vendor,
          date: data.date || prev.date,
          invoiceNumber: data.invoiceNumber || prev.invoiceNumber,
          vatAmount: data.vatAmount ? data.vatAmount.toString() : prev.vatAmount,
          netAmount: data.netAmount ? data.netAmount.toString() : prev.netAmount,
          vatRate: data.vatRate ? data.vatRate.toString() : prev.vatRate,
          companyName: data.companyName || prev.companyName,
          companyAddress: cleanedAddress || prev.companyAddress,
          companyVatNumber: data.companyVatNumber || prev.companyVatNumber,
          contactEmail: data.contactEmail || prev.contactEmail,
          contactPhone: data.contactPhone || prev.contactPhone,
        }));

        setCurrentReceipt(file);
        toast.success('Daten erfolgreich extrahiert!');
      } else {
        toast.error('Analyse fehlgeschlagen', {
          description: result.error || 'Datei konnte nicht verarbeitet werden',
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload-Fehler');
    } finally {
      setUploadingFile(false);
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleSaveExpense = async () => {
    if (!formData.title || !formData.amount || !formData.category) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Bitte geben Sie einen gültigen Betrag ein');
      return;
    }

    setIsLoading(true);

    try {
      const expenseData: ExpenseData = {
        title: formData.title,
        amount,
        category: formData.category,
        date: formData.date,
        description: formData.description,
        vendor: formData.vendor || '',
        invoiceNumber: formData.invoiceNumber || '',
        vatAmount: formData.vatAmount ? parseFloat(formData.vatAmount) : null,
        netAmount: formData.netAmount ? parseFloat(formData.netAmount) : null,
        vatRate: formData.vatRate ? parseFloat(formData.vatRate) : null,
        companyName: formData.companyName || '',
        companyAddress: formData.companyAddress || '',
        companyVatNumber: formData.companyVatNumber || '',
        contactEmail: formData.contactEmail || '',
        contactPhone: formData.contactPhone || '',
        taxDeductible: formData.taxDeductible,
        receipt: currentReceipt
          ? {
              fileName: currentReceipt.name,
              downloadURL: '',
              uploadDate: new Date().toISOString(),
            }
          : null,
      };

      const success = await onSave?.(expenseData);

      if (success) {
        setFormData({
          title: '',
          amount: '',
          category: 'Sonstiges',
          date: new Date().toISOString().split('T')[0],
          description: '',
          vendor: '',
          invoiceNumber: '',
          vatAmount: '',
          netAmount: '',
          vatRate: '19',
          companyName: '',
          companyAddress: '',
          companyVatNumber: '',
          contactEmail: '',
          contactPhone: '',
          taxDeductible: false,
        });
        setCurrentReceipt(null);
        setShowForm(false);
        toast.success('Ausgabe erfolgreich gespeichert');
        await onRefresh?.();
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Fehler beim Speichern');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Ausgaben verwalten</h2>
          <p className="text-gray-600">Geschäftsausgaben erfassen und verwalten</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-[#14ad9f] hover:bg-[#129488] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Neue Ausgabe
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="bg-white/30 backdrop-blur-sm border-[#14ad9f]/20">
          <CardHeader className="border-b border-[#14ad9f]/10">
            <CardTitle className="text-[#14ad9f]">Neue Ausgabe erfassen</CardTitle>
            <CardDescription>
              Laden Sie einen Beleg hoch für automatische Datenextraktion oder geben Sie die Daten
              manuell ein
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* File Upload */}
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-300 hover:border-[#14ad9f] transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <div className="text-sm text-gray-600 mb-3">
                  {currentReceipt ? (
                    <span className="text-[#14ad9f] font-medium">
                      Ausgewählt: {currentReceipt.name}
                    </span>
                  ) : (
                    <div>
                      <div>PDF-Beleg oder Rechnung hochladen für automatische Datenextraktion</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Tipp: Für Beträge Datei wie &quot;Rechnung-123-45.67.pdf&quot; benennen
                      </div>
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  className="border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingFile ? 'Verarbeitung...' : 'Beleg hochladen'}
                </Button>
              </div>
            </div>

            {/* Side-by-Side Layout: Form und PDF Preview */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Left Column: Form Fields */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Grundinformationen
                </h3>

                <div>
                  <Label htmlFor="title">Titel/Beschreibung *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="z.B. Büromaterial August 2024"
                    className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="amount">Betrag (€) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="0.00"
                      className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Kategorie *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={value => setFormData(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger className="focus:ring-[#14ad9f] focus:border-[#14ad9f]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="date">Datum</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="invoiceNumber">Rechnungsnummer</Label>
                    <Input
                      id="invoiceNumber"
                      value={formData.invoiceNumber}
                      onChange={e =>
                        setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))
                      }
                      placeholder="z.B. RG-2024-001"
                      className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="vendor">Anbieter/Lieferant</Label>
                  <Input
                    id="vendor"
                    value={formData.vendor}
                    onChange={e => setFormData(prev => ({ ...prev, vendor: e.target.value }))}
                    placeholder="Name des Anbieters"
                    className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Beschreibung/Notizen</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Zusätzliche Details zur Ausgabe..."
                    rows={3}
                    className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                  />
                </div>

                {/* VAT Section */}
                <div className="space-y-4 border-t pt-4">
                  <h4 className="font-medium text-gray-900">Steuerinformationen</h4>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="vatRate">USt-Satz (%)</Label>
                      <Select
                        value={formData.vatRate}
                        onValueChange={value => setFormData(prev => ({ ...prev, vatRate: value }))}
                      >
                        <SelectTrigger className="focus:ring-[#14ad9f] focus:border-[#14ad9f]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0% (steuerbefreit)</SelectItem>
                          <SelectItem value="7">7% (ermäßigt)</SelectItem>
                          <SelectItem value="19">19% (regulär)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="netAmount">Nettobetrag (€)</Label>
                      <Input
                        id="netAmount"
                        type="number"
                        step="0.01"
                        value={formData.netAmount}
                        onChange={e =>
                          setFormData(prev => ({ ...prev, netAmount: e.target.value }))
                        }
                        placeholder="0.00"
                        className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                      />
                    </div>
                    <div>
                      <Label htmlFor="vatAmount">USt-Betrag (€)</Label>
                      <Input
                        id="vatAmount"
                        type="number"
                        step="0.01"
                        value={formData.vatAmount}
                        onChange={e =>
                          setFormData(prev => ({ ...prev, vatAmount: e.target.value }))
                        }
                        placeholder="0.00"
                        className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="companyVatNumber">USt-IdNr./Steuernummer des Anbieters</Label>
                    <Input
                      id="companyVatNumber"
                      value={formData.companyVatNumber}
                      onChange={e =>
                        setFormData(prev => ({ ...prev, companyVatNumber: e.target.value }))
                      }
                      placeholder="z.B. DE123456789 oder IE3668997OH"
                      className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                    />
                  </div>
                </div>

                {/* Company Information */}
                <div className="space-y-4 border-t pt-4">
                  <h4 className="font-medium text-gray-900">Firmeninformationen</h4>

                  <div>
                    <Label htmlFor="companyName">Firmenname</Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={e =>
                        setFormData(prev => ({ ...prev, companyName: e.target.value }))
                      }
                      placeholder="Name der Firma"
                      className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                    />
                  </div>

                  <div>
                    <Label htmlFor="companyAddress">Firmenadresse</Label>
                    <Textarea
                      id="companyAddress"
                      value={formData.companyAddress}
                      onChange={e =>
                        setFormData(prev => ({ ...prev, companyAddress: e.target.value }))
                      }
                      placeholder="Straße, PLZ Ort, Land"
                      rows={2}
                      className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="contactEmail">E-Mail</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="contactEmail"
                          type="email"
                          value={formData.contactEmail}
                          onChange={e =>
                            setFormData(prev => ({ ...prev, contactEmail: e.target.value }))
                          }
                          placeholder="kontakt@firma.de"
                          className="pl-10 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="contactPhone">Telefon</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="contactPhone"
                          value={formData.contactPhone}
                          onChange={e =>
                            setFormData(prev => ({ ...prev, contactPhone: e.target.value }))
                          }
                          placeholder="+49 123 456789"
                          className="pl-10 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tax Deductible Checkbox */}
                <div className="flex items-center space-x-2 border-t pt-4">
                  <Checkbox
                    id="taxDeductible"
                    checked={formData.taxDeductible}
                    onCheckedChange={checked =>
                      setFormData(prev => ({ ...prev, taxDeductible: !!checked }))
                    }
                  />
                  <Label
                    htmlFor="taxDeductible"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Steuerlich absetzbar
                  </Label>
                </div>
              </div>

              {/* Right Column: PDF Preview */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  PDF-Vorschau
                </h3>

                <PdfPreview file={currentReceipt} className="h-[800px]" />

                {currentReceipt && (
                  <div className="bg-[#14ad9f]/10 rounded-lg p-4 border border-[#14ad9f]/20">
                    <div className="flex items-start space-x-3">
                      <FileText className="h-5 w-5 text-[#14ad9f] mt-0.5" />
                      <div>
                        <div className="text-sm font-medium text-[#14ad9f] mb-1">
                          Beleg hochgeladen: {currentReceipt.name}
                        </div>
                        <div className="text-xs text-gray-600">
                          Überprüfen Sie die automatisch extrahierten Daten links mit dem PDF-Inhalt
                          rechts auf Korrektheit
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setFormData({
                    title: '',
                    amount: '',
                    category: 'Sonstiges',
                    date: new Date().toISOString().split('T')[0],
                    description: '',
                    vendor: '',
                    invoiceNumber: '',
                    vatAmount: '',
                    netAmount: '',
                    vatRate: '19',
                    companyName: '',
                    companyAddress: '',
                    companyVatNumber: '',
                    contactEmail: '',
                    contactPhone: '',
                    taxDeductible: false,
                  });
                  setCurrentReceipt(null);
                }}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleSaveExpense}
                disabled={isLoading}
                className="bg-[#14ad9f] hover:bg-[#129488] text-white"
              >
                {isLoading ? 'Speichern...' : 'Ausgabe speichern'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expenses List */}
      <Card>
        <CardHeader>
          <CardTitle>Gespeicherte Ausgaben</CardTitle>
          <CardDescription>
            Übersicht aller erfassten Geschäftsausgaben ({expenses.length} Einträge)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {expenses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p>Noch keine Ausgaben erfasst</p>
                <p className="text-sm">Klicken Sie auf &quot;Neue Ausgabe&quot; um zu beginnen</p>
              </div>
            ) : (
              <div className="space-y-3">
                {expenses.map(expense => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{expense.title}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-3">
                            <span>{expense.category}</span>
                            {expense.vendor && (
                              <>
                                <span>•</span>
                                <span>{expense.vendor}</span>
                              </>
                            )}
                            {expense.invoiceNumber && (
                              <>
                                <span>•</span>
                                <span>RG: {expense.invoiceNumber}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-lg">
                            {formatCurrency(expense.amount || 0)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(expense.date).toLocaleDateString('de-DE')}
                          </div>
                        </div>
                      </div>
                      {expense.description && (
                        <div className="text-sm text-gray-600 mt-2">{expense.description}</div>
                      )}
                      {expense.receipt && (
                        <div className="text-xs text-[#14ad9f] mt-1 flex items-center">
                          <FileText className="h-3 w-3 mr-1" />
                          Beleg: {expense.receipt.fileName}
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-1 ml-4">
                      <Button variant="ghost" size="sm" className="hover:bg-[#14ad9f]/10">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
