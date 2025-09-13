'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import FooterTextEditor from '@/components/finance/FooterTextEditor';
import InventorySelector from '@/components/quotes/InventorySelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calculator,
  Save,
  FileText,
  User,
  X,
  Loader2,
  Info,
  ChevronDown,
  Eye,
  Mail,
  Printer,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { QuoteService, Quote as QuoteType, QuoteItem } from '@/services/quoteService';
import { getAllCurrencies } from '@/data/currencies';
import { getCustomers } from '@/utils/api/companyApi';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ProfessionalBusinessQuoteTemplate } from '@/components/templates/quote-templates';
type PreviewTemplateData = {
  quoteNumber: string;
  date: string;
  validUntil?: string;
  title?: string;
  reference?: string;
  currency?: string;
  taxRule?: string;
  taxRuleLabel?: string;
  customerName: string;
  customerAddress?: string;
  customerEmail?: string;
  companyName?: string;
  companyAddress?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyWebsite?: string;
  companyLogo?: string;
  profilePictureURL?: string;
  companyVatId?: string;
  companyTaxNumber?: string;
  items: Array<{
    id?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    taxRate?: number;
    category?: string;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  vatRate?: number;
  isSmallBusiness?: boolean;
  bankDetails?: {
    iban?: string;
    bic?: string;
    bankName?: string;
    accountHolder?: string;
  };
  notes?: string;
  headTextHtml?: string;
  footerText?: string;
  contactPersonName?: string;
};
import { db } from '@/firebase/clients';
import { doc, getDoc } from 'firebase/firestore';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { Switch } from '@/components/ui/switch';
import { InventoryService } from '@/services/inventoryService';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import NewProductModal, { NewProductValues } from '@/components/inventory/NewProductModal';
import NewCustomerModal from '@/components/finance/NewCustomerModal';

interface Customer {
  id: string;
  customerNumber?: string;
  name: string;
  email: string;
  phone?: string;
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

export default function CreateQuotePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';
  const { settings } = useCompanySettings(uid);

  // UI state
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [showNet, setShowNet] = useState(true);
  const [taxRate, setTaxRate] = useState(19);
  const [showDetailedOptions, setShowDetailedOptions] = useState(false);
  const [taxDEOpen, setTaxDEOpen] = useState(true);
  const [taxEUOpen, setTaxEUOpen] = useState(false);
  const [taxNonEUOpen, setTaxNonEUOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [company, setCompany] = useState<any | null>(null);
  // E-Mail Versand UI
  const [emailCardOpen, setEmailCardOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailAttachmentB64, setEmailAttachmentB64] = useState<string | null>(null);
  const [emailAttachmentName, setEmailAttachmentName] = useState<string>('Angebot.pdf');
  const [emailAttachmentReady, setEmailAttachmentReady] = useState<boolean>(false);
  const [emailAttachmentError, setEmailAttachmentError] = useState<string | null>(null);
  // On-demand PDF creation
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfSizeBytes, setPdfSizeBytes] = useState<number | null>(null);
  const [creatingPdf, setCreatingPdf] = useState<boolean>(false);

  // PDF Hidden Container Ref
  const pdfContainerRef = useRef<HTMLDivElement | null>(null);

  // Produkt-anlegen Prompt/Modal State
  const [dismissedCreatePromptIds, setDismissedCreatePromptIds] = useState<Set<string>>(new Set());
  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [createProductForIndex, setCreateProductForIndex] = useState<number | null>(null);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState<NewProductValues>({
    name: '',
    imageUrl: '',
    sku: '',
    category: 'Artikel',
    unit: 'Stk',
    stock: 0,
    taxRate: 19,
    purchaseNet: 0,
    purchaseGross: 0,
    sellingNet: 0,
    sellingGross: 0,
    description: '',
    internalNote: '',
  });

  // Kunden-anlegen Modal State
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [showCustomerSearchPopup, setShowCustomerSearchPopup] = useState(false);

  // Sync Preisfelder Netto/Brutto
  const syncGrossFromNet = (net: number, rate: number) =>
    Number.isFinite(net) ? net * (1 + Math.max(0, rate) / 100) : 0;
  const syncNetFromGross = (gross: number, rate: number) =>
    Number.isFinite(gross) ? gross / (1 + Math.max(0, rate) / 100) : 0;

  // Popover-Open-Status pro Zeile und Debounce-Timer pro Item
  const itemsRef = useRef<QuoteItem[]>([]);
  const [popoverOpenIds, setPopoverOpenIds] = useState<Set<string>>(new Set());
  const popoverTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Debounced onChange für Beschreibung
  const handleDescriptionChange = (index: number, id: string, value: string) => {
    handleItemChange(index, 'description', value);
    const timers = popoverTimersRef.current;
    const existing = timers.get(id);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => {
      const list = itemsRef.current;
      const current = list.find(i => i.id === id);
      const shouldOpen =
        Boolean(current) &&
        current!.category !== 'discount' &&
        Boolean((current!.description || '').trim()) &&
        !current!.inventoryItemId &&
        !dismissedCreatePromptIds.has(id) &&
        !createProductOpen;
      setPopoverOpenIds(prev => {
        const next = new Set(prev);
        if (shouldOpen) next.add(id);
        else next.delete(id);
        return next;
      });

      // Auto-Mapping aus Inventar: Wenn Beschreibung wie Name oder SKU passt, Produktdaten übernehmen
      (async () => {
        try {
          const row = itemsRef.current.find(i => i.id === id);
          if (!row || row.inventoryItemId) return;
          const term = (row.description || '').trim();
          if (!term || term.length < 2) return;
          const results = await InventoryService.findInventoryItems(uid, term);
          if (!results || results.length === 0) return;
          const lower = term.toLowerCase();
          const exactSku = results.find(r => (r.sku || '').toLowerCase() === lower);
          const exactName = results.find(r => (r.name || '').toLowerCase() === lower);
          const match = exactSku || exactName || (results.length === 1 ? results[0] : undefined);
          if (!match) return;
          setItems(prev =>
            prev.map((it, i) => {
              if (i !== index) return it;
              const unitPriceNet = Number(match.sellingPrice) || 0;
              const qty = Number.isFinite(it.quantity) ? it.quantity : 1;
              return {
                ...it,
                description: match.name || it.description,
                unit: match.unit || 'Stk',
                unitPrice: unitPriceNet,
                total: computeItemTotalNet(qty, unitPriceNet),
                inventoryItemId: match.id,
              };
            })
          );
          setPopoverOpenIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        } catch (_) {
          // ignoriere Fehler in der Auto-Suche
        }
      })();
    }, 100);
    timers.set(id, t);
  };

  // Konsistenz: Wenn Items/Modal/“dismissed” sich ändern, Popover neu bewerten
  useEffect(() => {
    setPopoverOpenIds(prev => {
      const next = new Set(prev);
      const list = itemsRef.current;
      for (const id of Array.from(prev)) {
        const current = list.find(i => i.id === id);
        const shouldOpen =
          Boolean(current) &&
          current!.category !== 'discount' &&
          Boolean((current!.description || '').trim()) &&
          !current!.inventoryItemId &&
          !dismissedCreatePromptIds.has(id) &&
          !createProductOpen;
        if (!shouldOpen) next.delete(id);
      }
      return next;
    });
  }, [dismissedCreatePromptIds, createProductOpen]);

  // Cleanup: ausstehende Timer beim Unmount löschen
  useEffect(() => {
    return () => {
      for (const t of popoverTimersRef.current.values()) clearTimeout(t);
      popoverTimersRef.current.clear();
    };
  }, []);

  // Kein automatisches Modal mehr – wir nutzen einen kleinen Popover unter dem Feld

  // Skonto-UI-State
  const [skontoEnabled, setSkontoEnabled] = useState<boolean>(false);
  const [skontoDays, setSkontoDays] = useState<number | undefined>(undefined);
  const [skontoPercentage, setSkontoPercentage] = useState<number | undefined>(undefined);
  const [skontoText, setSkontoText] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState({
    customerName: '',
    customerNumber: '',
    customerEmail: '',
    customerAddress: '',
    title: '',
    customerOrderNumber: '',
    validUntil: '',
    headTextHtml: '',
    footerText: '',
    notes: '',
    currency: 'EUR',
    internalContactPerson: '',
    deliveryTerms: '',
    paymentTerms: '',
    taxRule: 'DE_TAXABLE' as
      | 'DE_TAXABLE'
      | 'DE_EXEMPT_4_USTG'
      | 'DE_REVERSE_13B'
      | 'EU_REVERSE_18B'
      | 'EU_INTRACOMMUNITY_SUPPLY'
      | 'EU_OSS'
      | 'NON_EU_EXPORT'
      | 'NON_EU_OUT_OF_SCOPE',
  });

  // Items (Netto im State)
  const [items, setItems] = useState<QuoteItem[]>([
    {
      id:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2),
      description: 'Leistung',
      quantity: 1,
      unitPrice: 0,
      total: 0,
    },
  ]);

  // Halte itemsRef synchron, damit Debounce/Popover-Logik nicht vor Deklaration auf items zugreift
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Bei jeder Items-Änderung Popover-Entscheidungen neu evaluieren
  useEffect(() => {
    setPopoverOpenIds(prev => {
      const next = new Set(prev);
      for (const id of Array.from(prev)) {
        const current = items.find(i => i.id === id);
        const shouldOpen =
          Boolean(current) &&
          current!.category !== 'discount' &&
          Boolean((current!.description || '').trim()) &&
          !current!.inventoryItemId &&
          !dismissedCreatePromptIds.has(id) &&
          !createProductOpen;
        if (!shouldOpen) next.delete(id);
      }
      return next;
    });
  }, [items, dismissedCreatePromptIds, createProductOpen]);

  // Kunden laden
  useEffect(() => {
    const loadCustomers = async () => {
      if (!uid || !user || user.uid !== uid) return;
      try {
        setLoadingCustomers(true);
        const response = await getCustomers(uid);
        if (response.success && response.customers) {
          setCustomers(response.customers);
        }
      } catch (e) {
        toast.error('Fehler beim Laden der Kunden');
      } finally {
        setLoadingCustomers(false);
      }
    };
    loadCustomers();
  }, [uid, user]);

  // Popup schließen beim Klicken außerhalb
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showCustomerSearchPopup) {
        const target = event.target as Element;
        if (!target.closest('.customer-search-container')) {
          setShowCustomerSearchPopup(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCustomerSearchPopup]);

  // Firma laden (für Vorschau: Name, Adresse, Logo/Profilbild, Kontakt, Steuer/Bank)
  useEffect(() => {
    const loadCompany = async () => {
      if (!uid || !user || user.uid !== uid) return;
      try {
        const snap = await getDoc(doc(db, 'companies', uid));
        if (snap.exists()) setCompany(snap.data());
      } catch (e) {
        // still render, but without company info
      }
    };
    loadCompany();
  }, [uid, user]);

  // Steuerlogik aus der Auswahl ableiten (berücksichtigt Standard-Steuersatz aus Einstellungen)
  useEffect(() => {
    if (formData.taxRule === 'DE_TAXABLE') {
      const rate = settings?.defaultTaxRate ? parseInt(settings.defaultTaxRate, 10) : 19;
      setTaxRate(Number.isFinite(rate) ? rate : 19);
    } else {
      setTaxRate(0);
    }
  }, [formData.taxRule, settings?.defaultTaxRate]);

  // Defaults aus Unternehmenseinstellungen anwenden (einmalig, ohne Nutzereingaben zu überschreiben)
  useEffect(() => {
    if (!settings) return;

    // Preisanzeige (Netto/Brutto)
    setShowNet(settings.priceInput !== 'brutto');

    // Steuerregel aus USt-Status ableiten
    setFormData(prev => {
      const next = { ...prev };
      if (settings.ust === 'kleinunternehmer') {
        // Für Kleinunternehmer: keine USt -> sinnvolle Default-Regelung
        next.taxRule = 'DE_EXEMPT_4_USTG';
      } else {
        // Standardfall: steuerpflichtig in DE
        next.taxRule = prev.taxRule || 'DE_TAXABLE';
      }

      // Zahlungsbedingungen vorbelegen (nur Basis-Text; Skonto wird separat gesteuert)
      if (!prev.paymentTerms && settings.defaultPaymentTerms) {
        const d = settings.defaultPaymentTerms;
        const baseText = d.text || `Zahlbar binnen ${d.days} Tagen ohne Abzug`;
        next.paymentTerms = baseText;
      }

      // Währung vorbelegen (falls vorhanden und noch nicht bewusst geändert)
      if (prev.currency === 'EUR' && (company?.defaultCurrency as string)) {
        next.currency = company?.defaultCurrency as string;
      }

      return next;
    });
  }, [settings, company?.defaultCurrency]);

  // Skonto-Defaults aus Einstellungen übernehmen (separat, damit Basis-Text nicht dupliziert wird)
  useEffect(() => {
    if (!settings?.defaultPaymentTerms) return;
    const d = settings.defaultPaymentTerms as Record<string, unknown>;
    setSkontoEnabled(Boolean(d.skontoEnabled));
    setSkontoDays(
      typeof d.skontoDays === 'number'
        ? d.skontoDays
        : typeof d.days === 'number'
          ? d.days
          : undefined
    );
    setSkontoPercentage(typeof d.skontoPercentage === 'number' ? d.skontoPercentage : undefined);
    setSkontoText(typeof d.skontoText === 'string' ? d.skontoText : '');
  }, [settings?.defaultPaymentTerms]);

  // Währungen: alle ISO-4217 Codes mit lokalisierten Namen
  const allCurrencies = React.useMemo(() => getAllCurrencies('de-DE'), []);

  // Einheiten-Auswahl (analog zur gewünschten Liste)
  const UNIT_OPTIONS = React.useMemo(
    () => [
      { label: 'Stk', value: 'Stk' },
      { label: 'pauschal', value: 'pauschal' },
      { label: 'Std', value: 'Std' },
      { label: '%', value: '%' },
      { label: 'Tag(e)', value: 'Tag(e)' },
      // Hinweis: SelectItem darf keinen leeren value haben – 'none' dient als Platzhalter und wird auf '' gemappt
      { label: '—', value: 'none' },
      { label: 'm²', value: 'm²' },
      { label: 'm', value: 'm' },
      { label: 'kg', value: 'kg' },
      { label: 't', value: 't' },
      { label: 'lfm', value: 'lfm' },
      { label: 'm³', value: 'm³' },
      { label: 'km', value: 'km' },
      { label: 'L', value: 'L' },
    ],
    []
  );

  // Currency-Formatter
  const formatCurrency = (amount: number) => {
    try {
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: formData.currency || 'EUR',
      }).format(Number.isFinite(amount) ? amount : 0);
    } catch {
      return `${(Number.isFinite(amount) ? amount : 0).toFixed(2)} ${formData.currency || 'EUR'}`;
    }
  };

  // Datum als dd.mm.yyyy formatieren
  const formatDateDE = (d: Date | string | undefined): string => {
    if (!d) return '';
    try {
      const dateObj = typeof d === 'string' ? new Date(d) : d;
      if (Number.isNaN(dateObj.getTime())) return '';
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const yyyy = String(dateObj.getFullYear());
      return `${dd}.${mm}.${yyyy}`;
    } catch {
      return '';
    }
  };

  // Vorschau-Daten für das Template zusammenbauen
  const buildPreviewData = (): PreviewTemplateData => {
    const today = new Date();
    // Firmenname und -adresse aus companies-Collection, mit Fallbacks
    const companyName =
      (company?.companyName as string) ||
      (settings?.companyName as string) ||
      ((user as any)?.companyName as string) ||
      ((user as any)?.displayName as string) ||
      'Ihr Unternehmen';
    // Kontaktperson: interne Eingabe > Company-Kontakt > Vor-/Nachname > Firmenname
    const contactPersonNameForFooter =
      (formData.internalContactPerson || '').trim() ||
      (company?.contactPerson?.name as string) ||
      '' ||
      [company?.firstName, company?.lastName].filter(Boolean).join(' ') ||
      (companyName as string) ||
      undefined;
    const companyAddress = [
      [company?.companyStreet, company?.companyHouseNumber].filter(Boolean).join(' '),
      [company?.companyPostalCode, company?.companyCity].filter(Boolean).join(' '),
      company?.companyCountry,
    ]
      .filter(Boolean)
      .join('\n');

    // Kopf-Text (HTML) rudimentär in Text wandeln + weitere Metadaten als Bemerkungen bündeln
    const htmlToText = (html: string) =>
      (html || '')
        .replace(/<br\s*\/?>(\s*)/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&');
    const noteLines: string[] = [];
    // Kopf-Text und Referenz werden separat im Template angezeigt
    if (formData.deliveryTerms) noteLines.push(`Lieferbedingungen: ${formData.deliveryTerms}`);
    if (formData.paymentTerms) noteLines.push(`Zahlungsbedingungen: ${formData.paymentTerms}`);
    // Zahlungsbedingungen final zusammenbauen (Skonto separat anhängen, falls aktiv)
    // Skonto-Satz: Wenn Skonto aktiv ist, zuerst benutzerdefinierten Text nutzen; sonst Tage/%-Fallback
    let skontoSentence = '';
    if (skontoEnabled) {
      if (skontoText?.trim()) {
        skontoSentence = skontoText.trim();
      } else if (skontoDays && skontoPercentage) {
        skontoSentence = `Bei Zahlung binnen ${skontoDays} Tagen ${skontoPercentage}% Skonto`;
      }
    }
    const finalPaymentTerms = [formData.paymentTerms?.trim(), skontoSentence]
      .filter(Boolean)
      .join('\n\n');
    const previewNotes =
      [
        formData.deliveryTerms ? `Lieferbedingungen: ${formData.deliveryTerms}` : '',
        finalPaymentTerms ? `Zahlungsbedingungen: ${finalPaymentTerms}` : '',
      ]
        .filter(Boolean)
        .join('\n\n') || undefined;

    const taxRuleLabelMap: Record<string, string> = {
      DE_TAXABLE: 'Umsatzsteuerpflichtige Umsätze (DE, i. d. R. 19%)',
      DE_EXEMPT_4_USTG: 'Steuerfreie Umsätze §4 UStG',
      DE_REVERSE_13B: 'Reverse Charge gem. §13b UStG',
      EU_REVERSE_18B: 'Reverse Charge gem. §18b UStG (EU)',
      EU_INTRACOMMUNITY_SUPPLY: 'Innergemeinschaftliche Lieferungen (EU)',
      EU_OSS: 'OSS – One-Stop-Shop (EU)',
      NON_EU_EXPORT: 'Ausfuhren (Drittland)',
      NON_EU_OUT_OF_SCOPE: 'Nicht im Inland steuerbare Leistung (außerhalb EU)',
    };

    const data: PreviewTemplateData = {
      quoteNumber: 'Vorschau',
      date: formatDateDE(today),
      validUntil: formatDateDE(formData.validUntil),
      title: formData.title || undefined,
      reference: formData.customerOrderNumber || undefined,
      currency:
        formData.currency ||
        (company?.defaultCurrency as string) ||
        ((settings as any)?.defaultCurrency as string) ||
        'EUR',
      taxRule: formData.taxRule,
      taxRuleLabel: taxRuleLabelMap[formData.taxRule] || undefined,
      customerName: formData.customerName || 'Kunde',
      customerAddress: formData.customerAddress || '',
      customerEmail: formData.customerEmail || undefined,
      companyName,
      companyAddress,
      companyEmail: (company?.email as string) || undefined,
      companyPhone: (company?.companyPhoneNumber as string) || undefined,
      companyWebsite:
        (company?.website as string) || (company?.companyWebsite as string) || undefined,
      companyLogo: (company?.companyLogo as string) || undefined,
      profilePictureURL: (company?.profilePictureURL as string) || undefined,
      companyVatId:
        (company?.vatId as string) ||
        (company as any)?.vatIdForBackend ||
        (company as any)?.step3?.vatId ||
        ((settings as any)?.vatId as string) ||
        undefined,
      companyTaxNumber:
        (company?.taxNumber as string) ||
        (company as any)?.taxNumberForBackend ||
        (company as any)?.step3?.taxNumber ||
        ((settings as any)?.taxNumber as string) ||
        undefined,
      items: items.map(it => {
        const qty = Number.isFinite(it.quantity) ? it.quantity : 0;
        const unit = Number.isFinite(it.unitPrice) ? it.unitPrice : 0;
        const baseTotal = Number.isFinite(it.total) ? it.total : qty * unit;
        const sign = it.category === 'discount' ? -1 : 1;
        const factor =
          it.category === 'discount'
            ? 1
            : 1 - Math.max(0, Math.min(100, it.discountPercent || 0)) / 100;
        const lineTotalNet = baseTotal * sign * factor;
        return {
          id: it.id,
          description: it.description || '',
          quantity: qty,
          unitPrice: unit,
          total: lineTotalNet,
          taxRate: undefined,
          category: it.category as any,
        };
      }),
      subtotal,
      tax: vat,
      total: grandTotal,
      vatRate: taxRate,
      isSmallBusiness: settings?.ust === 'kleinunternehmer' || taxRate === 0,
      bankDetails: company
        ? {
            iban: (company?.iban as string) || undefined,
            bic: (company?.bic as string) || undefined,
            bankName: (company?.bankName as string) || undefined,
            accountHolder:
              (company?.accountHolder as string) ||
              (settings as any)?.accountHolder ||
              (companyName as string) ||
              undefined,
          }
        : undefined,
      notes: previewNotes,
      headTextHtml: formData.headTextHtml || undefined,
      footerText: formData.footerText || undefined,
      contactPersonName: contactPersonNameForFooter,
    };

    return data;
  };

  // E-Mail Defaults setzen, wenn das E-Mail-Card geöffnet wird
  useEffect(() => {
    if (!emailCardOpen) return;
    const data = buildPreviewData();
    if (!emailSubject) {
      setEmailSubject(`Angebot ${data.companyName}${data.title ? ' – ' + data.title : ''}`);
    }
    if (!emailBody) {
      setEmailBody(
        `Hallo ${data.customerName || ''},\n\n` +
          `anbei erhalten Sie unser Angebot${data.title ? ' zu: ' + data.title : ''}.` +
          `\n\nGesamtbetrag: ${formatCurrency(data.total)}\nGültig bis: ${data.validUntil}` +
          `\n\nBei Fragen melden Sie sich gerne.` +
          `\n\nBeste Grüße\n${data.companyName}`
      );
    }
    if (!emailTo && formData.customerEmail) setEmailTo(formData.customerEmail);
    // PDF vorab erstellen (rein clientseitig)
    (async () => {
      try {
        setEmailAttachmentError(null);
        setEmailAttachmentReady(false);
  const filename = `Angebot-${(data.companyName || 'Angebot').replace(/[^a-z0-9]+/gi, '-')}-${data.date}.pdf`;
        setEmailAttachmentName(filename);
        await new Promise(r => setTimeout(r, 100));
        // Clientseitig erzeugen
        const blob = await generatePdfBlob();
        if (!blob || (blob as any).size === 0) throw new Error('Leeres PDF');
        const base64 = await blobToBase64(blob);
        setEmailAttachmentB64(base64);
        setEmailAttachmentReady(true);
      } catch (err: any) {
        console.error('PDF-PreRender fehlgeschlagen', err);
        setEmailAttachmentError(err?.message || 'PDF konnte nicht erstellt werden');
        setEmailAttachmentReady(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailCardOpen]);

  // PDF-Generierung mit React-PDF und dem umgeschriebenen Template
  const generatePdfBlob = async (): Promise<Blob> => {
    try {
      console.log('[PDF] Start React-PDF Erzeugung mit umgeschriebenem Template');
      
      // Verwende das bestehende Template-Datenformat - EXAKT wie es ist!
      const templateData = buildPreviewData();
      
      console.log('[PDF] Template-Daten erstellt', {
        companyName: templateData.companyName,
        customerName: templateData.customerName,
        quoteNumber: templateData.quoteNumber,
        itemCount: templateData.items?.length || 0,
        total: templateData.total,
        currency: templateData.currency,
      });

      // React-PDF importieren
      const { pdf } = await import('@react-pdf/renderer');
      const { default: GermanStandardQuotePDF } = await import('@/components/pdf/GermanStandardQuotePDF');
      
      // PDF mit dem umgeschriebenen Template generieren
      const blob = await pdf(<GermanStandardQuotePDF data={templateData} />).toBlob();
      
      const size = blob.size;
      console.log('[PDF] React-PDF Blob erstellt', {
        size,
        sizeKB: (size / 1024).toFixed(1),
        isEmpty: size < 1000,
      });

      if (size < 1000) {
        throw new Error('PDF ist zu klein - möglicherweise leer');
      }

      return blob;
    } catch (error) {
      console.error('[PDF] React-PDF Fehler:', error);
      throw new Error(`PDF-Erstellung fehlgeschlagen: ${error}`);
    }
  };

  // Fallback-Erzeugung via html2canvas + jsPDF (mit Seiten-Slicing)
  const generatePdfViaCanvas = async (element: HTMLElement): Promise<Blob> => {
    const [{ default: html2canvas }, { default: jsPDF }]: any = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);

    // Sicherstellen, dass Layout steht
    await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#FFFFFF',
      logging: true,
      windowWidth: Math.max(794, element.scrollWidth || element.clientWidth || 794),
      windowHeight: Math.max(1123, element.scrollHeight || 1123),
    });

    const imgWidthPt = 595.28; // A4 Breite in pt
    const pageHeightPt = 841.89; // A4 Höhe in pt
    const canvasWidthPx = canvas.width;
    const canvasHeightPx = canvas.height;
    const ratio = imgWidthPt / canvasWidthPx;
    const imgHeightPt = canvasHeightPx * ratio;

    const pdf = new jsPDF('p', 'pt', 'a4');

    if (imgHeightPt <= pageHeightPt) {
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidthPt, imgHeightPt);
    } else {
      // Mehrseitig: in Seitenhöhe-Pixeln schneiden
      const pageHeightPx = Math.floor(pageHeightPt / ratio);
      let renderedPx = 0;
      let pageIndex = 0;
      const tmp = document.createElement('canvas');
      const ctx = tmp.getContext('2d')!;
      tmp.width = canvasWidthPx;
      while (renderedPx < canvasHeightPx) {
        const sliceHeightPx = Math.min(pageHeightPx, canvasHeightPx - renderedPx);
        tmp.height = sliceHeightPx;
        ctx.clearRect(0, 0, tmp.width, tmp.height);
        ctx.drawImage(
          canvas,
          0,
          renderedPx,
          canvasWidthPx,
          sliceHeightPx,
          0,
          0,
          canvasWidthPx,
          sliceHeightPx
        );
        const imgData = tmp.toDataURL('image/jpeg', 0.98);
        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidthPt, sliceHeightPx * ratio);
        renderedPx += sliceHeightPx;
        pageIndex++;
      }
    }

    return pdf.output('blob');
  };

  const downloadPdf = async () => {
    try {
      console.log('[PDF] Download gestartet');
      const element = pdfContainerRef.current;
      if (!element) throw new Error('PDF-Container nicht verfügbar');
      const data = buildPreviewData();
  const filename = `Angebot-${(data.companyName || 'Angebot').replace(/[^a-z0-9]+/gi, '-')}-${data.date}.pdf`;

      // 1) Server-seitiges PDF versuchen (höchste Qualität)
      try {
        const previewData = buildPreviewData();
        const res = await fetch('/api/pdf/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid,
            quoteId: 'preview',
            host: window.location.host,
            data: previewData,
          }),
        });
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
          if ((blob as any).size > 1500) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
              URL.revokeObjectURL(url);
              a.remove();
            }, 1000);
            console.log('[PDF] Download ausgelöst (server)', {
              filename,
              size: (blob as any).size,
            });
            return;
          }
        } else {
          const err = await res.json().catch(() => ({}));
          console.warn('[PDF] Server-PDF fehlgeschlagen', err);
        }
      } catch (e) {
        console.warn('[PDF] Server-PDF Fehler', e);
      }

      // 2) Client-Fallback
      const blob = await generatePdfBlob();
      if (!blob || (blob as any).size === 0) throw new Error('Leeres PDF erhalten');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
      }, 1000);
      console.log('[PDF] Download ausgelöst (client)', { filename, size: (blob as any).size });
    } catch (e: any) {
      console.error('[PDF] Download-Fehler', e);
      toast.error(`PDF konnte nicht erstellt werden${e?.message ? `: ${e.message}` : ''}`);
    }
  };

  const printInBrowser = () => {
    try {
      const data = buildPreviewData();
      // UTF-8-sichere Base64-Kodierung (vermeidet UmsÃ¤tze/ä/ö/ü-Probleme)
      const encodeBase64Utf8 = (obj: any): string => {
        const json = typeof obj === 'string' ? obj : JSON.stringify(obj);
        const bytes = new TextEncoder().encode(json);
        let bin = '';
        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        return btoa(bin);
      };
      const payload = encodeURIComponent(encodeBase64Utf8(data));
      const url = `/print/quote/${uid}/preview?auto=1&payload=${payload}`;
      const win = window.open(url, '_blank');
      if (!win || win.closed || typeof win.closed === 'undefined') {
        toast.message('Popup-Blocker aktiv – bitte Popups erlauben und erneut versuchen.');
      }
    } catch (e) {
      toast.error('Browser-Druck konnte nicht gestartet werden');
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] || '';
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const sendEmailWithPdf = async () => {
    if (!emailTo) {
      toast.error('Empfänger fehlt');
      return;
    }
    try {
      setSendingEmail(true);
      const data = buildPreviewData();
      let base64 = emailAttachmentB64;
      if (!emailAttachmentReady || !base64) {
        // als Fallback jetzt erzeugen
        await new Promise(r => setTimeout(r, 150));
        toast.message('PDF wird erstellt …');
        // Clientseitig erzeugen (kein Server-PDF)
        const blob = await generatePdfBlob();
        if (!blob || (blob as any).size === 0) {
          toast.error('PDF ist leer – Erstellung fehlgeschlagen');
          return;
        }
        base64 = await blobToBase64(blob);
      }
      // Absender auf firmenname@taskilo.de normalisieren
      const slug = (data.companyName || 'taskilo')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '');
      const from = `${slug}@taskilo.de`;
      toast.message('E-Mail wird versendet …');
      const res = await fetch('/api/email/send-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: [emailTo],
          subject: emailSubject || `Angebot ${data.companyName}`,
          html: (emailBody || '').replace(/\n/g, '<br />'),
          text: emailBody || undefined,
          from,
          attachment: { filename: emailAttachmentName || 'Angebot.pdf', contentBase64: base64 },
          meta: { uid, source: 'create-quote' },
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success('E-Mail wurde versendet');
        setEmailCardOpen(false);
      } else {
        toast.error(json?.error || 'E-Mail Versand fehlgeschlagen');
      }
    } catch (e) {
      console.error(e);
      toast.error('E-Mail Versand fehlgeschlagen (siehe Konsole)');
    } finally {
      setSendingEmail(false);
    }
  };

  // Guard
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

  // Helpers
  const computeItemTotalNet = (qty: number, unitNet: number) => {
    const q = isFinite(qty) ? Math.max(0, qty) : 0;
    const p = isFinite(unitNet) ? Math.max(0, unitNet) : 0;
    return q * p;
  };

  // Totals (Rabatt-Positionen abziehen)
  const subtotal = items.reduce((sum, it) => {
    const t = it.total || 0;
    if (it.category === 'discount') {
      return sum + -Math.abs(t);
    }
    const factor = 1 - Math.max(0, Math.min(100, it.discountPercent || 0)) / 100;
    return sum + t * factor;
  }, 0);
  const vat = subtotal * (taxRate / 100);
  const grandTotal = subtotal + vat;

  // Handlers
  const handleCustomerSelect = (customerName: string) => {
    const customer = customers.find(c => c.name === customerName);
    if (!customer) return;
    setFormData(prev => ({
      ...prev,
      customerName: customer.name,
      customerNumber: customer.customerNumber || '',
      customerEmail: customer.email || '',
      customerAddress:
        customer.street && customer.city
          ? `${customer.street}\n${customer.postalCode || ''} ${customer.city}\n${customer.country || 'Deutschland'}`
          : prev.customerAddress,
    }));
  };

  const addItem = () => {
    const newItem: QuoteItem = {
      id:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2),
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
      unit: 'Stk',
      discountPercent: 0,
    };
    setItems(prev => [...prev, newItem]);
  };

  const removeItem = (index: number) => {
    setItems(prev => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const handleItemChange = (index: number, field: keyof QuoteItem, value: any) => {
    setItems(prev =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const next: QuoteItem = { ...item };
        if (field === 'description') next.description = String(value);
        if (field === 'quantity') next.quantity = parseFloat(String(value)) || 0;
        if (field === 'unitPrice') {
          const input = parseFloat(String(value)) || 0;
          const net = showNet ? input : input / (1 + taxRate / 100);
          next.unitPrice = net;
        }
        next.total = computeItemTotalNet(next.quantity, next.unitPrice);
        return next;
      })
    );
  };

  const handleSubmit = async (asDraft = true) => {
    if (loading) return;
    setLoading(true);
    try {
      if (!formData.customerName || !formData.validUntil) {
        toast.error('Bitte füllen Sie alle Pflichtfelder aus');
        return;
      }
      const hasValidItems = items.some(it => it.description && it.quantity > 0);
      if (!hasValidItems) {
        toast.error('Bitte fügen Sie mindestens eine gültige Position hinzu');
        return;
      }
      const validUntilDate = new Date(formData.validUntil);

      // Zahlungsbedingungen final (inkl. Skonto, falls aktiv)
      const skontoSentence =
        skontoEnabled && skontoDays && skontoPercentage
          ? skontoText?.trim() ||
            `Bei Zahlung binnen ${skontoDays} Tagen ${skontoPercentage}% Skonto`
          : '';
      const finalPaymentTerms =
        [formData.paymentTerms?.trim(), skontoSentence].filter(Boolean).join('\n\n') || undefined;

      const quoteData: Omit<QuoteType, 'id' | 'number' | 'createdAt' | 'updatedAt'> = {
        companyId: uid,
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: '',
        customerOrderNumber: formData.customerOrderNumber || undefined,
        customerAddress: formData.customerAddress
          ? {
              street: formData.customerAddress.split('\n')[0] || '',
              city: formData.customerAddress.split('\n')[1] || '',
              postalCode: '',
              country: formData.customerAddress.split('\n')[2] || 'Deutschland',
            }
          : undefined,
        date: new Date(),
        validUntil: validUntilDate,
        status: asDraft ? 'draft' : 'sent',
        title: formData.title,
        description: formData.headTextHtml,
        notes: formData.notes,
        footerText: formData.footerText,
        deliveryMethod: formData.deliveryTerms ? 'custom' : undefined,
        deliveryDate: undefined,
        deliveryAddress: undefined,
        items: items.filter(it => it.description && it.quantity > 0),
        subtotal,
        taxAmount: vat,
        total: grandTotal,
        currency: formData.currency,
        language: 'de',
  template: 'professional-business-quote',
        lastModifiedBy: uid,
        taxRule: formData.taxRule,
        internalContactPerson: formData.internalContactPerson || undefined,
        deliveryTerms: formData.deliveryTerms || undefined,
        paymentTerms: finalPaymentTerms,
        createdBy: uid,
      };

      const createdQuoteId = await QuoteService.createQuote(uid, quoteData);

      // Bestand reservieren für alle Inventar-Artikel in den Positionen
      try {
        const inventoryItems = (items || [])
          .filter(it => it.inventoryItemId && it.quantity > 0 && it.category !== 'discount')
          .map(it => ({ itemId: it.inventoryItemId as string, quantity: it.quantity }));

        if (inventoryItems.length > 0) {
          await InventoryService.reserveItemsForQuote(uid, createdQuoteId, inventoryItems);
        }
      } catch (reserveErr: any) {
        // Rollback: Quote wieder löschen, wenn Reservierung fehlschlägt
        try {
          await QuoteService.deleteQuote(uid, createdQuoteId);
        } catch {}
        console.error(reserveErr);
        toast.error(reserveErr?.message || 'Bestandsreservierung ist fehlgeschlagen');
        return; // nicht weiter navigieren
      }

      toast.success(asDraft ? 'Angebot als Entwurf gespeichert' : 'Angebot erstellt und versendet');
      router.push(`/dashboard/company/${uid}/finance/quotes`);
    } catch (e) {
      console.error(e);
      toast.error('Angebot konnte nicht gespeichert werden');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Allgemeine Angaben */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2 text-[#14ad9f]" />
            Allgemeine Angaben
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Zeile 1 */}
            <div className="space-y-2">
              <Label>Kunde</Label>
              <div className="space-y-2">
                {/* Bestehender Kunde auswählen */}
                <Select
                  value={formData.customerName}
                  onValueChange={val => handleCustomerSelect(val)}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={loadingCustomers ? 'Kunden werden geladen…' : 'Bestehenden Kunden auswählen'}
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* ODER - Neuer Kunde mit intelligenter Suche */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 border-t border-gray-300"></div>
                  <span className="text-xs text-gray-500">oder</span>
                  <div className="flex-1 border-t border-gray-300"></div>
                </div>
                
                {/* Intelligente Kundensuche */}
                <div className="relative customer-search-container">
                  <Input
                    type="text"
                    value={formData.customerName}
                    onChange={e => {
                      const value = e.target.value;
                      setFormData(prev => ({ 
                        ...prev, 
                        customerName: value 
                      }));
                      
                      // Zeige Popup nur wenn mindestens 2 Zeichen eingegeben wurden
                      if (value.length >= 2) {
                        setShowCustomerSearchPopup(true);
                      } else {
                        setShowCustomerSearchPopup(false);
                      }
                    }}
                    placeholder="Neuen Kontakt eingeben..."
                    className="flex-1"
                  />
                  
                  {/* Intelligenter Such-Popup */}
                  {showCustomerSearchPopup && formData.customerName.length >= 2 && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {/* Gefilterte Kunden anzeigen */}
                      {customers
                        .filter(customer => 
                          customer.name.toLowerCase().includes(formData.customerName.toLowerCase())
                        )
                        .slice(0, 5) // Maximal 5 Ergebnisse
                        .map(customer => (
                          <div
                            key={customer.id}
                            className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            onClick={() => {
                              handleCustomerSelect(customer.name);
                              setShowCustomerSearchPopup(false);
                            }}
                          >
                            <div className="font-medium text-sm">{customer.name}</div>
                            <div className="text-xs text-gray-500">{customer.customerNumber} • {customer.email}</div>
                          </div>
                        ))}
                      
                      {/* "Kunden anlegen" Button */}
                      <div className="border-t border-gray-200 bg-gray-50">
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm text-[#14ad9f] hover:bg-gray-100 font-medium"
                          onClick={() => {
                            setShowCustomerSearchPopup(false);
                            setCreateCustomerOpen(true);
                          }}
                        >
                          + Neuen Kunden &quot;{formData.customerName}&quot; anlegen
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>E‑Mail</Label>
              <Input
                type="email"
                value={formData.customerEmail}
                onChange={e => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                placeholder="kunde@example.com"
              />
            </div>

            {/* Zeile 2 */}
            <div className="space-y-2">
              <Label>Angebotstitel</Label>
              <Input
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="z. B. Angebot für Webentwicklung"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerOrderNumber">Referenz / Bestellnummer</Label>
              <Input
                id="customerOrderNumber"
                value={formData.customerOrderNumber}
                onChange={e =>
                  setFormData(prev => ({ ...prev, customerOrderNumber: e.target.value }))
                }
                placeholder="z. B. PO-12345 / Kundenreferenz"
              />
            </div>

            {/* Zeile 3 */}
            <div className="space-y-2">
              <Label>Kundennummer</Label>
              <Input
                value={formData.customerNumber}
                onChange={e => setFormData(prev => ({ ...prev, customerNumber: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="validUntil">Gültig bis *</Label>
              <Input
                id="validUntil"
                type="date"
                value={formData.validUntil}
                onChange={e => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            {/* Adresse unter beiden Spalten */}
            <div className="space-y-2 md:col-span-2">
              <Label>Adresse</Label>
              <Textarea
                value={formData.customerAddress}
                onChange={e => setFormData(prev => ({ ...prev, customerAddress: e.target.value }))}
                placeholder={'Straße 1\n12345 Stadt\nDeutschland'}
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kopf-Text */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2 text-[#14ad9f]" />
            Kopf-Text
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label>Einleitung / Kopf-Text</Label>
          <FooterTextEditor
            value={formData.headTextHtml}
            onChange={(html: string) => setFormData(prev => ({ ...prev, headTextHtml: html }))}
          />
        </CardContent>
      </Card>

      {/* Produkte / Positionen */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calculator className="h-5 w-5 mr-2 text-[#14ad9f]" />
            Produkte
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Brutto/Netto Schalter */}
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-gray-600">Preisanzeige</div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={showNet ? 'default' : 'outline'}
                className={showNet ? 'bg-[#14ad9f] hover:bg-[#129488] text-white' : ''}
                onClick={() => setShowNet(true)}
                size="sm"
              >
                Netto
              </Button>
              <Button
                type="button"
                variant={!showNet ? 'default' : 'outline'}
                className={!showNet ? 'bg-[#14ad9f] hover:bg-[#129488] text-white' : ''}
                onClick={() => setShowNet(false)}
                size="sm"
              >
                Brutto
              </Button>
            </div>
          </div>

          {/* Positions-Steuerleiste */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Button type="button" variant="link" onClick={addItem} className="px-0 text-[#14ad9f]">
              + Position hinzufügen
            </Button>
            <InventorySelector
              companyId={uid}
              onSelectItem={(invItem, quantity) => {
                const qty = Math.max(1, quantity || 1);
                const unitPriceNet = invItem.sellingPrice || 0;
                const newItem: QuoteItem = {
                  id:
                    typeof crypto !== 'undefined' && 'randomUUID' in crypto
                      ? crypto.randomUUID()
                      : Math.random().toString(36).slice(2),
                  description: invItem.name,
                  quantity: qty,
                  unitPrice: unitPriceNet,
                  total: computeItemTotalNet(qty, unitPriceNet),
                  unit: invItem.unit,
                  inventoryItemId: invItem.id,
                  discountPercent: 0,
                };
                setItems(prev => [...prev, newItem]);
              }}
              selectedItems={items.map(i => i.inventoryItemId).filter(Boolean) as string[]}
            />
            <Button
              type="button"
              variant="link"
              onClick={() => {
                const newItem: QuoteItem = {
                  id:
                    typeof crypto !== 'undefined' && 'randomUUID' in crypto
                      ? crypto.randomUUID()
                      : Math.random().toString(36).slice(2),
                  description: 'Gesamtrabatt',
                  quantity: 1,
                  unitPrice: 0,
                  total: 0,
                  category: 'discount',
                };
                setItems(prev => [...prev, newItem]);
              }}
              className="px-0 text-[#14ad9f]"
            >
              + Gesamtrabatt hinzufügen
            </Button>
          </div>

          {/* Positionsliste */}
          <div className="space-y-4">
            {items.map((item, index) => {
              const unitPriceDisplay = showNet
                ? item.unitPrice
                : item.unitPrice * (1 + taxRate / 100);
              // Rabatt-Positionen als negative Beträge darstellen
              const baseTotalNet = item.total || 0;
              const sign = item.category === 'discount' ? -1 : 1;
              // Positions-Rabatt anwenden, außer bei speziellen Rabatt-Positionszeilen
              const discountFactor =
                item.category === 'discount'
                  ? 1
                  : 1 - Math.max(0, Math.min(100, item.discountPercent || 0)) / 100;
              const totalNet = baseTotalNet * sign * discountFactor;
              const totalGross = totalNet * (1 + taxRate / 100);
              return (
                <div
                  key={item.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 border border-gray-200 rounded-lg"
                >
                  <div className="md:col-span-4">
                    <div className="flex items-center gap-1">
                      <Label>Beschreibung</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            aria-label="Hinweis zur Beschreibung"
                            className="cursor-help inline-flex"
                          >
                            <Info className="w-4 h-4 text-[#14ad9f]" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="start" className="max-w-xs text-sm">
                          <p>
                            Hinweis: Die Beschreibung ist für den Kunden sichtbar. Du kannst auch
                            die SKU oder den exakten Produktnamen eingeben, um Werte automatisch aus
                            dem Inventar zu übernehmen.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Popover
                      open={popoverOpenIds.has(item.id)}
                      onOpenChange={open => {
                        if (!open) {
                          setDismissedCreatePromptIds(prev => new Set(prev).add(item.id));
                        }
                      }}
                    >
                      <div className="relative">
                        <Input
                          value={item.description}
                          onChange={e => handleDescriptionChange(index, item.id, e.target.value)}
                          placeholder={
                            item.category === 'discount'
                              ? 'Rabatt / Nachlass'
                              : 'Leistungsbeschreibung'
                          }
                        />
                        <PopoverAnchor />
                      </div>
                      <PopoverContent side="bottom" align="start">
                        <div className="text-sm">
                          <div className="font-medium mb-2">Als Produkt speichern?</div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                              onClick={() => {
                                const rate = Number.isFinite(taxRate) ? taxRate : 19;
                                const name = item.description || '';
                                const unit = (item.unit as string) || 'Stk';
                                const sellingNet = Number.isFinite(item.unitPrice)
                                  ? item.unitPrice
                                  : 0;
                                setNewProduct({
                                  name,
                                  imageUrl: '',
                                  sku: '',
                                  category: 'Artikel',
                                  unit,
                                  stock: 0,
                                  taxRate: rate,
                                  purchaseNet: 0,
                                  purchaseGross: 0,
                                  sellingNet,
                                  sellingGross: Number(
                                    syncGrossFromNet(sellingNet, rate).toFixed(2)
                                  ),
                                  description: '',
                                  internalNote: '',
                                });
                                setCreateProductForIndex(index);
                                setCreateProductOpen(true);
                                setDismissedCreatePromptIds(prev => new Set(prev).add(item.id));
                              }}
                            >
                              Produkt erstellen
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setDismissedCreatePromptIds(prev => new Set(prev).add(item.id))
                              }
                            >
                              Später
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="md:col-span-1">
                    <Label>Menge</Label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={e =>
                        handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)
                      }
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Label>Einheit</Label>
                    <Select
                      value={(item.unit as string) ?? 'Stk'}
                      onValueChange={val => {
                        const mapped = val === 'none' ? '' : val;
                        setItems(prev =>
                          prev.map((it, i) => (i === index ? { ...it, unit: mapped } : it))
                        );
                      }}
                      disabled={item.category === 'discount'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Einheit" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {UNIT_OPTIONS.map(u => (
                          <SelectItem key={u.value || 'blank'} value={u.value}>
                            {u.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label>
                      Preis
                      <small className="font-normal text-gray-500">
                        {' '}
                        ({showNet ? 'Netto' : 'Brutto'})
                      </small>
                    </Label>
                    <Input
                      type="number"
                      value={
                        Number.isFinite(unitPriceDisplay) ? Number(unitPriceDisplay.toFixed(2)) : 0
                      }
                      onChange={e =>
                        handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)
                      }
                      min="0"
                      step="0.01"
                      className="w-28 md:w-32 h-8 text-sm px-2"
                    />
                  </div>
                  {/* Rabatt in % (nur für normale Positionen) */}
                  <div className="md:col-span-1">
                    <Label>Rabatt %</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={item.category === 'discount' ? 0 : (item.discountPercent ?? 0)}
                      onChange={e => {
                        const v = parseFloat(e.target.value);
                        setItems(prev =>
                          prev.map((it, i) =>
                            i === index
                              ? {
                                  ...it,
                                  discountPercent: Number.isFinite(v)
                                    ? Math.max(0, Math.min(100, v))
                                    : 0,
                                }
                              : it
                          )
                        );
                      }}
                      disabled={item.category === 'discount'}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Betrag</Label>
                    <div
                      className={`h-10 flex items-center text-sm font-medium ${item.category === 'discount' ? 'text-red-600' : ''}`}
                    >
                      {formatCurrency(showNet ? totalNet : totalGross)}
                    </div>
                  </div>
                  <div className="md:col-span-1 flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={items.length === 1}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Fuß-Text (unter Positionen) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">Fuß-Text</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="footerText">Fuß-Text mit Platzhaltern</Label>
          <FooterTextEditor
            value={formData.footerText}
            onChange={(html: string) => setFormData(prev => ({ ...prev, footerText: html }))}
          />
          <div className="text-xs text-gray-500">Verfügbare Platzhalter: [%KONTAKTPERSON%]</div>
        </CardContent>
      </Card>

      {/* Mehr Optionen */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Mehr Optionen</CardTitle>
            <Button
              type="button"
              variant="link"
              className="px-0 text-[#14ad9f]"
              onClick={() => setShowDetailedOptions(v => !v)}
            >
              {!showDetailedOptions ? 'Weitere Optionen einblenden' : 'Weitere Optionen ausblenden'}
            </Button>
          </div>
        </CardHeader>
        {showDetailedOptions && (
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Währung</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={val => setFormData(prev => ({ ...prev, currency: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Bitte auswählen" />
                    </SelectTrigger>
                    <SelectContent
                      className="max-h-96 overflow-y-auto"
                      style={{ scrollbarGutter: 'stable' }}
                    >
                      {allCurrencies.map(c => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.name} ({c.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Interne Kontaktperson</Label>
                  <Input
                    value={formData.internalContactPerson}
                    onChange={e =>
                      setFormData(p => ({ ...p, internalContactPerson: e.target.value }))
                    }
                    placeholder="Name der Kontaktperson"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Lieferbedingungen</Label>
                  <Input
                    value={formData.deliveryTerms}
                    onChange={e => setFormData(p => ({ ...p, deliveryTerms: e.target.value }))}
                    placeholder="z.B. Lieferung innerhalb von 14 Tagen"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Zahlungsbedingungen</Label>
                  <Input
                    value={formData.paymentTerms}
                    onChange={e => setFormData(p => ({ ...p, paymentTerms: e.target.value }))}
                    placeholder="z.B. 14 Tage netto"
                  />
                </div>

                {/* Skonto-Einstellungen */}
                <div className="space-y-2 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">Skonto</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600">aktivieren</span>
                      <Switch checked={skontoEnabled} onCheckedChange={setSkontoEnabled} />
                    </div>
                  </div>
                  {skontoEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label>Skontotage</Label>
                        <Input
                          type="number"
                          min={1}
                          value={skontoDays ?? ''}
                          onChange={e => {
                            const v = parseInt(e.target.value, 10);
                            setSkontoDays(Number.isFinite(v) ? Math.max(1, v) : undefined);
                          }}
                          placeholder="z.B. 10"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Skonto %</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.1}
                          value={skontoPercentage ?? ''}
                          onChange={e => {
                            const v = parseFloat(e.target.value);
                            setSkontoPercentage(Number.isFinite(v) ? Math.max(0, v) : undefined);
                          }}
                          placeholder="z.B. 2"
                        />
                      </div>
                      <div className="space-y-1 md:col-span-1">
                        <Label>Text (optional)</Label>
                        <Input
                          value={skontoText}
                          onChange={e => setSkontoText(e.target.value)}
                          placeholder="Bei Zahlung binnen X Tagen Y% Skonto"
                        />
                      </div>
                    </div>
                  )}
                  {skontoEnabled && (
                    <div className="text-xs text-gray-500">
                      Vorschau:{' '}
                      {skontoText?.trim() ||
                        (skontoDays && skontoPercentage
                          ? `Bei Zahlung binnen ${skontoDays} Tagen ${skontoPercentage}% Skonto`
                          : '—')}
                    </div>
                  )}
                </div>
              </div>

              {/* Umsatzsteuerregelung: Drei unabhängige Accordions */}
              <div className="space-y-3">
                <Label className="font-semibold">Umsatzsteuerregelung</Label>

                {/* In Deutschland */}
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between bg-muted/30 px-3 py-2 hover:bg-muted/50 transition"
                    onClick={() => setTaxDEOpen(v => !v)}
                  >
                    <span className="text-sm font-medium">In Deutschland</span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${taxDEOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {taxDEOpen && (
                    <div className="p-3 space-y-2">
                      {[
                        {
                          key: 'DE_TAXABLE',
                          label: 'Umsatzsteuerpflichtige Umsätze',
                          hint: 'Regelsteuersatz, i. d. R. 19% (oder 7% für bestimmte Leistungen).',
                        },
                        {
                          key: 'DE_EXEMPT_4_USTG',
                          label: 'Steuerfreie Umsätze §4 UStG',
                          hint: 'Umsätze, die nach §4 UStG von der Steuer befreit sind (z. B. bestimmte Versicherungen).',
                        },
                        {
                          key: 'DE_REVERSE_13B',
                          label: 'Reverse Charge gem. §13b UStG',
                          hint: 'Steuerschuld geht auf den Leistungsempfänger über (B2B, bestimmte Leistungen).',
                        },
                      ].map(opt => (
                        <label
                          key={opt.key}
                          className={`flex items-center justify-between gap-3 rounded border p-2 ${formData.taxRule === opt.key ? 'border-[#14ad9f] bg-[#14ad9f]/5' : 'border-gray-200'}`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="taxRule"
                              className="accent-[#14ad9f]"
                              checked={formData.taxRule === (opt.key as any)}
                              onChange={() => setFormData(p => ({ ...p, taxRule: opt.key as any }))}
                            />
                            <span>{opt.label}</span>
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-4 h-4 text-gray-500" />
                            </TooltipTrigger>
                            <TooltipContent>{opt.hint}</TooltipContent>
                          </Tooltip>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Im EU-Ausland */}
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between bg-muted/30 px-3 py-2 hover:bg-muted/50 transition"
                    onClick={() => setTaxEUOpen(v => !v)}
                  >
                    <span className="text-sm font-medium">Im EU-Ausland</span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${taxEUOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {taxEUOpen && (
                    <div className="p-3 space-y-2">
                      {[
                        {
                          key: 'EU_REVERSE_18B',
                          label: 'Reverse Charge gem. §18b UStG',
                          hint: 'B2B-Leistungen innerhalb der EU – Steuerschuld beim Leistungsempfänger.',
                        },
                        {
                          key: 'EU_INTRACOMMUNITY_SUPPLY',
                          label: 'Innergemeinschaftliche Lieferungen',
                          hint: 'Lieferung von Waren in anderes EU-Land an Unternehmer mit USt-IdNr., i. d. R. steuerfrei.',
                        },
                        {
                          key: 'EU_OSS',
                          label: 'OSS – One-Stop-Shop',
                          hint: 'Fernverkauf an Privatkunden in EU; Besteuerung im Bestimmungsland über OSS.',
                        },
                      ].map(opt => (
                        <label
                          key={opt.key}
                          className={`flex items-center justify-between gap-3 rounded border p-2 ${formData.taxRule === opt.key ? 'border-[#14ad9f] bg-[#14ad9f]/5' : 'border-gray-200'}`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="taxRule"
                              className="accent-[#14ad9f]"
                              checked={formData.taxRule === (opt.key as any)}
                              onChange={() => setFormData(p => ({ ...p, taxRule: opt.key as any }))}
                            />
                            <span>{opt.label}</span>
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-4 h-4 text-gray-500" />
                            </TooltipTrigger>
                            <TooltipContent>{opt.hint}</TooltipContent>
                          </Tooltip>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Außerhalb der EU */}
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between bg-muted/30 px-3 py-2 hover:bg-muted/50 transition"
                    onClick={() => setTaxNonEUOpen(v => !v)}
                  >
                    <span className="text-sm font-medium">Außerhalb der EU</span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${taxNonEUOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {taxNonEUOpen && (
                    <div className="p-3 space-y-2">
                      {[
                        {
                          key: 'NON_EU_EXPORT',
                          label: 'Ausfuhren',
                          hint: 'Warenlieferungen in Drittländer (außerhalb EU) sind i. d. R. steuerfrei (Nachweis erforderlich).',
                        },
                        {
                          key: 'NON_EU_OUT_OF_SCOPE',
                          label: 'Nicht im Inland steuerbare Leistung (außerhalb EU, z.B. Schweiz)',
                          hint: 'Leistung gilt nicht im Inland als ausgeführt – keine deutsche USt.',
                        },
                      ].map(opt => (
                        <label
                          key={opt.key}
                          className={`flex items-center justify-between gap-3 rounded border p-2 ${formData.taxRule === opt.key ? 'border-[#14ad9f] bg-[#14ad9f]/5' : 'border-gray-200'}`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="taxRule"
                              className="accent-[#14ad9f]"
                              checked={formData.taxRule === (opt.key as any)}
                              onChange={() => setFormData(p => ({ ...p, taxRule: opt.key as any }))}
                            />
                            <span>{opt.label}</span>
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-4 h-4 text-gray-500" />
                            </TooltipTrigger>
                            <TooltipContent>{opt.hint}</TooltipContent>
                          </Tooltip>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-xs text-gray-500">
                  Hinweis: Je nach Regelung setzen wir den USt.-Satz automatisch (DE steuerpflichtig
                  → 19%, andere Regeln → 0%).
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Summen */}
      <Card>
        <CardHeader>
          <CardTitle>Summen</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm">
            <li className="flex justify-between py-2 border-b">
              <span>Gesamtsumme Netto (inkl. Rabatte / Aufschläge)</span>
              <span>{formatCurrency(subtotal)}</span>
            </li>
            {!showNet && taxRate > 0 && (
              <li className="flex justify-between py-2 border-b">
                <span>Umsatzsteuer {taxRate}%</span>
                <span>{formatCurrency(vat)}</span>
              </li>
            )}
            <li className="flex justify-between py-2">
              <span className="text-lg font-semibold">
                {showNet ? 'Gesamt (Netto)' : 'Gesamt (Brutto)'}
              </span>
              <span className="text-lg font-semibold">
                {formatCurrency(showNet ? subtotal : grandTotal)}
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Interne Notizen */}
      <Card>
        <CardHeader>
          <CardTitle>Interne Notizen</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.notes}
            onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Interne Notizen (werden nicht im Angebot angezeigt)..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Aktionen */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          onClick={() => setPreviewOpen(true)}
          variant="outline"
          className="text-[#14ad9f] border-[#14ad9f]"
        >
          <Eye className="w-4 h-4 mr-2" />
          Vorschau
        </Button>
        <Button type="button" onClick={printInBrowser} variant="outline" className="sm:ml-2">
          <Printer className="w-4 h-4 mr-2" />
          Drucken (Browser)
        </Button>
        <Button
          onClick={() => handleSubmit(true)}
          disabled={loading}
          className="bg-gray-600 hover:bg-gray-700 text-white"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Speichern
        </Button>
        <Button
          type="button"
          onClick={() => setEmailCardOpen(v => !v)}
          variant="default"
          className="bg-[#14ad9f] hover:bg-[#129488] text-white"
        >
          <Mail className="w-4 h-4 mr-2" />
          Als E-Mail versenden
        </Button>
      </div>

      {emailCardOpen && (
        <div className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>E-Mail versenden</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                {pdfPreviewUrl && (
                  <div className="rounded border p-2 bg-gray-50 text-xs text-gray-600">
                    PDF bereit • Größe:{' '}
                    {pdfSizeBytes ? `${(pdfSizeBytes / 1024).toFixed(1)} KB` : '—'} •
                    <a
                      className="ml-1 underline text-[#14ad9f]"
                      href={pdfPreviewUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Anzeigen
                    </a>
                    <a
                      className="ml-2 underline"
                      href={pdfPreviewUrl}
                      download={emailAttachmentName || 'Angebot.pdf'}
                    >
                      Download
                    </a>
                  </div>
                )}
                <div className="space-y-1">
                  <Label>Empfänger</Label>
                  <Input
                    value={emailTo}
                    onChange={e => setEmailTo(e.target.value)}
                    placeholder="kunde@example.com"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Betreff</Label>
                  <Input
                    value={emailSubject}
                    onChange={e => setEmailSubject(e.target.value)}
                    placeholder="Angebot …"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Text</Label>
                  <Textarea
                    rows={6}
                    value={emailBody}
                    onChange={e => setEmailBody(e.target.value)}
                    placeholder="Ihre Nachricht …"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    onClick={sendEmailWithPdf}
                    disabled={sendingEmail}
                    className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                  >
                    {sendingEmail ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4 mr-2" />
                    )}{' '}
                    Jetzt senden
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setEmailCardOpen(false)}>
                    Abbrechen
                  </Button>
                </div>
                <div className="text-xs text-gray-500">
                  {emailAttachmentReady ? (
                    <>Anhang bereit: {emailAttachmentName}</>
                  ) : emailAttachmentError ? (
                    <>
                      Anhang fehlgeschlagen: {emailAttachmentError}
                      <Button
                        type="button"
                        variant="link"
                        className="px-1"
                        onClick={async () => {
                          try {
                            setEmailAttachmentError(null);
                            setEmailAttachmentReady(false);
                            const data = buildPreviewData();
                            const filename = `Angebot-${(data.companyName || 'Angebot').replace(/[^a-z0-9]+/gi, '-')}-${data.date}.pdf`;
                            setEmailAttachmentName(filename);
                            await new Promise(r => setTimeout(r, 100));
                            const blob = await generatePdfBlob();
                            if (!blob || (blob as any).size === 0) throw new Error('Leeres PDF');
                            const base64 = await blobToBase64(blob);
                            setEmailAttachmentB64(base64);
                            setEmailAttachmentReady(true);
                          } catch (err: any) {
                            setEmailAttachmentError(
                              err?.message || 'PDF konnte nicht erstellt werden'
                            );
                            setEmailAttachmentReady(false);
                          }
                        }}
                      >
                        Erneut erstellen
                      </Button>
                    </>
                  ) : (
                    <>Anhang wird erstellt …</>
                  )}{' '}
                  • Absender:{' '}
                  {(() => {
                    const data = buildPreviewData();
                    const slug = (data.companyName || 'taskilo')
                      .normalize('NFKD')
                      .replace(/[\u0300-\u036f]/g, '')
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '');
                    return `${slug}@taskilo.de`;
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Vorschau-Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-[1000px] w-full p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Vorschau Angebot</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6">
            <div className="border rounded-md overflow-auto bg-white" style={{ maxHeight: '75vh' }}>
              <div className="p-4">
                <ProfessionalBusinessQuoteTemplate
                  data={{
                    documentNumber: buildPreviewData().quoteNumber,
                    date: buildPreviewData().date,
                    validUntil: buildPreviewData().validUntil,
                    customerName: buildPreviewData().customerName,
                    customerAddress: (() => {
                      const lines = (buildPreviewData().customerAddress || '').split('\n');
                      return {
                        street: lines[0] || '',
                        zipCode: (lines[1] || '').split(' ')[0] || '',
                        city: (lines[1] || '').split(' ').slice(1).join(' ') || '',
                        country: lines[2] || undefined,
                      };
                    })(),
                    items: buildPreviewData().items?.map(it => ({
                      description: it.description,
                      quantity: it.quantity,
                      unitPrice: it.unitPrice,
                    })) || [],
                    subtotal: buildPreviewData().subtotal,
                    taxRate: buildPreviewData().vatRate,
                    taxAmount: buildPreviewData().tax,
                    total: buildPreviewData().total,
                    notes: buildPreviewData().notes,
                    createdBy: buildPreviewData().contactPersonName,
                  }}
                  companySettings={{
                    companyName: buildPreviewData().companyName,
                    logoUrl:
                      buildPreviewData().companyLogo || buildPreviewData().profilePictureURL,
                    address: (() => {
                      const lines = (buildPreviewData().companyAddress || '').split('\n');
                      return {
                        street: lines[0] || '',
                        zipCode: (lines[1] || '').split(' ')[0] || '',
                        city: (lines[1] || '').split(' ').slice(1).join(' ') || '',
                        country: lines[2] || undefined,
                      };
                    })(),
                    contactInfo: {
                      email: buildPreviewData().companyEmail,
                      phone: buildPreviewData().companyPhone,
                      website: buildPreviewData().companyWebsite,
                    },
                    vatId: buildPreviewData().companyVatId,
                    taxId: buildPreviewData().companyTaxNumber,
                    bankDetails: buildPreviewData().bankDetails,
                  }}
                  customizations={{ showLogo: true }}
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Neues Produkt */}
      <NewProductModal
        open={createProductOpen}
        onOpenChange={setCreateProductOpen}
        defaultValues={newProduct}
        saving={creatingProduct}
        onSave={async vals => {
          if (!uid || !vals.name.trim()) return;
          setCreatingProduct(true);
          try {
            const itemId = await InventoryService.addInventoryItem(uid, {
              name: vals.name.trim(),
              description: vals.description || undefined,
              sku: vals.sku || '',
              category: vals.category || 'Allgemein',
              unit: vals.unit || 'Stk',
              currentStock: vals.stock || 0,
              reservedStock: 0,
              availableStock: (vals.stock || 0) - 0,
              minStock: 0,
              maxStock: undefined,
              purchasePrice: Number(vals.purchaseNet) || 0,
              sellingPrice: Number(vals.sellingNet) || 0,
              supplierName: undefined,
              supplierContact: undefined,
              location: undefined,
              barcode: undefined,
              image: vals.imageUrl || undefined,
              status: 'active',
              weight: undefined,
              dimensions: undefined,
              notes: vals.internalNote || undefined,
            });

            if (createProductForIndex !== null) {
              setItems(prev =>
                prev.map((it, i) =>
                  i === createProductForIndex
                    ? {
                        ...it,
                        inventoryItemId: itemId,
                        unit: vals.unit,
                        unitPrice:
                          Number.isFinite(it.unitPrice) && it.unitPrice > 0
                            ? it.unitPrice
                            : vals.sellingNet || 0,
                        total: computeItemTotalNet(
                          it.quantity,
                          Number.isFinite(it.unitPrice) && it.unitPrice > 0
                            ? it.unitPrice
                            : vals.sellingNet || 0
                        ),
                      }
                    : it
                )
              );
            }

            toast.success('Produkt angelegt und Position verknüpft');
            setCreateProductOpen(false);
          } catch (err) {
            console.error(err);
            toast.error('Produkt konnte nicht angelegt werden');
          } finally {
            setCreatingProduct(false);
          }
        }}
      />

      {/* Modal: Neuer Kunde */}
      <NewCustomerModal
        open={createCustomerOpen}
        onOpenChange={setCreateCustomerOpen}
        defaultValues={{
          name: formData.customerName || '',
        }}
        saving={creatingCustomer}
        persistDirectly={true}
        companyId={uid}
        onSaved={async (customerId) => {
          try {
            // Lade Kunden neu mit der existierenden Funktion
            const response = await getCustomers(uid);
            if (response.success && response.customers) {
              setCustomers(response.customers);
            }
            toast.success('Kunde erfolgreich erstellt');
          } catch (error) {
            console.error('Fehler beim Aktualisieren der Kundenliste:', error);
          }
        }}
      />

    </div>
  );
}

// Ende CreateQuotePage
