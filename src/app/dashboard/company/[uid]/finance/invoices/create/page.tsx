'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import FooterTextEditor from '@/components/finance/FooterTextEditor';
import InventorySelector from '@/components/quotes/InventorySelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  CheckCircle,
  AlertTriangle,
  MoreHorizontal,
  Copy,
  Download,
  Settings,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { QuoteService, Quote as QuoteType, QuoteItem } from '@/services/quoteService';
import { FirestoreInvoiceService as InvoiceService } from '@/services/firestoreInvoiceService';
import { InvoiceData as InvoiceType } from '@/types/invoiceTypes';
import { QuoteItem as InvoiceItem } from '@/services/quoteService';
import { getAllCurrencies } from '@/data/currencies';
import { getCustomers } from '@/utils/api/companyApi';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  ProfessionalBusinessTemplate,
  ExecutivePremiumTemplate,
  CreativeModernTemplate,
  MinimalistElegantTemplate,
  CorporateClassicTemplate,
  TechStartupTemplate as TechInnovationTemplate,
} from '@/components/templates/invoice-templates';

// Invoice Template Types
type InvoiceTemplate =
  | 'professional-business-invoice'
  | 'executive-premium-invoice'
  | 'creative-modern-invoice'
  | 'minimalist-elegant-invoice'
  | 'corporate-classic-invoice'
  | 'tech-innovation-invoice';
import { UserPreferencesService } from '@/lib/userPreferences';
import { TextTemplateService } from '@/services/TextTemplateService';
type PreviewTemplateData = {
  invoiceNumber: string;
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
  companyRegister?: string;
  items: Array<{
    id?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    taxRate?: number;
    category?: string;
    discountPercent?: number;
    unit?: string;
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
  paymentTerms?: string;
  deliveryTerms?: string;
  // Company-Objekt für Template-Kompatibilität
  company?: {
    name: string;
    email: string;
    phone: string;
    address: {
      street: string;
      zipCode: string;
      city: string;
      country: string;
    };
    taxNumber: string;
    vatId: string;
    bankDetails: {
      iban: string;
      bic: string;
      accountHolder: string;
    };
  };
};
import { db } from '@/firebase/clients';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { Switch } from '@/components/ui/switch';
import { InventoryService } from '@/services/inventoryService';
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
  vatId?: string;
  vatValidated?: boolean;
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

  // Template Auswahl & User Preferences
  const [selectedTemplate, setSelectedTemplate] = useState<InvoiceTemplate>(
    'professional-business-invoice'
  );
  const [loadingTemplate, setLoadingTemplate] = useState(true);

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

  // Kontakttyp State (neu für SevDesk-Style Interface)
  const [contactType, setContactType] = useState<'organisation' | 'person'>('organisation');

  // Adresszusatz State
  const [showAddressAddition, setShowAddressAddition] = useState(false);

  // Lieferdatum State (Einzeldatum vs. Zeitraum)
  const [deliveryDateType, setDeliveryDateType] = useState<'single' | 'range'>('single');
  const [deliveryDateRange, setDeliveryDateRange] = useState<{from?: Date; to?: Date}>({});
  const [deliveryDatePopoverOpen, setDeliveryDatePopoverOpen] = useState(false);

  // Textvorlagen State
  const [textTemplates, setTextTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedHeadTemplate, setSelectedHeadTemplate] = useState<string>('');
  const [selectedFooterTemplate, setSelectedFooterTemplate] = useState<string>('');

  // Nummernkreis Modal State
  const [showNumberingModal, setShowNumberingModal] = useState(false);
  const [numberingFormat, setNumberingFormat] = useState('RE-%NUMBER');
  const [nextNumber, setNextNumber] = useState(1000);

  // E-Rechnung State
  const [eInvoiceEnabled, setEInvoiceEnabled] = useState(false);
  const [showCompliancePanel, setShowCompliancePanel] = useState(false);
  const [complianceErrors, setComplianceErrors] = useState<string[]>([]);
  const [eInvoiceSettings, setEInvoiceSettings] = useState<any>(null);
  const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set());

  // Company Settings Banner State
  const [showCompanySettingsBanner, setShowCompanySettingsBanner] = useState(false);
  const [showCompanySettingsModal, setShowCompanySettingsModal] = useState(false);
  const [companySettingsFormData, setCompanySettingsFormData] = useState({
    companyOwner: '',
    companyName: '',
    street: '',
    zip: '',
    city: '',
    taxNumber: '',
    vatNumber: '',
    email: '',
    phone: '',
    iban: '',
    bic: '',
  });

  // Customer helper functions
  const selectCustomer = (customer: Customer) => {
    setFormData(prev => ({
      ...prev,
      customerName: customer.name,
      customerEmail: customer.email,
      customerNumber: customer.customerNumber || '',
      customerAddress: 
        customer.street && customer.city
          ? `${customer.street}\n${customer.postalCode || ''} ${customer.city}\n${customer.country || 'Deutschland'}`
          : prev.customerAddress,
    }));
    setShowCustomerSearchPopup(false);
  };

  const setShowNewCustomerModal = (show: boolean) => {
    console.log('setShowNewCustomerModal aufgerufen mit:', show);
    console.log('createCustomerOpen current state:', createCustomerOpen);
    setCreateCustomerOpen(show);
    console.log('setCreateCustomerOpen aufgerufen mit:', show);
  };

  // Nummernkreis Vorschau generieren
  const generateNumberPreview = (format: string, number: number): string => {
    const now = new Date();
    return format
      .replace('%NUMBER', number.toString())
      .replace('%YYYY', now.getFullYear().toString())
      .replace('%YY', now.getFullYear().toString().slice(-2))
      .replace('%MM', (now.getMonth() + 1).toString().padStart(2, '0'))
      .replace('%M', (now.getMonth() + 1).toString())
      .replace('%DD', now.getDate().toString().padStart(2, '0'))
      .replace('%D', now.getDate().toString());
  };

  // Sync Preisfelder Netto/Brutto
  const syncGrossFromNet = (net: number, rate: number) =>
    Number.isFinite(net) ? net * (1 + Math.max(0, rate) / 100) : 0;
  const syncNetFromGross = (gross: number, rate: number) =>
    Number.isFinite(gross) ? gross / (1 + Math.max(0, rate) / 100) : 0;

  // Popover-Open-Status pro Zeile und Debounce-Timer pro Item
  const itemsRef = useRef<InvoiceItem[]>([]);
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
    customerFirstName: '',
    customerLastName: '',
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
  // Wichtig: settings als Dependency, damit Template-Daten automatisch aktualisiert werden
  useEffect(() => {
    const loadCompany = async () => {
      if (!uid || !user || user.uid !== uid) return;
      try {
        const snap = await getDoc(doc(db, 'companies', uid));
        if (snap.exists()) {
          const companyData = snap.data();
          setCompany(companyData);
          
          // Prüfe Vollständigkeit der Unternehmensdaten für Banner
          const requiredFields = [
            companyData.companyName,
            companyData.companyStreet,
            companyData.companyCity,
            companyData.companyPostalCode,
            companyData.vatId || companyData.taxNumber || companyData.step3?.vatId || companyData.step3?.taxNumber,
          ];
          
          const missingRequiredFields = requiredFields.some(field => !field?.trim());
          const missingOptionalFields = !companyData.email && !companyData.phoneNumber && !companyData.iban;
          
          // Zeige Banner wenn wichtige Felder fehlen
          if (missingRequiredFields || missingOptionalFields) {
            setShowCompanySettingsBanner(true);
            
            // Vorausfüllen der Formulardaten für das Modal
            setCompanySettingsFormData({
              companyOwner: companyData.firstName && companyData.lastName 
                ? `${companyData.firstName} ${companyData.lastName}` 
                : '',
              companyName: companyData.companyName || '',
              street: companyData.companyStreet || '',
              zip: companyData.companyPostalCode || '',
              city: companyData.companyCity || '',
              taxNumber: companyData.taxNumber || companyData.step3?.taxNumber || '',
              vatNumber: companyData.vatId || companyData.step3?.vatId || '',
              email: companyData.email || '',
              phone: companyData.phoneNumber || companyData.companyPhoneNumber || '',
              iban: companyData.iban || companyData.step4?.iban || '',
              bic: companyData.bic || companyData.step4?.bic || '',
            });
          }
        }
      } catch (e) {
        // still render, but without company info
      }
    };
    loadCompany();
  }, [uid, user, settings]); // settings als Dependency hinzugefügt für automatische Template-Updates

  // Nummernkreis-Einstellungen laden
  useEffect(() => {
    const loadNumberingSettings = async () => {
      if (!uid) return;

      try {
        const companyRef = doc(db, 'companies', uid);
        const companySnap = await getDoc(companyRef);
        
        if (companySnap.exists()) {
          const data = companySnap.data();
          const numbering = data.invoiceNumbering;
          
          if (numbering) {
            setNumberingFormat(numbering.format || 'RE-%NUMBER');
            setNextNumber(numbering.nextNumber || 1000);
            
            // Setze die aktuelle Rechnungsnummer basierend auf den geladenen Einstellungen
            setFormData(prev => ({
              ...prev,
              title: generateNumberPreview(numbering.format || 'RE-%NUMBER', numbering.nextNumber || 1000)
            }));
          }
        }
      } catch (error) {
        console.error('Fehler beim Laden der Nummernkreis-Einstellungen:', error);
      }
    };

    loadNumberingSettings();
  }, [uid]);

  // Steuerlogik aus der Auswahl ableiten (berücksichtigt Standard-Steuersatz aus Einstellungen)
  useEffect(() => {
    if (formData.taxRule === 'DE_TAXABLE') {
      const rate = settings?.defaultTaxRate ? parseInt(settings.defaultTaxRate, 10) : 19;
      setTaxRate(Number.isFinite(rate) ? rate : 19);
    } else {
      setTaxRate(0);
    }
  }, [formData.taxRule, settings?.defaultTaxRate]);

  // Template Auswahl & User Preferences laden
  useEffect(() => {
    if (!user?.uid) return;

    const loadUserTemplate = async () => {
      try {
        setLoadingTemplate(true);
        // Lade direkt die User Preferences
        const preferences = await UserPreferencesService.getUserPreferences(user.uid, uid);

        if (preferences.preferredQuoteTemplate) {
          setSelectedTemplate(preferences.preferredInvoiceTemplate as InvoiceTemplate);
        } else {
          // Fallback auf corporate-classic-quote laut Datenbank
          setSelectedTemplate('corporate-classic-invoice');
        }
      } catch (error) {
        console.warn('Fehler beim Laden der Template-Preferences:', error);
        setSelectedTemplate('corporate-classic-invoice'); // Fallback
      } finally {
        setLoadingTemplate(false);
      }
    };

    loadUserTemplate();
  }, [user?.uid, uid]);

  // Textvorlagen laden
  useEffect(() => {
    const loadTextTemplates = async () => {
      if (!uid) return;

      try {
        setLoadingTemplates(true);
        const templates = await TextTemplateService.getTextTemplates(uid);
        setTextTemplates(templates);

        // Standard-Templates automatisch auswählen
        const headTemplate = templates.find(
          t => t.objectType === 'INVOICE' && t.textType === 'HEAD' && t.isDefault
        );
        const footerTemplate = templates.find(
          t => t.objectType === 'INVOICE' && t.textType === 'FOOT' && t.isDefault
        );

        if (headTemplate && !formData.headTextHtml) {
          setSelectedHeadTemplate(headTemplate.id);
          setFormData(prev => ({ ...prev, headTextHtml: headTemplate.text }));
        }

        if (footerTemplate && !formData.footerText) {
          setSelectedFooterTemplate(footerTemplate.id);
          setFormData(prev => ({ ...prev, footerText: footerTemplate.text }));
        }
      } catch (error) {
        console.error('Fehler beim Laden der Textvorlagen:', error);
      } finally {
        setLoadingTemplates(false);
      }
    };

    loadTextTemplates();
  }, [uid, formData.headTextHtml, formData.footerText]);

  // Template-Komponente dynamisch rendern
  const renderTemplateComponent = (templateId: InvoiceTemplate) => {
    const components = {
      'professional-business-invoice': ProfessionalBusinessTemplate,
      'executive-premium-invoice': ExecutivePremiumTemplate,
      'creative-modern-invoice': CreativeModernTemplate,
      'minimalist-elegant-invoice': MinimalistElegantTemplate,
      'corporate-classic-invoice': CorporateClassicTemplate,
      'tech-innovation-invoice': TechInnovationTemplate,
    };

    const TemplateComponent = components[templateId] || CorporateClassicTemplate;
    return TemplateComponent;
  };
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

  // E-Rechnung Einstellungen laden
  useEffect(() => {
    const loadEInvoiceSettings = async () => {
      if (!uid) return;
      
      try {
        // Check if E-Rechnung settings exist in company document
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('@/firebase/clients');
        const companyRef = doc(db, 'companies', uid);
        const companySnap = await getDoc(companyRef);
        
        if (companySnap.exists()) {
          const companyData = companySnap.data();
          const einvoiceSettings = companyData.eInvoiceSettings;
          
          if (einvoiceSettings) {
            setEInvoiceSettings(einvoiceSettings);
            setEInvoiceEnabled(Boolean(einvoiceSettings.enableAutoGeneration));
          } else {
            setEInvoiceEnabled(false);
          }
        } else {
          setEInvoiceEnabled(false);
        }
      } catch (error) {
        console.log('E-Rechnung Settings konnten nicht geladen werden:', error);
        setEInvoiceEnabled(false);
      }
    };
    loadEInvoiceSettings();
  }, [uid]);

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

  // Platzhalter-Ersetzung für Textvorlagen
  const replacePlaceholders = (text: string, data: PreviewTemplateData): string => {
    if (!text) return '';

    // Erstelle Platzhalter-Mapping
    const placeholders = {
      // Kunden-Information
      '[%KUNDENNAME%]': data.customerName || '',
      '[%KUNDENNUMMER%]': formData.customerNumber || '',
      '[%KUNDENADRESSE%]': data.customerAddress || '',
      '[%KUNDENANREDE%]': data.customerName ? `Sehr geehrte Damen und Herren` : '',
      '[%VOLLEANREDE%]': data.customerName ? `Sehr geehrte Damen und Herren` : '',

      // Rechnungs-Information
      '[%RECHNUNGSNUMMER%]': data.invoiceNumber || '',
      '[%ANGEBOTSNUMMER%]': data.invoiceNumber || '', // Fallback für gemischte Templates
      '[%RECHNUNGSDATUM%]': formatDateDE(data.date) || '',
      '[%ZAHLUNGSZIEL%]': formatDateDE(data.validUntil) || '',
      '[%LEISTUNGSDATUM%]': formatDateDE(data.date) || '',

      // Finanz-Information
      '[%BETRAG%]': formatCurrency(data.total),
      '[%NETTOBETRAG%]': formatCurrency(data.subtotal),
      '[%STEUERBETRAG%]': formatCurrency(data.tax),
      '[%WAEHRUNG%]': data.currency || 'EUR',
      '[%STEUERSATZ%]': `${data.vatRate || 0}%`,

      // Unternehmens-Information
      '[%KONTAKTPERSON%]': data.contactPersonName || data.companyName || '',
      '[%FIRMENNAME%]': data.companyName || '',
      '[%FIRMENADRESSE%]': data.companyAddress || '',
      '[%FIRMENTELEFON%]': data.companyPhone || '',
      '[%FIRMENEMAIL%]': data.companyEmail || '',
      '[%FIRMENWEBSITE%]': data.companyWebsite || '',
      '[%UMSATZSTEUERID%]': data.companyVatId || '',
      '[%STEUERNUMMER%]': data.companyTaxNumber || '',

      // Bank-Information
      '[%IBAN%]': data.bankDetails?.iban || '',
      '[%BIC%]': data.bankDetails?.bic || '',
      '[%BANKNAME%]': data.bankDetails?.bankName || '',
      '[%KONTOINHABER%]': data.bankDetails?.accountHolder || '',

      // Sonstige
      '[%DATUM%]': formatDateDE(new Date()),
      '[%TITEL%]': data.title || '',
      '[%REFERENZ%]': data.reference || '',
    };

    // Alle Platzhalter ersetzen
    let result = text;
    Object.entries(placeholders).forEach(([placeholder, value]) => {
      const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      result = result.replace(regex, value);
    });

    return result;
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
      invoiceNumber: 'Vorschau',
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
      companyPhone:
        (company?.phoneNumber as string) || (company?.companyPhoneNumber as string) || undefined,
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
      companyRegister:
        (company?.companyRegisterPublic as string) ||
        (company?.companyRegister as string) ||
        (company as any)?.step3?.companyRegister ||
        ((settings as any)?.districtCourt as string) ||
        ((settings as any)?.companyRegister as string) ||
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
          discountPercent: it.discountPercent || 0,
          unit: it.unit,
        };
      }),
      subtotal,
      tax: showNet ? 0 : vat, // Bei Netto-Anzeige keine Steuer anzeigen
      total: showNet ? subtotal : grandTotal, // Bei Netto-Anzeige nur Netto-Summe zeigen
      vatRate: showNet ? 0 : taxRate, // Bei Netto-Anzeige keine Steuer-Rate anzeigen
      isSmallBusiness: settings?.ust === 'kleinunternehmer' || taxRate === 0,
      bankDetails: company
        ? {
            iban:
              (company as any)?.step4?.iban ||
              (company?.iban as string) ||
              ((settings as any)?.step4?.iban as string) ||
              undefined,
            bic:
              (company as any)?.step4?.bic ||
              (company?.bic as string) ||
              ((settings as any)?.step4?.bic as string) ||
              undefined,
            bankName:
              (company as any)?.step4?.bankName ||
              (company?.bankName as string) ||
              ((settings as any)?.step4?.bankName as string) ||
              undefined,
            accountHolder:
              (company as any)?.step4?.accountHolder ||
              (company?.accountHolder as string) ||
              ((settings as any)?.step4?.accountHolder as string) ||
              (settings as any)?.accountHolder ||
              (companyName as string) ||
              undefined,
          }
        : undefined,
      notes: previewNotes,
      headTextHtml: formData.headTextHtml || undefined,
      footerText: formData.footerText || undefined,
      contactPersonName: contactPersonNameForFooter,
      paymentTerms: finalPaymentTerms || undefined,
      deliveryTerms: formData.deliveryTerms || undefined,
      // Company-Objekt für Template-Kompatibilität
      company: {
        name: companyName,
        email: (company?.email as string) || '',
        phone: (company?.phoneNumber as string) || (company?.companyPhoneNumber as string) || '',
        address: (() => {
          const lines = companyAddress.split('\n');
          return {
            street: lines[0] || '',
            zipCode: (lines[1] || '').split(' ')[0] || '',
            city: (lines[1] || '').split(' ').slice(1).join(' ') || '',
            country: lines[2] || '',
          };
        })(),
        taxNumber: (company?.taxNumber as string) ||
          (company as any)?.taxNumberForBackend ||
          (company as any)?.step3?.taxNumber ||
          ((settings as any)?.taxNumber as string) ||
          '',
        vatId: (company?.vatId as string) ||
          (company as any)?.vatIdForBackend ||
          (company as any)?.step3?.vatId ||
          ((settings as any)?.vatId as string) ||
          '',
        bankDetails: {
          iban: (company as any)?.step4?.iban ||
            (company?.iban as string) ||
            ((settings as any)?.step4?.iban as string) ||
            '',
          bic: (company as any)?.step4?.bic ||
            (company?.bic as string) ||
            ((settings as any)?.step4?.bic as string) ||
            '',
          accountHolder: (company as any)?.step4?.accountHolder ||
            (company?.accountHolder as string) ||
            ((settings as any)?.step4?.accountHolder as string) ||
            (settings as any)?.accountHolder ||
            companyName ||
            '',
        },
      },
    };

    return data;
  };

  // Platzhalter in Textvorlagen ersetzen
  const getProcessedPreviewData = (): PreviewTemplateData => {
    const data = buildPreviewData();

    // Platzhalter in Kopf- und Fußtext ersetzen
    const processedData = {
      ...data,
      headTextHtml: data.headTextHtml ? replacePlaceholders(data.headTextHtml, data) : undefined,
      footerText: data.footerText ? replacePlaceholders(data.footerText, data) : undefined,
    };

    return processedData;
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

      // Verwende das bestehende Template-Datenformat - angepasst für Invoice mit Platzhaltern
      const templateData = {
        ...getProcessedPreviewData(),
        dueDate: getProcessedPreviewData().validUntil, // Fälligkeitsdatum für Rechnungen
      };

      console.log('[PDF] Template-Daten erstellt', {
        companyName: templateData.companyName,
        customerName: templateData.customerName,
        invoiceNumber: templateData.invoiceNumber,
        itemCount: templateData.items?.length || 0,
        total: templateData.total,
        currency: templateData.currency,
      });

      // React-PDF importieren
      const { pdf } = await import('@react-pdf/renderer');
      const { default: GermanStandardInvoicePDF } = await import(
        '@/components/pdf/GermanStandardInvoicePDF'
      );

      // PDF mit dem umgeschriebenen Template generieren
      const blob = await pdf(<GermanStandardInvoicePDF data={templateData} />).toBlob();

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
      const data = getProcessedPreviewData();
      const filename = `Rechnung-${(data.companyName || 'Rechnung').replace(/[^a-z0-9]+/gi, '-')}-${data.date}.pdf`;

      // 1) Server-seitiges PDF versuchen (höchste Qualität)
      try {
        const previewData = getProcessedPreviewData();
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
      const data = getProcessedPreviewData();
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
      const data = getProcessedPreviewData();
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
      
      // Erhöhe die nächste Nummer im Nummernkreis nach erfolgreichem Speichern
      if (!asDraft) {
        try {
          const companyRef = doc(db, 'companies', uid);
          await updateDoc(companyRef, {
            'invoiceNumbering.nextNumber': nextNumber + 1
          });
          // Aktualisiere auch den lokalen State
          setNextNumber(prev => prev + 1);
        } catch (error) {
          console.error('Fehler beim Aktualisieren der nächsten Nummer:', error);
          // Nicht kritisch, deshalb kein toast.error
        }
      }
      
      router.push(`/dashboard/company/${uid}/finance/quotes`);
    } catch (e) {
      console.error(e);
      toast.error('Angebot konnte nicht gespeichert werden');
    } finally {
      setLoading(false);
    }
  };

  // E-Rechnung Toggle Handler
  const handleEInvoiceToggle = async (enabled: boolean) => {
    if (!enabled) {
      setEInvoiceEnabled(false);
      return;
    }
    
    // Umfassende E-Rechnung Compliance Prüfung
    try {
      const complianceErrors: string[] = [];
      const invalidFieldsSet = new Set<string>();
      
      // 1. Lade Company-Daten für vollständige Prüfung
      let companyData: any = null;
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('@/firebase/clients');
        const companyRef = doc(db, 'companies', uid);
        const companySnap = await getDoc(companyRef);
        if (companySnap.exists()) {
          companyData = companySnap.data();
        } else {
          complianceErrors.push('Unternehmensdaten nicht gefunden');
        }
      } catch (error) {
        complianceErrors.push('Fehler beim Laden der Unternehmensdaten');
      }
      
      // 2. Unternehmensdaten Prüfung (§14 UStG) - aus companies collection
      if (companyData) {
        // Firmenname (Pflichtfeld)
        if (!companyData.companyName?.trim()) {
          complianceErrors.push('Firmenname ist erforderlich');
        }
        
        // Vollständige Firmenanschrift prüfen (aus der echten DB-Struktur)
        if (!companyData.companyStreet?.trim()) {
          complianceErrors.push('Firmenstraße ist erforderlich');
        }
        if (!companyData.companyCity?.trim()) {
          complianceErrors.push('Firmenort ist erforderlich');
        }
        if (!companyData.companyPostalCode?.trim()) {
          complianceErrors.push('Postleitzahl der Firma ist erforderlich');
        }
        if (!companyData.companyCountry?.trim()) {
          complianceErrors.push('Land der Firma ist erforderlich');
        }
        
        // E-Mail für Versendung (aus der echten DB-Struktur)
        const hasEmail = companyData.contactEmail?.trim() || companyData.email?.trim();
        if (!hasEmail) {
          complianceErrors.push('Firmen-E-Mail-Adresse ist erforderlich');
        }
        
        // Telefonnummer (aus der echten DB-Struktur)
        const hasPhone = companyData.companyPhoneNumber?.trim() || companyData.phoneNumber?.trim();
        if (!hasPhone) {
          complianceErrors.push('Firmen-Telefonnummer ist für E-Rechnungen empfohlen');
        }
        
        // Steuerliche Identifikation (aus der echten DB-Struktur)
        const hasVatId = companyData.vatId?.trim() || companyData.step3?.vatId?.trim();
        const hasTaxNumber = companyData.taxNumber?.trim() || companyData.step3?.taxNumber?.trim();
        
        if (!hasVatId && !hasTaxNumber) {
          complianceErrors.push('USt-IdNr. oder Steuernummer ist erforderlich für E-Rechnungen');
        }
        
        // Kleinunternehmer-spezifische Prüfung (aus der echten DB-Struktur)
        const isKleinunternehmer = companyData.kleinunternehmer === 'ja' || 
                                   companyData.ust === 'kleinunternehmer' || 
                                   companyData.step2?.kleinunternehmer === 'ja';
        
        if (isKleinunternehmer) {
          if (hasVatId) {
            complianceErrors.push('Kleinunternehmer dürfen keine USt-IdNr. auf Rechnungen ausweisen');
          }
          if (!hasTaxNumber) {
            complianceErrors.push('Kleinunternehmer benötigen eine Steuernummer für E-Rechnungen');
          }
        } else {
          // Regelbesteuerte Unternehmen
          if (!hasVatId && !hasTaxNumber) {
            complianceErrors.push('Regelbesteuerte Unternehmen benötigen USt-IdNr. oder Steuernummer');
          }
        }
        
        // Rechtsform und Registrierung (aus der echten DB-Struktur)
        const legalForm = companyData.legalForm || companyData.step2?.legalForm;
        if (legalForm && legalForm !== 'Einzelunternehmen' && legalForm !== 'Freiberufler') {
          // Kapitalgesellschaften benötigen Handelsregistereintrag
          const hasRegister = companyData.companyRegister?.trim() || 
                             companyData.step3?.companyRegister?.trim() ||
                             companyData.registrationNumber?.trim();
          if (!hasRegister) {
            complianceErrors.push('Handelsregisternummer ist für Kapitalgesellschaften erforderlich');
          }
        }
        
        // Bankverbindung für Zahlungen (aus der echten DB-Struktur)
        const hasIban = companyData.iban?.trim() || companyData.step4?.iban?.trim();
        const hasBic = companyData.bic?.trim() || companyData.step4?.bic?.trim();
        const hasBankName = companyData.bankName?.trim() || companyData.step4?.bankName?.trim();
        const hasAccountHolder = companyData.accountHolder?.trim() || companyData.step4?.accountHolder?.trim();
        
        if (!hasIban) {
          complianceErrors.push('IBAN ist für E-Rechnungen erforderlich');
        }
        if (!hasBic) {
          complianceErrors.push('BIC ist für E-Rechnungen erforderlich');
        }
        if (!hasBankName) {
          complianceErrors.push('Bankname ist für E-Rechnungen erforderlich');
        }
        if (!hasAccountHolder) {
          complianceErrors.push('Kontoinhaber ist für E-Rechnungen erforderlich');
        }
        
        // Website (aus der echten DB-Struktur)
        const hasWebsite = companyData.website?.trim() || 
                          companyData.companyWebsite?.trim() || 
                          companyData.step1?.website?.trim() ||
                          companyData.companyWebsiteForBackend?.trim();
        if (!hasWebsite) {
          complianceErrors.push('Firmen-Website ist für professionelle E-Rechnungen empfohlen');
        }
        
        // Logo für Branding (aus der echten DB-Struktur)
        const hasLogo = companyData.profilePictureURL?.trim() || 
                       companyData.profilePictureFirebaseUrl?.trim();
        if (!hasLogo) {
          complianceErrors.push('Firmen-Logo ist für professionelle E-Rechnungen empfohlen');
        }
        
        // Branchenangabe (aus der echten DB-Struktur)
        const hasIndustry = companyData.selectedCategory?.trim() || 
                           companyData.step2?.industry?.trim() ||
                           companyData.industry?.trim();
        if (!hasIndustry) {
          complianceErrors.push('Branchenangabe ist für E-Rechnungen empfohlen');
        }
        
        // Geschäftsbeschreibung (aus der echten DB-Struktur)
        if (!companyData.description?.trim()) {
          complianceErrors.push('Geschäftsbeschreibung ist für professionelle E-Rechnungen empfohlen');
        }
      } else {
        complianceErrors.push('Unternehmensdaten nicht vollständig - bitte Firmenprofil vervollständigen');
      }
      
      // 3. Kundendaten Prüfung - Prüfe ob gültiger Kunde ausgewählt wurde
      const selectedCustomer = customers.find(c => c.name === formData.customerName);
      
      if (!formData.customerName.trim()) {
        complianceErrors.push('Kundenname ist erforderlich');
        invalidFieldsSet.add('customerName');
      } else if (!selectedCustomer) {
        // Neuer Kunde - prüfe manuell eingegebene Daten
        if (!formData.customerAddress?.trim()) {
          complianceErrors.push('Vollständige Kundenanschrift ist erforderlich');
          invalidFieldsSet.add('customerAddress');
        } else {
          const addressLines = formData.customerAddress.split('\n').filter(line => line.trim());
          if (addressLines.length < 3) {
            complianceErrors.push('Kundenanschrift muss Straße, PLZ/Ort und Land enthalten');
            invalidFieldsSet.add('customerAddress');
          }
        }
        
        if (!formData.customerEmail?.trim()) {
          complianceErrors.push('Kunden-E-Mail-Adresse für E-Rechnung Versendung erforderlich');
          invalidFieldsSet.add('customerEmail');
        }
      } else {
        // Existierender Kunde - prüfe Vollständigkeit in der Customers Collection
        if (!selectedCustomer.email?.trim()) {
          complianceErrors.push(`Kunde &quot;${selectedCustomer.name}&quot; hat keine E-Mail-Adresse hinterlegt`);
        }
        
        if (!selectedCustomer.street?.trim() || !selectedCustomer.city?.trim() || !selectedCustomer.postalCode?.trim()) {
          complianceErrors.push(`Kunde &quot;${selectedCustomer.name}&quot; hat unvollständige Adressdaten`);
        }
        
        // Für B2B-Kunden (mit VAT-ID) zusätzliche Prüfungen
        if (selectedCustomer.vatId?.trim()) {
          if (!selectedCustomer.vatValidated) {
            complianceErrors.push(`USt-IdNr. von Kunde &quot;${selectedCustomer.name}&quot; ist nicht validiert`);
          }
        }
      }
      
      // 4. Rechnungsdaten Prüfung
      if (!formData.title?.trim()) {
        complianceErrors.push('Rechnungsnummer ist erforderlich');
        invalidFieldsSet.add('title');
      }
      
      // 5. Positionen Prüfung
      const validItems = items.filter(item => 
        item.description?.trim() && 
        item.quantity > 0 && 
        item.unitPrice >= 0 &&
        item.category !== 'discount'
      );
      
      if (validItems.length === 0) {
        complianceErrors.push('Mindestens eine gültige Position ist erforderlich');
        invalidFieldsSet.add('items');
      }
      
      // 6. Steuerliche Prüfung
      if (!formData.taxRule) {
        complianceErrors.push('Steuerliche Behandlung muss definiert sein');
        invalidFieldsSet.add('taxRule');
      }
      
      // 7. E-Rechnung spezifische Anforderungen
      if (contactType === 'organisation') {
        // Für B2B E-Rechnungen
        if (!formData.customerEmail) {
          complianceErrors.push('Kunden-E-Mail-Adresse für E-Rechnung Versendung erforderlich');
        }
      }
      
      // 8. Format-spezifische Prüfungen
      const defaultFormat = eInvoiceSettings?.defaultFormat || 'zugferd';
      
      if (defaultFormat === 'xrechnung') {
        // XRechnung benötigt zusätzliche Metadaten
        if (!formData.customerOrderNumber?.trim()) {
          complianceErrors.push('Bestellnummer für XRechnung erforderlich');
        }
      }
      
      // 9. Betragsprüfung
      const totalAmount = subtotal + vat;
      if (totalAmount <= 0) {
        complianceErrors.push('Rechnungsbetrag muss größer als 0 sein');
      }
      
      // 10. Währungsprüfung
      if (formData.currency !== 'EUR') {
        complianceErrors.push('E-Rechnungen werden aktuell nur in EUR unterstützt');
      }
      
      // 11. Datum Prüfungen
      const today = new Date();
      const invoiceDate = new Date();
      
      if (invoiceDate > today) {
        complianceErrors.push('Rechnungsdatum darf nicht in der Zukunft liegen');
      }
      
      // Zeige Compliance Fehler oder aktiviere E-Rechnung
      if (complianceErrors.length > 0) {
        setEInvoiceEnabled(false);
        setComplianceErrors(complianceErrors);
        setInvalidFields(invalidFieldsSet);
        setShowCompliancePanel(true);
        
        // Kurze Toast-Nachricht mit Hinweis auf Panel
        toast.error('E-Rechnung kann nicht aktiviert werden', {
          description: `${complianceErrors.length} Probleme gefunden. Fehlende Felder sind rot markiert.`,
          duration: 5000,
        });
        
        return;
      }
      
      // Alle Prüfungen bestanden - E-Rechnung aktivieren
      setEInvoiceEnabled(true);
      setInvalidFields(new Set()); // Clear invalid fields
      
      // Update settings in company document
      try {
        const { doc, updateDoc } = await import('firebase/firestore');
        const { db } = await import('@/firebase/clients');
        
        const updatedSettings = {
          defaultFormat: eInvoiceSettings?.defaultFormat || 'zugferd',
          defaultStandard: eInvoiceSettings?.defaultStandard || 'EN16931',
          enableAutoGeneration: true,
          peppol: eInvoiceSettings?.peppol || {
            enabled: false,
            participantId: '',
            endpoint: '',
          },
          validation: eInvoiceSettings?.validation || {
            strictMode: true,
            autoCorrection: false,
          },
          updatedAt: new Date(),
        };
        
        const companyRef = doc(db, 'companies', uid);
        await updateDoc(companyRef, {
          'eInvoiceSettings': updatedSettings
        });
        
        setEInvoiceSettings(updatedSettings);
      } catch (updateError) {
        console.error('Fehler beim Speichern der E-Rechnung Einstellungen:', updateError);
        // Don't fail the whole process if settings can't be saved
      }
      
      toast.success('E-Rechnung aktiviert', {
        description: 'Alle Compliance-Anforderungen erfüllt. E-Rechnungen werden automatisch generiert.',
      });
      
    } catch (error) {
      console.error('Fehler bei E-Rechnung Compliance-Prüfung:', error);
      toast.error('E-Rechnung Prüfung fehlgeschlagen', {
        description: 'Technischer Fehler bei der Compliance-Prüfung. Bitte versuchen Sie es erneut.',
      });
      setEInvoiceEnabled(false);
    }
  };

  // Company Settings Save Handler
  const handleCompanySettingsSave = async () => {
    try {
      const companyRef = doc(db, 'companies', uid);
      await updateDoc(companyRef, {
        companyName: companySettingsFormData.companyName,
        companyStreet: companySettingsFormData.street,
        companyCity: companySettingsFormData.city,
        companyPostalCode: companySettingsFormData.zip,
        taxNumber: companySettingsFormData.taxNumber,
        vatId: companySettingsFormData.vatNumber,
        email: companySettingsFormData.email,
        phoneNumber: companySettingsFormData.phone,
        iban: companySettingsFormData.iban,
        bic: companySettingsFormData.bic,
        firstName: companySettingsFormData.companyOwner.split(' ')[0] || '',
        lastName: companySettingsFormData.companyOwner.split(' ').slice(1).join(' ') || '',
        updatedAt: new Date(),
      });

      toast.success('Unternehmensdaten gespeichert');
      setShowCompanySettingsModal(false);
      setShowCompanySettingsBanner(false);
      
      // Reload company data
      const snap = await getDoc(companyRef);
      if (snap.exists()) {
        setCompany(snap.data());
      }
    } catch (error) {
      console.error('Fehler beim Speichern der Unternehmensdaten:', error);
      toast.error('Fehler beim Speichern der Unternehmensdaten');
    }
  };

  // Hilfsfunktion für fehlerhafte Felder
  const getFieldErrorClass = (fieldName: string) => {
    return invalidFields.has(fieldName) 
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
      : '';
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header - SevDesk Style */}
      <header className="w-full" style={{ maxWidth: '1440px' }}>
        <div className="flex items-center justify-between py-4 border-b border-gray-200">
          {/* Left side - Title */}
          <div className="flex items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Neue Rechnung</h2>
            </div>
          </div>

          {/* Right side - Controls and Actions */}
          <div className="flex items-center gap-4">
            {/* E-Rechnung Toggle */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Switch 
                  checked={eInvoiceEnabled}
                  onCheckedChange={handleEInvoiceToggle}
                  style={{
                    backgroundColor: eInvoiceEnabled ? '#14ad9f' : undefined
                  }}
                  className=""
                />
                <span className="text-sm font-medium text-gray-700">E-Rechnung</span>
              </div>
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-gray-300"></div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="default"
                onClick={() => setPreviewOpen(true)}
              >
                Vorschau
              </Button>
              <Button 
                variant="outline" 
                size="default"
                onClick={() => handleSubmit(true)}
                disabled={loading}
              >
                Speichern
              </Button>
              <Button 
                className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                size="default"
                onClick={() => handleSubmit(false)}
                disabled={loading}
              >
                Überprüfen und senden
              </Button>

              {/* More Options Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="default" className="px-2">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => {
                    // TODO: Aufgabe erstellen Funktionalität implementieren
                    toast.success('Aufgabe erstellen - Feature wird implementiert');
                  }} className="w-full">
                    <div className="w-full">
                      <Button 
                        variant="default" 
                        className="w-full bg-[#14ad9f] hover:bg-[#129488] text-white justify-center"
                        size="sm"
                      >
                        Aufgabe erstellen
                      </Button>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    // TODO: Löschen Funktionalität implementieren
                    toast.success('Löschen - Feature wird implementiert');
                  }} className="w-full">
                    <div className="w-full">
                      <Button 
                        variant="default" 
                        className="w-full bg-gray-600 hover:bg-gray-700 text-white justify-center"
                        size="sm"
                      >
                        Löschen
                      </Button>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Company Settings Warning Banner */}
      {showCompanySettingsBanner && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium text-orange-800 mb-1">
                Angaben zu deinem Unternehmen
              </div>
              <div className="text-sm text-orange-700 mb-3">
                Damit deine Rechnungen rechtssicher und GoBD-konform sind, ergänze noch Angaben zu dir und deinem Unternehmen.
              </div>
              <Button 
                onClick={() => setShowCompanySettingsModal(true)}
                className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                size="sm"
              >
                Angaben vervollständigen
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCompanySettingsBanner(false)}
              className="p-1 h-auto"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* E-Rechnung Compliance Panel */}
      {showCompliancePanel && (
        <Sheet open={showCompliancePanel} onOpenChange={setShowCompliancePanel}>
          <SheetContent className="w-[400px] sm:w-[540px] bg-white border-l border-[#14ad9f]/20">
            <SheetHeader className="border-b border-[#14ad9f]/10 pb-4">
              <SheetTitle className="flex items-center gap-2 text-[#14ad9f]">
                <AlertTriangle className="h-5 w-5 text-[#14ad9f]" />
                E-Rechnung Compliance Prüfung
              </SheetTitle>
              <SheetDescription className="text-gray-600 font-medium">
                Folgende Probleme verhindern die Aktivierung der E-Rechnung:
              </SheetDescription>
            </SheetHeader>
            
            <div className="mt-6 space-y-3">
              {complianceErrors.length > 0 && (
                <div className="p-3 bg-[#14ad9f]/5 border border-[#14ad9f]/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 bg-[#14ad9f] text-white rounded-full flex items-center justify-center text-xs font-bold">
                      !
                    </div>
                    <h4 className="text-sm font-semibold text-[#14ad9f]">
                      Erforderliche Angaben
                    </h4>
                    <span className="text-xs bg-[#14ad9f]/10 text-[#14ad9f] px-1.5 py-0.5 rounded font-medium">
                      {complianceErrors.length}
                    </span>
                  </div>
                  <div className="text-xs text-gray-700 space-y-1">
                    {complianceErrors.map((error, index) => (
                      <div key={index} className="flex items-start gap-1.5">
                        <span className="text-[#14ad9f] mt-0.5 text-xs">•</span>
                        <span className="leading-tight">{error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 p-3 bg-[#14ad9f]/5 border border-[#14ad9f]/20 rounded-lg">
              <h4 className="flex items-center gap-2 text-sm font-medium text-[#14ad9f] mb-1">
                <Info className="h-3 w-3" />
                E-Rechnung Mindestanforderungen
              </h4>
              <div className="text-xs text-gray-700 leading-tight">
                Vollständige Firmen- und Kundendaten, Steuer-ID, Bankverbindung, gültige E-Mail-Adressen
              </div>
            </div>

            <SheetFooter className="mt-6 pt-4 border-t border-[#14ad9f]/10">
              <Button 
                onClick={() => setShowCompliancePanel(false)}
                variant="default"
                className="w-full bg-[#14ad9f] hover:bg-[#129488] text-white border-0"
                size="sm"
                style={{
                  backgroundColor: '#14ad9f',
                  color: 'white',
                  border: 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#129488';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#14ad9f';
                }}
              >
                Schließen
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}

      {/* Allgemeine Angaben - SevDesk Style */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2 text-[#14ad9f]" />
            Allgemeine Angaben
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 2-Spalten Grid für Empfänger und Rechnungsinformationen */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Empfänger Sektion - Links */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Empfänger</h3>
                
                {/* Kontakttyp Toggle */}
                <div className="flex items-center gap-2 mb-4">
                  <Label className="text-sm font-medium text-gray-700">Kontakt</Label>
                  <span className="text-red-500">*</span>
                  <div className="flex ml-auto">
                    <Button
                      type="button"
                      variant={contactType === 'organisation' ? 'default' : 'outline'}
                      size="sm"
                      className={`rounded-r-none ${
                        contactType === 'organisation' 
                          ? 'bg-[#14ad9f] hover:bg-[#129488] text-white' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setContactType('organisation')}
                    >
                      Organisation
                    </Button>
                    <Button
                      type="button"
                      variant={contactType === 'person' ? 'default' : 'outline'}
                      size="sm"
                      className={`rounded-l-none ${
                        contactType === 'person' 
                          ? 'bg-[#14ad9f] hover:bg-[#129488] text-white' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setContactType('person')}
                    >
                      Person
                    </Button>
                  </div>
                </div>

                {/* Kontakt Name Input */}
                <div className="space-y-2 mb-4">
                  {contactType === 'organisation' ? (
                    /* Organisation - Ein Feld für Organisationsname */
                    <div className="relative customer-search-container">
                      <Input
                        type="text"
                        value={formData.customerName}
                        onChange={e => {
                          const value = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            customerName: value,
                          }));

                          // Zeige Popup nur wenn mindestens 2 Zeichen eingegeben wurden
                          if (value.length >= 2) {
                            setShowCustomerSearchPopup(true);
                          } else {
                            setShowCustomerSearchPopup(false);
                          }
                        }}
                        placeholder="Name der Organisation"
                        className={`flex-1 ${getFieldErrorClass('customerName')}`}
                        required
                      />

                      {/* Intelligenter Such-Popup */}
                      {showCustomerSearchPopup && formData.customerName.length >= 2 && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {/* Gefilterte Kunden anzeigen */}
                          {customers
                            .filter(customer =>
                              customer.name.toLowerCase().includes(formData.customerName.toLowerCase())
                            )
                            .slice(0, 5)
                            .map(customer => (
                              <div
                                key={customer.id}
                                className="p-2 hover:bg-gray-50 cursor-pointer text-sm"
                                onClick={() => selectCustomer(customer)}
                              >
                                <div className="font-medium">{customer.name}</div>
                                {customer.email && (
                                  <div className="text-gray-500">{customer.email}</div>
                                )}
                              </div>
                            ))}

                          {/* "Neuen Kunden erstellen" Option */}
                          <div
                            className="p-2 hover:bg-gray-50 cursor-pointer text-sm border-t border-gray-100 text-[#14ad9f] font-medium"
                            onClick={() => {
                              setShowNewCustomerModal(true);
                              setShowCustomerSearchPopup(false);
                            }}
                          >
                            + Neuen Kunden "{formData.customerName}" erstellen
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Person - Zwei Felder für Vor- und Nachname mit Kundensuche */
                    <div className="relative customer-search-container">
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Vorname</Label>
                          <span className="text-red-500">*</span>
                          <Input
                            type="text"
                            value={formData.customerFirstName || ''}
                            onChange={e => {
                              const value = e.target.value;
                              setFormData(prev => ({
                                ...prev,
                                customerFirstName: value,
                                // Kombiniere Vor- und Nachname für customerName
                                customerName: `${value} ${prev.customerLastName || ''}`.trim(),
                              }));

                              // Trigger Kundensuche wenn kombinierter Name >= 2 Zeichen
                              const combinedName = `${value} ${formData.customerLastName || ''}`.trim();
                              if (combinedName.length >= 2) {
                                setShowCustomerSearchPopup(true);
                              } else {
                                setShowCustomerSearchPopup(false);
                              }
                            }}
                            placeholder="Vorname"
                            className={getFieldErrorClass('customerName')}
                            required
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Nachname</Label>
                          <span className="text-red-500">*</span>
                          <Input
                            type="text"
                            value={formData.customerLastName || ''}
                            onChange={e => {
                              const value = e.target.value;
                              setFormData(prev => ({
                                ...prev,
                                customerLastName: value,
                                // Kombiniere Vor- und Nachname für customerName
                                customerName: `${prev.customerFirstName || ''} ${value}`.trim(),
                              }));

                              // Trigger Kundensuche wenn kombinierter Name >= 2 Zeichen
                              const combinedName = `${formData.customerFirstName || ''} ${value}`.trim();
                              if (combinedName.length >= 2) {
                                setShowCustomerSearchPopup(true);
                              } else {
                                setShowCustomerSearchPopup(false);
                              }
                            }}
                            placeholder="Nachname"
                            className={getFieldErrorClass('customerName')}
                            required
                          />
                        </div>
                      </div>

                      {/* Intelligenter Such-Popup für Person - gleiche Struktur wie Organisation */}
                      {showCustomerSearchPopup && formData.customerName.length >= 2 && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {/* Gefilterte Kunden anzeigen */}
                          {customers
                            .filter(customer =>
                              customer.name.toLowerCase().includes(formData.customerName.toLowerCase())
                            )
                            .slice(0, 5)
                            .map(customer => (
                              <div
                                key={customer.id}
                                className="p-2 hover:bg-gray-50 cursor-pointer text-sm"
                                onClick={() => {
                                  // Bei Person-Auswahl Namen splitten
                                  const nameParts = customer.name.split(' ');
                                  const firstName = nameParts[0] || '';
                                  const lastName = nameParts.slice(1).join(' ') || '';
                                  
                                  setFormData(prev => ({
                                    ...prev,
                                    customerName: customer.name,
                                    customerFirstName: firstName,
                                    customerLastName: lastName,
                                    customerEmail: customer.email,
                                    customerNumber: customer.customerNumber || '',
                                    customerAddress: 
                                      customer.street && customer.city
                                        ? `${customer.street}\n${customer.postalCode || ''} ${customer.city}\n${customer.country || 'Deutschland'}`
                                        : prev.customerAddress,
                                  }));
                                  setShowCustomerSearchPopup(false);
                                }}
                              >
                                <div className="font-medium">{customer.name}</div>
                                {customer.email && (
                                  <div className="text-gray-500">{customer.email}</div>
                                )}
                              </div>
                            ))}

                          {/* "Neuen Kunden erstellen" Option */}
                          <div
                            className="p-2 hover:bg-gray-50 cursor-pointer text-sm border-t border-gray-100 text-[#14ad9f] font-medium"
                            onClick={() => {
                              console.log('Person: Neuen Kunden erstellen geklickt');
                              console.log('createCustomerOpen before:', createCustomerOpen);
                              setCreateCustomerOpen(true);
                              setShowCustomerSearchPopup(false);
                              console.log('setCreateCustomerOpen(true) direkt aufgerufen');
                            }}
                          >
                            + Neuen Kunden "{formData.customerName}" erstellen
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Anschrift */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Label className="text-sm font-medium text-gray-700">Anschrift</Label>
                      <span className="text-red-500">*</span>
                    </div>
                    <button
                      type="button"
                      className="text-sm text-[#14ad9f] hover:text-[#129488] font-medium"
                      onClick={() => setShowAddressAddition(true)}
                    >
                      Adresszusatz +
                    </button>
                  </div>

                  {/* Straße und Hausnummer */}
                  <Input
                    placeholder="Straße und Hausnummer"
                    value={formData.customerAddress?.split('\n')[0] || ''}
                    onChange={e => {
                      const lines = formData.customerAddress?.split('\n') || ['', '', '', ''];
                      lines[0] = e.target.value;
                      setFormData(prev => ({ ...prev, customerAddress: lines.join('\n') }));
                    }}
                    className={getFieldErrorClass('customerAddress')}
                  />

                  {/* Adresszusatz (optional) */}
                  {showAddressAddition && (
                    <div className="relative">
                      <Input
                        placeholder="Adresszusatz (z.B. c/o, Abteilung, etc.)"
                        value={formData.customerAddress?.split('\n')[1] || ''}
                        onChange={e => {
                          const lines = formData.customerAddress?.split('\n') || ['', '', '', ''];
                          lines[1] = e.target.value;
                          setFormData(prev => ({ ...prev, customerAddress: lines.join('\n') }));
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                        onClick={() => {
                          setShowAddressAddition(false);
                          // Entferne den Adresszusatz aus der Adresse
                          const lines = formData.customerAddress?.split('\n') || ['', '', '', ''];
                          lines[1] = ''; // Leere den Adresszusatz
                          setFormData(prev => ({ ...prev, customerAddress: lines.join('\n') }));
                        }}
                        title="Adresszusatz entfernen"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </Button>
                    </div>
                  )}

                  {/* PLZ und Ort */}
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Postleitzahl"
                      value={formData.customerAddress?.split('\n')[showAddressAddition ? 2 : 1]?.split(' ')[0] || ''}
                      onChange={e => {
                        const lines = formData.customerAddress?.split('\n') || ['', '', '', ''];
                        const lineIndex = showAddressAddition ? 2 : 1;
                        const city = lines[lineIndex]?.split(' ').slice(1).join(' ') || '';
                        lines[lineIndex] = `${e.target.value} ${city}`.trim();
                        setFormData(prev => ({ ...prev, customerAddress: lines.join('\n') }));
                      }}
                      className={getFieldErrorClass('customerAddress')}
                    />
                    <Input
                      placeholder="Ort"
                      value={formData.customerAddress?.split('\n')[showAddressAddition ? 2 : 1]?.split(' ').slice(1).join(' ') || ''}
                      onChange={e => {
                        const lines = formData.customerAddress?.split('\n') || ['', '', '', ''];
                        const lineIndex = showAddressAddition ? 2 : 1;
                        const zip = lines[lineIndex]?.split(' ')[0] || '';
                        lines[lineIndex] = `${zip} ${e.target.value}`.trim();
                        setFormData(prev => ({ ...prev, customerAddress: lines.join('\n') }));
                      }}
                      className={getFieldErrorClass('customerAddress')}
                    />
                  </div>

                  {/* Land */}
                  <Select 
                    value={formData.customerAddress?.split('\n')[showAddressAddition ? 3 : 2] || 'Deutschland'}
                    onValueChange={value => {
                      const lines = formData.customerAddress?.split('\n') || ['', '', '', ''];
                      const lineIndex = showAddressAddition ? 3 : 2;
                      lines[lineIndex] = value;
                      setFormData(prev => ({ ...prev, customerAddress: lines.join('\n') }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Bitte auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Deutschland">Deutschland</SelectItem>
                      <SelectItem value="Österreich">Österreich</SelectItem>
                      <SelectItem value="Schweiz">Schweiz</SelectItem>
                      <SelectItem value="Niederlande">Niederlande</SelectItem>
                      <SelectItem value="Frankreich">Frankreich</SelectItem>
                      <SelectItem value="Italien">Italien</SelectItem>
                      <SelectItem value="Spanien">Spanien</SelectItem>
                      <SelectItem value="Polen">Polen</SelectItem>
                      <SelectItem value="Tschechische Republik">Tschechische Republik</SelectItem>
                      <SelectItem value="Belgien">Belgien</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Rechnungsinformationen Sektion - Rechts */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Rechnungsinformationen</h3>
                
                {/* 2x2 Grid für Rechnungsfelder */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* Rechnungsdatum */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Label className="text-sm font-medium text-gray-700">Rechnungsdatum</Label>
                      <span className="text-red-500">*</span>
                    </div>
                    <Input
                      type="date"
                      value={new Date().toISOString().split('T')[0]}
                      onChange={e => {
                        // TODO: Handle invoice date change
                      }}
                      required
                    />
                  </div>

                  {/* Lieferdatum */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Label 
                          className={`text-sm font-medium cursor-pointer ${
                            deliveryDateType === 'single' ? 'text-gray-900' : 'text-gray-500'
                          }`}
                          onClick={() => setDeliveryDateType('single')}
                        >
                          Lieferdatum
                        </Label>
                        <span className="text-red-500">*</span>
                      </div>
                      <button
                        type="button"
                        className={`text-sm font-medium cursor-pointer ${
                          deliveryDateType === 'range' ? 'text-gray-900' : 'text-gray-500'
                        }`}
                        onClick={() => setDeliveryDateType('range')}
                      >
                        Zeitraum
                      </button>
                    </div>
                    
                    {deliveryDateType === 'single' ? (
                      <Input
                        type="date"
                        value={new Date().toISOString().split('T')[0]}
                        onChange={e => {
                          // TODO: Handle delivery date change
                        }}
                        required
                      />
                    ) : (
                      <Popover open={deliveryDatePopoverOpen} onOpenChange={setDeliveryDatePopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline" 
                            className="w-full justify-start text-left font-normal"
                            onClick={() => setDeliveryDatePopoverOpen(true)}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {deliveryDateRange.from ? (
                              deliveryDateRange.to ? (
                                <>
                                  {format(deliveryDateRange.from, "dd.MM.yyyy", { locale: de })} - {format(deliveryDateRange.to, "dd.MM.yyyy", { locale: de })}
                                </>
                              ) : (
                                format(deliveryDateRange.from, "dd.MM.yyyy", { locale: de })
                              )
                            ) : (
                              "Zeitraum auswählen"
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={deliveryDateRange.from}
                            selected={{
                              from: deliveryDateRange.from,
                              to: deliveryDateRange.to
                            }}
                            onSelect={(range) => {
                              setDeliveryDateRange(range || {});
                              // Schließe den Popover wenn beide Daten ausgewählt sind
                              if (range?.from && range?.to) {
                                setDeliveryDatePopoverOpen(false);
                              }
                            }}
                            numberOfMonths={2}
                            locale={de}
                            className="rounded-md border"
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>

                  {/* Rechnungsnummer */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Label className="text-sm font-medium text-gray-700">Rechnungsnummer</Label>
                      <span className="text-red-500">*</span>
                    </div>
                    <div className="relative">
                      <Input
                        placeholder="RE-1000"
                        value={formData.title || ''}
                        onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        required
                        className="pr-10"
                      />
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
                        type="button"
                        onClick={() => setShowNumberingModal(true)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="3"/>
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1.06 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1.06H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1.06-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1.06 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1.06H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1.06z"/>
                        </svg>
                      </Button>
                    </div>
                  </div>

                  {/* Referenznummer */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Referenznummer</Label>
                    <Input
                      placeholder="Optional"
                      value={formData.customerOrderNumber}
                      onChange={e =>
                        setFormData(prev => ({ ...prev, customerOrderNumber: e.target.value }))
                      }
                    />
                  </div>
                </div>

                {/* Zahlungsziel - Ganze Zeile */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Zahlungsziel</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={formData.validUntil}
                      onChange={e => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
                      className="flex-1"
                    />
                    <span className="text-sm text-gray-500">in</span>
                    <Input
                      type="number"
                      placeholder="14"
                      className="w-16 text-center"
                      defaultValue="14"
                    />
                    <span className="text-sm text-gray-500">Tagen</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kopf-Text mit Textvorlagen */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2 text-[#14ad9f]" />
            Kopf-Text & Textvorlagen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Textvorlagen Selector für Kopftext */}
          <div className="flex items-center gap-2">
            <Label className="flex-shrink-0">Kopftext-Vorlage:</Label>
            <Select
              value={selectedHeadTemplate}
              onValueChange={value => {
                setSelectedHeadTemplate(value);
                const template = textTemplates.find(t => t.id === value);
                if (template) {
                  setFormData(prev => ({ ...prev, headTextHtml: template.text }));
                }
              }}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Vorlage auswählen..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Keine Vorlage</SelectItem>
                {textTemplates
                  .filter(t => t.objectType === 'INVOICE' && t.textType === 'HEAD')
                  .map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} {template.isDefault && '(Standard)'}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowTemplateModal(true)}
            >
              Vorlagen verwalten
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Einleitung / Kopf-Text</Label>
            <FooterTextEditor
              value={formData.headTextHtml}
              onChange={(html: string) => setFormData(prev => ({ ...prev, headTextHtml: html }))}
              companyId={uid}
              objectType="INVOICE"
              textType="HEAD"
            />
          </div>
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
            companyId={uid}
            objectType="INVOICE"
            textType="FOOT"
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

      {/* Fußtext mit Textvorlagen */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2 text-[#14ad9f]" />
            Fußtext & Zahlungsbedingungen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Textvorlagen Selector für Fußtext */}
          <div className="flex items-center gap-2">
            <Label className="flex-shrink-0">Fußtext-Vorlage:</Label>
            <Select
              value={selectedFooterTemplate}
              onValueChange={value => {
                setSelectedFooterTemplate(value);
                const template = textTemplates.find(t => t.id === value);
                if (template) {
                  setFormData(prev => ({ ...prev, footerText: template.text }));
                }
              }}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Vorlage auswählen..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Keine Vorlage</SelectItem>
                {textTemplates
                  .filter(t => t.objectType === 'INVOICE' && t.textType === 'FOOT')
                  .map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} {template.isDefault && '(Standard)'}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Fußtext / Hinweise</Label>
            <FooterTextEditor
              value={formData.footerText}
              onChange={(html: string) => setFormData(prev => ({ ...prev, footerText: html }))}
              companyId={uid}
              objectType="INVOICE"
              textType="FOOT"
            />
          </div>
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
                {(() => {
                  if (loadingTemplate) {
                    return (
                      <div className="flex items-center justify-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <span className="ml-2">Template wird geladen...</span>
                      </div>
                    );
                  }

                  const TemplateComponent = renderTemplateComponent(selectedTemplate);
                  const previewData = buildPreviewData();

                  return (
                    <TemplateComponent
                      data={previewData as any}
                      companySettings={{
                        companyName: previewData.companyName,
                        logoUrl: previewData.companyLogo || previewData.profilePictureURL,
                        address: (() => {
                          const lines = (previewData.companyAddress || '').split('\n');
                          return {
                            street: lines[0] || '',
                            zipCode: (lines[1] || '').split(' ')[0] || '',
                            city: (lines[1] || '').split(' ').slice(1).join(' ') || '',
                            country: lines[2] || undefined,
                          };
                        })(),
                        contactInfo: {
                          email: previewData.companyEmail,
                          phone: previewData.companyPhone,
                          website: previewData.companyWebsite,
                        },
                        vatId: previewData.companyVatId,
                        taxId: previewData.companyTaxNumber,
                        commercialRegister: previewData.companyRegister,
                        bankDetails: previewData.bankDetails,
                      }}
                      customizations={{ showLogo: true }}
                    />
                  );
                })()}
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

      {/* Company Settings Modal */}
      <Dialog open={showCompanySettingsModal} onOpenChange={setShowCompanySettingsModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Deine Angaben</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Pflichtangaben */}
            <div>
              <h3 className="text-lg font-medium mb-4">Pflichtangaben</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Inhaber</Label>
                  <Input
                    value={companySettingsFormData.companyOwner}
                    onChange={e => setCompanySettingsFormData(prev => ({ ...prev, companyOwner: e.target.value }))}
                    placeholder="Inhaber"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Firma</Label>
                  <Input
                    value={companySettingsFormData.companyName}
                    onChange={e => setCompanySettingsFormData(prev => ({ ...prev, companyName: e.target.value }))}
                    placeholder="Firma"
                  />
                </div>
              </div>
              
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Anschrift</Label>
                  <Input
                    value={companySettingsFormData.street}
                    onChange={e => setCompanySettingsFormData(prev => ({ ...prev, street: e.target.value }))}
                    placeholder="Straße und Hausnummer"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Input
                      value={companySettingsFormData.zip}
                      onChange={e => setCompanySettingsFormData(prev => ({ ...prev, zip: e.target.value }))}
                      placeholder="PLZ"
                    />
                  </div>
                  <div className="space-y-2">
                    <Input
                      value={companySettingsFormData.city}
                      onChange={e => setCompanySettingsFormData(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="Ort"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Steuernummer</Label>
                  <Input
                    value={companySettingsFormData.taxNumber}
                    onChange={e => setCompanySettingsFormData(prev => ({ ...prev, taxNumber: e.target.value }))}
                    placeholder="Steuernummer"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Umsatzsteuer-ID</Label>
                  <Input
                    value={companySettingsFormData.vatNumber}
                    onChange={e => setCompanySettingsFormData(prev => ({ ...prev, vatNumber: e.target.value }))}
                    placeholder="Umsatzsteuer-ID"
                  />
                </div>
              </div>
            </div>

            {/* Optionale Angaben */}
            <div>
              <h3 className="text-lg font-medium mb-4">Optionale Angaben</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>E-Mail</Label>
                  <Input
                    type="email"
                    value={companySettingsFormData.email}
                    onChange={e => setCompanySettingsFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="marie@musterfrau.de"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefon</Label>
                  <Input
                    value={companySettingsFormData.phone}
                    onChange={e => setCompanySettingsFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="07821 127384"
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>IBAN</Label>
                  <Input
                    value={companySettingsFormData.iban}
                    onChange={e => setCompanySettingsFormData(prev => ({ ...prev, iban: e.target.value }))}
                    placeholder="DE01100100000010101010"
                  />
                </div>
                <div className="space-y-2">
                  <Label>BIC</Label>
                  <Input
                    value={companySettingsFormData.bic}
                    onChange={e => setCompanySettingsFormData(prev => ({ ...prev, bic: e.target.value }))}
                    placeholder="BELADEBE"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <Button variant="outline" onClick={() => setShowCompanySettingsModal(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={handleCompanySettingsSave}
              className="bg-[#14ad9f] hover:bg-[#129488] text-white"
            >
              Speichern
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Neuer Kunde */}
      <NewCustomerModal
        open={createCustomerOpen}
        onOpenChange={setCreateCustomerOpen}
        defaultValues={{
          name: formData.customerName || '',
          firstName: contactType === 'person' ? formData.customerFirstName : undefined,
          lastName: contactType === 'person' ? formData.customerLastName : undefined,
        }}
        contactType={contactType}
        saving={creatingCustomer}
        persistDirectly={true}
        companyId={uid}
        onSaved={async customerId => {
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

      {/* Modal: Textvorlagen verwalten */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent className="max-w-[800px] w-full">
          <DialogHeader>
            <DialogTitle>Textvorlagen verwalten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Hier können Sie neue Textvorlagen für Kopf- und Fußtexte erstellen und verwalten.
            </p>
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Textvorlagen-Verwaltung wird in Kürze verfügbar sein.</p>
              <p className="text-xs mt-1">
                Navigieren Sie zu Finance → Textvorlagen für die vollständige Verwaltung.
              </p>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setShowTemplateModal(false)}>Schließen</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Nummernkreis bearbeiten */}
      <Dialog open={showNumberingModal} onOpenChange={setShowNumberingModal}>
        <DialogContent className="w-[320px] max-w-none sm:w-[320px]">
          <DialogHeader>
            <DialogTitle>Nummernkreis bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Format */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Format</Label>
              <Input
                value={numberingFormat}
                onChange={e => setNumberingFormat(e.target.value)}
                placeholder="RE-%NUMBER"
              />
            </div>

            {/* Nächste Zahl */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Nächste Zahl</Label>
              <Input
                type="number"
                value={nextNumber}
                onChange={e => setNextNumber(parseInt(e.target.value) || 0)}
                placeholder="1000"
              />
            </div>

            {/* Vorschau */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Vorschau</Label>
              <div className="p-3 bg-gray-50 rounded-md border">
                <code className="text-sm font-mono text-gray-800">
                  {generateNumberPreview(numberingFormat, nextNumber)}
                </code>
              </div>
            </div>

            {/* Verfügbare Variablen */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Folgende Variablen stehen für das Format zur Verfügung:
              </Label>
              <div className="text-xs text-gray-600 space-y-1">
                <div><code className="bg-gray-100 px-1 rounded">%NUMBER</code> - Nächste Zahl <span className="text-red-500">Obligatorisch</span></div>
                <div><code className="bg-gray-100 px-1 rounded">%YYYY</code> - Aktuelles Jahr (2025)</div>
                <div><code className="bg-gray-100 px-1 rounded">%YY</code> - Aktuelles Jahr (25)</div>
                <div><code className="bg-gray-100 px-1 rounded">%MM</code> - Aktueller Monat (09)</div>
                <div><code className="bg-gray-100 px-1 rounded">%M</code> - Aktueller Monat (9)</div>
                <div><code className="bg-gray-100 px-1 rounded">%DD</code> - Aktueller Tag (15)</div>
                <div><code className="bg-gray-100 px-1 rounded">%D</code> - Aktueller Tag (15)</div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowNumberingModal(false)}
              >
                Abbrechen
              </Button>
              <Button 
                className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                onClick={async () => {
                  try {
                    // Speichere die Nummernkreis-Einstellungen in Firestore
                    const companyRef = doc(db, 'companies', uid);
                    await updateDoc(companyRef, {
                      'invoiceNumbering.format': numberingFormat,
                      'invoiceNumbering.nextNumber': nextNumber,
                      'invoiceNumbering.lastUpdated': new Date().toISOString()
                    });

                    // Aktualisiere das Rechnungsnummer-Feld mit der neuen Vorschau
                    setFormData(prev => ({ 
                      ...prev, 
                      title: generateNumberPreview(numberingFormat, nextNumber) 
                    }));
                    
                    setShowNumberingModal(false);
                    toast.success('Nummernkreis-Einstellungen gespeichert');
                  } catch (error) {
                    console.error('Fehler beim Speichern der Nummernkreis-Einstellungen:', error);
                    toast.error('Fehler beim Speichern der Einstellungen');
                  }
                }}
              >
                Übernehmen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* E-Rechnung Compliance Panel - von rechts ausfahrend */}
      <Sheet open={showCompliancePanel} onOpenChange={setShowCompliancePanel}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              E-Rechnung Compliance Prüfung
            </SheetTitle>
            <SheetDescription>
              Folgende Probleme verhindern die Aktivierung der E-Rechnung:
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-3">
            {(() => {
              // Kategorisiere die Compliance-Fehler in Pflicht und Empfohlen
              const criticalErrors = complianceErrors.filter(error => 
                !error.includes('empfohlen') && 
                !error.includes('Website') && 
                !error.includes('Logo') && 
                !error.includes('Branchenangabe') &&
                !error.includes('Geschäftsbeschreibung') &&
                !error.includes('Telefonnummer')
              );
              
              const recommendedErrors = complianceErrors.filter(error => 
                error.includes('empfohlen') || 
                error.includes('Website') || 
                error.includes('Logo') || 
                error.includes('Branchenangabe') ||
                error.includes('Geschäftsbeschreibung') ||
                error.includes('Telefonnummer')
              );

              return (
                <>
                  {/* Kritische Fehler - Kompakt */}
                  {criticalErrors.length > 0 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          !
                        </div>
                        <h4 className="text-sm font-semibold text-red-800">Erforderliche Angaben</h4>
                        <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                          {criticalErrors.length}
                        </span>
                      </div>
                      <div className="text-xs text-red-700 space-y-1">
                        {criticalErrors.slice(0, 5).map((error, index) => (
                          <div key={index} className="flex items-start gap-1.5">
                            <span className="text-red-400 mt-0.5 text-xs">•</span>
                            <span className="leading-tight">{error}</span>
                          </div>
                        ))}
                        {criticalErrors.length > 5 && (
                          <div className="text-xs text-red-600 font-medium mt-1">
                            ... und {criticalErrors.length - 5} weitere
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Empfehlungen - Kollapsible */}
                  {recommendedErrors.length > 0 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-4 h-4 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xs">
                          i
                        </div>
                        <h4 className="text-sm font-semibold text-yellow-800">Empfehlungen</h4>
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
                          {recommendedErrors.length}
                        </span>
                      </div>
                      <div className="text-xs text-yellow-700">
                        <div className="leading-tight">
                          {recommendedErrors.slice(0, 2).join(', ')}
                          {recommendedErrors.length > 2 && ` und ${recommendedErrors.length - 2} weitere Verbesserungen`}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Kompakte Hilfe-Section */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="flex items-center gap-2 text-sm font-medium text-blue-800 mb-1">
              <Info className="h-3 w-3" />
              E-Rechnung Mindestanforderungen
            </h4>
            <div className="text-xs text-blue-700 leading-tight">
              Vollständige Firmen- und Kundendaten, Steuer-ID, Bankverbindung, gültige E-Mail-Adressen
            </div>
          </div>

          <SheetFooter className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowCompliancePanel(false)}
              className="w-full h-8 text-sm"
            >
              Schließen
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Ende CreateQuotePage
