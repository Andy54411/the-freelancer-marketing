'use client';

import React, { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
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
import { ArrowLeft, Upload, FileText, Save } from 'lucide-react';
import { toast } from 'sonner';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import ExpenseReceiptUpload from '@/components/finance/ExpenseReceiptUpload';
import Link from 'next/link';

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

export default function CreateExpensePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  const [isLoading, setIsLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<File | null>(null);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCurrentReceipt(file);
    setUploadingFile(true);

    try {
      // Dateiname-Extraktion für Betrag
      const fileNameLower = file.name.toLowerCase();
      const amountMatch = fileNameLower.match(/(\d+[.,]\d{2})/);
      if (amountMatch) {
        const extractedAmount = amountMatch[1].replace(',', '.');
        setFormData(prev => ({ ...prev, amount: extractedAmount }));
        toast.success(`Betrag ${extractedAmount}€ aus Dateinamen erkannt!`);
      }

      // Rechnungsnummer-Extraktion
      const invoiceMatch = fileNameLower.match(/(?:re|rechnung|invoice)[_\s-]*(\d+)/i);
      if (invoiceMatch) {
        setFormData(prev => ({ ...prev, invoiceNumber: invoiceMatch[1] }));
      }

      toast.success('Beleg geladen - bereit zum Speichern');
    } catch (error) {
      toast.error('Fehler beim Laden des Belegs');
    } finally {
      setUploadingFile(false);
    }
  };

  const uploadPdfToStorage = async (file: File): Promise<string> => {
    const storage = getStorage();
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `companies/${uid}/expenses/${timestamp}_${sanitizedFileName}`;
    const storageRef = ref(storage, storagePath);

    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  };

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

      // PDF-Upload zu Firebase Storage
      let pdfDownloadURL = '';
      if (currentReceipt) {
        try {
          toast.info('PDF wird hochgeladen...', {
            description: 'Beleg wird für Steuerberater gespeichert',
          });
          pdfDownloadURL = await uploadPdfToStorage(currentReceipt);
          toast.success('PDF erfolgreich gespeichert!');
        } catch (error) {
          toast.error('PDF-Upload fehlgeschlagen, Ausgabe wird trotzdem gespeichert');
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
        receipt: currentReceipt
          ? {
              fileName: currentReceipt.name,
              downloadURL: pdfDownloadURL,
              uploadDate: new Date().toISOString(),
            }
          : null,
      };

      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData),
      });

      if (!response.ok) throw new Error('API request failed');

      const result = await response.json();

      if (result.success) {
        toast.success('Ausgabe erfolgreich gespeichert!');
        router.push(`/dashboard/company/${uid}/finance/expenses`);
      } else {
        throw new Error(result.error || 'Speichern fehlgeschlagen');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Fehler beim Speichern der Ausgabe');
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
            <h1 className="text-2xl font-bold text-gray-900">Neue Ausgabe erfassen</h1>
            <p className="text-sm text-gray-600">
              Laden Sie einen Beleg hoch für automatische Datenextraktion oder geben Sie die Daten
              manuell ein
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
                  onCheckedChange={(checked) =>
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
                onDataExtracted={async (data, storageUrl) => {
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
                    vatAmount: data.vatAmount !== null && data.vatAmount !== undefined ? data.vatAmount.toString() : prev.vatAmount,
                    netAmount: data.netAmount !== null && data.netAmount !== undefined ? data.netAmount.toString() : prev.netAmount,
                    vatRate: data.vatRate !== null && data.vatRate !== undefined ? data.vatRate.toString() : prev.vatRate,
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
                onFileUploaded={(file, storageUrl) => {
                  setCurrentReceipt(file);
                  setUploadingFile(false);
                }}
                showPreview={true}
                enhancedMode={false}
                className="h-[750px]"
              />
            </div>
          </div>

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
              className="bg-[#14ad9f] hover:bg-[#129488] text-white"
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
