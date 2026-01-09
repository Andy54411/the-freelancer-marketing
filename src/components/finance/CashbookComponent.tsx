'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Wallet,
  Plus,
  Minus,
  Eye,
  Download,
  Upload,
  TrendingUp,
  TrendingDown,
  Calendar,
  Receipt,
  Loader2,
  Search,
  ChevronDown,
  Link as LinkIcon,
  FileText,
  CheckCircle,
  Circle,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { OpenCashRegisterModal } from './OpenCashRegisterModal';
import { OpeningBalanceModal } from './OpeningBalanceModal';
import { CashMovementModal } from './CashMovementModal';
import { AllocateBookingModal } from './AllocateBookingModal';

interface CashEntry {
  id: string;
  date: string;
  type: 'income' | 'expense' | 'opening_balance';
  amount: number;
  description: string;
  category: string;
  reference?: string;
  createdAt: string;
  status?: 'open' | 'linked' | 'processed';
  linkedDocuments?: Array<{
    id: string;
    type: 'invoice' | 'expense';
    number: string;
  }>;
  counterpartyName?: string;
}

interface CashbookComponentProps {
  companyId: string;
}

export function CashbookComponent({ companyId }: CashbookComponentProps) {
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showOpenCashRegisterModal, setShowOpenCashRegisterModal] = useState(false);
  const [showOpeningBalanceModal, setShowOpeningBalanceModal] = useState(false);
  const [showCashMovementModal, setShowCashMovementModal] = useState(false);
  const [showAllocateBookingModal, setShowAllocateBookingModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchCategory, setSearchCategory] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPeriod, _setSelectedPeriod] = useState('current-month');
  const [cashBalance, setCashBalance] = useState(0);
  const [_openingBalance, setOpeningBalance] = useState(0);
  const [isCashRegisterOpen, setIsCashRegisterOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [companyData, setCompanyData] = useState<any>(null);

  // Form state for new entry
  const [newEntry, setNewEntry] = useState({
    type: 'income' as 'income' | 'expense',
    amount: '',
    description: '',
    category: '',
    reference: '',
  });

  const categories = {
    income: [
      'Barverkäufe',
      'Dienstleistungen',
      'Trinkgelder',
      'Rückerstattungen',
      'Sonstige Einnahmen',
    ],
    expense: [
      'Büromaterial',
      'Porto',
      'Bewirtung',
      'Fahrtkosten',
      'Kleinbeträge',
      'Sonstige Ausgaben',
    ],
  };

  useEffect(() => {
    loadCashEntries();
    checkCashRegisterStatus();
    loadCompanyData();
  }, [companyId, selectedPeriod]);

  const loadCompanyData = async () => {
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('@/firebase/clients');

      const companyRef = doc(db, 'companies', companyId);
      const companySnap = await getDoc(companyRef);

      if (companySnap.exists()) {
        setCompanyData(companySnap.data());
      }
    } catch (error) {
      console.error('Error loading company data:', error);
    }
  };

  const checkCashRegisterStatus = async () => {
    try {
      // Check if cash register is already opened
      // In production: fetch from Firestore
      const isOpen = localStorage.getItem(`cashRegister_${companyId}_opened`) === 'true';
      const savedOpeningBalance = localStorage.getItem(`cashRegister_${companyId}_openingBalance`);

      setIsCashRegisterOpen(isOpen);
      if (savedOpeningBalance) {
        setOpeningBalance(parseFloat(savedOpeningBalance));
      }
    } catch (error) {
      console.error('Error checking cash register status:', error);
    }
  };

  const loadCashEntries = async () => {
    try {
      setLoading(true);

      // Load from Firestore subcollection
      const { collection, query, orderBy, getDocs } = await import('firebase/firestore');
      const { db } = await import('@/firebase/clients');

      const cashbookRef = collection(db, 'companies', companyId, 'cashbook');
      const q = query(cashbookRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      const loadedEntries: CashEntry[] = [];

      querySnapshot.forEach(doc => {
        const data = doc.data();

        // Convert Firestore data to CashEntry format
        const entry: CashEntry = {
          id: doc.id,
          date: data.date || new Date().toISOString().split('T')[0],
          type:
            data.type === 'opening_balance' ? 'income' : data.amount >= 0 ? 'income' : 'expense',
          amount: Math.abs(data.amount || 0),
          description: data.description || '',
          category: data.category || '',
          reference: data.reference,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          status: data.status || 'open',
          linkedDocuments: data.linkedDocuments || [],
          counterpartyName: data.counterpartyName,
        };

        loadedEntries.push(entry);
      });

      setEntries(loadedEntries);

      // Calculate balance including opening balance
      const balance = loadedEntries.reduce((acc, entry) => {
        return entry.type === 'income' ? acc + entry.amount : acc - entry.amount;
      }, 0);
      setCashBalance(balance);

      console.log('Loaded entries from Firestore:', loadedEntries.length);
    } catch (error) {
      console.error('Error loading cashbook entries:', error);
      toast.error('Kassenbuch-Einträge konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const filteredEntries = entries.filter(entry => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        entry.description.toLowerCase().includes(searchLower) ||
        entry.category.toLowerCase().includes(searchLower) ||
        (entry.reference && entry.reference.toLowerCase().includes(searchLower)) ||
        (entry.counterpartyName && entry.counterpartyName.toLowerCase().includes(searchLower));

      // Category-specific search
      if (
        searchCategory === 'name' &&
        !entry.counterpartyName?.toLowerCase().includes(searchLower)
      ) {
        return false;
      } else if (
        searchCategory === 'reference' &&
        !entry.reference?.toLowerCase().includes(searchLower)
      ) {
        return false;
      } else if (searchCategory === 'links' && !entry.linkedDocuments?.length) {
        return false;
      } else if (searchCategory === 'all' && !matchesSearch) {
        return false;
      }
    }

    // Date range filter
    if (startDate && entry.date < startDate) return false;
    if (endDate && entry.date > endDate) return false;

    // Amount range filter
    if (minAmount && Math.abs(entry.amount) < parseFloat(minAmount)) return false;
    if (maxAmount && Math.abs(entry.amount) > parseFloat(maxAmount)) return false;

    return true;
  });

  const handleAddEntry = async () => {
    try {
      if (!newEntry.amount || !newEntry.description || !newEntry.category) {
        toast.error('Bitte füllen Sie alle Pflichtfelder aus');
        return;
      }

      const amount = parseFloat(newEntry.amount);

      // Import Firestore functions
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('@/firebase/clients');

      // Save to Firestore
      const cashbookRef = collection(db, 'companies', companyId, 'cashbook');

      const docRef = await addDoc(cashbookRef, {
        type: newEntry.type,
        amount: newEntry.type === 'income' ? amount : -amount,
        description: newEntry.description,
        category: newEntry.category,
        reference: newEntry.reference || null,
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp(),
        status: 'open',
      });

      // Create entry for local state
      const entry: CashEntry = {
        id: docRef.id,
        date: new Date().toISOString().split('T')[0],
        type: newEntry.type,
        amount: amount,
        description: newEntry.description,
        category: newEntry.category,
        reference: newEntry.reference || undefined,
        createdAt: new Date().toISOString(),
        status: 'open',
      };

      setEntries(prev => [entry, ...prev]);

      // Update balance
      setCashBalance(prev => (entry.type === 'income' ? prev + entry.amount : prev - entry.amount));

      // Reset form
      setNewEntry({
        type: 'income',
        amount: '',
        description: '',
        category: '',
        reference: '',
      });

      setShowAddModal(false);
      toast.success('Kassenbuch-Eintrag wurde hinzugefügt');
    } catch (error) {
      console.error('Error adding entry:', error);
      toast.error('Eintrag konnte nicht hinzugefügt werden');
    }
  };

  const totalIncome = entries
    .filter(entry => entry.type === 'income')
    .reduce((sum, entry) => sum + entry.amount, 0);

  const totalExpenses = entries
    .filter(entry => entry.type === 'expense')
    .reduce((sum, entry) => sum + entry.amount, 0);

  // Drag & Drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, []);

  const handleFiles = (files: FileList) => {
    Array.from(files).forEach(file => {
      if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
        toast.success(`Datei "${file.name}" wird hochgeladen...`);
        // In production: upload to storage and process with OCR
      } else {
        toast.error(`Dateityp von "${file.name}" wird nicht unterstützt`);
      }
    });
  };

  const handleAgreedToTerms = () => {
    // Close terms modal and open opening balance modal
    setShowOpenCashRegisterModal(false);
    setShowOpeningBalanceModal(true);
  };

  const handleOpeningBalanceSubmit = (balance: number, date: string) => {
    // In production: the balance is already saved to Firestore by OpeningBalanceModal
    setOpeningBalance(balance);
    setIsCashRegisterOpen(true);
    setCashBalance(balance);

    // Save to localStorage for persistence
    localStorage.setItem(`cashRegister_${companyId}_opened`, 'true');
    localStorage.setItem(`cashRegister_${companyId}_openingBalance`, balance.toString());
    localStorage.setItem(`cashRegister_${companyId}_openingDate`, date);
  };

  const handleLinkBooking = () => {
    if (selectedEntries.length === 0) {
      toast.error('Bitte wählen Sie mindestens einen Eintrag aus');
      return;
    }
    setShowAllocateBookingModal(true);
  };

  const handleExportCSV = () => {
    const csvData = filteredEntries.map(entry => ({
      Datum: entry.date,
      Typ: entry.type === 'income' ? 'Einnahme' : 'Ausgabe',
      Betrag: entry.amount,
      Beschreibung: entry.description,
      Kategorie: entry.category,
      Referenz: entry.reference || '',
      Status: entry.status || 'open',
    }));

    const headers = Object.keys(csvData[0]);
    const csv = [
      headers.join(';'),
      ...csvData.map(row => headers.map(header => row[header as keyof typeof row]).join(';')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `kassenbuch_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Kassenbuch wurde exportiert');
  };

  const handlePrintReport = async () => {
    // Create print window with formatted report
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Popup wurde blockiert. Bitte erlauben Sie Popups für diese Seite.');
      return;
    }

    // Load fresh company data if not available
    let printCompanyData = companyData;
    if (!printCompanyData) {
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('@/firebase/clients');

        const companyRef = doc(db, 'companies', companyId);
        const companySnap = await getDoc(companyRef);

        if (companySnap.exists()) {
          printCompanyData = companySnap.data();
        }
      } catch (error) {
        console.error('Error loading company data for print:', error);
      }
    }

    const today = new Date().toLocaleDateString('de-DE');
    const startDateFormatted = startDate
      ? new Date(startDate).toLocaleDateString('de-DE')
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString('de-DE');
    const endDateFormatted = endDate
      ? new Date(endDate).toLocaleDateString('de-DE')
      : new Date().toLocaleDateString('de-DE');

    // Calculate totals
    const openingBalance = entries.find(e => e.type === 'opening_balance')?.amount || 0;
    const totalIncome = filteredEntries
      .filter(e => e.type === 'income')
      .reduce((sum, e) => sum + e.amount, 0);
    const totalExpense = filteredEntries
      .filter(e => e.type === 'expense')
      .reduce((sum, e) => sum + e.amount, 0);
    const finalBalance = openingBalance + totalIncome - totalExpense;

    // Debug: Log company data
    console.log('Print Company Data:', printCompanyData);

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Kassenbericht ${startDateFormatted} - ${endDateFormatted}</title>
          <style>
            @media print {
              @page {
                margin: 20mm;
                size: A4;
              }
            }
            body {
              font-family: Arial, sans-serif;
              font-size: 11pt;
              line-height: 1.4;
              color: #000;
              margin: 0;
              padding: 20px;
            }
            .header {
              margin-bottom: 30px;
            }
            .header h1 {
              font-size: 18pt;
              margin: 0 0 10px 0;
              font-weight: bold;
            }
            .company-info {
              font-size: 10pt;
              margin-bottom: 20px;
            }
            .report-info {
              font-size: 10pt;
              margin-bottom: 20px;
              padding: 10px;
              background: #f5f5f5;
              border: 1px solid #ddd;
            }
            .report-info div {
              margin: 3px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              font-size: 10pt;
            }
            thead {
              background: #14ad9f;
              color: white;
            }
            th {
              padding: 8px;
              text-align: left;
              font-weight: bold;
              border: 1px solid #0f9d84;
            }
            td {
              padding: 6px 8px;
              border: 1px solid #ddd;
            }
            tbody tr:nth-child(even) {
              background: #f9f9f9;
            }
            .text-right {
              text-align: right;
            }
            .summary {
              margin-top: 30px;
              padding: 15px;
              background: #f5f5f5;
              border: 2px solid #14ad9f;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 5px 0;
              font-size: 11pt;
            }
            .summary-row.total {
              font-weight: bold;
              font-size: 12pt;
              border-top: 2px solid #14ad9f;
              padding-top: 10px;
              margin-top: 5px;
            }
            .footer {
              margin-top: 40px;
              font-size: 9pt;
              color: #666;
              text-align: center;
              border-top: 1px solid #ddd;
              padding-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Kassenbericht ${startDateFormatted} - ${endDateFormatted}</h1>
          </div>

          <div class="company-info">
            ${printCompanyData?.companyName || printCompanyData?.name || ''}<br>
            ${
              printCompanyData?.companyStreet
                ? `${printCompanyData.companyStreet}${printCompanyData.companyHouseNumber ? ' ' + printCompanyData.companyHouseNumber : ''}`
                : printCompanyData?.street || ''
            }<br>
            ${printCompanyData?.companyPostalCode || printCompanyData?.postalCode || ''} ${printCompanyData?.companyCity || printCompanyData?.city || ''}<br>
            ${printCompanyData?.contactEmail || printCompanyData?.email || ''}
          </div>

          <div class="report-info">
            <div><strong>Datum:</strong> ${today}</div>
            <div><strong>Zeitraum:</strong> ${startDateFormatted} - ${endDateFormatted}</div>
            <div><strong>Anzahl Einträge:</strong> ${filteredEntries.length}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Datum</th>
                <th>Name</th>
                <th class="text-right">Einnahme</th>
                <th class="text-right">Ausgabe</th>
                <th class="text-right">Bestand</th>
                <th>Kategorie</th>
                <th>Referenz</th>
              </tr>
            </thead>
            <tbody>
              ${filteredEntries
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((entry, index) => {
                  let runningBalance = openingBalance;
                  // Calculate running balance
                  for (let i = 0; i <= index; i++) {
                    const e = filteredEntries[i];
                    if (e.type === 'income') runningBalance += e.amount;
                    if (e.type === 'expense') runningBalance -= e.amount;
                  }

                  return `
                    <tr>
                      <td>${new Date(entry.date).toLocaleDateString('de-DE')}</td>
                      <td>${entry.counterpartyName || entry.description || '-'}</td>
                      <td class="text-right">${
                        entry.type === 'income' ? formatCurrency(entry.amount) : '-'
                      }</td>
                      <td class="text-right">${
                        entry.type === 'expense' ? formatCurrency(entry.amount) : '-'
                      }</td>
                      <td class="text-right">${formatCurrency(runningBalance)}</td>
                      <td>${entry.category || '-'}</td>
                      <td>${entry.reference || '-'}</td>
                    </tr>
                  `;
                })
                .join('')}
            </tbody>
          </table>

          <div class="summary">
            <div class="summary-row">
              <span>Anfangsbestand:</span>
              <span>${formatCurrency(openingBalance)}</span>
            </div>
            <div class="summary-row">
              <span>Einnahmen:</span>
              <span>${formatCurrency(totalIncome)}</span>
            </div>
            <div class="summary-row">
              <span>Ausgaben:</span>
              <span>${formatCurrency(totalExpense)}</span>
            </div>
            <div class="summary-row total">
              <span>Endbestand:</span>
              <span>${formatCurrency(finalBalance)}</span>
            </div>
          </div>

          <div class="footer">
            Erstellt am ${today} | Taskilo Kassenbuch
          </div>

          <script>
            window.onload = function() {
              window.print();
              // Close window after printing (optional)
              // setTimeout(() => window.close(), 100);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    toast.success('Kassenbericht wird gedruckt...');
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSearchCategory('all');
    setStartDate('');
    setEndDate('');
    setMinAmount('');
    setMaxAmount('');
  };

  const getStatusBadge = (status?: 'open' | 'linked' | 'processed') => {
    switch (status) {
      case 'linked':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="h-3 w-3 mr-1" />
            Verknüpft
          </Badge>
        );
      case 'processed':
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <Circle className="h-3 w-3 mr-1" />
            Verarbeitet
          </Badge>
        );
      case 'open':
      default:
        return (
          <Badge variant="outline" className="text-gray-600">
            <AlertCircle className="h-3 w-3 mr-1" />
            Offen
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#14ad9f]" />
        <span className="ml-2 text-gray-600">Lade Kassenbuch...</span>
      </div>
    );
  }

  // Show "Open Cash Register" prompt if not opened yet
  if (!isCashRegisterOpen) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-6 w-6 text-[#14ad9f]" />
                Hast du eine Kasse?
              </CardTitle>
              <CardDescription>
                Hier kannst du deine Kassenumsätze einpflegen.
                <br />
                Denke daran, dass der Anfangsbestand nach dem Eröffnen aus rechtlichen Gründen
                unveränderlich ist.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setShowOpenCashRegisterModal(true)}
                className="w-full bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
              >
                Kasse eröffnen
              </Button>
            </CardContent>
          </Card>
        </div>

        <OpenCashRegisterModal
          isOpen={showOpenCashRegisterModal}
          onClose={() => setShowOpenCashRegisterModal(false)}
          onConfirm={handleAgreedToTerms}
        />

        <OpeningBalanceModal
          isOpen={showOpeningBalanceModal}
          onClose={() => setShowOpeningBalanceModal(false)}
          onSuccess={handleOpeningBalanceSubmit}
          companyId={companyId}
        />
      </>
    );
  }

  return (
    <div
      className="space-y-6"
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Overlay */}
      {dragActive && (
        <div className="fixed inset-0 bg-[#14ad9f]/10 backdrop-blur-sm z-50 flex items-center justify-center border-4 border-dashed border-[#14ad9f]">
          <div className="bg-white rounded-lg p-8 shadow-xl">
            <Upload className="h-16 w-16 text-[#14ad9f] mx-auto mb-4" />
            <p className="text-xl font-semibold text-gray-900 text-center">Dateien hier ablegen</p>
            <p className="text-gray-600 text-center mt-2">Belege und Quittungen hochladen</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border">
        {/* Card Head with Tabs and Buttons */}
        <div className={`px-6 py-3 ${showFilters ? 'border-b' : ''}`}>
          <div className="flex items-center justify-between">
            {/* Tabs Section */}
            <div className="flex items-center">
              <button className="px-4 py-2 text-sm font-semibold text-[#14ad9f] border-b-2 border-[#14ad9f] -mb-3">
                Kasse
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowCashMovementModal(true)} size="sm">
                Geldbewegung
              </Button>

              <Button variant="outline" onClick={handlePrintReport} size="sm">
                <Download className="h-4 w-4 mr-2" />
                Kassenbericht drucken
              </Button>

              <Button variant="outline" onClick={handleExportCSV} size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportieren
              </Button>

              <Button variant="outline" onClick={() => setShowFilters(!showFilters)} size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
        </div>

        {/* Filter Section */}
        {showFilters && (
          <div className="px-6 py-4 bg-gray-50">
            <div className="flex gap-3 mb-3">
              {/* Search Field - Big */}
              <div className="flex-2">
                <Label className="text-xs font-medium text-gray-700 mb-1 block">Suche</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="z. B. Name, Verwendungszweck, Verknüpfungen"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={searchCategory} onValueChange={setSearchCategory}>
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Spalten</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="reference">Verwendungszweck</SelectItem>
                      <SelectItem value="links">Verknüpfungen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Start Date - Small */}
              <div className="flex-1">
                <Label className="text-xs font-medium text-gray-700 mb-1 block">Startdatum</Label>
                <div className="relative">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    placeholder="TT.MM.JJJJ"
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* End Date - Small */}
              <div className="flex-1">
                <Label className="text-xs font-medium text-gray-700 mb-1 block">Enddatum</Label>
                <div className="relative">
                  <Input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    placeholder="TT.MM.JJJJ"
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Amount Range - Small */}
              <div className="flex-1">
                <Label className="text-xs font-medium text-gray-700 mb-1 block">
                  Betrag <span className="font-normal">(Brutto)</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="von"
                    value={minAmount}
                    onChange={e => setMinAmount(e.target.value)}
                    className="w-full"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="bis"
                    value={maxAmount}
                    onChange={e => setMaxAmount(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Reset Filter Link */}
            <div className="flex items-center">
              <Button
                variant="link"
                onClick={resetFilters}
                className="text-[#14ad9f] hover:text-[#0f9d84] px-0 h-auto text-sm"
              >
                Filter zurücksetzen
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Title and Description - Moved below filter */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Kassenbuch</h2>
          <p className="text-gray-600 mt-1">
            Bargeld-Einnahmen und -Ausgaben dokumentieren und verwalten
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleLinkBooking}
            disabled={selectedEntries.length === 0}
            size="sm"
          >
            <LinkIcon className="h-4 w-4 mr-2" />
            Buchung zuordnen
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white" size="sm">
                Rechnung erstellen
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setNewEntry(prev => ({ ...prev, type: 'income' }));
                  setShowAddModal(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Einnahme erfassen
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setNewEntry(prev => ({ ...prev, type: 'expense' }));
                  setShowAddModal(true);
                }}
              >
                <Minus className="h-4 w-4 mr-2" />
                Ausgabe erfassen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="entries">Einträge</TabsTrigger>
          <TabsTrigger value="reports">Berichte</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Cash Balance and Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="md:col-span-2">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Wallet className="h-12 w-12 text-[#14ad9f]" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Kassenbestand</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {formatCurrency(cashBalance)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Stand: {new Date().toLocaleDateString('de-DE')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Einnahmen</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(totalIncome)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <TrendingDown className="h-8 w-8 text-red-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Ausgaben</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(totalExpenses)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Entries */}
          <Card>
            <CardHeader>
              <CardTitle>Letzte Einträge</CardTitle>
              <CardDescription>Die neuesten Kassenbuch-Einträge im Überblick</CardDescription>
            </CardHeader>
            <CardContent>
              {entries.slice(0, 5).map(entry => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between py-3 border-b last:border-b-0"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`p-2 rounded-full ${
                        entry.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                      }`}
                    >
                      {entry.type === 'income' ? (
                        <Plus
                          className={`h-4 w-4 ${
                            entry.type === 'income' ? 'text-green-600' : 'text-red-600'
                          }`}
                        />
                      ) : (
                        <Minus className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{entry.description}</p>
                      <p className="text-sm text-gray-600">{entry.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-medium ${
                        entry.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {entry.type === 'income' ? '+' : '-'}
                      {formatCurrency(entry.amount)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(entry.date).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entries" className="space-y-4">
          {/* Search */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Einträge suchen..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {selectedEntries.length > 0 && (
              <Badge variant="secondary">{selectedEntries.length} ausgewählt</Badge>
            )}
          </div>

          {/* Entries Table */}
          <Card>
            <CardHeader>
              <CardTitle>Alle Einträge</CardTitle>
              <CardDescription>Vollständige Liste aller Kassenbuch-Einträge</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredEntries.length === 0 ? (
                <div className="text-center py-8">
                  <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchTerm ? 'Keine Einträge gefunden' : 'Keine Kassenbuch-Einträge vorhanden'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm
                      ? 'Versuchen Sie andere Suchbegriffe'
                      : 'Fügen Sie Ihren ersten Kassenbuch-Eintrag hinzu'}
                  </p>
                  {!searchTerm && (
                    <Button
                      onClick={() => setShowAddModal(true)}
                      className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
                    >
                      Ersten Eintrag hinzufügen
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
                          <input
                            type="checkbox"
                            checked={selectedEntries.length === filteredEntries.length}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedEntries(filteredEntries.map(entry => entry.id));
                              } else {
                                setSelectedEntries([]);
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Name / Verwendungszweck
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Buchungstag
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Betrag (Brutto)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Verknüpfungen
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Aktionen
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredEntries.map(entry => (
                        <tr
                          key={entry.id}
                          className={`hover:bg-gray-50 transition-colors ${
                            selectedEntries.includes(entry.id) ? 'bg-blue-50' : ''
                          }`}
                        >
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              checked={selectedEntries.includes(entry.id)}
                              onChange={e => {
                                if (e.target.checked) {
                                  setSelectedEntries(prev => [...prev, entry.id]);
                                } else {
                                  setSelectedEntries(prev => prev.filter(id => id !== entry.id));
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                          </td>
                          <td className="px-4 py-4">{getStatusBadge(entry.status)}</td>
                          <td className="px-4 py-4">
                            <div>
                              <p className="font-medium text-gray-900">
                                {entry.counterpartyName || 'Unbekannt'}
                              </p>
                              <p className="text-sm text-gray-600 truncate max-w-md">
                                {entry.description}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right text-sm text-gray-900">
                            {new Date(entry.date).toLocaleDateString('de-DE')}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span
                              className={`font-medium ${
                                entry.type === 'income' ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {entry.type === 'income' ? '+' : '-'}
                              {formatCurrency(entry.amount)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            {entry.linkedDocuments && entry.linkedDocuments.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {entry.linkedDocuments.map(doc => (
                                  <Badge key={doc.id} variant="outline" className="text-xs">
                                    <FileText className="h-3 w-3 mr-1" />
                                    {doc.number}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // Handle view/edit entry
                                toast.info('Eintrag-Details öffnen (in Entwicklung)');
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Kassenbuch-Berichte</CardTitle>
              <CardDescription>
                Exportieren Sie Ihre Kassenbuch-Daten für Buchhaltung und Steuerberater
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button variant="outline" className="h-20 flex flex-col">
                <Download className="h-6 w-6 mb-2" />
                Kassenbuch Export (Excel)
              </Button>

              <Button variant="outline" className="h-20 flex flex-col">
                <Receipt className="h-6 w-6 mb-2" />
                Kassenbericht (PDF)
              </Button>

              <Button variant="outline" className="h-20 flex flex-col">
                <Calendar className="h-6 w-6 mb-2" />
                Monatsabschluss
              </Button>

              <Button variant="outline" className="h-20 flex flex-col">
                <Upload className="h-6 w-6 mb-2" />
                DATEV Export
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Entry Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Neuer Kassenbuch-Eintrag</DialogTitle>
            <DialogDescription>Fügen Sie eine neue Bargeld-Transaktion hinzu</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Art</Label>
              <Select
                value={newEntry.type}
                onValueChange={(value: 'income' | 'expense') =>
                  setNewEntry(prev => ({ ...prev, type: value, category: '' }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Einnahme</SelectItem>
                  <SelectItem value="expense">Ausgabe</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Betrag (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newEntry.amount}
                  onChange={e => setNewEntry(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Kategorie</Label>
                <Select
                  value={newEntry.category}
                  onValueChange={value => setNewEntry(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories[newEntry.type].map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Beschreibung</Label>
              <Textarea
                value={newEntry.description}
                onChange={e => setNewEntry(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Beschreibung der Transaktion"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Referenz (optional)</Label>
              <Input
                value={newEntry.reference}
                onChange={e => setNewEntry(prev => ({ ...prev, reference: e.target.value }))}
                placeholder="z.B. Belegnummer, Quittung"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleAddEntry}
                className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
              >
                Eintrag hinzufügen
              </Button>
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                Abbrechen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cash Movement Modal */}
      <CashMovementModal
        isOpen={showCashMovementModal}
        onClose={() => setShowCashMovementModal(false)}
        companyId={companyId}
        onSuccess={() => {
          loadCashEntries();
        }}
      />

      {/* Allocate Booking Modal */}
      <AllocateBookingModal
        isOpen={showAllocateBookingModal}
        onClose={() => {
          setShowAllocateBookingModal(false);
          setSelectedEntries([]);
        }}
        companyId={companyId}
        selectedEntryIds={selectedEntries}
        onSuccess={() => {
          loadCashEntries();
          setSelectedEntries([]);
        }}
      />
    </div>
  );
}
