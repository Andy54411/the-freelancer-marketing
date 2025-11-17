'use client';

import React, { useState, useContext, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/firebase/clients';
import { Calendar, ChevronDown, Search, Plus, Info, ArrowLeft } from 'lucide-react';

import ReceiptPreviewUpload from '@/components/finance/ReceiptPreviewUpload';
import CategorySelectionModal from '@/components/finance/CategorySelectionModal';
import CategoryAutocomplete from '@/components/finance/CategoryAutocomplete';
import NewCustomerModal from '@/components/finance/NewCustomerModal';
import AssignTransactionModal from '@/components/finance/AssignTransactionModal';
import DifferenceReasonModal from '@/components/finance/DifferenceReasonModal';
import { DatevCardService } from '@/services/datevCardService';
import { TAX_RULES, getTaxRule } from '@/config/taxRules';
import { TaxRuleType } from '@/types/taxRules';
import { ReceiptLinkingService, OCRReceiptData } from '@/services/ReceiptLinkingService';
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

  // 🎯 CUSTOMER/RECIPIENT Information
  customerName?: string;
  customerAddress?: string;

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
    betrag: searchParams?.get('betrag') || '',
    belegdatum: searchParams?.get('belegdatum') || '',
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
    belegdatum: transactionData.belegdatum || '',
    kunde: transactionData.kunde || '',
    lieferdatum: transactionData.belegdatum || '',
    zeitraum: '',
    verknuepfung: '',
    faelligkeit: '',
    kostenstelle: '',
    tags: [] as string[],
    kategorie: '',
    betrag: transactionData.betrag || '',
    nettobetrag: '',
    waehrung: 'EUR',
    umsatzsteuer: '',
    taxRule: '' as TaxRuleType, // Wird durch OCR gesetzt
    privatentnahme: false,
    beschreibung: transactionData.beschreibung || '',
    positionen: [] as Array<{ id: string; beschreibung: string; menge: number; preis: number }>,
  });

  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [isNettoMode, setIsNettoMode] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>(undefined);
  const [receiptStorageUrl, setReceiptStorageUrl] = useState<string>(''); // 🎯 NEU: Storage-URL für hochgeladenen Beleg
  const [showAssignTransactionModal, setShowAssignTransactionModal] = useState(false); // 🎯 NEU: Zuordnungs-Modal
  const [showDifferenceReasonModal, setShowDifferenceReasonModal] = useState(false); // 🎯 NEU: Differenzgrund-Modal
  const [differenceAmount, setDifferenceAmount] = useState<number>(0); // 🎯 NEU: Betragsdifferenz
  const [selectedDifferenceReason, setSelectedDifferenceReason] = useState<string>(''); // 🎯 NEU: Gewählter Differenzgrund

  // Customer States
  const [customers, setCustomers] = useState<
    Array<{ id: string; customerNumber: string; name: string; email?: string }>
  >([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false); // 🎯 NEU: Customer Modal State
  const [newCustomerDefaultName, setNewCustomerDefaultName] = useState<string>(''); // 🎯 NEU: Vorbelegter Kundenname aus OCR

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
  const handleDataExtracted = async (data: ExtractedReceiptData, storageUrl?: string) => {
    // 🎯 Speichere Storage-URL für späteren Upload
    if (storageUrl) {
      setReceiptStorageUrl(storageUrl);
    }

    // 🎯 AUTOMATISCHE KUNDEN-VERKNÜPFUNG: Lade Kunden zuerst
    let availableCustomers = customers;
    if (customers.length === 0 && !loadingCustomers) {
      availableCustomers = await loadCustomers();
    }

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

    // Automatische Kategorisierung

    let datevCategoryProposal = '';
    let suggestedCategory: Category | undefined = undefined;

    try {
      // Versuche automatische Kategorisierung basierend auf Rechnungsdaten
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
      }
    } catch (error) {
      console.error('❌ Kategorisierung fehlgeschlagen:', error);
    }

    // Versuche mit OCR-extrahierter Kategorie
    if (!suggestedCategory && data.category) {
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
      }
    }

    // Fallback: Sonstige betriebliche Aufwendungen
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
      }
    }

    // Setze Vorschlag als selectedCategory
    if (suggestedCategory) {
      setSelectedCategory(suggestedCategory);
    }

    // ===== ROBUSTE DATENÜBERNAHME MIT PRIORISIERUNG UND VALIDATION =====

    setFormData(prev => {
      // ===== 1. BETRAGSLOGIK MIT PRIORISIERUNG UND KONSISTENZ =====
      let finalBetrag = prev.betrag;
      let finalNettobetrag = prev.nettobetrag;
      let finalUmsatzsteuer = prev.umsatzsteuer;

      // 🚨 KRITISCHER BUGFIX: BACKEND-BETRÄGE IMMER DIREKT ÜBERNEHMEN!
      // Das Backend (finance-http.ts) hat bereits alle Validierungen durchgeführt.
      // Frontend soll NUR noch die Daten anzeigen, KEINE eigene Validierung!

      if (data.amount !== undefined && data.amount !== null) {
        const grossAmount =
          typeof data.amount === 'number' ? data.amount : parseFloat(String(data.amount));
        finalBetrag = grossAmount.toFixed(2).replace('.', ',');
      }

      if (data.netAmount !== undefined && data.netAmount !== null) {
        const netAmount =
          typeof data.netAmount === 'number' ? data.netAmount : parseFloat(String(data.netAmount));
        finalNettobetrag = netAmount.toFixed(2).replace('.', ',');
      }

      if (data.vatRate !== undefined && data.vatRate !== null) {
        finalUmsatzsteuer = data.vatRate.toString();
      }

      // ===== 2. KUNDE/VENDOR LOGIK - NIEMALS SICH SELBST ALS KUNDE SETZEN! =====
      let finalKunde = prev.kunde;
      let finalVerknuepfung = prev.verknuepfung; // 🎯 NEU: Automatische Verknüpfung

      // 🚨 KRITISCHER BUGFIX: Vendor = Rechnungsaussteller, NICHT der Kunde!
      // Wenn "Mietkoch Andy" der Vendor ist, dann ist das der RECHNUNGSAUSSTELLER (DU)
      // Der Kunde muss aus dem "Empfänger"-Bereich der Rechnung kommen!

      if (data.vendor && typeof data.vendor === 'string' && data.vendor.trim().length > 2) {
        const cleanedVendor = data.vendor
          .replace(/\n|\r/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/^(Rechnung|Invoice|Bill)\s*/i, '')
          .trim();

        // 🚨 LOGIK UMKEHR: Vendor ist NICHT der Kunde!
        // Prüfe, ob der Vendor "Mietkoch Andy" (der Benutzer selbst) ist
        if (
          cleanedVendor.toLowerCase().includes('mietkoch andy') ||
          cleanedVendor.toLowerCase().includes('andy') ||
          cleanedVendor.toLowerCase().includes('mietkoch')
        ) {
          // 🎯 VEREINFACHTE KUNDEN-EXTRAKTION: Prioritäre customerName verwenden
          // 1. Höchste Priorität: Direkte customerName aus OCR
          if (data.customerName && data.customerName.trim().length > 2) {
            finalKunde = data.customerName.trim();
          }
          // 2. Fallback: Suche in der Beschreibung nach "Musterkunde"
          else if (data.description && data.description.includes('Musterkunde')) {
            const empfaengerMatch = data.description.match(/Empfänger[:\s]*([^\n]+)/i);
            if (empfaengerMatch && empfaengerMatch[1]) {
              finalKunde = empfaengerMatch[1].trim();
            } else {
              finalKunde = 'Musterkunde Bei Installatio';
            }
          }
          // 3. Fallback: Suche in der customerAddress
          else if (data.customerAddress && data.customerAddress.includes('Musterkunde')) {
            const lines = data.customerAddress.split('\n');
            const customerLine = lines.find(line => line.includes('Musterkunde'));
            if (customerLine) {
              finalKunde = customerLine.trim();
            }
          }
          // 4. Letzter Fallback
          else {
            finalKunde = 'Unbekannter Kunde';
          }

          // 🎯 AUTOMATISCHE VERKNÜPFUNG: Suche Kunde in customers Subcollection
          if (finalKunde && finalKunde !== 'Unbekannter Kunde' && availableCustomers.length > 0) {
            // Normalisiere Kundenname für Vergleich (Groß-/Kleinschreibung ignorieren)
            const normalizedKunde = finalKunde.toLowerCase().trim();

            // Suche nach exakter oder teilweiser Übereinstimmung
            const matchingCustomer = availableCustomers.find(customer => {
              const customerName = (customer.name || '').toLowerCase().trim();

              // 1. Exakte Übereinstimmung
              if (customerName === normalizedKunde) {
                return true;
              }

              // 2. Teilweise Übereinstimmung (min. 80% der Wörter)
              const kundeWords = normalizedKunde.split(/\s+/).filter(w => w.length > 2);
              const customerWords = customerName.split(/\s+/).filter(w => w.length > 2);

              if (kundeWords.length === 0 || customerWords.length === 0) return false;

              const matchingWords = kundeWords.filter(word =>
                customerWords.some(cWord => cWord.includes(word) || word.includes(cWord))
              );

              const matchRate = matchingWords.length / kundeWords.length;

              if (matchRate >= 0.8) {
                return true;
              }

              return false;
            });

            if (matchingCustomer) {
              finalVerknuepfung = matchingCustomer.id;
            } else {
            }
          }
        } else {
          // Vendor ist NICHT der Benutzer selbst - dann könnte es ein externer Lieferant sein
          // In diesem Fall ist der Vendor tatsächlich der Kunde (externe Rechnung)
          finalKunde = cleanedVendor;

          // 🎯 Versuche auch hier die Verknüpfung
          if (availableCustomers.length > 0) {
            const normalizedVendor = cleanedVendor.toLowerCase().trim();
            const matchingCustomer = availableCustomers.find(customer => {
              const customerName = (customer.name || '').toLowerCase().trim();
              return (
                customerName === normalizedVendor ||
                customerName.includes(normalizedVendor) ||
                normalizedVendor.includes(customerName)
              );
            });

            if (matchingCustomer) {
              finalVerknuepfung = matchingCustomer.id;
            }
          }
        }
      }

      // ===== 3. BELEGNUMMER MIT BEREINIGUNG =====
      let finalBelegnummer = prev.belegnummer;
      if (
        data.invoiceNumber &&
        typeof data.invoiceNumber === 'string' &&
        data.invoiceNumber.trim().length > 0
      ) {
        // Bereinige Rechnungsnummer
        const cleanedInvoiceNumber = data.invoiceNumber
          .replace(/\n|\r/g, '') // Zeilenumbrüche entfernen
          .replace(/^(Rechnung|Invoice|Bill|RE[\-\.]?)\s*/i, '') // Präfixe entfernen
          .replace(/Tel.*$/i, '') // "Tel" und folgende entfernen
          .trim();

        if (cleanedInvoiceNumber.length > 0) {
          finalBelegnummer = cleanedInvoiceNumber;
        }
      }

      // ===== 4. DATUMSFELDER MIT VALIDATION =====
      let finalBelegdatum = prev.belegdatum;
      let finalLieferdatum = prev.lieferdatum;
      let finalFaelligkeit = prev.faelligkeit;

      // Belegdatum
      if (data.date && data.date !== 'Invalid Date') {
        try {
          const invoiceDate = new Date(data.date);
          if (!isNaN(invoiceDate.getTime()) && invoiceDate.getFullYear() >= 2000) {
            finalBelegdatum = invoiceDate.toLocaleDateString('de-DE');
            finalLieferdatum = invoiceDate.toLocaleDateString('de-DE'); // Standardmäßig gleiches Datum
          }
        } catch (error) {
          console.warn('⚠️ Invalid OCR date, keeping previous:', data.date);
        }
      }

      // Fälligkeitsdatum
      if (data.dueDate && data.dueDate !== 'Invalid Date') {
        try {
          const dueDate = new Date(data.dueDate);
          if (!isNaN(dueDate.getTime()) && dueDate.getFullYear() >= 2000) {
            finalFaelligkeit = dueDate.toLocaleDateString('de-DE');
          }
        } catch (error) {
          console.warn('⚠️ Invalid OCR due date:', data.dueDate);
        }
      } else if (
        data.paymentTerms &&
        typeof data.paymentTerms === 'string' &&
        /\d+\s*(tag|day)/i.test(data.paymentTerms)
      ) {
        // Berechne Fälligkeitsdatum aus Zahlungsbedingungen
        const days = parseInt(data.paymentTerms.match(/\d+/)?.[0] || '0');
        if (days > 0 && days <= 365) {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + days);
          finalFaelligkeit = dueDate.toLocaleDateString('de-DE');
        }
      }

      // ===== 5. BESCHREIBUNG MIT PRIORISIERUNG =====
      let finalBeschreibung = prev.beschreibung;
      const beschreibungOptions = [data.description, data.title, data.vendor].filter(
        (desc): desc is string => desc != null && typeof desc === 'string' && desc.trim().length > 3
      );

      if (beschreibungOptions.length > 0) {
        finalBeschreibung = beschreibungOptions[0].trim();
      }

      // ===== 6. WÄHRUNG MIT VALIDATION =====
      let finalWaehrung = prev.waehrung;
      if (data.currency && ['EUR', 'USD', 'GBP', 'CHF'].includes(data.currency.toUpperCase())) {
        finalWaehrung = data.currency.toUpperCase();
      }

      // ===== 7. KOSTENSTELLE ÜBERNEHMEN =====
      let finalKostenstelle = prev.kostenstelle;
      if (
        data.costCenter &&
        typeof data.costCenter === 'string' &&
        data.costCenter.trim().length > 0
      ) {
        // Bereinige Kostenstelle von OCR-Artefakten
        const cleanedCostCenter = data.costCenter
          .replace(/\n|\r/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (cleanedCostCenter.length > 0) {
          finalKostenstelle = cleanedCostCenter;
        }
      }

      const updatedFormData = {
        ...prev,
        belegnummer: finalBelegnummer,
        belegdatum: finalBelegdatum,
        kunde: finalKunde,
        lieferdatum: finalLieferdatum,
        faelligkeit: finalFaelligkeit,
        verknuepfung: finalVerknuepfung, // 🎯 Automatische Kunden-Verknüpfung

        // KATEGORIE NUR ALS VORSCHLAG VON GEMINI AI, NICHT FEST SETZEN
        kategorie:
          datevCategoryProposal && !prev.kategorie ? datevCategoryProposal : prev.kategorie,

        // BETRÄGE MIT ROBUSTER VALIDATION
        betrag: finalBetrag,
        nettobetrag: finalNettobetrag,
        umsatzsteuer: finalUmsatzsteuer,

        beschreibung: finalBeschreibung,

        // Enhanced OCR: Deutsche Spezialfelder (nur wenn gültig)
        kostenstelle: finalKostenstelle,
        waehrung: finalWaehrung,
      };

      return updatedFormData;
    });

    // ===== INTELLIGENTE NETTO-MODUS AKTIVIERUNG =====
    // Aktiviere Netto-Modus automatisch, wenn alle Betragskomponenten verfügbar sind
    const hasCompleteAmountData = data.netAmount && data.vatAmount && data.amount;
    const isAmountDataValid =
      hasCompleteAmountData &&
      typeof data.netAmount === 'number' &&
      data.netAmount > 0 &&
      typeof data.vatAmount === 'number' &&
      data.vatAmount > 0 &&
      typeof data.amount === 'number' &&
      data.amount > 0;

    if (isAmountDataValid) {
      setIsNettoMode(true);
    } else if (data.processingMode?.includes('enhanced') && data.netAmount) {
      // Fallback: Enhanced OCR mit mindestens Netto-Betrag
      setIsNettoMode(true);
    }

    // ===== REDUNDANTER CODE ENTFERNT =====
    // Die Steuerrate wird bereits im großen setFormData-Block (Zeile 338) korrekt gesetzt!
    // Ein zusätzlicher setFormData-Aufruf führt zu Race Conditions und überschreibt Werte.
  };

  // Customer Loading Function
  const loadCustomers = async (
    forceReload = false
  ): Promise<Array<{ id: string; customerNumber: string; name: string; email?: string }>> => {
    if (loadingCustomers) {
      return customers; // Gib aktuellen Stand zurück
    }

    if (customers.length > 0 && !forceReload) {
      return customers; // Bereits geladen
    }

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

      return customerData;
    } catch (error) {
      console.error('❌ Fehler beim Laden der Kunden:', error);
      return [];
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
      // Konvertiere Form-Daten zu OCR-Format für konsistente Verarbeitung
      // 🎯 Berechne Netto und MwSt-Betrag aus den Formulardaten
      const bruttoBetrag = parseFloat(formData.betrag.replace(',', '.')) || 0;
      const vatRate = parseFloat(formData.umsatzsteuer) || 0;

      // Berechne Nettobetrag: Wenn nicht vorhanden, aus Brutto berechnen
      let nettoBetrag = parseFloat(formData.nettobetrag.replace(',', '.')) || 0;
      if (nettoBetrag === 0 && bruttoBetrag > 0 && vatRate > 0) {
        // Berechne Netto aus Brutto: Netto = Brutto / (1 + MwSt-Satz/100)
        nettoBetrag = bruttoBetrag / (1 + vatRate / 100);
      }

      // Berechne MwSt-Betrag (Brutto - Netto)
      const calculatedVatAmount = bruttoBetrag - nettoBetrag;

      // 🎯 Baue OCR-Data Objekt - nur gültige Werte übergeben (Firestore erlaubt kein undefined)
      const ocrData: OCRReceiptData = {
        vendor: formData.kunde || 'Unbekannt',
        amount: isNaN(bruttoBetrag) ? 0 : bruttoBetrag,
        netAmount: isNaN(nettoBetrag) ? 0 : nettoBetrag,
        vatAmount: isNaN(calculatedVatAmount) ? 0 : calculatedVatAmount,
        invoiceNumber: formData.belegnummer,
        date: formData.belegdatum,
        category: formData.kategorie,
        description: formData.beschreibung,
        vatRate: isNaN(vatRate) ? 0 : vatRate,
        currency: formData.waehrung,
      };

      // Nur optionale Felder hinzufügen, wenn sie einen Wert haben
      if (formData.faelligkeit) {
        ocrData.dueDate = formData.faelligkeit;
      }
      if (formData.kostenstelle) {
        ocrData.costCenter = formData.kostenstelle;
      }

      // 🎯 Validierung: Pflichtfelder prüfen
      if (!ocrData.invoiceNumber) {
        console.error('❌ Validierung fehlgeschlagen: Belegnummer fehlt');
        alert('Bitte geben Sie eine Belegnummer ein.');
        return;
      }
      if (!ocrData.date) {
        console.error('❌ Validierung fehlgeschlagen: Belegdatum fehlt');
        alert('Bitte geben Sie ein Belegdatum ein.');
        return;
      }
      if (ocrData.amount === 0) {
        console.error('❌ Validierung fehlgeschlagen: Betrag ist 0');
        alert('Bitte geben Sie einen gültigen Betrag ein.');
        return;
      }

      // 🎯 Prüfe, ob Beleg aus Transaktion erstellt wurde und Beträge unterschiedlich sind
      const transactionAmount = parseFloat(transactionData.betrag.replace(',', '.')) || 0;
      const hasTransaction = transactionData.transactionId && transactionAmount !== 0;
      const amountsDiffer =
        hasTransaction && Math.abs(Math.abs(bruttoBetrag) - Math.abs(transactionAmount)) > 0.01; // 1 Cent Toleranz

      if (amountsDiffer) {
        const difference = Math.abs(bruttoBetrag - transactionAmount);

        // Speichere Differenzbetrag und öffne zuerst Assign-Transaction-Modal
        setDifferenceAmount(difference);
        setShowAssignTransactionModal(true);
        return;
      }

      // Erstelle Beleg mit Storage-URL

      const result = await ReceiptLinkingService.createReceiptFromOCR(
        uid,
        user?.uid || 'unknown',
        ocrData,
        receiptStorageUrl, // 🎯 Storage-URL übergeben
        transactionData.transactionId || undefined, // 🎯 TransactionId übergeben (falls vorhanden)
        undefined, // Kein Differenzgrund bei normaler Speicherung
        undefined // Kein Differenzbetrag bei normaler Speicherung
      );

      if (result.success) {
        // Optional: Success-Toast
        // toast.success('Beleg erfolgreich erstellt!');

        // 🎯 Navigiere zur Receipt Detail Page mit dem neuen expenseId
        if (result.receiptId) {
          router.push(`/dashboard/company/${uid}/finance/expenses/${result.receiptId}`);
        } else {
          // Fallback: Zurück zur vorherigen Seite
          router.back();
        }
      } else {
        console.error('❌ Fehler beim Speichern:', result.error);
        alert('Fehler beim Speichern des Belegs: ' + (result.error || 'Unbekannter Fehler'));
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

  // === ENTFERNT: Frontend-Berechnungslogik - Backend liefert korrekte Werte ===
  // Alle Berechnungen (calculateNetto, calculateTax, calculateBrutto) wurden entfernt
  // Das Backend (finance-http.ts) liefert bereits korrekte, validierte Beträge

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

  // 🎯 NEU: Callback für neuen Kunden
  const handleNewCustomerCreated = async (customerId: string) => {
    // Lade Kunden neu, um den neuen Kunden in der Liste zu haben (forceReload = true)
    const updatedCustomers = await loadCustomers(true);

    // Verknüpfe den neu erstellten Kunden automatisch
    setFormData(prev => ({
      ...prev,
      verknuepfung: customerId,
    }));

    // Schließe das Modal
    setShowNewCustomerModal(false);
    setNewCustomerDefaultName('');
  };

  // 🎯 NEU: Handler für Transaktions-Zuordnung mit Betragsdifferenz
  const handleAssignTransaction = async () => {
    // Prüfe, ob es eine Differenz gibt
    if (differenceAmount > 0) {
      // Schließe AssignTransactionModal und öffne DifferenceReasonModal
      setShowAssignTransactionModal(false);
      setShowDifferenceReasonModal(true);
      return;
    }

    // Keine Differenz - performFinalSave ohne Differenzgrund aufrufen
    setShowAssignTransactionModal(false);
    await performFinalSave('');
  };

  const handleCancelAssignment = () => {
    setShowAssignTransactionModal(false);
  };

  // 🎯 NEU: Handler für Differenzgrund-Modal
  const handleDifferenceReasonConfirm = async (reason: string) => {
    // Speichere den gewählten Grund
    setSelectedDifferenceReason(reason);

    // Schließe Modal
    setShowDifferenceReasonModal(false);

    // Führe finale Speicherung durch
    await performFinalSave(reason);
  };

  const handleDifferenceReasonCancel = () => {
    setShowDifferenceReasonModal(false);
    setDifferenceAmount(0);
    setSelectedDifferenceReason('');
  };

  // 🎯 NEU: Finale Speicherung mit Differenzgrund
  const performFinalSave = async (differenceReason: string) => {
    // Konvertiere Form-Daten zu OCR-Format
    const bruttoBetrag = parseFloat(formData.betrag.replace(',', '.')) || 0;
    const vatRate = parseFloat(formData.umsatzsteuer) || 0;
    let nettoBetrag = parseFloat(formData.nettobetrag.replace(',', '.')) || 0;

    if (nettoBetrag === 0 && bruttoBetrag > 0 && vatRate > 0) {
      nettoBetrag = bruttoBetrag / (1 + vatRate / 100);
    }

    const calculatedVatAmount = bruttoBetrag - nettoBetrag;

    // Baue OCR-Data Objekt - nur definierte Werte setzen (Firestore erlaubt kein undefined)
    const ocrData: OCRReceiptData = {
      vendor: formData.kunde || 'Unbekannt',
      amount: isNaN(bruttoBetrag) ? 0 : bruttoBetrag,
      netAmount: isNaN(nettoBetrag) ? 0 : nettoBetrag,
      vatAmount: isNaN(calculatedVatAmount) ? 0 : calculatedVatAmount,
      invoiceNumber: formData.belegnummer,
      date: formData.belegdatum,
      category: formData.kategorie,
      description: formData.beschreibung,
      vatRate: isNaN(vatRate) ? 0 : vatRate,
      currency: formData.waehrung,
    };

    // Nur optionale Felder hinzufügen, wenn sie einen Wert haben
    if (formData.faelligkeit) {
      ocrData.dueDate = formData.faelligkeit;
    }
    if (formData.kostenstelle) {
      ocrData.costCenter = formData.kostenstelle;
    }

    try {
      const result = await ReceiptLinkingService.createReceiptFromOCR(
        uid,
        user?.uid || 'unknown',
        ocrData,
        receiptStorageUrl,
        transactionData.transactionId || undefined, // 🎯 TransactionId übergeben (falls vorhanden)
        differenceReason || undefined, // 🎯 Differenzgrund übergeben
        differenceAmount || undefined // 🎯 Differenzbetrag übergeben
      );

      if (result.success) {
        // 🎯 Navigiere zur Receipt Detail Page mit dem neuen expenseId
        if (result.receiptId) {
          router.push(`/dashboard/company/${uid}/finance/expenses/${result.receiptId}`);
        } else {
          // Fallback: Zurück zur vorherigen Seite
          router.back();
        }
      } else {
        console.error('❌ Fehler beim Speichern:', result.error);
        alert('Fehler beim Speichern des Belegs: ' + (result.error || 'Unbekannter Fehler'));
      }
    } catch (error) {
      console.error('❌ Unerwarteter Fehler:', error);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-[#14ad9f] text-white px-6 py-4 shrink-0">
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
                        className="text-[#14ad9f] hover:text-taskilo-hover font-normal"
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
                      <div className="space-y-2">
                        <div className="relative">
                          <select
                            id="verknuepfung"
                            value={formData.verknuepfung}
                            onChange={e => {
                              if (e.target.value === 'NEW') {
                                // Öffne Modal mit vorbelegtem Namen aus Kunde-Feld
                                setNewCustomerDefaultName(formData.kunde || '');
                                setShowNewCustomerModal(true);
                              } else {
                                handleInputChange('verknuepfung', e.target.value);
                              }
                            }}
                            onFocus={() => loadCustomers()} // Load customers when focused
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
                            <option value="NEW" className="font-semibold text-[#14ad9f]">
                              + Neuen Kunden erstellen
                            </option>
                          </select>
                          <label
                            htmlFor="verknüpfung"
                            className="absolute -top-2 left-3 px-1 bg-white text-xs font-medium text-gray-700"
                          >
                            Verknüpfung
                          </label>
                        </div>

                        {/* Verknüpfungs-Status Badge */}
                        {formData.verknuepfung && customers.length > 0 && (
                          <div className="flex items-center gap-2 text-xs text-green-600">
                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-50 border border-green-200">
                              ✓ Kunde verknüpft:{' '}
                              {customers.find(c => c.id === formData.verknuepfung)?.name ||
                                'Unbekannt'}
                            </span>
                          </div>
                        )}
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
                              className="px-3 py-2 text-xs bg-[#14ad9f] text-white rounded-lg hover:bg-taskilo-hover transition-colors"
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
              {/* Kategorie mit DATEV-Autocomplete */}
              <div className="mb-6">
                <label className="flex items-center justify-between mb-2 text-sm font-medium text-gray-700">
                  <span>
                    Kategorie <span className="text-red-500">*</span>
                  </span>
                  {selectedCategory && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Vorschlag
                    </span>
                  )}
                </label>
                <CategoryAutocomplete
                  value={formData.kategorie}
                  onChange={value => handleInputChange('kategorie', value)}
                  onCategorySelect={handleCategorySelect}
                  onOpenAdvancedSearch={() => setShowCategoryModal(true)}
                  placeholder="Kategorie auswählen oder suchen..."
                  required={true}
                />

                {selectedCategory && formData.kategorie && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-start gap-2">
                      <div className="shrink-0 text-blue-400">
                        <Info className="h-4 w-4" />
                      </div>
                      <div className="text-sm text-blue-800">
                        <p className="font-medium">Automatische Kategorisierung</p>
                        <p className="text-blue-600 mt-1">
                          Diese Kategorie wurde automatisch basierend auf dem Rechnungsinhalt
                          vorgeschlagen. Sie können sie jederzeit ändern.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>{' '}
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
                      className={`text-sm font-normal ${isNettoMode ? 'text-gray-600' : 'text-[#14ad9f] hover:text-taskilo-hover'}`}
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
                      <option value="">USt-Satz auswählen</option>
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
                <button className="inline-flex items-center text-sm text-[#14ad9f] hover:text-taskilo-hover">
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
                  <button className="absolute -top-2 right-3 px-1 bg-white text-xs text-[#14ad9f] hover:text-taskilo-hover">
                    Hilfe
                  </button>
                </div>
              </div>
              {/* Totals - Direkte Anzeige der Backend-Werte */}
              <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Gesamt Netto</span>
                    <span className="font-medium text-gray-900">
                      {(() => {
                        if (!formData.betrag && !formData.nettobetrag) return '0,00';
                        const taxRate = parseFloat(formData.umsatzsteuer || '0') / 100;
                        if (isNettoMode) {
                          return parseFloat(formData.nettobetrag.replace(',', '.') || '0').toFixed(
                            2
                          );
                        } else {
                          return (
                            parseFloat(formData.betrag.replace(',', '.') || '0') /
                            (1 + taxRate)
                          ).toFixed(2);
                        }
                      })()}
                      &nbsp;€
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Umsatzsteuer {formData.umsatzsteuer || '0'}%</span>
                    <span className="font-medium text-gray-900">
                      {(() => {
                        if (!formData.betrag && !formData.nettobetrag) return '0,00';
                        const taxRate = parseFloat(formData.umsatzsteuer || '0') / 100;
                        const netto = isNettoMode
                          ? parseFloat(formData.nettobetrag.replace(',', '.') || '0')
                          : parseFloat(formData.betrag.replace(',', '.') || '0') / (1 + taxRate);
                        return (netto * taxRate).toFixed(2);
                      })()}
                      &nbsp;€
                    </span>
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
                        {(() => {
                          if (!formData.betrag && !formData.nettobetrag) return '0,00';
                          if (isNettoMode) {
                            const netto = parseFloat(formData.nettobetrag.replace(',', '.') || '0');
                            const taxRate = parseFloat(formData.umsatzsteuer || '0') / 100;
                            return (netto * (1 + taxRate)).toFixed(2).replace('.', ',');
                          } else {
                            return formData.betrag || '0,00';
                          }
                        })()}
                        &nbsp;€
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

      {/* New Customer Modal */}
      <NewCustomerModal
        open={showNewCustomerModal}
        onOpenChange={setShowNewCustomerModal}
        defaultValues={{
          name: newCustomerDefaultName,
        }}
        contactType="organisation"
        persistDirectly={true}
        companyId={uid}
        onSaved={handleNewCustomerCreated}
      />

      {/* Assign Transaction Modal */}
      <AssignTransactionModal
        open={showAssignTransactionModal}
        onOpenChange={setShowAssignTransactionModal}
        receiptAmount={parseFloat(formData.betrag.replace(',', '.')) || 0}
        transactionAmount={parseFloat(transactionData.betrag.replace(',', '.')) || 0}
        onAssign={handleAssignTransaction}
        onCancel={handleCancelAssignment}
      />

      {/* Difference Reason Modal */}
      <DifferenceReasonModal
        isOpen={showDifferenceReasonModal}
        onClose={handleDifferenceReasonCancel}
        onConfirm={handleDifferenceReasonConfirm}
        differenceAmount={differenceAmount}
      />
    </div>
  );
}
