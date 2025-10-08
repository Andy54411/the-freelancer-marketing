'use client';

import React, { useState, useContext, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/firebase/clients';
import { Calendar, ChevronDown, Search, Plus, Info, ArrowLeft } from 'lucide-react';

import ReceiptPreviewUpload from '@/components/finance/ReceiptPreviewUpload';
import CategorySelectionModal from '@/components/finance/CategorySelectionModal';
import CategoryAutocomplete from '@/components/finance/CategoryAutocomplete';
import { DatevCardService } from '@/services/datevCardService';
import { TAX_RULES, getTaxRule } from '@/config/taxRules';
import { TaxRuleType } from '@/types/taxRules';
import { ReceiptLinkingService, OCRReceiptData } from '@/services/ReceiptLinkingService';
import { GeminiReceiptCategorizationService } from '@/services/GeminiReceiptCategorizationService';
// Use the same Category interface as CategorySelectionModal
interface Category {
  id: string;
  name: string;
  code: string;
  description?: string;
  icon: React.ReactNode;
}

interface ExtractedReceiptData {
  vendor?: string;
  amount?: number;
  invoiceNumber?: string;
  date?: string;
  dueDate?: string; // 🎯 FÄLLIGKEITSDATUM hinzugefügt
  category?: string;
  description?: string;
  title?: string;
  vatAmount?: number;
  netAmount?: number;
  vatRate?: number;

  // Enhanced OCR fields
  costCenter?: string;
  paymentTerms?: string; // 🎯 Geändert von number zu string für Text-Zahlungsbedingungen
  currency?: string;
  companyVatNumber?: string;
  goBDCompliant?: boolean;
  validationIssues?: Array<{
    field: string;
    severity: 'ERROR' | 'WARNING' | 'INFO';
    message: string;
  }>;
  processingMode?: string;
}

export default function ReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const uid = params?.uid as string;

  // Auth State - Fallback implementation
  const [user, setUser] = useState<{ uid: string } | null>(null);

  useEffect(() => {
    // Einfache Auth-State Implementierung
    const unsubscribe = auth.onAuthStateChanged(currentUser => {
      setUser(currentUser ? { uid: currentUser.uid } : null);
    });

    return () => unsubscribe();
  }, []);

  // Get initial data from URL params (from transaction)
  const transactionData = {
    beschreibung: searchParams?.get('beschreibung') || '',
    betrag: searchParams?.get('betrag') || '0,00',
    belegdatum: searchParams?.get('belegdatum') || new Date().toLocaleDateString('de-DE'),
    kunde: searchParams?.get('kunde') || '',
    transactionId: searchParams?.get('transactionId') || '',
    type: searchParams?.get('type') || 'EXPENSE', // Default: Ausgabe
  };

  // Determine transaction type for CategorySelectionModal
  const getTransactionType = (): 'INCOME' | 'EXPENSE' | 'ALL' => {
    // 1. Zuerst URL-Parameter prüfen
    const urlType = transactionData.type?.toUpperCase();
    if (urlType === 'INCOME' || urlType === 'EXPENSE') {
      return urlType as 'INCOME' | 'EXPENSE';
    }

    // 2. Fallback: Anhand des Betrags erkennen
    const betrag = parseFloat(formData.betrag.replace(',', '.').replace('-', '')) || 0;
    const isNegative = formData.betrag.includes('-') || transactionData.betrag.includes('-');

    // Negative Beträge oder explizite Ausgaben = EXPENSE
    if (isNegative || betrag > 0) {
      return 'EXPENSE';
    }

    // Default: Ausgabe
    return 'EXPENSE';
  };

  const transactionType = getTransactionType();

  const [formData, setFormData] = useState({
    belegnummer: '',
    belegdatum: transactionData.belegdatum,
    kunde: transactionData.kunde,
    lieferdatum: transactionData.belegdatum,
    zeitraum: '',
    verknuepfung: '',
    faelligkeit: '',
    kostenstelle: '',
    tags: [] as string[],
    kategorie: '',
    betrag: transactionData.betrag,
    nettobetrag: '',
    waehrung: 'EUR',
    umsatzsteuer: '19',
    taxRule: TaxRuleType.DE_TAXABLE, // Für die Erstattung der Umsatzsteuer
    privatentnahme: false,
    beschreibung: transactionData.beschreibung,
    positionen: [] as Array<{ id: string; beschreibung: string; menge: number; preis: number }>,
  });

  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [isNettoMode, setIsNettoMode] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>(undefined);

  // Customer States
  const [customers, setCustomers] = useState<
    Array<{ id: string; customerNumber: string; name: string; email?: string }>
  >([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // Kostenstellen States
  const [kostenstellen, setKostenstellen] = useState<
    Array<{
      id: string;
      name: string;
      code?: string;
      number?: string;
      active?: boolean;
      description?: string;
    }>
  >([]);
  const [loadingKostenstellen, setLoadingKostenstellen] = useState(false);
  const [showNewKostenstelleInput, setShowNewKostenstelleInput] = useState(false);
  const [newKostenstelle, setNewKostenstelle] = useState('');

  // Handle extracted data from upload component (Enhanced OCR Support with Gemini AI)
  const handleDataExtracted = async (data: ExtractedReceiptData) => {
    // Enhanced OCR: Validierungshinweise anzeigen
    if (data.goBDCompliant === false && data.validationIssues) {
      const errorCount = data.validationIssues.filter(i => i.severity === 'ERROR').length;
      const warningCount = data.validationIssues.filter(i => i.severity === 'WARNING').length;

      if (errorCount > 0) {
        console.error(
          '🚨 GoBD-Compliance Fehler:',
          data.validationIssues.filter(i => i.severity === 'ERROR')
        );
      }
      if (warningCount > 0) {
        console.warn(
          '⚠️ GoBD-Compliance Warnungen:',
          data.validationIssues.filter(i => i.severity === 'WARNING')
        );
      }
    }

    // 🤖 GEMINI AI POWERED INTELLIGENT DATEV CATEGORIZATION
    console.log('🤖 Starting Gemini AI categorization...');
    let datevCategoryProposal = '';
    let suggestedCategory: Category | undefined = undefined;
    let aiConfidence = 0;
    let aiReasoning = '';

    try {
      // Prepare data for Gemini AI analysis - verbesserte Datenextraktion
      const dataAny = data as any; // Temporärer Workaround für fehlende Felder
      const receiptForAI = {
        vendor: data.vendor || dataAny.kunde || '',
        description: data.description || dataAny.beschreibung || data.title || '',
        title: data.title || data.invoiceNumber || '',
        amount:
          data.amount ||
          (typeof dataAny.betrag === 'string'
            ? parseFloat(dataAny.betrag.replace(',', '.'))
            : dataAny.betrag),
        invoiceNumber: data.invoiceNumber || dataAny.belegnummer,
        date: data.date || dataAny.belegdatum,
      };

      // Debug: Bessere Datenanalyse
      console.log('🔍 OCR-Daten Analyse:', {
        originalKeys: Object.keys(data),
        vendor: { original: data.vendor, final: receiptForAI.vendor },
        description: {
          original: data.description,
          title: data.title,
          final: receiptForAI.description,
          length: receiptForAI.description?.length || 0,
        },
        amount: { original: data.amount, final: receiptForAI.amount },
        hasRelevantKeywords: {
          gastronomisch: receiptForAI.description?.toLowerCase().includes('gastronomisch') || false,
          honorar: receiptForAI.description?.toLowerCase().includes('honorar') || false,
          bewirtung: receiptForAI.description?.toLowerCase().includes('bewirtung') || false,
        },
      });

      // Debug: Zeige alle OCR-Daten
      console.log('📄 Vollständige OCR-Daten:', data);
      console.log('🧠 Sending to Gemini AI:', receiptForAI);

      // Spezielle Behandlung für "Gastronomisch bezogene Honoraleistung"
      if (
        receiptForAI.description?.toLowerCase().includes('gastronomisch') &&
        receiptForAI.description?.toLowerCase().includes('honorar')
      ) {
        console.log('🍽️ Spezialfall erkannt: Gastronomische Honorarleistung');
      }

      // Get AI-powered category suggestion
      const aiSuggestion = await GeminiReceiptCategorizationService.suggestCategoryWithRetry(
        receiptForAI,
        2
      );

      console.log('🎯 Gemini AI suggestion:', aiSuggestion);

      if (aiSuggestion && aiSuggestion.categoryCode) {
        // Find matching DATEV card
        const allCards = DatevCardService.getAllCards().filter(card => card.type === 'EXPENSE');
        const suggestedCard = allCards.find(card => card.code === aiSuggestion.categoryCode);

        if (suggestedCard) {
          datevCategoryProposal = `${suggestedCard.code} - ${suggestedCard.name}`;
          suggestedCategory = {
            id: suggestedCard.id,
            name: suggestedCard.name,
            code: suggestedCard.code,
            icon: null,
          };
          aiConfidence = aiSuggestion.confidence;
          aiReasoning = aiSuggestion.reasoning;

          console.log(
            `✅ Gemini AI DATEV-Kategorie: ${suggestedCard.name} (${aiConfidence}% Sicherheit)`
          );
          console.log(`💡 AI Begründung: ${aiReasoning}`);
        } else {
          console.warn(
            '❌ AI-vorgeschlagene Kategorie in DATEV nicht gefunden:',
            aiSuggestion.categoryCode
          );
        }
      }
    } catch (aiError) {
      console.error('❌ Gemini AI Kategorisierung fehlgeschlagen:', aiError);
    }

    // 1. Fallback: Versuche mit OCR-extrahierter Kategorie (falls AI fehlschlägt)
    if (!suggestedCategory && data.category) {
      console.log('� Fallback: OCR erkannte Kategorie:', data.category);

      const allCards = DatevCardService.getAllCards().filter(card => card.type === 'EXPENSE');
      const matchingCard = allCards.find(
        card =>
          card.id === data.category ||
          (data.category && card.name.toLowerCase().includes(data.category.toLowerCase())) ||
          (data.category &&
            card.category &&
            card.category.toLowerCase().includes(data.category.toLowerCase()))
      );

      if (matchingCard) {
        datevCategoryProposal = `${matchingCard.code} - ${matchingCard.name}`;
        suggestedCategory = {
          id: matchingCard.id,
          name: matchingCard.name,
          code: matchingCard.code,
          icon: null,
        };
        console.log('✅ OCR-Kategorie-Match gefunden:', matchingCard);
      }
    }

    // 2. Letzte Fallback: Sonstige betriebliche Aufwendungen (nur wenn AI + OCR beide fehlschlagen)
    if (!suggestedCategory) {
      const allCards = DatevCardService.getAllCards().filter(card => card.type === 'EXPENSE');
      const fallbackCard = allCards.find(card => card.code === '6850'); // Sonstiger Betriebsbedarf
      if (fallbackCard) {
        datevCategoryProposal = `${fallbackCard.code} - ${fallbackCard.name}`;
        suggestedCategory = {
          id: fallbackCard.id,
          name: fallbackCard.name,
          code: fallbackCard.code,
          icon: null,
        };
        console.log('💡 Ultimo Fallback-Kategorie-Vorschlag:', fallbackCard);
        aiReasoning = 'Fallback-Kategorie (AI und OCR konnten keine passende Kategorie finden)';
        aiConfidence = 25;
      }
    }

    // Setze AI-Vorschlag als selectedCategory (nicht fest im Input)
    if (suggestedCategory) {
      setSelectedCategory(suggestedCategory);
      console.log('📋 Gemini AI Kategorie-Vorschlag gesetzt:', {
        category: suggestedCategory,
        confidence: aiConfidence,
        reasoning: aiReasoning,
      });

      // Optional: Show AI confidence to user
      if (aiConfidence > 0) {
        const confidenceLevel =
          GeminiReceiptCategorizationService.getConfidenceDescription(aiConfidence);
        console.log(`🎯 AI-Sicherheit: ${confidenceLevel} (${aiConfidence}%)`);
      }
    }

    // Auto-fill form with extracted data (Enhanced OCR Support)
    setFormData(prev => ({
      ...prev,
      belegnummer: data.invoiceNumber || prev.belegnummer,
      belegdatum: data.date ? new Date(data.date).toLocaleDateString('de-DE') : prev.belegdatum,
      kunde: data.vendor || prev.kunde,
      lieferdatum: data.date ? new Date(data.date).toLocaleDateString('de-DE') : prev.lieferdatum,
      // KATEGORIE NUR ALS VORSCHLAG VON GEMINI AI, NICHT FEST SETZEN - User kann überschreiben
      kategorie: datevCategoryProposal && !prev.kategorie ? datevCategoryProposal : prev.kategorie,
      betrag: data.amount ? data.amount.toString().replace('.', ',') : prev.betrag,
      beschreibung: data.description || data.title || prev.beschreibung,

      // Enhanced OCR: Deutsche Spezialfelder
      kostenstelle: data.costCenter || prev.kostenstelle,
      waehrung: data.currency || prev.waehrung,
      nettobetrag: data.netAmount ? data.netAmount.toString().replace('.', ',') : prev.nettobetrag,
      umsatzsteuer: data.vatRate ? data.vatRate.toString() : prev.umsatzsteuer,

      // Enhanced OCR: Fälligkeitsdatum direkt vom OCR oder aus Zahlungsbedingungen berechnet
      faelligkeit: data.dueDate
        ? new Date(data.dueDate).toLocaleDateString('de-DE')
        : data.paymentTerms &&
            typeof data.paymentTerms === 'string' &&
            /\d+\s*(tag|day)/i.test(data.paymentTerms)
          ? (() => {
              const days = parseInt(data.paymentTerms.match(/\d+/)?.[0] || '0');
              return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toLocaleDateString('de-DE');
            })()
          : prev.faelligkeit,
    }));

    // Enhanced OCR: Zusätzliche Verarbeitung
    if (data.processingMode?.includes('enhanced')) {
      // Automatische USt-Berechnungsmodus basierend auf erkannten Daten
      if (data.netAmount && data.vatAmount && data.amount) {
        setIsNettoMode(true);
      }
    }
  };

  // Customer Loading Function
  const loadCustomers = async () => {
    if (loadingCustomers || customers.length > 0) return; // Bereits geladen oder lädt gerade

    setLoadingCustomers(true);
    try {
      const { collection, getDocs } = await import('firebase/firestore');
      const { db } = await import('@/firebase/clients');

      const customersRef = collection(db, 'companies', uid, 'customers');
      const snapshot = await getDocs(customersRef);

      const customerData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        customerNumber: doc.data().customerNumber || `KD-${doc.id.substring(0, 6).toUpperCase()}`,
        name: doc.data().name || doc.data().companyName || 'Unbenannter Kunde',
      })) as Array<{ id: string; customerNumber: string; name: string; email?: string }>;

      setCustomers(customerData);
    } catch (error) {
      console.error('Fehler beim Laden der Kunden:', error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Kostenstellen Loading Function
  const loadKostenstellen = async () => {
    if (loadingKostenstellen || kostenstellen.length > 0) return;

    setLoadingKostenstellen(true);
    try {
      const { collection, getDocs } = await import('firebase/firestore');
      const { db } = await import('@/firebase/clients');

      const kostenstellenRef = collection(db, 'companies', uid, 'kostenstellen');
      const snapshot = await getDocs(kostenstellenRef);

      const kostenstellenData = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || 'Unbenannte Kostenstelle',
        number: doc.data().number || doc.data().code || '999',
        code: doc.data().number || doc.data().code || '999', // Backward compatibility
        active: doc.data().active !== false,
        description: doc.data().description || '',
      }));

      setKostenstellen(kostenstellenData);
    } catch (error) {
      console.error('Fehler beim Laden der Kostenstellen:', error);
    } finally {
      setLoadingKostenstellen(false);
    }
  };

  // Neue Kostenstelle speichern
  const saveNewKostenstelle = async () => {
    if (!newKostenstelle.trim()) return;

    try {
      const { collection, addDoc } = await import('firebase/firestore');
      const { db } = await import('@/firebase/clients');

      const kostenstellenRef = collection(db, 'companies', uid, 'kostenstellen');
      // Generiere nächste verfügbare Kostenstellennummer
      const nextNumber =
        Math.max(
          0,
          ...kostenstellen.map(ks => {
            const match = ks.code?.match(/^(\d+)$/);
            return match ? parseInt(match[1]) : 0;
          })
        ) + 1;

      const kostenstellenCode = nextNumber.toString().padStart(3, '0');

      const docRef = await addDoc(kostenstellenRef, {
        name: newKostenstelle.trim(),
        number: kostenstellenCode, // Deutsche Standard-Nummerierung
        code: kostenstellenCode, // Backward compatibility
        active: true,
        description: '',
        createdAt: new Date(),
      });

      // Neue Kostenstelle zu lokaler Liste hinzufügen
      const newKostenstelleObj = {
        id: docRef.id,
        name: newKostenstelle.trim(),
        number: kostenstellenCode,
        code: kostenstellenCode,
        active: true,
        description: '',
      };

      setKostenstellen(prev => [...prev, newKostenstelleObj]);

      // Neue Kostenstelle auswählen (verwende Nummer, nicht ID)
      handleInputChange('kostenstelle', kostenstellenCode);
      setNewKostenstelle('');
      setShowNewKostenstelleInput(false);
    } catch (error) {
      console.error('Fehler beim Speichern der Kostenstelle:', error);
    }
  };

  const handleInputChange = (field: string, value: string | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      console.log('💾 Speichere Beleg manuell...');

      // Konvertiere Form-Daten zu OCR-Format für konsistente Verarbeitung
      const ocrData: OCRReceiptData = {
        vendor: formData.kunde,
        amount: parseFloat(formData.betrag.replace(',', '.')),
        invoiceNumber: formData.belegnummer,
        date: formData.belegdatum,
        dueDate: formData.faelligkeit,
        category: formData.kategorie,
        description: formData.beschreibung,
        vatRate: parseFloat(formData.umsatzsteuer),
        costCenter: formData.kostenstelle,
        currency: formData.waehrung,
      };

      // Erstelle Beleg
      const result = await ReceiptLinkingService.createReceiptFromOCR(
        uid,
        user?.uid || 'unknown',
        ocrData
      );

      if (result.success) {
        console.log('✅ Beleg erfolgreich gespeichert:', result.receiptId);

        // Optional: Success-Toast
        // toast.success('Beleg erfolgreich erstellt!');

        router.back();
      } else {
        console.error('❌ Fehler beim Speichern:', result.error);
        // Optional: Error-Toast
        // toast.error('Fehler beim Speichern des Belegs');
      }
    } catch (error) {
      console.error('❌ Unerwarteter Fehler beim Speichern:', error);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const calculateTotal = () => {
    const betrag = parseFloat(formData.betrag.replace(',', '.')) || 0;
    return betrag.toFixed(2).replace('.', ',');
  };

  const calculateNetto = () => {
    if (isNettoMode) {
      return parseFloat(formData.nettobetrag.replace(',', '.') || '0').toFixed(2);
    } else {
      const betrag = parseFloat(formData.betrag.replace(',', '.')) || 0;
      const taxRate = parseFloat(formData.umsatzsteuer) / 100;
      const netto = betrag / (1 + taxRate);
      return netto.toFixed(2);
    }
  };

  const calculateTax = () => {
    const netto = parseFloat(calculateNetto());
    const taxRate = parseFloat(formData.umsatzsteuer) / 100;
    return (netto * taxRate).toFixed(2);
  };

  const calculateBrutto = () => {
    if (isNettoMode) {
      const netto = parseFloat(formData.nettobetrag.replace(',', '.') || '0');
      const taxRate = parseFloat(formData.umsatzsteuer) / 100;
      return (netto * (1 + taxRate)).toFixed(2).replace('.', ',');
    } else {
      return formData.betrag || '0,00';
    }
  };

  const handleCategorySelect = (category: any) => {
    setSelectedCategory(category);
    setFormData(prev => ({ ...prev, kategorie: category.name }));
    // Modal wird durch die CategoryAutocomplete Komponente geschlossen
  };

  const handleModalCategorySelect = (bookingAccount: any) => {
    // Konvertiere BookingAccount zurück zu Category für lokale State
    const categoryFromBooking: Category = {
      id: bookingAccount.id,
      name: bookingAccount.name,
      code: bookingAccount.number || '',
      icon: null,
    };
    setSelectedCategory(categoryFromBooking);
    setFormData(prev => ({
      ...prev,
      kategorie: bookingAccount.number || bookingAccount.id, // DATEV-Kontonummer für BWA
    }));
    setShowCategoryModal(false);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-[#14ad9f] text-white px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-white/10 rounded-md transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold">Beleg erstellen</h1>
              {transactionData.transactionId && (
                <p className="text-sm text-white/80">Aus Transaktion erstellt</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium bg-white text-[#14ad9f] border border-transparent rounded-md hover:bg-gray-50 transition-colors"
            >
              Verwerfen
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-[#129488] border border-transparent rounded-md hover:bg-[#0f7a70] transition-colors"
            >
              Fertigstellen
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - FUNKTIONIERT GARANTIERT! */}
      <div className="flex-1 flex h-screen">
        {/* Left Side - STICKY FUNKTIONIERT! */}
        <div className="w-1/2 border-r border-gray-200 bg-white sticky top-0 h-[700px] overflow-hidden">
          <ReceiptPreviewUpload
            companyId={uid}
            onDataExtracted={handleDataExtracted}
            className="h-full w-full"
            showPreview={true}
          />
        </div>

        {/* Right Side - SCROLLT UNABHÄNGIG! */}
        <div className="w-1/2 p-6 overflow-y-auto">
          <div className="space-y-6 max-w-2xl">
            {/* Details Section */}
            <div className="bg-white">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Details</h3>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  {/* Belegnummer - Modern Input with Label Above */}
                  <div className="relative">
                    <input
                      id="belegnummer"
                      type="text"
                      value={formData.belegnummer}
                      onChange={e => handleInputChange('belegnummer', e.target.value)}
                      placeholder="z. B. Rechnungsnummer"
                      className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] transition-colors bg-white"
                      required
                    />
                    <label
                      htmlFor="belegnummer"
                      className="absolute -top-2 left-3 px-1 bg-white text-xs font-medium text-gray-700"
                    >
                      Belegnummer <span className="text-red-500">*</span>
                    </label>
                  </div>

                  {/* Belegdatum - Modern Input with Icon */}
                  <div className="relative">
                    <input
                      id="belegdatum"
                      type="text"
                      value={formData.belegdatum}
                      onChange={e => handleInputChange('belegdatum', e.target.value)}
                      placeholder="dd.MM.yyyy"
                      className="w-full px-4 py-3 pr-12 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] transition-colors bg-white"
                      required
                    />
                    <label
                      htmlFor="belegdatum"
                      className="absolute -top-2 left-3 px-1 bg-white text-xs font-medium text-gray-700"
                    >
                      Belegdatum <span className="text-red-500">*</span>
                    </label>
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  </div>

                  {/* Kunde - Modern Input */}
                  <div className="relative">
                    <input
                      id="kunde"
                      type="text"
                      value={formData.kunde}
                      onChange={e => handleInputChange('kunde', e.target.value)}
                      placeholder="Auswählen"
                      className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] transition-colors bg-white"
                      required
                    />
                    <label
                      htmlFor="kunde"
                      className="absolute -top-2 left-3 px-1 bg-white text-xs font-medium text-gray-700"
                    >
                      Kunde <span className="text-red-500">*</span>
                    </label>
                  </div>

                  {/* Lieferdatum - Modern Input with Zeitraum Button */}
                  <div className="relative">
                    <input
                      id="lieferdatum"
                      type="text"
                      value={formData.lieferdatum}
                      onChange={e => handleInputChange('lieferdatum', e.target.value)}
                      placeholder="dd.MM.yyyy"
                      className="w-full px-4 py-3 pr-12 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] transition-colors bg-white"
                      required
                    />
                    <div className="absolute -top-2 left-3 px-1 bg-white text-xs font-medium text-gray-700 flex items-center gap-2">
                      <span>
                        Lieferdatum <span className="text-red-500">*</span>
                      </span>
                      <button
                        type="button"
                        className="text-[#14ad9f] hover:text-[#129488] font-normal"
                      >
                        Zeitraum
                      </button>
                    </div>
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  </div>
                </div>

                {/* Erweiterte Felder - nur anzeigen wenn showMoreDetails true ist */}
                {showMoreDetails && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      {/* Verknüpfung - Customer Selector */}
                      <div className="relative">
                        <select
                          id="verknuepfung"
                          value={formData.verknuepfung}
                          onChange={e => handleInputChange('verknuepfung', e.target.value)}
                          onFocus={loadCustomers} // Load customers when focused
                          className="w-full px-4 py-3 pr-12 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] transition-colors bg-white"
                        >
                          <option value="">Kunde auswählen</option>
                          {loadingCustomers ? (
                            <option disabled>Lade Kunden...</option>
                          ) : (
                            customers.map(customer => (
                              <option key={customer.id} value={customer.id}>
                                {customer.customerNumber} - {customer.name}
                              </option>
                            ))
                          )}
                        </select>
                        <label
                          htmlFor="verknüpfung"
                          className="absolute -top-2 left-3 px-1 bg-white text-xs font-medium text-gray-700"
                        >
                          Verknüpfung
                        </label>
                      </div>

                      {/* Fälligkeit */}
                      <div className="relative">
                        <input
                          id="faelligkeit"
                          type="text"
                          value={formData.faelligkeit}
                          onChange={e => handleInputChange('faelligkeit', e.target.value)}
                          placeholder="Auswählen"
                          className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] transition-colors bg-white"
                        />
                        <label
                          htmlFor="faelligkeit"
                          className="absolute -top-2 left-3 px-1 bg-white text-xs font-medium text-gray-700"
                        >
                          Fälligkeit
                        </label>
                      </div>

                      {/* Kostenstelle - Enhanced Selector */}
                      <div className="space-y-2">
                        <div className="relative">
                          <select
                            id="kostenstelle"
                            value={formData.kostenstelle}
                            onChange={e => {
                              if (e.target.value === 'NEW') {
                                setShowNewKostenstelleInput(true);
                              } else {
                                handleInputChange('kostenstelle', e.target.value);
                              }
                            }}
                            onFocus={loadKostenstellen}
                            className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] transition-colors bg-white"
                          >
                            <option value="">Kostenstelle auswählen</option>
                            {loadingKostenstellen ? (
                              <option disabled>Lade Kostenstellen...</option>
                            ) : (
                              kostenstellen.map(ks => (
                                <option key={ks.id} value={ks.code || ks.number}>
                                  {ks.code || ks.number} - {ks.name}
                                </option>
                              ))
                            )}
                            <option value="NEW">+ Neue Kostenstelle anlegen</option>
                          </select>
                          <label
                            htmlFor="kostenstelle"
                            className="absolute -top-2 left-3 px-1 bg-white text-xs font-medium text-gray-700"
                          >
                            Kostenstelle
                          </label>
                        </div>

                        {/* Neue Kostenstelle Input */}
                        {showNewKostenstelleInput && (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newKostenstelle}
                              onChange={e => setNewKostenstelle(e.target.value)}
                              placeholder="Name der neuen Kostenstelle"
                              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] transition-colors"
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  saveNewKostenstelle();
                                } else if (e.key === 'Escape') {
                                  setShowNewKostenstelleInput(false);
                                  setNewKostenstelle('');
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={saveNewKostenstelle}
                              className="px-3 py-2 text-xs bg-[#14ad9f] text-white rounded-lg hover:bg-[#129488] transition-colors"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowNewKostenstelleInput(false);
                                setNewKostenstelle('');
                              }}
                              className="px-3 py-2 text-xs bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      <div className="relative">
                        <input
                          id="tags"
                          type="text"
                          placeholder="Tags hinzufügen"
                          className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] transition-colors bg-white"
                          onKeyDown={e => {
                            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                              const newTag = e.currentTarget.value.trim();
                              if (!formData.tags.includes(newTag)) {
                                handleInputChange('tags', [...formData.tags, newTag]);
                              }
                              e.currentTarget.value = '';
                            }
                          }}
                        />
                        <label
                          htmlFor="tags"
                          className="absolute -top-2 left-3 px-1 bg-white text-xs font-medium text-gray-700"
                        >
                          Tags
                        </label>
                        {/* Tags anzeigen */}
                        {formData.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {formData.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                              >
                                {tag}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newTags = formData.tags.filter((_, i) => i !== index);
                                    handleInputChange('tags', newTags);
                                  }}
                                  className="ml-1 h-3 w-3 rounded-full inline-flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Mehr anzeigen Button */}
                <div className="flex justify-center">
                  <button
                    onClick={() => setShowMoreDetails(!showMoreDetails)}
                    className="inline-flex items-center text-sm text-gray-600 hover:text-gray-800 font-medium"
                  >
                    <ChevronDown
                      className={`h-4 w-4 mr-1 transition-transform ${showMoreDetails ? 'rotate-180' : ''}`}
                    />
                    {showMoreDetails ? 'Weniger anzeigen' : 'Mehr anzeigen'}
                  </button>
                </div>
              </div>
            </div>

            {/* Buchhaltung Section */}
            <div className="bg-white">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Buchhaltung</h3>
              </div>

              {/* Kategorie mit intelligenter DATEV-Autocomplete + Gemini AI */}
              <div className="mb-6">
                <label className="flex items-center justify-between mb-2 text-sm font-medium text-gray-700">
                  <span>
                    Kategorie <span className="text-red-500">*</span>
                  </span>
                  {selectedCategory && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      🤖 AI-Vorschlag
                    </span>
                  )}
                </label>
                <CategoryAutocomplete
                  value={formData.kategorie}
                  onChange={value => handleInputChange('kategorie', value)}
                  onCategorySelect={handleCategorySelect}
                  onOpenAdvancedSearch={() => setShowCategoryModal(true)}
                  placeholder="Gemini AI analysiert automatisch Ihre Rechnung..."
                  required={true}
                />
                {selectedCategory && formData.kategorie && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 text-blue-400">
                        <Info className="h-4 w-4" />
                      </div>
                      <div className="text-sm text-blue-800">
                        <p className="font-medium">Gemini AI Kategorisierung</p>
                        <p className="text-blue-600 mt-1">
                          Diese Kategorie wurde automatisch basierend auf dem Rechnungsinhalt
                          vorgeschlagen. Sie können sie jederzeit ändern.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Betrag Section - 2-spaltiges horizontales Grid */}
              <div className="grid grid-cols-2 gap-12">
                {/* Betrag (Brutto) mit Netto-Button */}
                <div>
                  <label className="flex items-center justify-between mb-2 text-sm font-medium text-gray-700">
                    <span>
                      Betrag{' '}
                      <span className="text-gray-500">({isNettoMode ? 'Netto' : 'Brutto'})</span>{' '}
                      <span className="text-red-500">*</span>
                    </span>
                    <button
                      onClick={() => setIsNettoMode(!isNettoMode)}
                      className={`text-sm font-normal ${isNettoMode ? 'text-gray-600' : 'text-[#14ad9f] hover:text-[#129488]'}`}
                      type="button"
                    >
                      {isNettoMode ? 'Brutto' : 'Netto'}
                    </button>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={isNettoMode ? formData.nettobetrag : formData.betrag}
                      onChange={e => {
                        if (isNettoMode) {
                          handleInputChange('nettobetrag', e.target.value);
                          // Berechne Bruttobetrag automatisch
                          const netto = parseFloat(e.target.value.replace(',', '.')) || 0;
                          const taxRate = parseFloat(formData.umsatzsteuer) / 100;
                          const brutto = netto * (1 + taxRate);
                          handleInputChange('betrag', brutto.toFixed(2).replace('.', ','));
                        } else {
                          handleInputChange('betrag', e.target.value);
                          // Berechne Nettobetrag automatisch
                          const brutto = parseFloat(e.target.value.replace(',', '.')) || 0;
                          const taxRate = parseFloat(formData.umsatzsteuer) / 100;
                          const netto = brutto / (1 + taxRate);
                          handleInputChange('nettobetrag', netto.toFixed(2).replace('.', ','));
                        }
                      }}
                      placeholder="0,00"
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] transition-colors bg-white text-right"
                      required
                    />
                    <select
                      value={formData.waehrung}
                      onChange={e => handleInputChange('waehrung', e.target.value)}
                      className="w-20 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] transition-colors bg-white"
                    >
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>

                {/* Umsatzsteuer */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Umsatzsteuer
                  </label>
                  <div className="relative">
                    <select
                      value={formData.umsatzsteuer}
                      onChange={e => handleInputChange('umsatzsteuer', e.target.value)}
                      className="w-full px-3 py-2 pr-8 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] transition-colors bg-white appearance-none"
                    >
                      <option value="19">19 %</option>
                      <option value="7">7 %</option>
                      <option value="0">0 %</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Position hinzufügen Button */}
              <div className="mt-6">
                <button className="inline-flex items-center text-sm text-[#14ad9f] hover:text-[#129488]">
                  <Plus className="h-4 w-4 mr-1" />
                  Position hinzufügen
                </button>
              </div>

              {/* Beschreibung - Separate Sektion */}
              <div className="mt-6">
                <label className="block mb-2 text-sm font-medium text-gray-700">Beschreibung</label>
                <input
                  type="text"
                  value={formData.beschreibung}
                  onChange={e => handleInputChange('beschreibung', e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] transition-colors bg-white"
                />
              </div>

              {/* Umsatzsteuer Section mit Tax Rules */}
              <div className="mt-8">
                <div className="mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">Umsatzsteuer</h4>
                </div>
                <div className="relative">
                  <select
                    value={formData.taxRule}
                    onChange={e => handleInputChange('taxRule', e.target.value as TaxRuleType)}
                    className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] transition-colors bg-white"
                  >
                    <option value="">Erstattung der Umsatzsteuer auswählen</option>
                    {TAX_RULES.map(rule => (
                      <option key={rule.id} value={rule.id}>
                        {rule.name} ({rule.taxRate}%) - {rule.legalBasis}
                      </option>
                    ))}
                  </select>
                  <label className="absolute -top-2 left-3 px-1 bg-white text-xs font-medium text-gray-700">
                    Erstattung der Umsatzsteuer
                  </label>
                  <button className="absolute -top-2 right-3 px-1 bg-white text-xs text-[#14ad9f] hover:text-[#129488]">
                    Hilfe
                  </button>
                </div>
              </div>

              {/* Totals - Moderne Berechnung */}
              <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Gesamt Netto</span>
                    <span className="font-medium text-gray-900">{calculateNetto()}&nbsp;€</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Umsatzsteuer {formData.umsatzsteuer}%</span>
                    <span className="font-medium text-gray-900">{calculateTax()}&nbsp;€</span>
                  </div>
                  <hr className="border-gray-200" />
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-gray-900">Gesamt</span>
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <Info className="h-4 w-4 text-gray-400" />
                      </button>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-semibold text-gray-900">
                        {calculateBrutto()}&nbsp;€
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Selection Modal */}
      <CategorySelectionModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onSelect={handleModalCategorySelect}
        selectedCategory={selectedCategory}
        companyUid={uid}
        transactionType={transactionType}
      />
    </div>
  );
}
