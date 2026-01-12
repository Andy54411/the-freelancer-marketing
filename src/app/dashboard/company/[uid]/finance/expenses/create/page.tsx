'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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
import { ArrowLeft, Save, Receipt, RefreshCcw, Landmark } from 'lucide-react';
import { toast } from 'sonner';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/firebase/clients';
import ExpenseReceiptUpload from '@/components/finance/ExpenseReceiptUpload';
import Link from 'next/link';

// Konvertiert deutsches Datum (DD.MM.YYYY) zu ISO-Format (YYYY-MM-DD) für HTML date input
const convertGermanDateToISO = (germanDate: string | undefined | null): string => {
  if (!germanDate) return '';
  
  // Prüfe ob bereits ISO-Format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(germanDate)) {
    return germanDate;
  }
  
  // Deutsches Format DD.MM.YYYY
  const match = germanDate.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Falls anderes Format, versuche zu parsen
  const parsed = new Date(germanDate);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  
  return '';
};

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

    // Upload file
    await uploadBytes(storageRef, file, {
      contentType: file.type,
    });

    console.log('✅ Upload successful');

    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    console.log('🔗 Download URL:', downloadURL);

    return downloadURL;
  } catch (error: any) {
    console.error('❌ Error uploading PDF:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
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
  isRecurring: boolean;
  recurringInterval: string;
  // Anlagen-spezifische Felder
  depreciationMethod: 'linear' | 'degressive' | 'none';
  usefulLifeYears: string;
  residualValue: string;
  serialNumber: string;
  location: string;
  assetCategory: string;
}

type ExpenseType = 'einmalig' | 'wiederkehrend' | 'anlage';

const ASSET_CATEGORIES = [
  { value: 'buildings', label: 'Gebäude & Grundstücke' },
  { value: 'vehicles', label: 'Fahrzeuge' },
  { value: 'it', label: 'IT & EDV' },
  { value: 'furniture', label: 'Büroausstattung & Möbel' },
  { value: 'machinery', label: 'Maschinen & Anlagen' },
  { value: 'other', label: 'Sonstiges' },
];

export default function CreateExpensePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  // Typ aus URL-Parameter lesen (z.B. ?type=wiederkehrend)
  const typeFromUrl = searchParams.get('type') as ExpenseType | null;
  const initialType: ExpenseType = typeFromUrl && ['einmalig', 'wiederkehrend', 'anlage'].includes(typeFromUrl) 
    ? typeFromUrl 
    : 'einmalig';

  const [isLoading, setIsLoading] = useState(false);
  const [expenseType, setExpenseType] = useState<ExpenseType>(initialType);
  const [currentReceipt, _setCurrentReceipt] = useState<File | null>(null);
  const [currentReceipts, setCurrentReceipts] = useState<string[]>([]); // Multiple receipts support - stores URLs
  const [extractedLineItems, setExtractedLineItems] = useState<LineItem[]>([]); // Store extracted line items
  
  // Aktualisiere expenseType wenn sich URL-Parameter ändert
  useEffect(() => {
    if (typeFromUrl && ['einmalig', 'wiederkehrend', 'anlage'].includes(typeFromUrl)) {
      setExpenseType(typeFromUrl);
    }
  }, [typeFromUrl]);
  
  // 🧠 OCR Learning: Speichere originale OCR-Daten für Vergleich
  const [originalOcrData, setOriginalOcrData] = useState<{
    vendor?: string;
    invoiceNumber?: string;
    email?: string;
    phone?: string;
    vatId?: string;
    address?: string;
  } | null>(null);

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
    isRecurring: false,
    recurringInterval: 'monthly',
    // Anlagen-Felder
    depreciationMethod: 'linear',
    usefulLifeYears: '3',
    residualValue: '1',
    serialNumber: '',
    location: '',
    assetCategory: 'it',
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

  const handleSave = async () => {
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
      let supplierId = '';
      if (formData.companyName) {
        supplierId = await findOrCreateSupplier(formData.companyName, {
          contactEmail: formData.contactEmail,
          contactPhone: formData.contactPhone,
          companyAddress: formData.companyAddress,
          companyVatNumber: formData.companyVatNumber,
        });
      }

      // PDF-Upload zu Firebase Storage - Support für multiple receipts
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
        // Typ-spezifische Felder basierend auf expenseType
        isRecurring: expenseType === 'wiederkehrend',
        recurringInterval: expenseType === 'wiederkehrend' ? formData.recurringInterval : null,
        isAsset: expenseType === 'anlage',
        receipts: receipts.length > 0 ? receipts : null, // Multiple receipts support
        receipt: receipts.length > 0 ? receipts[0] : null, // Backward compatibility
      };

      // Bei Anlagen: Direkt in fixedAssets speichern
      if (expenseType === 'anlage') {
        const assetResponse = await fetch('/api/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId: uid,
            name: formData.title,
            description: formData.description || '',
            category: formData.assetCategory,
            acquisitionDate: formData.date,
            acquisitionCost: amount,
            depreciationMethod: formData.depreciationMethod,
            usefulLifeYears: parseInt(formData.usefulLifeYears) || 3,
            residualValue: parseFloat(formData.residualValue) || 1,
            serialNumber: formData.serialNumber || '',
            location: formData.location || '',
            supplier: formData.vendor || formData.companyName || '',
            invoiceNumber: formData.invoiceNumber || '',
            status: 'active',
            receipts: receipts.length > 0 ? receipts : null,
          }),
        });

        if (!assetResponse.ok) throw new Error('Anlage konnte nicht gespeichert werden');
        
        const assetResult = await assetResponse.json();
        if (assetResult.success) {
          toast.success('Anlage erfolgreich gespeichert!');
          router.push(`/dashboard/company/${uid}/finance/expenses/assets`);
        } else {
          throw new Error(assetResult.error || 'Speichern fehlgeschlagen');
        }
      } else {
        // Einmalige oder wiederkehrende Ausgabe
        const response = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(expenseData),
        });

        if (!response.ok) throw new Error('API request failed');

        const result = await response.json();

        if (result.success) {
          // 🧠 OCR Learning: Sende Korrekturen an Lernsystem
          if (originalOcrData && formData.vendor) {
            try {
              const correctedData = {
                vendor: formData.vendor,
                invoiceNumber: formData.invoiceNumber,
                email: formData.contactEmail,
                phone: formData.contactPhone,
                vatId: formData.companyVatNumber,
                address: formData.companyAddress,
              };
              
              // Nur senden wenn es Unterschiede gibt
              const hasChanges = Object.keys(correctedData).some(key => {
                const corrected = correctedData[key as keyof typeof correctedData];
                const original = originalOcrData[key as keyof typeof originalOcrData];
                return corrected && corrected !== original;
              });
              
              if (hasChanges) {
                await fetch('/api/ocr/learn', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    companyId: uid,
                    ocrData: originalOcrData,
                    correctedData,
                  }),
                });
              }
            } catch {
              // Lernen ist optional, Fehler nicht kritisch
            }
          }
          
          // Erfolgs-Toast und Navigation basierend auf Typ
          if (expenseType === 'wiederkehrend') {
            toast.success('Wiederkehrende Ausgabe erfolgreich gespeichert!');
            router.push(`/dashboard/company/${uid}/finance/expenses/recurring`);
          } else {
            toast.success('Ausgabe erfolgreich gespeichert!');
            router.push(`/dashboard/company/${uid}/finance/expenses`);
          }
        } else {
          throw new Error(result.error || 'Speichern fehlgeschlagen');
        }
      }
    } catch {
      toast.error('Fehler beim Speichern der Ausgabe');
    } finally {
      setIsLoading(false);
    }
  };

  // Autorisierung prüfen
  const isOwner = user?.uid === uid;
  const isEmployee = user?.user_type === 'mitarbeiter' && user?.companyId === uid;

  if (!user || (!isOwner && !isEmployee)) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Zugriff verweigert</h2>
          <p className="text-gray-600">Sie sind nicht berechtigt, diese Seite zu sehen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
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
            <h1 className="text-2xl font-bold text-gray-900">Neue Ausgabe erfassen</h1>
            <p className="text-sm text-gray-600">
              Laden Sie einen Beleg hoch für automatische Datenextraktion oder geben Sie die Daten
              manuell ein
            </p>
          </div>
        </div>
      </div>

      {/* Ausgabentyp-Auswahl */}
      <div className="grid grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => setExpenseType('einmalig')}
          className={`p-4 rounded-xl border-2 transition-all ${
            expenseType === 'einmalig'
              ? 'border-[#14ad9f] bg-[#14ad9f]/10'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              expenseType === 'einmalig' ? 'bg-[#14ad9f]/20' : 'bg-gray-100'
            }`}>
              <Receipt className={`w-6 h-6 ${expenseType === 'einmalig' ? 'text-[#14ad9f]' : 'text-gray-500'}`} />
            </div>
            <span className={`font-semibold ${expenseType === 'einmalig' ? 'text-[#14ad9f]' : 'text-gray-700'}`}>
              Einmalige Ausgabe
            </span>
            <span className="text-xs text-gray-500 text-center">
              Einzelne Rechnung oder Beleg
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setExpenseType('wiederkehrend')}
          className={`p-4 rounded-xl border-2 transition-all ${
            expenseType === 'wiederkehrend'
              ? 'border-[#14ad9f] bg-[#14ad9f]/10'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              expenseType === 'wiederkehrend' ? 'bg-[#14ad9f]/20' : 'bg-gray-100'
            }`}>
              <RefreshCcw className={`w-6 h-6 ${expenseType === 'wiederkehrend' ? 'text-[#14ad9f]' : 'text-gray-500'}`} />
            </div>
            <span className={`font-semibold ${expenseType === 'wiederkehrend' ? 'text-[#14ad9f]' : 'text-gray-700'}`}>
              Wiederkehrende Ausgabe
            </span>
            <span className="text-xs text-gray-500 text-center">
              Monatliche Abos, Miete, etc.
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setExpenseType('anlage')}
          className={`p-4 rounded-xl border-2 transition-all ${
            expenseType === 'anlage'
              ? 'border-[#14ad9f] bg-[#14ad9f]/10'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              expenseType === 'anlage' ? 'bg-[#14ad9f]/20' : 'bg-gray-100'
            }`}>
              <Landmark className={`w-6 h-6 ${expenseType === 'anlage' ? 'text-[#14ad9f]' : 'text-gray-500'}`} />
            </div>
            <span className={`font-semibold ${expenseType === 'anlage' ? 'text-[#14ad9f]' : 'text-gray-700'}`}>
              Anlage / Anschaffung
            </span>
            <span className="text-xs text-gray-500 text-center">
              Abschreibbare Wirtschaftsgüter
            </span>
          </div>
        </button>
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
                    placeholder="tt.mm.jjjj"
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
                    placeholder="z.B. Zahlbar binnen 14 Tagen ohne Abzug"
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

              {/* Typ-spezifische Felder */}
              {expenseType === 'wiederkehrend' && (
                <div className="space-y-3 p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <h4 className="font-semibold text-teal-800">Wiederkehrende Ausgabe</h4>
                  <div>
                    <Label htmlFor="recurringInterval">Intervall *</Label>
                    <Select
                      value={formData.recurringInterval}
                      onValueChange={value => setFormData(prev => ({ ...prev, recurringInterval: value }))}
                    >
                      <SelectTrigger className="mt-1 focus:ring-[#14ad9f] focus:border-[#14ad9f]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Wöchentlich</SelectItem>
                        <SelectItem value="monthly">Monatlich</SelectItem>
                        <SelectItem value="quarterly">Vierteljährlich</SelectItem>
                        <SelectItem value="yearly">Jährlich</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-teal-600">
                    Die Ausgabe wird automatisch in der Übersicht für wiederkehrende Ausgaben angezeigt.
                  </p>
                </div>
              )}

              {expenseType === 'anlage' && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800">Anlagen-Informationen</h4>
                  
                  <div>
                    <Label htmlFor="assetCategory">Anlagenkategorie *</Label>
                    <Select
                      value={formData.assetCategory}
                      onValueChange={value => setFormData(prev => ({ ...prev, assetCategory: value }))}
                    >
                      <SelectTrigger className="mt-1 focus:ring-[#14ad9f] focus:border-[#14ad9f]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSET_CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="depreciationMethod">Abschreibungsmethode</Label>
                      <Select
                        value={formData.depreciationMethod}
                        onValueChange={value => setFormData(prev => ({ ...prev, depreciationMethod: value as 'linear' | 'degressive' | 'none' }))}
                      >
                        <SelectTrigger className="mt-1 focus:ring-[#14ad9f] focus:border-[#14ad9f]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="linear">Linear (AfA)</SelectItem>
                          <SelectItem value="degressive">Degressiv</SelectItem>
                          <SelectItem value="none">Keine Abschreibung</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="usefulLifeYears">Nutzungsdauer (Jahre)</Label>
                      <Input
                        id="usefulLifeYears"
                        type="number"
                        min="1"
                        value={formData.usefulLifeYears}
                        onChange={e => setFormData(prev => ({ ...prev, usefulLifeYears: e.target.value }))}
                        placeholder="3"
                        className="mt-1 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="residualValue">Restwert (€)</Label>
                      <Input
                        id="residualValue"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.residualValue}
                        onChange={e => setFormData(prev => ({ ...prev, residualValue: e.target.value }))}
                        placeholder="1.00"
                        className="mt-1 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                      />
                    </div>
                    <div>
                      <Label htmlFor="serialNumber">Seriennummer</Label>
                      <Input
                        id="serialNumber"
                        value={formData.serialNumber}
                        onChange={e => setFormData(prev => ({ ...prev, serialNumber: e.target.value }))}
                        placeholder="z.B. SN-12345"
                        className="mt-1 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="location">Standort</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="z.B. Büro Berlin"
                      className="mt-1 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                    />
                  </div>

                  <p className="text-xs text-blue-600">
                    Die Anlage wird automatisch in der Anlagenübersicht mit Abschreibungsberechnung angezeigt.
                  </p>
                </div>
              )}

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
                  placeholder="z.B. The One Building, 1 Grand Canal Street Lower"
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
                    placeholder="z.B. Dublin 2"
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
                  placeholder="z.B. Ireland"
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
                  placeholder="z.B. DE123456789 oder IE3206488LH"
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

            {/* Rechte Spalte: Beleg Upload & PDF Vorschau */}
            <div className="space-y-4 self-start">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Beleg hochladen
              </h3>
              <ExpenseReceiptUpload
                companyId={uid}
                multiple={true}
                onDataExtracted={data => {
                  // Store extracted line items
                  if (data.lineItems && data.lineItems.length > 0) {
                    setExtractedLineItems(data.lineItems);
                    console.log(`📋 Extracted ${data.lineItems.length} line items`);
                  }

                  // 🧠 OCR Learning: Speichere originale OCR-Daten für Vergleich
                  setOriginalOcrData({
                    vendor: data.vendor,
                    invoiceNumber: data.invoiceNumber,
                    email: data.contactEmail,
                    phone: data.contactPhone,
                    vatId: data.companyVatNumber,
                    address: data.companyAddress,
                  });

                  setFormData(prev => ({
                    ...prev,
                    title: data.title || prev.title,
                    amount: data.amount ? data.amount.toString() : prev.amount,
                    category: data.category || prev.category,
                    description: data.description || prev.description,
                    vendor: data.vendor || prev.vendor,
                    date: convertGermanDateToISO(data.date) || prev.date,
                    dueDate: convertGermanDateToISO(data.dueDate) || prev.dueDate,
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
                    // Firmeninformationen aus OCR
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
            <div className="space-y-4">
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
              onClick={handleSave}
              disabled={isLoading}
              className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Speichern...' : 'Ausgabe speichern'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
