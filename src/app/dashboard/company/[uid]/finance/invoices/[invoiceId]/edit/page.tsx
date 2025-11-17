'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  InvoiceTemplateRenderer,
  DEFAULT_INVOICE_TEMPLATE,
  type InvoiceTemplate as ImportedInvoiceTemplate,
  AVAILABLE_TEMPLATES,
} from '@/components/finance/InvoiceTemplates';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { PopoverAnchor } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import FooterTextEditor from '@/components/finance/FooterTextEditor';
import InventorySelector from '@/components/quotes/InventorySelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { COUNTRIES } from '@/constants/countries';
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
import { db } from '@/firebase/clients';
import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  deleteDoc,
  FieldValue,
  DocumentData,
  QuerySnapshot,
} from 'firebase/firestore';
import { QuoteService, Quote as QuoteType, QuoteItem } from '@/services/quoteService';
import { FirestoreInvoiceService as InvoiceService } from '@/services/firestoreInvoiceService';
import { InvoiceData as InvoiceType } from '@/types/invoiceTypes';
import { QuoteItem as InvoiceItem } from '@/services/quoteService';
import { TaxRuleType } from '@/types/taxRules';
import { getAllCurrencies } from '@/data/currencies';
import { QuickAddService } from '@/components/QuickAddService';
import { getCustomers } from '@/utils/api/companyApi';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
// ...
// State für Dienstleistungs-Modal innerhalb der Komponente anlegen!
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
// Use ImportedInvoiceTemplate type from @/components/finance/InvoiceTemplates
import { UserPreferencesService } from '@/lib/userPreferences';
import { TextTemplateService } from '@/services/TextTemplateService';
import InvoiceHeaderTextSection from '@/components/finance/InvoiceHeaderTextSection';
import { SimpleTaxRuleSelector } from '@/components/finance/SimpleTaxRuleSelector';
import { TaxRuleSelector } from '@/components/finance/TaxRuleSelector';
import { useTaxCalculation } from '@/hooks/useTaxCalculation';
// Import der zentralen Platzhalter-Engine
import {
  replacePlaceholders as centralReplacePlaceholders,
  PlaceholderContext,
} from '@/utils/placeholders';
type PreviewTemplateData = {
  invoiceNumber: string;
  documentNumber: string;
  date: string;
  validUntil?: string;
  dueDate?: string;
  title?: string;
  reference?: string;
  currency?: string;
  taxRule?: TaxRuleType;
  taxRuleLabel?: string;
  invoiceDate?: string;
  deliveryDate?: string;
  customerName: string;
  customerAddress?: string;
  customerEmail?: string;
  customerPhone?: string;
  customer: {
    name: string;
    email: string;
    address: {
      street: string;
      zipCode: string;
      city: string;
      country: string;
    };
  };
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
  internalContactPerson?: string;
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
    website: string;
    bankDetails: {
      iban: string;
      bic: string;
      accountHolder: string;
    };
  };
  // Template-Informationen
  selectedTemplate?: string;
  // TSE-Daten für deutsche E-Rechnung-Compliance
  tseData?: {
    serialNumber: string;
    signatureAlgorithm: string;
    transactionNumber: string;
    startTime: string;
    finishTime: string;
    signature: string;
    publicKey: string;
    certificateSerial: string;
  };
};
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { Switch } from '@/components/ui/switch';
import { InventoryService } from '@/services/inventoryService';
import NewProductModal, { NewProductValues } from '@/components/inventory/NewProductModal';
import NewCustomerModal from '@/components/finance/NewCustomerModal';
import { EInvoiceIntegration } from '@/components/finance/EInvoiceIntegration';
import { EInvoiceComplianceDashboard } from '@/components/finance/EInvoiceComplianceDashboard';

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

export default function EditInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';
  const invoiceId = typeof params?.invoiceId === 'string' ? params.invoiceId : '';
  const [selectedTemplate, setSelectedTemplate] =
    useState<ImportedInvoiceTemplate>(DEFAULT_INVOICE_TEMPLATE);

  // Edit-spezifische States
  const [loadingInvoice, setLoadingInvoice] = useState(true);
  const [originalInvoice, setOriginalInvoice] = useState<any>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  const renderProductsCard = () => (
    <Card>
      <CardHeader>
        <CardTitle>
          <Calculator className="h-5 w-5 mr-2 text-[#14ad9f]" />
          Produkte
        </CardTitle>
      </CardHeader>
      <CardContent>
        <QuickAddService
          companyId={uid}
          onServiceAdded={service => {
            setItems(prev => [...prev, service]);
            toast.success('Dienstleistung wurde zur Rechnung hinzugefügt');
          }}
        />

        {/* Rest des Card Contents */}
        <div className="flex items-center justify-between mb-3">
          {/* ... existierender Content ... */}
        </div>
      </CardContent>
    </Card>
  );

  interface InvoiceService {
    id: string;
    name: string;
    description?: string;
    price: number | string;
    unit: string;
    source: 'inlineInvoiceServices';
  }

  // Hilfsfunktion zur Preiskonvertierung
  const parsePrice = (price: number | string): number => {
    if (typeof price === 'number') return price;
    return parseFloat(price) || 0;
  };

  // Erweiterte States für Dienstleistungen
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [existingServices, setExistingServices] = useState<InvoiceService[]>([]);
  const [selectedService, setSelectedService] = useState<string>('');
  const [showPopover, setShowPopover] = useState(false);
  const [loadingSavedServices, setLoadingSavedServices] = useState(false);
  const [savedServices, setSavedServices] = useState<InvoiceService[]>([]);
  const [serviceDraft, setServiceDraft] = useState({
    name: '',
    description: '',
    price: '',
    unit: 'Stk',
  });
  const [savingService, setSavingService] = useState(false);

  // Lade existierende Dienstleistungen
  useEffect(() => {
    const loadExistingServices = async () => {
      if (!uid) return;
      setLoadingSavedServices(true);
      try {
        const inlineInvoiceServicesCol = collection(db, 'companies', uid, 'inlineInvoiceServices');
        const inlineInvoiceServicesSnap = await getDocs(inlineInvoiceServicesCol);

        const inlineInvoiceServices = inlineInvoiceServicesSnap.docs.map(doc => {
          const data = doc.data();

          return {
            id: doc.id,
            name: data.name || '',
            description: data.description,
            price: data.price || 0,
            unit: data.unit || 'Stk',
            source: 'inlineInvoiceServices' as const,
          };
        });

        setExistingServices(inlineInvoiceServices);
        setSavedServices(inlineInvoiceServices);
      } catch (error) {
        console.error('Fehler beim Laden der Dienstleistungen:', error);
        toast.error('Dienstleistungen konnten nicht geladen werden');
      } finally {
        setLoadingSavedServices(false);
      }
    };

    loadExistingServices();
  }, [uid]);
  // ComboBox für Dienstleistungsauswahl
  const ServiceSelector = () => (
    <div className="flex items-center gap-2 border-l border-gray-200 pl-4 ml-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className={cn(
              'min-w-[280px] justify-between border-input',
              'hover:bg-accent hover:text-accent-foreground',
              'focus:ring-2 focus:ring-[#14ad9f] focus:ring-offset-2',
              selectedService && 'text-[#14ad9f] border-[#14ad9f]'
            )}
          >
            {selectedService
              ? existingServices.find(service => service.name === selectedService)?.name
              : 'Dienstleistung auswählen oder neu erstellen...'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0">
          <Command>
            <CommandInput
              placeholder="Dienstleistung suchen..."
              className="border-none focus:ring-0 focus-visible:ring-0"
            />

            <CommandEmpty>
              <div className="p-4 text-sm text-center">
                <p className="text-muted-foreground mb-2">Keine Dienstleistung gefunden.</p>
                <Button
                  variant="ghost"
                  className="w-full mt-2 text-[#14ad9f]"
                  onClick={() => {
                    setServiceDraft(prev => ({ ...prev, name: '' }));
                    setServiceModalOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Neue Dienstleistung erstellen
                </Button>
              </div>
            </CommandEmpty>
            <CommandGroup>
              {existingServices.map(service => (
                <CommandItem
                  key={service.id}
                  onSelect={() => {
                    setSelectedService(service.name);
                    setServiceDraft({
                      name: service.name,
                      description: service.description || '',
                      price: service.price?.toString() || '',
                      unit: service.unit || 'Stk',
                    });
                  }}
                  className="text-sm hover:bg-[#14ad9f]/10 aria-selected:bg-[#14ad9f]/10"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selectedService === service.name ? 'opacity-100 text-[#14ad9f]' : 'opacity-0'
                    )}
                  />

                  {service.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedService ? (
        <Button
          className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
          onClick={saveServiceToSubcollection}
          disabled={savingService}
        >
          {savingService ? <>Speichert...</> : <>Dienstleistung übernehmen</>}
        </Button>
      ) : (
        <Button
          variant="outline"
          className="text-[#14ad9f] border-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
          onClick={() => {
            setServiceDraft(prev => ({ ...prev, name: '' }));
            setServiceModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Neu
        </Button>
      )}
    </div>
  );

  // Dienstleistung in Subcollection speichern
  const saveServiceToSubcollection = async () => {
    toast('SERVICE SAVE TRIGGERED (UI)', {
      description: 'Die Save-Funktion wurde im Client aufgerufen.',
    });

    if (!uid || !serviceDraft.name.trim()) {
      console.warn('[Dienstleistung speichern] Abbruch: UID oder Name fehlt', {
        uid,
        name: serviceDraft.name,
      });
      return;
    }
    setSavingService(true);
    try {
      const serviceData = {
        name: serviceDraft.name.trim(),
        description: serviceDraft.description?.trim() || '',
        price: parseFloat(serviceDraft.price) || 0,
        unit: serviceDraft.unit || 'Stk',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const ref = collection(db, 'companies', uid, 'inlineInvoiceServices');

      const result = await addDoc(ref, serviceData);

      // 📊 SERVICE USAGE TRACKING - Initialisiere Service-Statistiken
      try {
        const { ServiceUsageTrackingService } = await import('@/services/serviceUsageTrackingService');
        // Erstelle ein temporäres Item für das Tracking
        const tempItem = {
          id: result.id,
          description: serviceData.name,
          quantity: 1,
          unitPrice: serviceData.price,
          total: serviceData.price,
          inventoryItemId: result.id,
          category: 'Dienstleistung'
        };
        
        await ServiceUsageTrackingService.trackInvoiceServiceUsage(
          uid,
          invoiceId || 'service-creation', 
          [tempItem],
          formData.customerName || 'Service-Erstellung'
        );
      } catch (trackingError) {
        console.warn('⚠️ Service initialization tracking failed (non-critical):', trackingError);
      }

      toast.success('Dienstleistung gespeichert');
      setServiceDraft({ name: '', description: '', price: '', unit: 'Stk' });
      setServiceModalOpen(false);
    } catch (e) {
      console.error('[Dienstleistung speichern] Fehler:', e);
      toast.error('Fehler beim Speichern der Dienstleistung');
    } finally {
      setSavingService(false);
    }
  };
  // States für Quick-Add Service Funktion
  const [quickServiceName, setQuickServiceName] = useState('');
  const [quickServicePrice, setQuickServicePrice] = useState('');
  const [savingQuickService, setSavingQuickService] = useState(false);

  // Quick-Add Service Handler
  const handleQuickAddService = async () => {
    if (!uid || !quickServiceName.trim()) {
      toast.error('Bitte geben Sie einen Namen für die Dienstleistung ein');
      return;
    }

    setSavingQuickService(true);
    try {
      // 1. In inlineInvoiceServices speichern
      const serviceData = {
        name: quickServiceName.trim(),
        description: '',
        price: parseFloat(quickServicePrice) || 0,
        unit: 'Std',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const ref = collection(db, 'companies', uid, 'inlineInvoiceServices');
      const result = await addDoc(ref, serviceData);

      // 2. Direkt zur Rechnung hinzufügen
      const newItem = {
        id: crypto.randomUUID(),
        description: serviceData.name,
        quantity: 1,
        unitPrice: serviceData.price,
        unit: serviceData.unit,
        total: serviceData.price,
        category: 'Dienstleistung',
        inventoryItemId: result.id,
      };

      setItems(prev => [...prev, newItem]);

      // 📊 SERVICE USAGE TRACKING - Sofortiges Tracking für schnelle Nutzung
      try {
        const { ServiceUsageTrackingService } = await import('@/services/serviceUsageTrackingService');
        await ServiceUsageTrackingService.trackInvoiceServiceUsage(
          uid,
          invoiceId || 'temp-invoice', // Fallback für neue Rechnungen
          [newItem], // Nur das neue Item tracken
          formData.customerName || 'Kunde'
        );
      } catch (trackingError) {
        console.warn('⚠️ Immediate service usage tracking failed (non-critical):', trackingError);
      }

      // 3. UI zurücksetzen
      setQuickServiceName('');
      setQuickServicePrice('');
      toast.success('Dienstleistung gespeichert und zur Rechnung hinzugefügt');
    } catch (e) {
      console.error('Fehler beim Quick-Add Service:', e);
      toast.error('Fehler beim Speichern der Dienstleistung');
    } finally {
      setSavingQuickService(false);
    }
  };

  // State für neue Dienstleistung (Service)
  const [newServiceName, setNewServiceName] = useState<string>('');
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

  // Template Auswahl & User Preferences - entfernt, da doppelt deklariert

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
  const [deliveryDateRange, setDeliveryDateRange] = useState<{ from?: Date; to?: Date }>({});
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
    setCreateCustomerOpen(show);
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
    invoiceDate: '',
    deliveryDate: '',
    headTextHtml: '[%VOLLEANREDE%],\n\n[%INVOICE_INTRO_TEXT%]',
    footerText:
      'Wir bitten Sie, den Rechnungsbetrag von [%GESAMTBETRAG%] unter Angabe der Rechnungsnummer [%RECHNUNGSNUMMER%] auf das unten angegebene Konto zu überweisen. Zahlungsziel: [%ZAHLUNGSZIEL%] Rechnungsdatum: [%RECHNUNGSDATUM%] Vielen Dank für Ihr Vertrauen und die angenehme Zusammenarbeit!<br>Mit freundlichen Grüßen<br>[%KONTAKTPERSON%]',
    notes: '',
    currency: 'EUR',
    internalContactPerson: '',
    deliveryTerms: '',
    paymentTerms: '',
    taxRule: TaxRuleType.DE_TAXABLE,
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

  // Invoice-Daten laden (für Edit-Modus)
  useEffect(() => {
    const loadInvoiceData = async () => {
      if (!invoiceId || !uid || !user || user.uid !== uid) return;

      try {
        setLoadingInvoice(true);

        // Lade Invoice-Daten
        const invoiceData = await InvoiceService.getInvoiceById(uid, invoiceId);

        if (!invoiceData || invoiceData.companyId !== uid) {
          toast.error('Rechnung nicht gefunden oder keine Berechtigung');
          router.push(`/dashboard/company/${uid}/finance/invoices`);
          return;
        }

        setOriginalInvoice(invoiceData);

        // Form-Daten mit Invoice-Daten befüllen
        setFormData(prev => ({
          ...prev,
          customerName: invoiceData.customerName || '',
          customerFirstName: invoiceData.customerFirstName || '',
          customerLastName: invoiceData.customerLastName || '',
          customerNumber: invoiceData.customerNumber || '',
          customerEmail: invoiceData.customerEmail || '',
          customerAddress: invoiceData.customerAddress || '',
          title: invoiceData.title || invoiceData.documentNumber || invoiceData.invoiceNumber || '',
          customerOrderNumber: invoiceData.customerOrderNumber || '',
          validUntil: invoiceData.dueDate || '',
          invoiceDate: invoiceData.date || invoiceData.issueDate || '',
          deliveryDate: invoiceData.deliveryDate || '',
          headTextHtml: invoiceData.headTextHtml || invoiceData.description || '',
          footerText: invoiceData.footerText || '',
          notes: invoiceData.notes || '',
          currency: invoiceData.currency || 'EUR',
          internalContactPerson: invoiceData.internalContactPerson || '',
          deliveryTerms: invoiceData.deliveryTerms || '',
          paymentTerms: invoiceData.paymentTerms || '',
          taxRule: invoiceData.taxRuleType || TaxRuleType.DE_TAXABLE,
        }));

        // Items laden
        if (invoiceData.items && invoiceData.items.length > 0) {
          const mappedItems = invoiceData.items.map((item: any) => ({
            id: item.id || crypto.randomUUID(),
            description: item.description || '',
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            total: item.total || item.quantity * item.unitPrice,
            unit: item.unit || 'Stk',
            category: item.category || 'Artikel',
            discountPercent: item.discountPercent || 0,
            inventoryItemId: item.inventoryItemId || null,
          }));
          setItems(mappedItems);
        }

        // Template setzen (Felder existieren nicht im InvoiceData Typ)
        // Default Template verwenden
        setSelectedTemplate(DEFAULT_INVOICE_TEMPLATE);

        // Tax Rate setzen
        if (invoiceData.vatRate !== undefined) {
          setTaxRate(invoiceData.vatRate);
        }

        // Show Net/Brutto based on saved settings
        if (invoiceData.priceInput) {
          setShowNet(invoiceData.priceInput === 'netto');
        }

        // E-Invoice Settings (Feld existiert nicht im InvoiceData Typ)
        // Default auf false setzen
        setEInvoiceEnabled(false);

        // Skonto-Einstellungen
        if (invoiceData.skontoEnabled) {
          setSkontoEnabled(invoiceData.skontoEnabled);
          setSkontoDays(invoiceData.skontoDays);
          setSkontoPercentage(invoiceData.skontoPercentage);
          setSkontoText(invoiceData.skontoText || '');
        }

        // Delivery Date Type (Felder existieren nicht im InvoiceData Typ)
        // Default Werte setzen
        setDeliveryDateType('single');
        setDeliveryDateRange({
          from: undefined,
          to: undefined,
        });

        toast.success('Rechnung geladen');
      } catch (error) {
        console.error('Error loading invoice:', error);
        toast.error('Fehler beim Laden der Rechnung');
        router.push(`/dashboard/company/${uid}/finance/invoices`);
      } finally {
        setLoadingInvoice(false);
      }
    };

    loadInvoiceData();
  }, [invoiceId, uid, user, router]);

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
            companyData.vatId ||
              companyData.taxNumber ||
              companyData.step3?.vatId ||
              companyData.step3?.taxNumber,
          ];

          const missingRequiredFields = requiredFields.some(field => !field?.trim());
          const missingOptionalFields =
            !companyData.email && !companyData.phoneNumber && !companyData.iban;

          // Zeige Banner wenn wichtige Felder fehlen
          if (missingRequiredFields || missingOptionalFields) {
            setShowCompanySettingsBanner(true);

            // Vorausfüllen der Formulardaten für das Modal
            setCompanySettingsFormData({
              companyOwner:
                companyData.firstName && companyData.lastName
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
              title: generateNumberPreview(
                numbering.format || 'RE-%NUMBER',
                numbering.nextNumber || 1000
              ),
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
    if (formData.taxRule === TaxRuleType.DE_TAXABLE) {
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

        if (preferences.preferredInvoiceTemplate) {
          setSelectedTemplate(preferences.preferredInvoiceTemplate as ImportedInvoiceTemplate);
        } else {
          // Fallback auf Standard-Template wenn keine Präferenz gesetzt ist
          setSelectedTemplate(DEFAULT_INVOICE_TEMPLATE);
        }
      } catch (error) {
        console.warn('Fehler beim Laden der Template-Preferences:', error);
        setSelectedTemplate(DEFAULT_INVOICE_TEMPLATE); // Fallback auf das Standard-Template
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
  const renderTemplateComponent = (templateId: ImportedInvoiceTemplate) => {
    const template = AVAILABLE_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      return template.component;
    }
    console.warn('Unbekannte Template-ID:', templateId, 'Verwende Standard Template als Fallback');
    return null; // PDF-System wird über AVAILABLE_TEMPLATES verwaltet
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
        next.taxRule = TaxRuleType.DE_EXEMPT_4_USTG;
      } else {
        // Standardfall: steuerpflichtig in DE
        next.taxRule = prev.taxRule || TaxRuleType.DE_TAXABLE;
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
        setEInvoiceEnabled(false);
      }
    };
    loadEInvoiceSettings();
  }, [uid]);

  // Währungen: alle ISO-4217 Codes mit lokalisierten Namen
  const allCurrencies = React.useMemo(() => getAllCurrencies('de-DE'), []);

  // Quick-Add Service Komponente
  const QuickAddServiceSection = () => (
    <div className="mb-4 border-b pb-4">
      <QuickAddService
        companyId={uid}
        onServiceAdded={service => {
          setItems(prev => [...prev, service]);
          toast.success('Dienstleistung wurde zur Rechnung hinzugefügt');
        }}
      />
    </div>
  );

  // CardContent rendern
  const renderCardContent = () => (
    <div data-slot="card-content" className="px-6">
      <QuickAddServiceSection />
      {/* Rest des Card Contents */}
      <div className="flex items-center justify-between mb-3">
        {/* ... existierender Content ... */}
      </div>
    </div>
  );

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

  // GoBD-konforme Stornierung einer Rechnung
  const handleStornierung = async () => {
    if (!originalInvoice || !uid || !user) {
      toast.error('Rechnung kann nicht storniert werden');
      return;
    }

    // Benutzer-Bestätigung abfragen
    const confirmed = window.confirm(
      `Sind Sie sicher, dass Sie die Rechnung ${originalInvoice.invoiceNumber} stornieren möchten?\n\n` +
        'Dies erstellt eine neue Stornorechnung mit negativen Beträgen und einer fortlaufenden Rechnungsnummer.\n' +
        'Die ursprüngliche Rechnung bleibt unverändert bestehen (GoBD-konform).'
    );

    if (!confirmed) return;

    try {
      setLoading(true);

      // Prüfe, ob die Rechnung storniert werden kann
      if (originalInvoice.isStorno) {
        toast.error('Eine Stornorechnung kann nicht erneut storniert werden');
        return;
      }

      if (originalInvoice.status === 'cancelled') {
        toast.error('Eine bereits stornierte Rechnung kann nicht erneut storniert werden');
        return;
      }

      // Alle anderen Status (einschließlich 'draft') können storniert werden

      // Erstelle Storno-Rechnung mit dem FirestoreInvoiceService
      const stornoReason =
        window.prompt('Grund für die Stornierung (optional):', 'Stornierung auf Kundenwunsch') ||
        'Stornierung';

      const stornoBy = (user as any).displayName || user.email || 'System';

      // Verwende FirestoreInvoiceService für GoBD-konforme Stornierung
      const stornoInvoice = await InvoiceService.createAndSaveStornoInvoice(
        uid,
        originalInvoice.id,
        stornoReason,
        stornoBy
      );

      toast.success(`Stornorechnung ${stornoInvoice.invoiceNumber} wurde erfolgreich erstellt`, {
        description: 'Die ursprüngliche Rechnung wurde als storniert markiert',
      });

      // Weiterleitung zur neuen Stornorechnung
      router.push(`/dashboard/company/${uid}/finance/invoices/${stornoInvoice.id}/edit`);
    } catch (error) {
      console.error('Fehler beim Stornieren der Rechnung:', error);
      toast.error('Fehler beim Stornieren der Rechnung', {
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
      });
    } finally {
      setLoading(false);
    }
  };

  // ✨ DATUM-HILFSFUNKTIONEN für erweiterte Platzhalter
  const getISOWeek = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  };

  const getMonthName = (monthIndex: number): string => {
    const adjustedMonth = ((monthIndex % 12) + 12) % 12; // Handle negative values
    const date = new Date(2000, adjustedMonth, 1);
    return date.toLocaleDateString('de-DE', { month: 'long' });
  };

  const getMonthNameShort = (monthIndex: number): string => {
    const adjustedMonth = ((monthIndex % 12) + 12) % 12;
    const date = new Date(2000, adjustedMonth, 1);
    return date.toLocaleDateString('de-DE', { month: 'short' });
  };

  const getMonthNumber = (monthIndex: number): string => {
    const adjustedMonth = ((monthIndex % 12) + 12) % 12;
    return (adjustedMonth + 1).toString().padStart(2, '0');
  };

  const getNextQuarter = (): number => {
    const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
    return currentQuarter === 4 ? 1 : currentQuarter + 1;
  };

  const getPreviousQuarter = (): number => {
    const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
    return currentQuarter === 1 ? 4 : currentQuarter - 1;
  };

  const getYesterday = (): Date => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  };

  const getDaysInCurrentMonth = (): number => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  };

  // Platzhalter-Ersetzung für Textvorlagen - NEUE ZENTRALE ENGINE
  const replacePlaceholders = (text: string, data: PreviewTemplateData): string => {
    if (!text) return '';

    // Erstelle Kontext für die zentrale Engine
    const context: PlaceholderContext = {
      type: 'invoice',
      company: {
        companyName: data.companyName || '',
        name: data.companyName || '',
        email: data.companyEmail || '',
        phone: data.companyPhone || '',
        website: data.companyWebsite || '',
        vatId: data.companyVatId || '',
        taxNumber: data.companyTaxNumber || '',
        address: data.companyAddress || '',
        // Strukturierte Adresse wenn verfügbar
        street: data.companyAddress?.split('\n')[0] || '',
        postalCode: data.companyAddress?.split('\n')[1]?.split(' ')[0] || '',
        city: data.companyAddress?.split('\n')[1]?.split(' ').slice(1).join(' ') || '',
        country: data.companyAddress?.split('\n')[2] || '',
        // Bankdaten
        bankDetails: data.bankDetails
          ? {
              iban: data.bankDetails.iban || '',
              bic: data.bankDetails.bic || '',
              bankName: data.bankDetails.bankName || '',
              accountHolder: data.bankDetails.accountHolder || '',
            }
          : undefined,
      },
      selectedCustomer: {
        companyName: data.customerName || '',
        name: data.customerName || '',
        email: data.customerEmail || '',
        phone: data.customerPhone || '',
        address: data.customerAddress || '',
        street: data.customerAddress?.split('\n')[0] || '',
        postalCode: data.customerAddress?.split('\n')[1]?.split(' ')[0] || '',
        city: data.customerAddress?.split('\n')[1]?.split(' ').slice(1).join(' ') || '',
        country: data.customerAddress?.split('\n')[2] || '',
      },
      invoice: {
        invoiceNumber: data.invoiceNumber || '',
        invoiceDate: data.date || '',
        dueDate: data.validUntil || '',
        deliveryDate: data.deliveryDate || '',
        serviceDate: data.deliveryDate || '',
        netAmount: data.subtotal || 0,
        taxAmount: data.tax || 0,
        totalAmount: data.total || 0,
        currency: data.currency || 'EUR',
        taxRate: data.vatRate || 0,
        paymentTerms: parseInt(data.paymentTerms || '14'),
        notes: data.notes || '',
        reference: data.reference || '',
        title: data.title || '',
      },
      contactPerson: {
        name:
          data.internalContactPerson ||
          (company?.contactPerson?.name as string) ||
          [company?.firstName, company?.lastName].filter(Boolean).join(' ') ||
          '',
      },
    };

    // Spezial: Kontaktperson ODER Firmenname am Ende
    let result = centralReplacePlaceholders(text, context);
    if (result.includes('[%KONTAKTPERSON]')) {
      const kontakt = context.contactPerson?.name?.trim();
      const fallbackFirma =
        context.company?.companyName?.trim() || context.company?.name?.trim() || '';
      const value = kontakt ? kontakt : fallbackFirma;
      result = result.replace(/\[%KONTAKTPERSON_ODER_FIRMENNAME%\]/g, value);
    }

    // Debug: Platzhalter-Ersetzung validieren

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
    // Kontaktperson: interne Eingabe > Company-Kontakt > Vor-/Nachname
    const contactPersonNameForFooter =
      (formData.internalContactPerson || '').trim() ||
      (company?.contactPerson?.name as string) ||
      '' ||
      [company?.firstName, company?.lastName].filter(Boolean).join(' ') ||
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
    const basePaymentTerms = formData.paymentTerms?.trim() || 'Zahlbar binnen 7 Tagen ohne Abzug';
    if (basePaymentTerms) noteLines.push(`Zahlungsbedingungen: ${basePaymentTerms}`);
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
    const finalPaymentTerms = [basePaymentTerms, skontoSentence].filter(Boolean).join('\n\n');
    const previewNotes =
      [
        formData.deliveryTerms ? `Lieferbedingungen: ${formData.deliveryTerms}` : '',
        finalPaymentTerms ? `Zahlungsbedingungen: ${finalPaymentTerms}` : '',
      ]
        .filter(Boolean)
        .join('\n\n') || undefined;

    const taxRuleLabelMap: Record<TaxRuleType, string> = {
      [TaxRuleType.DE_TAXABLE]:
        'Steuerpflichtiger Umsatz (Regelsteuersatz 19 %, § 1 Abs. 1 Nr. 1 i.V.m. § 12 Abs. 1 UStG)',
      [TaxRuleType.DE_TAXABLE_REDUCED]:
        'Steuerpflichtiger Umsatz (ermäßigter Steuersatz 7 %, § 12 Abs. 2 UStG)',
      [TaxRuleType.DE_EXEMPT_4_USTG]: 'Steuerfreie Lieferung/Leistung gemäß § 4 UStG',
      [TaxRuleType.DE_REVERSE_13B]:
        'Reverse-Charge – Steuerschuldnerschaft des Leistungsempfängers (§ 13b UStG)',
      [TaxRuleType.EU_REVERSE_18B]:
        'Reverse-Charge – Steuerschuldnerschaft des Leistungsempfängers (Art. 196 MwStSystRL, § 18b UStG)',
      [TaxRuleType.EU_INTRACOMMUNITY_SUPPLY]:
        'Innergemeinschaftliche Lieferung, steuerfrei gemäß § 4 Nr. 1b i.V.m. § 6a UStG',
      [TaxRuleType.EU_OSS]: 'Fernverkauf über das OSS-Verfahren (§ 18j UStG)',
      [TaxRuleType.NON_EU_EXPORT]: 'Steuerfreie Ausfuhrlieferung (§ 4 Nr. 1a i.V.m. § 6 UStG)',
      [TaxRuleType.NON_EU_OUT_OF_SCOPE]:
        'Nicht im Inland steuerbare Leistung (Leistungsort außerhalb Deutschlands, § 3a Abs. 2 UStG)',
    };

    const data: PreviewTemplateData = {
      invoiceNumber: 'Vorschau',
      documentNumber: formData.title || 'VORSCHAU',
      date: formData.invoiceDate
        ? formatDateDE(new Date(formData.invoiceDate))
        : formatDateDE(today),
      dueDate: formData.validUntil ? formatDateDE(new Date(formData.validUntil)) : undefined,
      validUntil: formatDateDE(formData.validUntil),
      deliveryDate: formData.deliveryDate
        ? formatDateDE(new Date(formData.deliveryDate))
        : undefined,
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
        (company?.website as string) ||
        (company?.companyWebsite as string) ||
        (company?.companyWebsiteForBackend as string) ||
        ((company as any)?.step1?.website as string) ||
        ((company as any)?.step2?.website as string) ||
        undefined,
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
      // Customer-Objekt für Template-Kompatibilität
      customer: {
        name: formData.customerName || 'Kunde',
        email: formData.customerEmail || '',
        address: (() => {
          const addressLines = (formData.customerAddress || '').split('\n');
          const streetLine = addressLines[0] || '';
          const cityLine = addressLines[1] || '';
          const zipCodeMatch = cityLine.match(/^(\d{5})\s*(.*)$/);

          return {
            street: streetLine,
            zipCode: zipCodeMatch ? zipCodeMatch[1] : '',
            city: zipCodeMatch ? zipCodeMatch[2] : cityLine,
            country: addressLines[2] || 'Deutschland',
          };
        })(),
      },
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
        taxNumber:
          (company?.taxNumber as string) ||
          (company as any)?.taxNumberForBackend ||
          (company as any)?.step3?.taxNumber ||
          ((settings as any)?.taxNumber as string) ||
          '',
        vatId:
          (company?.vatId as string) ||
          (company as any)?.vatIdForBackend ||
          (company as any)?.step3?.vatId ||
          ((settings as any)?.vatId as string) ||
          '',
        website:
          (company?.website as string) ||
          (company?.companyWebsite as string) ||
          (company?.companyWebsiteForBackend as string) ||
          ((company as any)?.step1?.website as string) ||
          ((company as any)?.step2?.website as string) ||
          '',
        bankDetails: {
          iban:
            (company as any)?.step4?.iban ||
            (company?.iban as string) ||
            ((settings as any)?.step4?.iban as string) ||
            '',
          bic:
            (company as any)?.step4?.bic ||
            (company?.bic as string) ||
            ((settings as any)?.step4?.bic as string) ||
            '',
          accountHolder:
            (company as any)?.step4?.accountHolder ||
            (company?.accountHolder as string) ||
            ((settings as any)?.step4?.accountHolder as string) ||
            (settings as any)?.accountHolder ||
            companyName ||
            '',
        },
      },
      // TSE-Daten für deutsche E-Rechnung-Compliance
      tseData: (() => {
        // TSE-Daten aus Company-Einstellungen holen, falls verfügbar
        const tseSettings = (company as any)?.eInvoiceSettings?.tse || (settings as any)?.tse;

        if (!tseSettings) {
          return undefined;
        }

        return {
          serialNumber: tseSettings.serialNumber || '',
          signatureAlgorithm: tseSettings.signatureAlgorithm || 'ecdsa-plain-SHA256',
          transactionNumber:
            tseSettings.transactionNumber || Math.floor(Math.random() * 1000000).toString(),
          startTime: tseSettings.startTime || new Date().toISOString(),
          finishTime: tseSettings.finishTime || new Date(Date.now() + 1000).toISOString(),
          signature: tseSettings.signature || '',
          publicKey: tseSettings.publicKey || '',
          certificateSerial: tseSettings.certificateSerial || '',
        };
      })(),
      // Template-Informationen
      selectedTemplate:
        typeof selectedTemplate === 'string' ? selectedTemplate : 'professional-business',
    };

    return data;
  };

  // Platzhalter in Textvorlagen ersetzen
  const getProcessedPreviewData = (): PreviewTemplateData => {
    const data = buildPreviewData();

    // Import der richtigen replacePlaceholders Funktion mit Sprach-Support aus placeholderSystem
    const { replacePlaceholders: systemReplacePlaceholders } = require('@/utils/placeholderSystem');

    // Platzhalter in Kopf- und Fußtext ersetzen mit Sprach-Unterstützung
    // Deutsch als Standard, da das ein deutsches System ist
    const processedData = {
      ...data,
      headTextHtml: data.headTextHtml
        ? systemReplacePlaceholders(data.headTextHtml, data, 'de')
        : undefined,
      footerText: data.footerText
        ? systemReplacePlaceholders(data.footerText, data, 'de')
        : undefined,
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

  // PDF-Generierung mit der bestehenden InvoicePDFTemplate Service
  const generatePdfBlob = async (): Promise<Blob> => {
    try {
      // Verwende das bestehende Template-Datenformat - angepasst für Invoice mit Platzhaltern
      const templateData = {
        ...getProcessedPreviewData(),
        dueDate: getProcessedPreviewData().validUntil, // Fälligkeitsdatum für Rechnungen
        documentType: 'invoice', // Explizit als Rechnung markieren
      };

      // InvoicePDFTemplate Service importieren
      const { InvoicePDFTemplate } = await import('@/services/pdf/InvoicePDFTemplate');

      // PDF mit der bestehenden Service generieren
      const pdfBuffer = await InvoicePDFTemplate.generateInvoicePDF(templateData);
      const blob = new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' });

      const size = blob.size;

      if (size < 1000) {
        throw new Error('PDF ist zu klein - möglicherweise leer');
      }

      return blob;
    } catch (error) {
      console.error('[PDF] PDF-Erstellung Fehler:', error);
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
    } catch (e: any) {
      console.error('[PDF] Download-Fehler', e);
      toast.error(`PDF konnte nicht erstellt werden${e?.message ? `: ${e.message}` : ''}`);
    }
  };

  // printInBrowser function removed - using PDF-only system now

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
      // Validation
      if (!formData.customerName || !formData.validUntil) {
        toast.error('Bitte füllen Sie alle Pflichtfelder aus');
        return;
      }
      const hasValidItems = items.some(it => it.description && it.quantity > 0);
      if (!hasValidItems) {
        toast.error('Bitte fügen Sie mindestens eine gültige Position hinzu');
        return;
      }

      // Kundensuche für vollständige Daten
      const selectedCustomer = customers.find(c => c.name === formData.customerName);

      // Zahlungsbedingungen final (inkl. Skonto, falls aktiv)
      const skontoSentence =
        skontoEnabled && skontoDays && skontoPercentage
          ? skontoText?.trim() ||
            `Bei Zahlung binnen ${skontoDays} Tagen ${skontoPercentage}% Skonto`
          : '';
      const finalPaymentTerms =
        [formData.paymentTerms?.trim(), skontoSentence].filter(Boolean).join('\n\n') || undefined;

      // 🚨 COMPLETE INVOICE DATA OBJECT - **EVERY SINGLE FIELD** FROM THE FORM!
      // This object must contain ALL form fields to ensure complete data persistence
      const invoiceData = {
        // Basic Invoice Info - ID will be set by Firestore
        id: '', // This will be set by Firestore when saving
        companyId: uid,
        invoiceNumber: formData.title || `RE-${nextNumber}`,
        number: formData.title || `RE-${nextNumber}`,
        sequentialNumber: nextNumber,
        status: asDraft ? 'draft' : 'sent',

        // Dates - ALLE Datumswerte aus dem Formular
        date: formData.invoiceDate
          ? new Date(formData.invoiceDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        issueDate: formData.invoiceDate
          ? new Date(formData.invoiceDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        dueDate: formData.validUntil
          ? new Date(formData.validUntil).toISOString().split('T')[0]
          : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        invoiceDate: formData.invoiceDate || '',
        validUntil: formData.validUntil || '',
        deliveryDate: formData.deliveryDate || '',

        // Customer Data - ALLE Kundenfelder aus dem Formular
        customerName: formData.customerName || '',
        customerFirstName: formData.customerFirstName || '',
        customerLastName: formData.customerLastName || '',
        customerNumber: formData.customerNumber || '',
        customerEmail: formData.customerEmail || selectedCustomer?.email || '',
        customerAddress: formData.customerAddress || '',
        customerOrderNumber: formData.customerOrderNumber || '',
        customerPhone: selectedCustomer?.phone || '',

        // Invoice Identifiers - ALLE Titel und Referenz-Felder
        title: formData.title || '',
        documentNumber: formData.title || `RE-${nextNumber}`,
        reference: formData.customerOrderNumber || '',

        // Company Data - ALLE Firmendaten aus Settings
        companyName:
          company?.companyName ||
          settings?.companyName ||
          (user as any)?.displayName ||
          'Ihr Unternehmen',
        companyAddress: [
          [company?.companyStreet, company?.companyHouseNumber].filter(Boolean).join(' '),
          [company?.companyPostalCode, company?.companyCity].filter(Boolean).join(' '),
          company?.companyCountry,
        ]
          .filter(Boolean)
          .join('\n'),
        companyEmail: (company?.email as string) || '',
        companyPhone:
          (company?.phoneNumber as string) || (company?.companyPhoneNumber as string) || '',
        companyWebsite: (company?.website as string) || (company?.companyWebsite as string) || '',
        companyVatId: (company?.vatId as string) || (company as any)?.vatIdForBackend || '',
        companyTaxNumber:
          (company?.taxNumber as string) || (company as any)?.taxNumberForBackend || '',
        companyRegister:
          (company?.companyRegisterPublic as string) || (company?.companyRegister as string) || '',
        companyLogo: (company?.companyLogo as string) || '',
        profilePictureURL: (company?.profilePictureURL as string) || '',

        // **CRITICAL**: ALLE Textfelder - Kopftext, Footer, Notizen
        description: formData.headTextHtml || '',
        headTextHtml: formData.headTextHtml || '', // MUSS gespeichert werden!
        footerText: formData.footerText || '', // MUSS gespeichert werden!
        notes: formData.notes || '',

        // Contact Person - ALLE Kontaktfelder
        internalContactPerson: formData.internalContactPerson || '',
        contactPersonName: formData.internalContactPerson || '',

        // Payment & Delivery Terms - ALLE Zahlungs- und Lieferbedingungen
        paymentTerms:
          finalPaymentTerms || formData.paymentTerms || 'Zahlbar binnen 14 Tagen ohne Abzug',
        deliveryTerms: formData.deliveryTerms || '',
        deliveryMethod: formData.deliveryTerms ? 'custom' : null,

        // Skonto Data - ALLE Skonto-Einstellungen
        skontoEnabled: skontoEnabled || false,
        skontoDays: skontoDays || null,
        skontoPercentage: skontoPercentage || null,
        skontoText: skontoText || '',

        // Financial Data - ALLE Items mit vollständigen Details
        items: items
          .filter(it => it.description && it.quantity > 0)
          .map(item => ({
            id: item.id || crypto.randomUUID(),
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
            taxRate: item.taxRate || taxRate,
            unit: item.unit || 'Stk',
            category: item.category || 'Artikel',
            discountPercent: item.discountPercent || 0,
            inventoryItemId: item.inventoryItemId || null,
          })),
        amount: subtotal, // Nettobetrag
        tax: vat, // Steuerbetrag
        total: grandTotal, // Gesamtbetrag
        subtotal: subtotal,
        taxAmount: vat,

        // Tax & Business Settings - ALLE Steuer-Einstellungen
        vatRate: taxRate,
        isSmallBusiness: settings?.ust === 'kleinunternehmer' || taxRate === 0,
        priceInput: showNet ? 'netto' : 'brutto',
        taxRuleType: (formData.taxRule as TaxRuleType) || 'DE_TAXABLE',
        taxRule: (formData.taxRule as TaxRuleType) || 'DE_TAXABLE',
        showNet: showNet,

        // Currency & Formatting
        currency: formData.currency || 'EUR',

        // Required metadata fields
        year: new Date().getFullYear(),
        createdAt: new Date(),
        updatedAt: new Date(),

        // User IDs
        createdBy: uid,
        lastModifiedBy: uid,

        // Bank Details - ALLE Bankdaten
        bankDetails: company
          ? {
              iban: (company as any)?.step4?.iban || (company?.iban as string) || '',
              bic: (company as any)?.step4?.bic || (company?.bic as string) || '',
              bankName: (company as any)?.step4?.bankName || (company?.bankName as string) || '',
              accountHolder:
                (company as any)?.step4?.accountHolder ||
                (company?.accountHolder as string) ||
                company?.companyName ||
                '',
            }
          : undefined,

        // Template & UI Settings
        template: typeof selectedTemplate === 'string' ? selectedTemplate : 'TEMPLATE_NEUTRAL',
        templateType:
          typeof selectedTemplate === 'string' ? selectedTemplate : 'TEMPLATE_NEUTRAL',
        language: 'de',

        // Additional Control Fields
        isStorno: false,
        isRecurring: false,

        // E-Invoice Settings (if enabled)
        isEInvoice: eInvoiceEnabled || false,
        eInvoiceType: eInvoiceEnabled ? 'zugferd' : null,
        eInvoiceSettings: eInvoiceEnabled ? eInvoiceSettings : null,

        // PDF & Document Paths
        pdfPath: null,
        eInvoiceXmlPath: null,

        // Delivery Date Configuration
        deliveryDateType: deliveryDateType || 'single',
        deliveryDateRange:
          deliveryDateType === 'range'
            ? {
                from: deliveryDateRange.from?.toISOString().split('T')[0] || null,
                to: deliveryDateRange.to?.toISOString().split('T')[0] || null,
              }
            : null,

        // Original form state preservation for debugging
        _originalFormData: {
          ...formData,
          items: items,
          skontoEnabled,
          skontoDays,
          skontoPercentage,
          skontoText,
          showNet,
          taxRate,
          eInvoiceEnabled,
          deliveryDateType,
          deliveryDateRange,
        },
      } as any;

      // 🚨 CRITICAL: Remove all undefined values (Firestore doesn't accept undefined)
      // But preserve Date objects for Firestore Timestamps
      const cleanInvoiceData = JSON.parse(
        JSON.stringify(invoiceData, (key, value) => {
          return value === undefined ? null : value;
        })
      );

      // Restore Date objects that got converted to strings
      cleanInvoiceData.createdAt = new Date(cleanInvoiceData.createdAt);
      cleanInvoiceData.updatedAt = new Date(cleanInvoiceData.updatedAt);

      // 🔄 UPDATE EXISTING INVOICE (Edit Mode)
      // Verwende die ursprüngliche ID der existierenden Rechnung
      cleanInvoiceData.id = invoiceId;

      // Update Invoice using FirestoreInvoiceService
      await InvoiceService.updateInvoice(invoiceId, cleanInvoiceData);

      // 📊 SERVICE USAGE TRACKING - Update service usage analytics
      try {
        const { ServiceUsageTrackingService } = await import('@/services/serviceUsageTrackingService');
        await ServiceUsageTrackingService.trackInvoiceServiceUsage(
          uid,
          invoiceId,
          items || [],
          formData.customerName
        );
      } catch (trackingError) {
        console.warn('⚠️ Service usage tracking failed (non-critical):', trackingError);
      }

      // Inventory Management (Optional für Edit)
      try {
        const inventoryItems = (items || [])
          .filter(it => it.inventoryItemId && it.quantity > 0 && it.category !== 'discount')
          .map(it => ({ itemId: it.inventoryItemId as string, quantity: it.quantity }));

        if (inventoryItems.length > 0) {
        }
      } catch (reserveErr: any) {
        console.error('❌ Inventory update failed:', reserveErr);
        // Continue anyway - inventory updates are not critical for invoice editing
      }

      // Für Edit: Keine Nummern-Sequenz-Updates nötig da die Nummer schon existiert
      // Invoice number bleibt gleich bei Edit

      toast.success(asDraft ? 'Rechnung als Entwurf aktualisiert' : 'Rechnung aktualisiert');

      // Navigate to invoices list
      router.push(`/dashboard/company/${uid}/finance/invoices`);
    } catch (e) {
      console.error('❌ CRITICAL ERROR in handleSubmit:', e);
      toast.error('Rechnung konnte nicht gespeichert werden');
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
        const isKleinunternehmer =
          companyData.kleinunternehmer === 'ja' ||
          companyData.ust === 'kleinunternehmer' ||
          companyData.step2?.kleinunternehmer === 'ja';

        if (isKleinunternehmer) {
          if (hasVatId) {
            complianceErrors.push(
              'Kleinunternehmer dürfen keine USt-IdNr. auf Rechnungen ausweisen'
            );
          }
          if (!hasTaxNumber) {
            complianceErrors.push('Kleinunternehmer benötigen eine Steuernummer für E-Rechnungen');
          }
        } else {
          // Regelbesteuerte Unternehmen
          if (!hasVatId && !hasTaxNumber) {
            complianceErrors.push(
              'Regelbesteuerte Unternehmen benötigen USt-IdNr. oder Steuernummer'
            );
          }
        }

        // Rechtsform und Registrierung (aus der echten DB-Struktur)
        const legalForm = companyData.legalForm || companyData.step2?.legalForm;
        if (legalForm && legalForm !== 'Einzelunternehmen' && legalForm !== 'Freiberufler') {
          // Kapitalgesellschaften benötigen Handelsregistereintrag
          const hasRegister =
            companyData.companyRegister?.trim() ||
            companyData.step3?.companyRegister?.trim() ||
            companyData.registrationNumber?.trim();
          if (!hasRegister) {
            complianceErrors.push(
              'Handelsregisternummer ist für Kapitalgesellschaften erforderlich'
            );
          }
        }

        // Bankverbindung für Zahlungen (aus der echten DB-Struktur)
        const hasIban = companyData.iban?.trim() || companyData.step4?.iban?.trim();
        const hasBic = companyData.bic?.trim() || companyData.step4?.bic?.trim();
        const hasBankName = companyData.bankName?.trim() || companyData.step4?.bankName?.trim();
        const hasAccountHolder =
          companyData.accountHolder?.trim() || companyData.step4?.accountHolder?.trim();

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
        const hasWebsite =
          companyData.website?.trim() ||
          companyData.companyWebsite?.trim() ||
          companyData.step1?.website?.trim() ||
          companyData.companyWebsiteForBackend?.trim();
        if (!hasWebsite) {
          complianceErrors.push('Firmen-Website ist für professionelle E-Rechnungen empfohlen');
        }

        // Logo für Branding (aus der echten DB-Struktur)
        const hasLogo =
          companyData.profilePictureURL?.trim() || companyData.profilePictureFirebaseUrl?.trim();
        if (!hasLogo) {
          complianceErrors.push('Firmen-Logo ist für professionelle E-Rechnungen empfohlen');
        }

        // Branchenangabe (aus der echten DB-Struktur)
        const hasIndustry =
          companyData.selectedCategory?.trim() ||
          companyData.step2?.industry?.trim() ||
          companyData.industry?.trim();
        if (!hasIndustry) {
          complianceErrors.push('Branchenangabe ist für E-Rechnungen empfohlen');
        }

        // Geschäftsbeschreibung (aus der echten DB-Struktur)
        if (!companyData.description?.trim()) {
          complianceErrors.push(
            'Geschäftsbeschreibung ist für professionelle E-Rechnungen empfohlen'
          );
        }
      } else {
        complianceErrors.push(
          'Unternehmensdaten nicht vollständig - bitte Firmenprofil vervollständigen'
        );
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
          complianceErrors.push(
            `Kunde &quot;${selectedCustomer.name}&quot; hat keine E-Mail-Adresse hinterlegt`
          );
        }

        if (
          !selectedCustomer.street?.trim() ||
          !selectedCustomer.city?.trim() ||
          !selectedCustomer.postalCode?.trim()
        ) {
          complianceErrors.push(
            `Kunde &quot;${selectedCustomer.name}&quot; hat unvollständige Adressdaten`
          );
        }

        // Für B2B-Kunden (mit VAT-ID) zusätzliche Prüfungen
        if (selectedCustomer.vatId?.trim()) {
          if (!selectedCustomer.vatValidated) {
            complianceErrors.push(
              `USt-IdNr. von Kunde &quot;${selectedCustomer.name}&quot; ist nicht validiert`
            );
          }
        }
      }

      // 4. Rechnungsdaten Prüfung
      if (!formData.title?.trim()) {
        complianceErrors.push('Rechnungsnummer ist erforderlich');
        invalidFieldsSet.add('title');
      }

      // 5. Positionen Prüfung
      const validItems = items.filter(
        item =>
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
          eInvoiceSettings: updatedSettings,
        });

        setEInvoiceSettings(updatedSettings);
      } catch (updateError) {
        console.error('Fehler beim Speichern der E-Rechnung Einstellungen:', updateError);
        // Don't fail the whole process if settings can't be saved
      }

      toast.success('E-Rechnung aktiviert', {
        description:
          'Alle Compliance-Anforderungen erfüllt. E-Rechnungen werden automatisch generiert.',
      });
    } catch (error) {
      console.error('Fehler bei E-Rechnung Compliance-Prüfung:', error);
      toast.error('E-Rechnung Prüfung fehlgeschlagen', {
        description:
          'Technischer Fehler bei der Compliance-Prüfung. Bitte versuchen Sie es erneut.',
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

  // Loading state for initial invoice data
  if (loadingInvoice) {
    return (
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#14ad9f]" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Rechnung wird geladen...</h2>
            <p className="text-gray-600">Die Rechnungsdaten werden abgerufen.</p>
          </div>
        </div>
      </div>
    );
  }

  // Guard: Rechnung nicht gefunden oder keine Berechtigung
  if (!loadingInvoice && !originalInvoice) {
    return (
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Rechnung nicht gefunden</h2>
            <p className="text-gray-600 mb-4">
              Die angeforderte Rechnung konnte nicht gefunden werden oder Sie haben keine
              Berechtigung.
            </p>
            <Button
              onClick={() => router.push(`/dashboard/company/${uid}/finance/invoices`)}
              className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
            >
              Zurück zu Rechnungen
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header - SevDesk Style */}
      <header className="w-full" style={{ maxWidth: '1440px' }}>
        <div className="flex items-center justify-between py-4 border-b border-gray-200">
          {/* Left side - Title */}
          <div className="flex items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {loadingInvoice ? 'Rechnung wird geladen...' : `Rechnung bearbeiten`}
                {originalInvoice?.invoiceNumber && !loadingInvoice && (
                  <span className="text-lg font-normal text-gray-600 ml-2">
                    #{originalInvoice.invoiceNumber}
                  </span>
                )}
              </h2>
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
                    backgroundColor: eInvoiceEnabled ? '#14ad9f' : undefined,
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
                onClick={() => handleSubmit(true)}
                disabled={loading || loadingInvoice}
              >
                {loadingInvoice ? 'Laden...' : 'Speichern'}
              </Button>

              <Button
                variant="outline"
                size="default"
                onClick={() => {
                  const previewData = buildPreviewData();
                  const TemplateComponent = renderTemplateComponent(selectedTemplate);
                  setPreviewOpen(true);
                }}
                className="border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
              >
                <Eye className="w-4 h-4 mr-2" />
                Live-Vorschau
              </Button>

              <Button
                className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
                size="default"
                onClick={() => handleSubmit(false)}
                disabled={loading || loadingInvoice}
              >
                {loadingInvoice ? 'Laden...' : 'Rechnung aktualisieren'}
              </Button>

              {/* More Options Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="default" className="px-2">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => {
                      // TODO: Aufgabe erstellen Funktionalität implementieren
                      toast.success('Aufgabe erstellen - Feature wird implementiert');
                    }}
                    className="w-full"
                  >
                    <div className="w-full">
                      <Button
                        variant="default"
                        className="w-full bg-[#14ad9f] hover:bg-taskilo-hover text-white justify-center"
                        size="sm"
                      >
                        Aufgabe erstellen
                      </Button>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      handleStornierung();
                    }}
                    className="w-full"
                  >
                    <div className="w-full">
                      <Button
                        variant="default"
                        className="w-full bg-red-600 hover:bg-red-700 text-white justify-center"
                        size="sm"
                      >
                        Rechnung Stornieren
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
            <AlertTriangle className="h-6 w-6 text-orange-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="font-medium text-orange-800 mb-1">Angaben zu deinem Unternehmen</div>
              <div className="text-sm text-orange-700 mb-3">
                Damit deine Rechnungen rechtssicher und GoBD-konform sind, ergänze noch Angaben zu
                dir und deinem Unternehmen.
              </div>
              <Button
                onClick={() => setShowCompanySettingsModal(true)}
                className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
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
                    <h4 className="text-sm font-semibold text-[#14ad9f]">Erforderliche Angaben</h4>
                    <span className="text-xs bg-[#14ad9f]/10 text-[#14ad9f] px-1.5 py-0.5 rounded">
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
                Vollständige Firmen- und Kundendaten, Steuer-ID, Bankverbindung, gültige
                E-Mail-Adressen
              </div>
            </div>

            <SheetFooter className="mt-6 pt-4 border-t border-[#14ad9f]/10">
              <Button
                onClick={() => setShowCompliancePanel(false)}
                variant="default"
                className="w-full bg-[#14ad9f] hover:bg-taskilo-hover text-white"
                size="sm"
                style={{
                  backgroundColor: '#14ad9f',
                  color: 'white',
                  border: 'none',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = '#129488';
                }}
                onMouseLeave={e => {
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
                          ? 'bg-[#14ad9f] hover:bg-taskilo-hover text-white'
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
                          ? 'bg-[#14ad9f] hover:bg-taskilo-hover text-white'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setContactType('person')}
                    >
                      Person
                    </Button>
                  </div>
                </div>

                {/* ⚠️ Warning Banner: Kunde nicht gefunden */}
                {formData.customerName && !formData.customerId && (
                  <div className="mb-4 p-4 bg-[#14ad9f]/10 border-2 border-[#14ad9f] rounded-lg">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <Info className="h-5 w-5 text-[#14ad9f] mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm text-gray-700">
                            <span className="font-semibold text-[#14ad9f]">"{formData.customerName}"</span> ist noch nicht in Ihrer Kundenverwaltung.
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={() => setCreateCustomerOpen(true)}
                        className="bg-[#14ad9f] hover:bg-taskilo-hover text-white shrink-0"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Kunde anlegen
                      </Button>
                    </div>
                  </div>
                )}

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
                              customer.name
                                .toLowerCase()
                                .includes(formData.customerName.toLowerCase())
                            )
                            .slice(0, 5)
                            .map(customer => (
                              <div
                                key={customer.id}
                                className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
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
                            className="p-2 hover:bg-gray-100 rounded-md cursor-pointer"
                            onClick={() => {
                              setShowNewCustomerModal(true);
                              setShowCustomerSearchPopup(false);
                            }}
                          >
                            + Neuen Kunden &quot;{formData.customerName}&quot; erstellen
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
                              const combinedName =
                                `${value} ${formData.customerLastName || ''}`.trim();
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
                              const combinedName =
                                `${formData.customerFirstName || ''} ${value}`.trim();
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
                              customer.name
                                .toLowerCase()
                                .includes(formData.customerName.toLowerCase())
                            )
                            .slice(0, 5)
                            .map(customer => (
                              <div
                                key={customer.id}
                                className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
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
                            className="p-2 hover:bg-gray-100 rounded-md cursor-pointer"
                            onClick={() => {
                              setCreateCustomerOpen(true);
                              setShowCustomerSearchPopup(false);
                            }}
                          >
                            + Neuen Kunden &quot;{formData.customerName}&quot; erstellen
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
                      className="text-sm text-[#14ad9f] hover:text-taskilo-hover font-medium"
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
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
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
                      value={
                        formData.customerAddress
                          ?.split('\n')
                          [showAddressAddition ? 2 : 1]?.split(' ')[0] || ''
                      }
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
                      value={
                        formData.customerAddress
                          ?.split('\n')
                          [showAddressAddition ? 2 : 1]?.split(' ')
                          .slice(1)
                          .join(' ') || ''
                      }
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
                    value={
                      formData.customerAddress?.split('\n')[showAddressAddition ? 3 : 2] ||
                      'Deutschland'
                    }
                    onValueChange={value => {
                      const lines = formData.customerAddress?.split('\n') || ['', '', '', ''];
                      const lineIndex = showAddressAddition ? 3 : 2;
                      lines[lineIndex] = value;
                      setFormData(prev => ({ ...prev, customerAddress: lines.join('\n') }));
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Bitte auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map(country => (
                        <SelectItem key={country.value} value={country.value}>
                          {country.label}
                        </SelectItem>
                      ))}
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
                      value={formData.invoiceDate || new Date().toISOString().split('T')[0]}
                      onChange={e => {
                        setFormData(prev => ({ ...prev, invoiceDate: e.target.value }));
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
                        value={formData.deliveryDate || new Date().toISOString().split('T')[0]}
                        onChange={e => {
                          setFormData(prev => ({ ...prev, deliveryDate: e.target.value }));
                        }}
                        required
                      />
                    ) : (
                      <Popover
                        open={deliveryDatePopoverOpen}
                        onOpenChange={setDeliveryDatePopoverOpen}
                      >
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
                                  {format(deliveryDateRange.from, 'dd.MM.yyyy', { locale: de })} -{' '}
                                  {format(deliveryDateRange.to, 'dd.MM.yyyy', { locale: de })}
                                </>
                              ) : (
                                format(deliveryDateRange.from, 'dd.MM.yyyy', { locale: de })
                              )
                            ) : (
                              'Zeitraum auswählen'
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
                              to: deliveryDateRange.to,
                            }}
                            onSelect={range => {
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
                        placeholder="Wird automatisch generiert"
                        value={formData.title || ''}
                        onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        required
                        className={`pr-10 ${originalInvoice?.title ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                        disabled={!!originalInvoice?.title}
                        title={
                          originalInvoice?.title
                            ? 'Rechnungsnummer kann nach Erstellung nicht mehr geändert werden (GoBD Konformität)'
                            : undefined
                        }
                      />

                      {!originalInvoice?.title && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
                          type="button"
                          onClick={() => setShowNumberingModal(true)}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <circle cx="12" cy="12" r="3" />
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1.06 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1.06H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1.06-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1.06 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1.06H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1.06z" />
                          </svg>
                        </Button>
                      )}
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

      {/* Kopf-Text & Textvorlagen */}
      <InvoiceHeaderTextSection
        title={formData.title}
        headTextHtml={formData.headTextHtml}
        onTitleChange={value => setFormData(prev => ({ ...prev, title: value }))}
        onHeadTextChange={html => setFormData(prev => ({ ...prev, headTextHtml: html }))}
        companyId={uid}
        userId={user?.uid || ''}
        getFieldErrorClass={getFieldErrorClass}
      />

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
                className={showNet ? 'bg-[#14ad9f] hover:bg-taskilo-hover text-white' : ''}
                onClick={() => setShowNet(true)}
                size="sm"
              >
                Netto
              </Button>
              <Button
                type="button"
                variant={!showNet ? 'default' : 'outline'}
                className={!showNet ? 'bg-[#14ad9f] hover:bg-taskilo-hover text-white' : ''}
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

            {/* Dienstleistung anlegen */}
            <div className="flex items-center gap-2 border-l border-gray-200 pl-4 ml-2">
              <div className="relative w-[500px]">
                <Input
                  type="text"
                  value={newServiceName || ''}
                  onChange={e => {
                    const value = e.target.value;
                    setNewServiceName(value);
                    // Zeige Dropdown ab 2 Zeichen
                    if (value.trim().length >= 2) {
                      setShowPopover(true);
                    } else {
                      setShowPopover(false);
                    }
                  }}
                  placeholder="Dienstleistung suchen oder neue erstellen..."
                  className="w-full"
                />

                {/* Dropdown für Vorschläge */}
                {showPopover && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50">
                    <div className="max-h-[400px] overflow-y-auto p-4">
                      {loadingSavedServices ? (
                        <div className="p-2 flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Lade Dienstleistungen...</span>
                        </div>
                      ) : (
                        <>
                          {/* Vorhandene Dienstleistungen */}
                          {(savedServices || [])
                            .filter(
                              service =>
                                !newServiceName ||
                                service.name.toLowerCase().includes(newServiceName.toLowerCase())
                            )
                            .map(service => (
                              <div
                                key={service.id}
                                className="flex items-center justify-between p-2 hover:bg-gray-100 cursor-pointer rounded-md"
                                onClick={() => {
                                  const price =
                                    typeof service.price === 'string'
                                      ? parseFloat(service.price)
                                      : service.price;
                                  setItems(prev => [
                                    ...prev,
                                    {
                                      id: crypto.randomUUID(),
                                      description: service.name,
                                      quantity: 1,
                                      unitPrice: price,
                                      total: price,
                                      unit: service.unit || 'Stk',
                                    },
                                  ]);
                                  setNewServiceName('');
                                  setShowPopover(false);
                                  toast.success('Dienstleistung zur Rechnung hinzugefügt');
                                }}
                              >
                                <div>
                                  <div className="font-medium">{service.name}</div>
                                  <div className="text-sm text-gray-500">{service.unit}</div>
                                </div>
                                <div className="font-medium">
                                  {formatCurrency(
                                    typeof service.price === 'string'
                                      ? parseFloat(service.price)
                                      : service.price
                                  )}
                                </div>
                              </div>
                            ))}

                          {/* Option zum Erstellen einer neuen Dienstleistung */}
                          {newServiceName && newServiceName.trim().length >= 2 && (
                            <div
                              className={
                                savedServices.filter(service =>
                                  service.name.toLowerCase().includes(newServiceName.toLowerCase())
                                ).length > 0
                                  ? 'border-t border-gray-200 mt-2 pt-2'
                                  : ''
                              }
                            >
                              <div
                                className="p-2 hover:bg-gray-100 rounded-md cursor-pointer"
                                onClick={() => {
                                  setServiceDraft({
                                    name: newServiceName,
                                    description: '',
                                    price: '',
                                    unit: 'Stk',
                                  });
                                  setServiceModalOpen(true);
                                  setNewServiceName('');
                                  setShowPopover(false);
                                }}
                              >
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Plus className="w-4 h-4" />
                                  <span>
                                    Neue Dienstleistung &quot;{newServiceName}&quot; erstellen
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Modal für neue Dienstleistung */}
            <Dialog open={serviceModalOpen} onOpenChange={setServiceModalOpen}>
              <DialogContent className="max-w-md" aria-describedby="service-dialog-description">
                <DialogHeader>
                  <DialogTitle>Neue Dienstleistung anlegen</DialogTitle>
                  <div id="service-dialog-description" className="sr-only">
                    Dialog zum Anlegen einer neuen Dienstleistung mit Name und weiteren Details
                  </div>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name *</label>
                    <input
                      type="text"
                      className="w-full border rounded px-2 py-1"
                      value={serviceDraft.name}
                      onChange={e => setServiceDraft(d => ({ ...d, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Beschreibung</label>
                    <textarea
                      className="w-full border rounded px-2 py-1"
                      value={serviceDraft.description}
                      onChange={e => setServiceDraft(d => ({ ...d, description: e.target.value }))}
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">Preis *</label>
                      <input
                        type="number"
                        className="w-full border rounded px-2 py-1"
                        value={serviceDraft.price}
                        onChange={e => setServiceDraft(d => ({ ...d, price: e.target.value }))}
                        min="0"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Einheit</label>
                      <select
                        className="border rounded px-2 py-1"
                        value={serviceDraft.unit}
                        onChange={e => setServiceDraft(d => ({ ...d, unit: e.target.value }))}
                      >
                        <option value="Stk">Stk</option>
                        <option value="Std">Std</option>
                        <option value="Pauschale">Pauschale</option>
                        <option value="%">%</option>
                        <option value="Tag(e)">Tag(e)</option>
                      </select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
                    onClick={async () => {
                      if (!serviceDraft.name.trim() || !serviceDraft.price) return;

                      // 1. Zuerst in Firestore speichern
                      await saveServiceToSubcollection();

                      // 2. Dann als Position zur Rechnung hinzufügen
                      const newItemWithInventoryId = {
                        id:
                          typeof crypto !== 'undefined' && 'randomUUID' in crypto
                            ? crypto.randomUUID()
                            : Math.random().toString(36).slice(2),
                        description:
                          serviceDraft.name +
                          (serviceDraft.description ? `: ${serviceDraft.description}` : ''),
                        quantity: 1,
                        unitPrice: parseFloat(serviceDraft.price),
                        total: parseFloat(serviceDraft.price),
                        unit: serviceDraft.unit,
                        inventoryItemId: 'will-be-set-by-saveServiceToSubcollection', // Wird gesetzt
                      };

                      setItems(prev => [...prev, newItemWithInventoryId]);

                      // 3. Dialog schließen und Form zurücksetzen
                      setServiceModalOpen(false);
                      setServiceDraft({ name: '', description: '', price: '', unit: 'Stk' });
                      toast.success('Dienstleistung zur Rechnung hinzugefügt');
                    }}
                    disabled={!serviceDraft.name.trim() || !serviceDraft.price}
                  >
                    Speichern & hinzufügen
                  </Button>
                  <DialogClose asChild>
                    <Button variant="outline" type="button">
                      Abbrechen
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
                              className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
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

              {/* Umsatzsteuerregelung */}
              <div className="space-y-3">
                <Label className="font-semibold">Umsatzsteuerregelung</Label>

                <TaxRuleSelector
                  value={formData.taxRule}
                  onChange={value => setFormData(p => ({ ...p, taxRule: value }))}
                />

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
        <Button type="button" onClick={downloadPdf} variant="outline" className="sm:ml-2">
          <Printer className="w-4 h-4 mr-2" />
          PDF herunterladen
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
          className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
        >
          <Mail className="w-4 h-4 mr-2" />
          Als E-Mail versenden
        </Button>
      </div>

      {/* E-Rechnung ist ab 2025 PFLICHT - automatisch bei jeder Rechnung */}

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
                    className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
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

      {/* Live-Vorschau Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-7xl w-full p-0">
          <DialogHeader className="px-6 pt-6 flex items-center justify-between">
            <DialogTitle>Live-Vorschau</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const previewData = buildPreviewData();
                const payload = encodeURIComponent(btoa(JSON.stringify(previewData)));
                // Removed: Print URL - now using PDF-only system
                // window.open(`/print/invoice/preview?auto=1&payload=${payload}`, '_blank');
              }}
            >
              <Printer className="h-4 w-4 mr-2" />
              Drucken
            </Button>
          </DialogHeader>
          <div
            className="bg-[#f5f5f5] w-full overflow-auto"
            style={{ maxHeight: 'calc(100vh - 200px)' }}
          >
            <div className="max-w-[210mm] mx-auto bg-white shadow-sm my-8">
              {loadingTemplate ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Template wird geladen...</span>
                </div>
              ) : (
                <div className="p-0">
                  <InvoiceTemplateRenderer
                    template={selectedTemplate}
                    data={buildPreviewData()}
                    preview={true}
                    customizations={{ showLogo: true }}
                  />
                </div>
              )}
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
                    onChange={e =>
                      setCompanySettingsFormData(prev => ({
                        ...prev,
                        companyOwner: e.target.value,
                      }))
                    }
                    placeholder="Inhaber"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Firma</Label>
                  <Input
                    value={companySettingsFormData.companyName}
                    onChange={e =>
                      setCompanySettingsFormData(prev => ({ ...prev, companyName: e.target.value }))
                    }
                    placeholder="Firma"
                  />
                </div>
              </div>

              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Anschrift</Label>
                  <Input
                    value={companySettingsFormData.street}
                    onChange={e =>
                      setCompanySettingsFormData(prev => ({ ...prev, street: e.target.value }))
                    }
                    placeholder="Straße und Hausnummer"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Input
                      value={companySettingsFormData.zip}
                      onChange={e =>
                        setCompanySettingsFormData(prev => ({ ...prev, zip: e.target.value }))
                      }
                      placeholder="PLZ"
                    />
                  </div>
                  <div className="space-y-2">
                    <Input
                      value={companySettingsFormData.city}
                      onChange={e =>
                        setCompanySettingsFormData(prev => ({ ...prev, city: e.target.value }))
                      }
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
                    onChange={e =>
                      setCompanySettingsFormData(prev => ({ ...prev, taxNumber: e.target.value }))
                    }
                    placeholder="Steuernummer"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Umsatzsteuer-ID</Label>
                  <Input
                    value={companySettingsFormData.vatNumber}
                    onChange={e =>
                      setCompanySettingsFormData(prev => ({ ...prev, vatNumber: e.target.value }))
                    }
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
                    onChange={e =>
                      setCompanySettingsFormData(prev => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="marie@musterfrau.de"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefon</Label>
                  <Input
                    value={companySettingsFormData.phone}
                    onChange={e =>
                      setCompanySettingsFormData(prev => ({ ...prev, phone: e.target.value }))
                    }
                    placeholder="07821 127384"
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>IBAN</Label>
                  <Input
                    value={companySettingsFormData.iban}
                    onChange={e =>
                      setCompanySettingsFormData(prev => ({ ...prev, iban: e.target.value }))
                    }
                    placeholder="DE01100100000010101010"
                  />
                </div>
                <div className="space-y-2">
                  <Label>BIC</Label>
                  <Input
                    value={companySettingsFormData.bic}
                    onChange={e =>
                      setCompanySettingsFormData(prev => ({ ...prev, bic: e.target.value }))
                    }
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
              className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
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
                <div>
                  <code className="bg-gray-100 px-1 rounded">%NUMBER</code> - Nächste Zahl{' '}
                  <span className="text-red-500">Obligatorisch</span>
                </div>
                <div>
                  <code className="bg-gray-100 px-1 rounded">%YYYY</code> - Aktuelles Jahr (2025)
                </div>
                <div>
                  <code className="bg-gray-100 px-1 rounded">%YY</code> - Aktuelles Jahr (25)
                </div>
                <div>
                  <code className="bg-gray-100 px-1 rounded">%MM</code> - Aktueller Monat (09)
                </div>
                <div>
                  <code className="bg-gray-100 px-1 rounded">%M</code> - Aktueller Monat (9)
                </div>
                <div>
                  <code className="bg-gray-100 px-1 rounded">%DD</code> - Aktueller Tag (15)
                </div>
                <div>
                  <code className="bg-gray-100 px-1 rounded">%D</code> - Aktueller Tag (15)
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowNumberingModal(false)}>
                Abbrechen
              </Button>
              <Button
                className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
                onClick={async () => {
                  try {
                    // Speichere die Nummernkreis-Einstellungen in Firestore
                    const companyRef = doc(db, 'companies', uid);
                    await updateDoc(companyRef, {
                      'invoiceNumbering.format': numberingFormat,
                      'invoiceNumbering.nextNumber': nextNumber,
                      'invoiceNumbering.lastUpdated': new Date().toISOString(),
                    });

                    // Aktualisiere das Rechnungsnummer-Feld mit der neuen Vorschau
                    setFormData(prev => ({
                      ...prev,
                      title: generateNumberPreview(numberingFormat, nextNumber),
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
              const criticalErrors = complianceErrors.filter(
                error =>
                  !error.includes('empfohlen') &&
                  !error.includes('Website') &&
                  !error.includes('Logo') &&
                  !error.includes('Branchenangabe') &&
                  !error.includes('Geschäftsbeschreibung') &&
                  !error.includes('Telefonnummer')
              );

              const recommendedErrors = complianceErrors.filter(
                error =>
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
                        <h4 className="text-sm font-semibold text-red-800">
                          Erforderliche Angaben
                        </h4>
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
                          {recommendedErrors.length > 2 &&
                            ` und ${recommendedErrors.length - 2} weitere Verbesserungen`}
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
              Vollständige Firmen- und Kundendaten, Steuer-ID, Bankverbindung, gültige
              E-Mail-Adressen
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
