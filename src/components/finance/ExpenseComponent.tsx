'use client';

import React, { useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Plus,
  Upload,
  FileText,
  Edit,
  Trash2,
  Mail,
  Phone,
  Eye,
  MoreHorizontal,
  Download,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import ExpenseReceiptUpload from '@/components/finance/ExpenseReceiptUpload';

interface ExpenseData {
  id?: string;
  title: string;
  amount: number | null;
  category: string;
  date: string;
  dueDate?: string; // Fälligkeitsdatum hinzugefügt
  paymentTerms?: string; // Zahlungsbedingungen hinzugefügt
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
  supplierId?: string; // Link zur Lieferanten-Akte (war supplierId)
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
  dueDate: string; // Fälligkeitsdatum hinzugefügt
  paymentTerms: string; // Zahlungsbedingungen hinzugefügt
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
  supplierId: string; // Link zur Lieferanten-Akte (war supplierId)
  taxDeductible: boolean;
}

interface ExpenseComponentProps {
  companyId: string;
  expenses: ExpenseData[];
  onSave?: (expense: ExpenseData) => Promise<boolean>;
  onDelete?: (expenseId: string) => Promise<boolean>;
  onRefresh?: () => Promise<void>;
  showForm?: boolean;
  onFormToggle?: (show: boolean) => void;
}

export function ExpenseComponent({
  companyId,
  expenses,
  onSave,
  onDelete,
  onRefresh,
  showForm: externalShowForm,
  onFormToggle,
}: ExpenseComponentProps) {
  const { user } = useAuth(); // User-Kontext für Authentication
  const router = useRouter();

  // Form State Management - verwende externe State wenn verfügbar
  const [internalShowForm, setInternalShowForm] = useState(false);
  const showForm = externalShowForm !== undefined ? externalShowForm : internalShowForm;
  const setShowForm = (show: boolean) => {
    if (onFormToggle) {
      onFormToggle(show);
    } else {
      setInternalShowForm(show);
    }
  };

  const [isLoading, setIsLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const [formData, setFormData] = useState<ExpenseFormData>({
    title: '',
    amount: '',
    category: 'Sonstiges',
    date: new Date().toISOString().split('T')[0],
    dueDate: '', // Fälligkeitsdatum
    paymentTerms: '', // Zahlungsbedingungen
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
    supplierId: '', // Lieferanten-Verknüpfung
    taxDeductible: false,
  });

  const [currentReceipt, setCurrentReceipt] = useState<File | null>(null);
  const [editingExpense, setEditingExpense] = useState<ExpenseData | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);

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

    // Sichere String-Escape-Funktion für RegExp
    const escapeRegExp = (str: string): string => {
      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    // Entferne VAT-Nummer und verwandte Begriffe (sicher)
    if (vatNumber && vatNumber.length <= 50) {
      // Length limit für Sicherheit
      const escapedVatNumber = escapeRegExp(vatNumber);
      cleanedAddress = cleanedAddress.replace(new RegExp(escapedVatNumber, 'gi'), '');
    }
    cleanedAddress = cleanedAddress.replace(/Umsatzsteuer-Identifikationsnummer:?\s*/gi, '');
    cleanedAddress = cleanedAddress.replace(/VAT Number:?\s*/gi, '');
    cleanedAddress = cleanedAddress.replace(/USt-IdNr:?\s*/gi, '');

    // Entferne Rechnungsinformationen (sicher)
    if (invoiceNumber && invoiceNumber.length <= 50) {
      // Length limit für Sicherheit
      const escapedInvoiceNumber = escapeRegExp(invoiceNumber);
      cleanedAddress = cleanedAddress.replace(new RegExp(escapedInvoiceNumber, 'gi'), '');
    }
    cleanedAddress = cleanedAddress.replace(/Rechnungsnummer:?\s*/gi, '');
    cleanedAddress = cleanedAddress.replace(/Invoice Number:?\s*/gi, '');
    cleanedAddress = cleanedAddress.replace(/Rechnungsdatum:?\s*/gi, '');
    cleanedAddress = cleanedAddress.replace(/Invoice Date:?\s*/gi, '');

    // Entferne Betragsangaben
    cleanedAddress = cleanedAddress.replace(/Gesamtsumme\s+in\s+\w+:?\s*/gi, '');
    cleanedAddress = cleanedAddress.replace(/Total\s+in\s+\w+:?\s*/gi, '');
    cleanedAddress = cleanedAddress.replace(/\d+[.,]\s*\d+\s*€/g, '');

    // Entferne weitere Details und Service-Namen
    cleanedAddress = cleanedAddress.replace(/Details\s*/gi, '');
    cleanedAddress = cleanedAddress.replace(/Google Workspace\s*/gi, '');
    cleanedAddress = cleanedAddress.replace(/Abrechnungs-ID:?\s*/gi, '');
    cleanedAddress = cleanedAddress.replace(/Billing ID:?\s*/gi, '');

    // Bereinige Datumsangaben (Format: XX. Monat YYYY)
    cleanedAddress = cleanedAddress.replace(/\d{1,2}\.\s*\w+\.?\s*\d{4}/g, '');

    // Entferne alles nach der ersten Stadt/Land-Kombination
    // Stoppe nach typischen Adressmustern wie "Stadt\nLand"
    const lines = cleanedAddress.split(/\\n|\n/);
    const cleanLines: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Stoppe bei Details-Markern
      if (
        /^(Details|Rechnungsnummer|Invoice|Gesamtsumme|Total|Abrechnungs|Billing)/i.test(
          trimmedLine
        )
      ) {
        break;
      }

      cleanLines.push(trimmedLine);

      // Stoppe nach Land (typische Länder-Pattern)
      if (
        /^(Deutschland|Germany|Ireland|Irland|France|Frankreich|Italy|Italien|Spain|Spanien|Netherlands|Niederlande|UK|United Kingdom|USA|America)$/i.test(
          trimmedLine
        )
      ) {
        break;
      }
    }

    // Entferne mehrfache Zeilenumbrüche und Leerzeichen
    const result = cleanLines
      .filter(line => line.length > 0)
      .join('\n')
      .replace(/\s+/g, ' ')
      .trim();

    return result;
  };

  // PDF-Datei zu Firebase Storage hochladen
  const uploadPdfToStorage = async (file: File, expenseId?: string): Promise<string> => {
    try {
      const storage = getStorage();

      // Generiere eindeutigen Pfad für die PDF-Datei
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = expenseId
        ? `expense_${expenseId}_${sanitizedFileName}`
        : `expense_${timestamp}_${sanitizedFileName}`;

      const storagePath = `companies/${companyId}/expenses/${fileName}`;
      const storageRef = ref(storage, storagePath);

      // Upload der Datei
      const uploadResult = await uploadBytes(storageRef, file);

      // Download-URL abrufen
      const downloadURL = await getDownloadURL(uploadResult.ref);

      return downloadURL;
    } catch (error) {
      toast.error('Fehler beim Hochladen der PDF-Datei');
      throw error;
    }
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
          dueDate: data.dueDate || prev.dueDate, // 🎯 FÄLLIGKEITSDATUM AUS OCR!
          paymentTerms: data.paymentTerms || prev.paymentTerms, // 🎯 ZAHLUNGSBEDINGUNGEN AUS OCR!
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
      toast.error('Upload-Fehler');
    } finally {
      setUploadingFile(false);
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  // Automatische Lieferanten-Erstellung/Zuordnung über API
  const findOrCreateSupplier = async (companyName: string, ocrData: any): Promise<string> => {
    if (!companyName.trim() || !user) return '';

    try {
      // Auth-Check
      if (user.uid !== companyId) {
        return '';
      }

      // 1. Suche nach existierendem Lieferanten über API
      const response = await fetch(`/api/suppliers?companyId=${companyId}`);
      const result = await response.json();

      if (!result.success) {
        toast.error('Fehler beim Laden der Lieferanten');
        return '';
      }

      const existingCustomers = result.customers || [];

      // Fuzzy Matching: Normalisiere Namen für Vergleich
      const normalizeCompanyName = (name: string) => {
        return name
          .toLowerCase()
          .replace(/\s*(gmbh|ag|kg|llc|inc|ltd|corp|ug|limited|emea)\s*/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
      };

      const normalizedInputName = normalizeCompanyName(companyName);

      // Suche ähnliche Namen
      const existingSupplier = existingCustomers.find((customer: any) => {
        const normalizedCustomerName = normalizeCompanyName(customer.name || '');

        // Exakte Übereinstimmung nach Normalisierung
        if (normalizedCustomerName === normalizedInputName) return true;

        // Teilstring-Matching für bekannte Firmen
        if (normalizedInputName.includes('google') && normalizedCustomerName.includes('google'))
          return true;
        if (normalizedInputName.includes('amazon') && normalizedCustomerName.includes('amazon'))
          return true;
        if (
          normalizedInputName.includes('microsoft') &&
          normalizedCustomerName.includes('microsoft')
        )
          return true;

        return false;
      });

      if (existingSupplier) {
        return existingSupplier.id;
      }

      // 2. Neuen Lieferanten automatisch anlegen über API

      // Generiere Lieferanten-Nummer
      const supplierNumbers = existingCustomers
        .map((c: any) => c.customerNumber || '')
        .filter((num: string) => num.startsWith('LF-'))
        .map((num: string) => parseInt(num.replace('LF-', ''), 10))
        .filter((num: number) => !isNaN(num));

      // ✅ FIXED: Use NumberSequenceService for supplier numbers
      let nextSupplierNumber = 'LF-001';
      try {
        // Import dynamic to avoid circular dependencies
        const { NumberSequenceService } = await import('@/services/numberSequenceService');
        const numberResult = await NumberSequenceService.getNextNumberForType(
          companyId,
          'Lieferant'
        );
        nextSupplierNumber = numberResult.formattedNumber;
      } catch (error) {
        console.error('❌ Failed to get supplier number from NumberSequenceService:', error);
        // Emergency fallback - no race conditions
        console.warn('❌ NumberSequenceService failed - using timestamp fallback');
        nextSupplierNumber = `LF-${Date.now().toString().slice(-6)}`;
      }

      // Erstelle neuen Lieferanten über API
      const createResponse = await fetch('/api/suppliers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId,
          name: companyName,
          email: ocrData.contactEmail || '',
          phone: ocrData.contactPhone || '',
          address: ocrData.companyAddress || '',
          street: extractStreetFromAddress(ocrData.companyAddress || ''),
          city: extractCityFromAddress(ocrData.companyAddress || ''),
          postalCode: extractPostalCodeFromAddress(ocrData.companyAddress || ''),
          country: extractCountryFromAddress(ocrData.companyAddress || '') || 'Deutschland',
          vatId: ocrData.companyVatNumber || '',
          customerNumber: nextSupplierNumber,
          isSupplier: true,
        }),
      });

      const createResult = await createResponse.json();

      if (createResult.success) {
        toast.success(`Lieferant "${companyName}" automatisch angelegt`);
        return createResult.customerId; // API gibt customerId zurück, wir verwenden es als supplierId
      } else {
        toast.error('Fehler bei automatischer Lieferanten-Erstellung');
        return '';
      }
    } catch (error) {
      toast.error('Fehler bei automatischer Lieferanten-Erstellung');
      return '';
    }
  };

  // Hilfsfunktionen für Adress-Extraktion
  const extractStreetFromAddress = (address: string): string => {
    const lines = address.split('\\n').map(line => line.trim());
    return lines[0] || '';
  };

  const extractCityFromAddress = (address: string): string => {
    const lines = address.split('\\n').map(line => line.trim());
    for (const line of lines) {
      if (line.match(/dublin|ireland|berlin|münchen|hamburg|köln/i)) {
        return line.replace(/\d+/g, '').trim();
      }
    }
    return '';
  };

  const extractPostalCodeFromAddress = (address: string): string => {
    const match = address.match(/\b\d{4,5}\b/);
    return match ? match[0] : '';
  };

  const extractCountryFromAddress = (address: string): string => {
    if (address.toLowerCase().includes('ireland')) return 'Irland';
    if (address.toLowerCase().includes('deutschland')) return 'Deutschland';
    if (address.toLowerCase().includes('austria')) return 'Österreich';
    return '';
  };

  const handleSaveExpense = async () => {
    // Unterscheide zwischen Edit und Create Mode
    if (isEditMode) {
      await handleUpdateExpense();
      return;
    }

    // Create Mode (Original-Logic)
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
      // 🔥 GAME CHANGER: Automatische Lieferanten-Erstellung!
      let supplierId = '';
      if (formData.companyName) {
        supplierId = await findOrCreateSupplier(formData.companyName, {
          contactEmail: formData.contactEmail,
          contactPhone: formData.contactPhone,
          companyAddress: formData.companyAddress,
          companyVatNumber: formData.companyVatNumber,
        });
      }

      // 📄 PDF-Upload zu Firebase Storage
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

      const expenseData: ExpenseData = {
        title: formData.title,
        amount,
        category: formData.category,
        date: formData.date,
        dueDate: formData.dueDate || '', // 🎯 FÄLLIGKEITSDATUM
        paymentTerms: formData.paymentTerms || '', // 🎯 ZAHLUNGSBEDINGUNGEN
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
        supplierId, // 🔗 Link zur Lieferanten-Akte!
        taxDeductible: formData.taxDeductible,
        receipt: currentReceipt
          ? {
              fileName: currentReceipt.name,
              downloadURL: pdfDownloadURL, // 🎯 Echte Firebase Storage URL!
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
          dueDate: '', // Fälligkeitsdatum
          paymentTerms: '', // Zahlungsbedingungen
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
          supplierId: '', // Lieferanten-Verknüpfung
          taxDeductible: false,
        });
        setCurrentReceipt(null);
        setShowForm(false);
        toast.success('Ausgabe erfolgreich gespeichert');
        await onRefresh?.();
      }
    } catch (error) {
      toast.error('Fehler beim Speichern');
    } finally {
      setIsLoading(false);
    }
  };

  // Ausgabe bearbeiten - Formular mit existierenden Daten füllen
  const handleEditExpense = (expense: ExpenseData) => {
    setEditingExpense(expense);
    setIsEditMode(true);

    // Formular mit existierenden Daten füllen
    setFormData({
      title: expense.title || '',
      amount: expense.amount ? expense.amount.toString() : '',
      category: expense.category || 'Sonstiges',
      date: expense.date || new Date().toISOString().split('T')[0],
      dueDate: expense.dueDate || '', // Fälligkeitsdatum aus Expense
      paymentTerms: expense.paymentTerms || '', // Zahlungsbedingungen aus Expense
      description: expense.description || '',
      vendor: expense.vendor || '',
      invoiceNumber: expense.invoiceNumber || '',
      vatAmount: expense.vatAmount ? expense.vatAmount.toString() : '',
      netAmount: expense.netAmount ? expense.netAmount.toString() : '',
      vatRate: expense.vatRate ? expense.vatRate.toString() : '19',
      companyName: expense.companyName || '',
      companyAddress: expense.companyAddress || '',
      companyVatNumber: expense.companyVatNumber || '',
      contactEmail: expense.contactEmail || '',
      contactPhone: expense.contactPhone || '',
      supplierId: expense.supplierId || '',
      taxDeductible: expense.taxDeductible || false,
    });

    setShowForm(true);
    toast.info(`Bearbeite Ausgabe: ${expense.title}`);
  };

  // Bearbeitung abbrechen
  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditingExpense(null);
    setShowForm(false);

    // Formular zurücksetzen
    setFormData({
      title: '',
      amount: '',
      category: 'Sonstiges',
      date: new Date().toISOString().split('T')[0],
      dueDate: '', // Fälligkeitsdatum
      paymentTerms: '', // Zahlungsbedingungen
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
      supplierId: '',
      taxDeductible: false,
    });

    setCurrentReceipt(null);
  };

  // Update-Funktion für bearbeitete Ausgaben
  const handleUpdateExpense = async () => {
    if (!editingExpense?.id) {
      toast.error('Ausgabe-ID nicht gefunden');
      return;
    }

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
      // Automatische Lieferanten-Erstellung auch beim Update
      let supplierId = formData.supplierId;
      if (formData.companyName && !supplierId) {
        supplierId = await findOrCreateSupplier(formData.companyName, {
          contactEmail: formData.contactEmail,
          contactPhone: formData.contactPhone,
          companyAddress: formData.companyAddress,
          companyVatNumber: formData.companyVatNumber,
        });
      }

      // 📄 PDF-Upload zu Firebase Storage (nur bei neuen Uploads)
      let pdfDownloadURL = editingExpense.receipt?.downloadURL || '';
      if (currentReceipt) {
        try {
          toast.info('PDF wird hochgeladen...', {
            description: 'Neuer Beleg wird gespeichert',
          });
          pdfDownloadURL = await uploadPdfToStorage(currentReceipt, editingExpense.id);
          toast.success('PDF erfolgreich gespeichert!');
        } catch (error) {
          toast.error('PDF-Upload fehlgeschlagen, Änderungen werden trotzdem gespeichert');
        }
      }

      const updatedExpenseData: ExpenseData = {
        ...editingExpense, // Behalte existierende Felder
        id: editingExpense.id,
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
        supplierId,
        taxDeductible: formData.taxDeductible,
        // Receipt wird nur bei neuen Uploads überschrieben
        receipt: currentReceipt
          ? {
              fileName: currentReceipt.name,
              downloadURL: pdfDownloadURL, // 🎯 Echte Firebase Storage URL!
              uploadDate: new Date().toISOString(),
            }
          : editingExpense.receipt,
      };

      const success = await onSave?.(updatedExpenseData);

      if (success) {
        handleCancelEdit(); // Reset form und edit mode
        toast.success('Ausgabe erfolgreich aktualisiert');
        await onRefresh?.();
      }
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    } finally {
      setIsLoading(false);
    }
  };

  // Ausgabe löschen mit Bestätigung
  const handleDeleteExpense = async (expense: ExpenseData) => {
    if (!expense.id) {
      toast.error('Ausgabe-ID nicht gefunden');
      return;
    }

    // Bestätigungsdialog
    const confirmed = window.confirm(
      `Sind Sie sicher, dass Sie die Ausgabe "${expense.title}" (${formatCurrency(expense.amount || 0)}) löschen möchten?\n\nDiese Aktion kann nicht rückgängig gemacht werden.`
    );

    if (!confirmed) return;

    try {
      setIsLoading(true);

      // Verwende onDelete Prop falls verfügbar, sonst nur refresh
      if (onDelete) {
        const success = await onDelete(expense.id);
        if (success) {
          toast.success(`Ausgabe "${expense.title}" wurde gelöscht`);
          await onRefresh?.();
        } else {
          toast.error('Fehler beim Löschen der Ausgabe');
        }
      } else {
        // Fallback: Nur UI-Update via refresh
        toast.success(`Ausgabe "${expense.title}" wurde gelöscht`);
        await onRefresh?.();
      }
    } catch (error) {
      toast.error('Fehler beim Löschen der Ausgabe');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Form */}
      {showForm && (
        <Card className="bg-white/30 backdrop-blur-sm border-[#14ad9f]/20">
          <CardHeader className="border-b border-[#14ad9f]/10">
            <CardTitle className="text-[#14ad9f]">
              {isEditMode
                ? `${editingExpense?.title || 'Ausgabe'} bearbeiten`
                : 'Neue Ausgabe erfassen'}
            </CardTitle>
            <CardDescription>
              Laden Sie einen Beleg hoch für automatische Datenextraktion oder geben Sie die Daten
              manuell ein
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {/* 2-Spalten Layout: Links Upload, Rechts Formular */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Linke Spalte: Upload & OCR */}
              <div className="space-y-6">
                <ExpenseReceiptUpload
                  companyId={companyId}
                  onDataExtracted={async (data: any) => {
                    // Update form with extracted data
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
                      companyName: data.vendor || prev.companyName,
                      companyVatNumber: data.companyVatNumber || prev.companyVatNumber,
                    }));

                    toast.success('✅ OCR-Extraktion erfolgreich', {
                      description: 'Daten wurden automatisch eingetragen',
                    });
                  }}
                  onFileUploaded={(storageUrl: string) => {
                    // File Upload erfolgreich - setze Flag für Upload-Status
                    setUploadingFile(false);
                    toast.success('Datei erfolgreich hochgeladen');
                  }}
                  showPreview={true}
                  enhancedMode={false}
                />
              </div>

              {/* Rechte Spalte: Formular */}
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
                    <Label htmlFor="date">Rechnungsdatum</Label>
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
                      placeholder="Fälligkeitsdatum der Rechnung"
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
                      onChange={e =>
                        setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))
                      }
                      placeholder="z.B. Zahlbar binnen 14 Tagen ohne Abzug"
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
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (isEditMode) {
                    handleCancelEdit();
                  } else {
                    setShowForm(false);
                    setFormData({
                      title: '',
                      amount: '',
                      category: 'Sonstiges',
                      date: new Date().toISOString().split('T')[0],
                      dueDate: '', // Fälligkeitsdatum
                      paymentTerms: '', // Zahlungsbedingungen
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
                      supplierId: '', // Lieferanten-Verknüpfung
                      taxDeductible: false,
                    });
                    setCurrentReceipt(null);
                  }
                }}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleSaveExpense}
                disabled={isLoading}
                className="bg-[#14ad9f] hover:bg-[#129488] text-white"
              >
                {isLoading
                  ? 'Speichern...'
                  : isEditMode
                    ? 'Änderungen speichern'
                    : 'Ausgabe speichern'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expenses List */}
      <Card>
        <CardHeader>
          <CardTitle>Alle Ausgaben</CardTitle>
          <CardDescription>
            {expenses.length === 0
              ? 'Übersicht aller erfassten Ausgaben'
              : `${expenses.length} ${expenses.length === 1 ? 'Ausgabe' : 'Ausgaben'} erfasst`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p>Noch keine Ausgaben erfasst</p>
              <p className="text-sm">
                Klicken Sie auf &quot;Ausgabe hinzufügen&quot; um zu beginnen
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Beleg</TableHead>
                    <TableHead>Titel</TableHead>
                    <TableHead>Kategorie</TableHead>
                    <TableHead>Lieferant</TableHead>
                    <TableHead className="text-right">Betrag</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map(expense => (
                    <TableRow
                      key={expense.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => {
                        if (expense.id) {
                          router.push(
                            `/dashboard/company/${companyId}/finance/expenses/${expense.id}`
                          );
                        }
                      }}
                    >
                      <TableCell>
                        {expense.receipt?.downloadURL ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={e => {
                              e.stopPropagation();
                              setViewingReceipt(expense.receipt!.downloadURL);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4 text-[#14ad9f]" />
                          </Button>
                        ) : (
                          <FileText className="h-4 w-4 text-gray-300" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{expense.title}</div>
                        {expense.invoiceNumber && (
                          <div className="text-xs text-gray-500">RG: {expense.invoiceNumber}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {expense.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{expense.vendor || '-'}</div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(expense.amount || 0)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(expense.date).toLocaleDateString('de-DE')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={e => e.stopPropagation()}
                              className="h-8 w-8 p-0"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={e => {
                                e.stopPropagation();
                                handleEditExpense(expense);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Bearbeiten
                            </DropdownMenuItem>
                            {expense.receipt?.downloadURL && (
                              <DropdownMenuItem
                                onClick={e => {
                                  e.stopPropagation();
                                  window.open(expense.receipt!.downloadURL, '_blank');
                                }}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Beleg herunterladen
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={e => {
                                e.stopPropagation();
                                handleDeleteExpense(expense);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Löschen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PDF-Viewer-Dialog */}
      <Dialog open={!!viewingReceipt} onOpenChange={open => !open && setViewingReceipt(null)}>
        <DialogContent className="max-w-6xl h-[95vh] p-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle className="flex justify-between items-center">
              <span>Beleg-Vorschau</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => viewingReceipt && window.open(viewingReceipt, '_blank')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Neuer Tab
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setViewingReceipt(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="h-[calc(95vh-100px)] bg-gray-900">
            {viewingReceipt && (
              <iframe
                src={viewingReceipt}
                className="w-full h-full border-0"
                title="PDF Beleg"
                allow="fullscreen"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
