'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
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
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/firebase/clients';
import ExpenseReceiptUpload from '@/components/finance/ExpenseReceiptUpload';
import Link from 'next/link';

// Upload PDF to Firebase Storage
const uploadPdfToStorage = async (file: File, companyId: string): Promise<string> => {
  try {
    console.log('🔄 Starting PDF upload...', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      companyId,
    });

    const fileName = `${Date.now()}-${file.name}`;
    const storagePath = `companies/${companyId}/expenses/${fileName}`;
    const storageRef = ref(storage, storagePath);

    console.log('📁 Storage path:', storagePath);

    await uploadBytes(storageRef, file, {
      contentType: file.type,
    });

    console.log('✅ Upload successful');

    const downloadURL = await getDownloadURL(storageRef);
    console.log('🔗 Download URL:', downloadURL);

    return downloadURL;
  } catch (error: any) {
    console.error('❌ Error uploading PDF:', error);
    throw new Error(`PDF-Upload fehlgeschlagen: ${error.message}`);
  }
};

interface LineItem {
  position: string;
  description: string;
  quantity: number | null;
  unitPrice: number | null;
  totalPrice: number | null;
  unit?: string;
}

interface ExpenseFormData {
  title: string;
  amount: string;
  category: string;
  date: string;
  dueDate: string;
  paymentTerms: string;
  description: string;
  vendor: string;
  invoiceNumber: string;
  vatAmount: string;
  netAmount: string;
  vatRate: string;
  companyName: string;
  companyAddress: string;
  companyCity: string;
  companyZip: string;
  companyCountry: string;
  companyVatNumber: string;
  contactEmail: string;
  contactPhone: string;
  supplierId: string;
  taxDeductible: boolean;
}

export default function EditExpensePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';
  const expenseId = typeof params?.expenseId === 'string' ? params.expenseId : '';

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [currentReceipt, setCurrentReceipt] = useState<File | null>(null);
  const [currentReceipts, setCurrentReceipts] = useState<string[]>([]);
  const [extractedLineItems, setExtractedLineItems] = useState<LineItem[]>([]);

  const [formData, setFormData] = useState<ExpenseFormData>({
    title: '',
    amount: '',
    category: 'Sonstiges',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    paymentTerms: '',
    description: '',
    vendor: '',
    invoiceNumber: '',
    vatAmount: '',
    netAmount: '',
    vatRate: '19',
    companyName: '',
    companyAddress: '',
    companyCity: '',
    companyZip: '',
    companyCountry: '',
    companyVatNumber: '',
    contactEmail: '',
    contactPhone: '',
    supplierId: '',
    taxDeductible: false,
  });

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

  // Lade bestehende Ausgabe
  useEffect(() => {
    const loadExpense = async () => {
      if (!uid || !expenseId) return;

      try {
        setIsFetching(true);
        const response = await fetch(`/api/expenses?companyId=${uid}`);

        if (!response.ok) {
          throw new Error('Fehler beim Laden der Ausgabe');
        }

        const result = await response.json();
        const expense = result.expenses?.find((e: any) => e.id === expenseId);

        if (!expense) {
          toast.error('Ausgabe nicht gefunden');
          router.push(`/dashboard/company/${uid}/finance/expenses`);
          return;
        }

        // Formular mit bestehenden Daten befüllen
        setFormData({
          title: expense.title || '',
          amount: expense.amount?.toString() || '',
          category: expense.category || 'Sonstiges',
          date: expense.date || new Date().toISOString().split('T')[0],
          dueDate: expense.dueDate || '',
          paymentTerms: expense.paymentTerms || '',
          description: expense.description || '',
          vendor: expense.vendor || '',
          invoiceNumber: expense.invoiceNumber || '',
          vatAmount: expense.vatAmount?.toString() || '',
          netAmount: expense.netAmount?.toString() || '',
          vatRate: expense.vatRate?.toString() || '19',
          companyName: expense.companyName || '',
          companyAddress: expense.companyAddress || '',
          companyCity: expense.companyCity || '',
          companyZip: expense.companyZip || '',
          companyCountry: expense.companyCountry || '',
          companyVatNumber: expense.companyVatNumber || '',
          contactEmail: expense.contactEmail || '',
          contactPhone: expense.contactPhone || '',
          supplierId: expense.supplierId || '',
          taxDeductible: expense.taxDeductible || false,
        });

        // Bestehende Belege laden
        if (expense.receipts && Array.isArray(expense.receipts)) {
          setCurrentReceipts(expense.receipts.map((r: any) => r.downloadURL));
        } else if (expense.receipt?.downloadURL) {
          setCurrentReceipts([expense.receipt.downloadURL]);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Ausgabe:', error);
        toast.error('Ausgabe konnte nicht geladen werden');
        router.push(`/dashboard/company/${uid}/finance/expenses`);
      } finally {
        setIsFetching(false);
      }
    };

    loadExpense();
  }, [uid, expenseId, router]);

  const findOrCreateSupplier = async (
    companyName: string,
    additionalData: {
      contactEmail?: string;
      contactPhone?: string;
      companyAddress?: string;
      companyVatNumber?: string;
    }
  ): Promise<string> => {
    try {
      const response = await fetch('/api/suppliers/find-or-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: uid,
          name: companyName,
          ...additionalData,
        }),
      });

      if (!response.ok) throw new Error('Supplier creation failed');

      const result = await response.json();
      return result.supplierId;
    } catch (error) {
      console.error('Supplier error:', error);
      return '';
    }
  };

  const handleUpdate = async () => {
    if (!formData.title || !formData.amount || !formData.category) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus (Titel, Betrag, Kategorie)');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Bitte geben Sie einen gültigen Betrag ein');
      return;
    }

    setIsLoading(true);

    try {
      // Automatische Lieferanten-Erstellung
      let supplierId = formData.supplierId;
      if (formData.companyName && !supplierId) {
        supplierId = await findOrCreateSupplier(formData.companyName, {
          contactEmail: formData.contactEmail,
          contactPhone: formData.contactPhone,
          companyAddress: formData.companyAddress,
          companyVatNumber: formData.companyVatNumber,
        });
      }

      // PDF-Upload zu Firebase Storage
      const receipts: any[] = [];

      if (currentReceipts.length > 0) {
        receipts.push(
          ...currentReceipts.map(url => ({
            fileName: url.split('/').pop() || 'receipt.pdf',
            downloadURL: url,
            uploadDate: new Date().toISOString(),
          }))
        );
      } else if (currentReceipt) {
        try {
          toast.info('Beleg wird hochgeladen...', {
            description: 'Beleg wird für Steuerberater gespeichert',
          });

          const downloadURL = await uploadPdfToStorage(currentReceipt, uid);
          receipts.push({
            fileName: currentReceipt.name,
            downloadURL,
            uploadDate: new Date().toISOString(),
          });

          toast.success('Beleg erfolgreich gespeichert!');
        } catch (error) {
          toast.error('Upload fehlgeschlagen, Ausgabe wird trotzdem gespeichert');
        }
      }

      const expenseData = {
        id: expenseId, // Wichtig für UPDATE
        companyId: uid,
        title: formData.title,
        amount,
        category: formData.category,
        description: formData.description || '',
        date: formData.date,
        dueDate: formData.dueDate || '',
        paymentTerms: formData.paymentTerms || '',
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
        supplierId,
        taxDeductible: formData.taxDeductible,
        receipts: receipts.length > 0 ? receipts : null,
        receipt: receipts.length > 0 ? receipts[0] : null,
      };

      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData),
      });

      if (!response.ok) throw new Error('API request failed');

      const result = await response.json();

      if (result.success) {
        toast.success('Ausgabe erfolgreich aktualisiert!');
        router.push(`/dashboard/company/${uid}/finance/expenses`);
      } else {
        throw new Error(result.error || 'Aktualisierung fehlgeschlagen');
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Fehler beim Aktualisieren der Ausgabe');
    } finally {
      setIsLoading(false);
    }
  };

  // Autorisierung prüfen
  if (!user || user.uid !== uid) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Zugriff verweigert</h2>
          <p className="text-gray-600">Sie sind nicht berechtigt, diese Seite zu sehen.</p>
        </div>
      </div>
    );
  }

  if (isFetching) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#14ad9f] mx-auto mb-4" />
          <p className="text-gray-600">Ausgabe wird geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/company/${uid}/finance/expenses`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ausgabe bearbeiten</h1>
            <p className="text-sm text-gray-600">
              Aktualisieren Sie die Ausgabendaten oder laden Sie zusätzliche Belege hoch
            </p>
          </div>
        </div>
      </div>

      <Card className="bg-white/30 backdrop-blur-sm border-[#14ad9f]/20">
        <CardContent className="p-6">
          {/* Side-by-Side Layout: Formular Links, Beleg-Upload Rechts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Linke Spalte: Formular */}
            <div className="space-y-6 overflow-y-auto">
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
                  <Label htmlFor="date">Ausgabedatum</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                  />
                </div>
                <div>
                  <Label htmlFor="dueDate">Fälligkeitsdatum</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={e => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="invoiceNumber">Rechnungsnummer</Label>
                  <Input
                    id="invoiceNumber"
                    value={formData.invoiceNumber}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))
                    }
                    placeholder="z.B. RE-1082"
                    className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                  />
                </div>
                <div>
                  <Label htmlFor="paymentTerms">Zahlungsbedingungen</Label>
                  <Input
                    id="paymentTerms"
                    value={formData.paymentTerms}
                    onChange={e => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                    placeholder="z.B. Zahlbar binnen 14 Tagen"
                    className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="vendor">Lieferant/Anbieter</Label>
                <Input
                  id="vendor"
                  value={formData.vendor}
                  onChange={e => setFormData(prev => ({ ...prev, vendor: e.target.value }))}
                  placeholder="Name des Anbieters"
                  className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                />
              </div>

              <div>
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Zusätzliche Details zur Ausgabe..."
                  rows={3}
                  className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                />
              </div>

              {/* Steuerinformationen */}
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Steuerinformationen
              </h3>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="vatRate">
                    MwSt-Satz (%)
                    {formData.vatRate === '0' && (
                      <span className="text-xs text-orange-600 ml-2">Reverse Charge</span>
                    )}
                  </Label>
                  <Select
                    value={formData.vatRate}
                    onValueChange={value => setFormData(prev => ({ ...prev, vatRate: value }))}
                  >
                    <SelectTrigger className="focus:ring-[#14ad9f] focus:border-[#14ad9f]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0% (steuerfrei/Reverse Charge)</SelectItem>
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
                    onChange={e => setFormData(prev => ({ ...prev, netAmount: e.target.value }))}
                    placeholder="0.00"
                    className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                  />
                </div>
                <div>
                  <Label htmlFor="vatAmount">MwSt-Betrag (€)</Label>
                  <Input
                    id="vatAmount"
                    type="number"
                    step="0.01"
                    value={formData.vatAmount}
                    onChange={e => setFormData(prev => ({ ...prev, vatAmount: e.target.value }))}
                    placeholder="0.00"
                    className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="taxDeductible"
                  checked={formData.taxDeductible}
                  onCheckedChange={checked =>
                    setFormData(prev => ({ ...prev, taxDeductible: checked as boolean }))
                  }
                />
                <Label htmlFor="taxDeductible" className="cursor-pointer">
                  Steuerlich absetzbar
                </Label>
              </div>

              {/* Firmeninformationen */}
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Firmeninformationen
              </h3>

              <div>
                <Label htmlFor="companyName">Firmenname</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={e => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                  placeholder="Name der Firma"
                  className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                />
              </div>

              <div>
                <Label htmlFor="companyAddress">Straße & Hausnummer</Label>
                <Input
                  id="companyAddress"
                  value={formData.companyAddress}
                  onChange={e => setFormData(prev => ({ ...prev, companyAddress: e.target.value }))}
                  placeholder="z.B. Musterstraße 123"
                  className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="companyZip">PLZ</Label>
                  <Input
                    id="companyZip"
                    value={formData.companyZip}
                    onChange={e => setFormData(prev => ({ ...prev, companyZip: e.target.value }))}
                    placeholder="z.B. 10115"
                    className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="companyCity">Stadt</Label>
                  <Input
                    id="companyCity"
                    value={formData.companyCity}
                    onChange={e => setFormData(prev => ({ ...prev, companyCity: e.target.value }))}
                    placeholder="z.B. Berlin"
                    className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="companyCountry">Land</Label>
                <Input
                  id="companyCountry"
                  value={formData.companyCountry}
                  onChange={e => setFormData(prev => ({ ...prev, companyCountry: e.target.value }))}
                  placeholder="z.B. Deutschland"
                  className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                />
              </div>

              <div>
                <Label htmlFor="companyVatNumber">USt-IdNr.</Label>
                <Input
                  id="companyVatNumber"
                  value={formData.companyVatNumber}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, companyVatNumber: e.target.value }))
                  }
                  placeholder="z.B. DE123456789"
                  className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="contactEmail">E-Mail</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={e => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                    placeholder="kontakt@firma.de"
                    className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                  />
                </div>
                <div>
                  <Label htmlFor="contactPhone">Telefon</Label>
                  <Input
                    id="contactPhone"
                    type="tel"
                    value={formData.contactPhone}
                    onChange={e => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                    placeholder="+49 123 456789"
                    className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                  />
                </div>
              </div>
            </div>

            {/* Rechte Spalte: Beleg Upload */}
            <div className="space-y-4 self-start">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Belege verwalten
              </h3>
              <ExpenseReceiptUpload
                companyId={uid}
                multiple={true}
                onDataExtracted={data => {
                  if (data.lineItems && data.lineItems.length > 0) {
                    setExtractedLineItems(data.lineItems);
                  }

                  setFormData(prev => ({
                    ...prev,
                    title: data.title || prev.title,
                    amount: data.amount ? data.amount.toString() : prev.amount,
                    category: data.category || prev.category,
                    description: data.description || prev.description,
                    vendor: data.vendor || prev.vendor,
                    date: data.date || prev.date,
                    dueDate: data.dueDate || prev.dueDate,
                    paymentTerms: data.paymentTerms || prev.paymentTerms,
                    invoiceNumber: data.invoiceNumber || prev.invoiceNumber,
                    vatAmount:
                      data.vatAmount !== null && data.vatAmount !== undefined
                        ? data.vatAmount.toString()
                        : prev.vatAmount,
                    netAmount:
                      data.netAmount !== null && data.netAmount !== undefined
                        ? data.netAmount.toString()
                        : prev.netAmount,
                    vatRate:
                      data.vatRate !== null && data.vatRate !== undefined
                        ? data.vatRate.toString()
                        : prev.vatRate,
                    companyName: data.companyName || data.vendor || prev.companyName,
                    companyAddress: data.companyAddress || prev.companyAddress,
                    companyCity: data.companyCity || prev.companyCity,
                    companyZip: data.companyZip || prev.companyZip,
                    companyCountry: data.companyCountry || prev.companyCountry,
                    companyVatNumber: data.companyVatNumber || prev.companyVatNumber,
                    contactEmail: data.contactEmail || prev.contactEmail,
                    contactPhone: data.contactPhone || prev.contactPhone,
                  }));
                  toast.success('✅ OCR-Extraktion erfolgreich');
                }}
                onFilesUploaded={files => {
                  setCurrentReceipts(files);
                }}
                showPreview={true}
                enhancedMode={false}
              />
            </div>
          </div>

          {/* Extracted Line Items Display */}
          {extractedLineItems.length > 0 && (
            <div className="space-y-4 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Extrahierte Leistungspositionen ({extractedLineItems.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">
                        Pos.
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">
                        Beschreibung
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-700 uppercase tracking-wider border-b">
                        Menge
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-700 uppercase tracking-wider border-b">
                        Einzelpreis
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-700 uppercase tracking-wider border-b">
                        Gesamt
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {extractedLineItems.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                          {item.position}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{item.description}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">
                          {item.quantity !== null ? item.quantity.toLocaleString('de-DE') : '-'}
                          {item.unit && ` ${item.unit}`}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">
                          {item.unitPrice !== null
                            ? `${item.unitPrice.toLocaleString('de-DE', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })} €`
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right whitespace-nowrap">
                          {item.totalPrice !== null
                            ? `${item.totalPrice.toLocaleString('de-DE', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })} €`
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <Link href={`/dashboard/company/${uid}/finance/expenses`}>
              <Button variant="outline" disabled={isLoading}>
                Abbrechen
              </Button>
            </Link>
            <Button
              onClick={handleUpdate}
              disabled={isLoading}
              className="bg-[#14ad9f] hover:bg-[#129488] text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Speichern...' : 'Änderungen speichern'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
