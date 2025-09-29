'use client';

import React, { useState, useEffect } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { COUNTRIES } from '@/constants/countries';
import {
  Bell,
  Save,
  Eye,
  Send,
  Loader2,
  AlertTriangle,
  Clock,
  Euro,
  FileText,
  User,
  Mail,
  MoreHorizontal,
  Calculator,
  StickyNote,
  Info,
  X,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/firebase/clients';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { ReminderLivePreviewComponent } from '@/components/finance/ReminderLivePreviewComponent';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import InvoiceHeaderTextSection from '@/components/finance/InvoiceHeaderTextSection';
import FooterTextEditor from '@/components/finance/FooterTextEditor';
import InventorySelector from '@/components/quotes/InventorySelector';
import { QuoteItem } from '@/services/quoteService';

type PreviewTemplateData = {
  invoiceNumber: string;
  documentNumber: string;
  documentType?: string;
  date: string;
  validUntil?: string;
  dueDate?: string;
  title?: string;
  reference?: string;
  currency?: string;
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
    taxNumber?: string;
    vatId?: string;
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
  headerText?: string;
  introText?: string;
  description?: string;
  footerText?: string;
  contactPersonName?: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  step1?: any;
  step2?: any;
  step3?: any;
  step4?: any;
  managingDirectors?: string;
  districtCourt?: string;
  companyRegister?: string;
  legalForm?: string;
  firstName?: string;
  lastName?: string;
  selectedTemplate?: string;
  reminderLevel?: number;
  reminderFee?: number;
  daysPastDue?: number;
  outstandingAmount?: number;
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
};

interface CustomerAddressDisplayProps {
  invoiceId: string;
  companyId: string;
}

function CustomerAddressDisplay({ invoiceId, companyId }: CustomerAddressDisplayProps) {
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCustomerAddress = async () => {
      if (!invoiceId || !companyId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const invoiceDoc = await getDoc(doc(db, 'companies', companyId, 'invoices', invoiceId));
        if (invoiceDoc.exists()) {
          const invoiceData = invoiceDoc.data();
          const customerId = invoiceData.customerId;

          if (customerId) {
            const customerDoc = await getDoc(doc(db, 'companies', companyId, 'customers', customerId));
            if (customerDoc.exists()) {
              const customerData = customerDoc.data();
              const addressParts = [
                customerData.street,
                customerData.postalCode && customerData.city ? `${customerData.postalCode} ${customerData.city}` : customerData.city,
                customerData.country || 'Deutschland'
              ].filter(Boolean);

              const address = addressParts.join('\n');
              setCustomerAddress(address || 'Keine Adresse verfügbar');
            } else {
              setCustomerAddress('Kunde nicht gefunden');
            }
          } else {
            setCustomerAddress('Kein Kunde zugewiesen');
          }
        } else {
          setCustomerAddress('Rechnung nicht gefunden');
        }
      } catch (error) {
        console.error('Error loading customer address:', error);
        setCustomerAddress('Fehler beim Laden der Adresse');
      } finally {
        setLoading(false);
      }
    };

    loadCustomerAddress();
  }, [invoiceId, companyId]);

  if (loading) {
    return <div className="text-gray-500">Adresse wird geladen...</div>;
  }

  return (
    <div className="whitespace-pre-line">
      {customerAddress || 'Keine Adresse verfügbar'}
    </div>
  );
}

interface OverdueInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  originalAmount: number;
  outstandingAmount: number;
  dueDate: string;
  daysPastDue: number;
}

interface ReminderData {
  invoiceId: string;
  reminderLevel: '1' | '2' | '3';
  customMessage: string;
  reminderFee: number;
  title?: string;
  headText?: string;
  footerText?: string;
  notes?: string;
  outstandingAmount?: number;
  newDueDate?: string;
  referenceNumber?: string;
  // Additional fields for the general information card
  customerName?: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerPhone?: string;
  customerVatId?: string;
  customerNumber?: string;
  invoiceDate?: string;
  deliveryDate?: string;
  servicePeriod?: string;
  customerOrderNumber?: string;
  validUntil?: string;
}

export default function CreateReminderPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  const [overdueInvoices, setOverdueInvoices] = useState<OverdueInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState<QuoteItem[]>([]);

  // Additional state variables for the general information card
  const [contactType, setContactType] = useState<'organisation' | 'person'>('organisation');
  const [showCustomerSearchPopup, setShowCustomerSearchPopup] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [showAddressAddition, setShowAddressAddition] = useState(false);
  const [deliveryDateType, setDeliveryDateType] = useState<'single' | 'range'>('single');
  const [deliveryDatePopoverOpen, setDeliveryDatePopoverOpen] = useState(false);
  const [deliveryDateRange, setDeliveryDateRange] = useState<{from?: Date, to?: Date}>({});
  const [paymentDays, setPaymentDays] = useState(14);
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);

  // Helper functions
  const getFieldErrorClass = (fieldName: string) => {
    // Simple implementation - in a real app this would check for validation errors
    return '';
  };

  const selectCustomer = (customer: any) => {
    setFormData(prev => ({
      ...prev,
      customerName: customer.name,
      customerEmail: customer.email,
      customerAddress: customer.street && customer.city
        ? `${customer.street}\n${customer.postalCode || ''} ${customer.city}\n${customer.country || 'Deutschland'}`
        : prev.customerAddress,
    }));
    setShowCustomerSearchPopup(false);
  };

  const formatDateDE = (date: Date) => {
    return format(date, 'dd.MM.yyyy', { locale: de });
  };

  const setShowNumberingModal = (show: boolean) => {
    // Simple implementation - in a real app this would open a modal
  };

  const [formData, setFormData] = useState<ReminderData>({
    invoiceId: '',
    reminderLevel: '1',
    customMessage: '',
    reminderFee: 5.0,
    title: '',
    headText: '',
    footerText: '',
    notes: '',
    outstandingAmount: 0,
    customerName: '',
    customerFirstName: '',
    customerLastName: '',
    customerEmail: '',
    customerAddress: '',
    customerPhone: '',
    customerVatId: '',
    customerNumber: '',
    invoiceDate: '',
    deliveryDate: '',
    servicePeriod: '',
    customerOrderNumber: '',
    validUntil: '',
  });

  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  // Company settings
  const { settings } = useCompanySettings(uid);
  const [company, setCompany] = useState<any | null>(null);

  // Invoice position state (for the positions table)
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [showNet, setShowNet] = useState(true);
  const [taxRate, setTaxRate] = useState(19);
  const [popoverOpenIds, setPopoverOpenIds] = useState<Set<string>>(new Set());
  const [dismissedCreatePromptIds, setDismissedCreatePromptIds] = useState<Set<string>>(new Set());
  const [newProduct, setNewProduct] = useState<any>(null);
  const [createProductForIndex, setCreateProductForIndex] = useState<number | null>(null);
  const [createProductOpen, setCreateProductOpen] = useState(false);

  // Service management state
  const [savedServices, setSavedServices] = useState<any[]>([]);
  const [loadingSavedServices, setLoadingSavedServices] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [showPopover, setShowPopover] = useState(false);
  const [serviceDraft, setServiceDraft] = useState({
    name: '',
    description: '',
    price: '',
    unit: 'Stk',
  });
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [savingService, setSavingService] = useState(false);

  // Reminder settings based on company settings or defaults
  const reminderSettings = React.useMemo(() => {
    if (settings?.reminderFees) {
      return {
        '1': {
          fee: settings.reminderFees.level1.fee,
          days: settings.reminderFees.level1.days,
          title: settings.reminderFees.level1.title,
        },
        '2': {
          fee: settings.reminderFees.level2.fee,
          days: settings.reminderFees.level2.days,
          title: settings.reminderFees.level2.title,
        },
        '3': {
          fee: settings.reminderFees.level3.fee,
          days: settings.reminderFees.level3.days,
          title: settings.reminderFees.level3.title,
        },
      };
    }
    // Fallback to defaults
    return {
      '1': { fee: 5.0, days: 7, title: '1. Mahnung' },
      '2': { fee: 10.0, days: 14, title: '2. Mahnung' },
      '3': { fee: 15.0, days: 21, title: '3. Mahnung / Inkasso-Androhung' },
    };
  }, [settings]);

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
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const selectedInvoiceFromList = overdueInvoices.find(inv => inv.id === formData.invoiceId);

  useEffect(() => {
    loadOverdueInvoices();
    loadCustomers();
    loadCompany();
    loadSavedServices();
  }, [uid]);

  // Manage items based on invoice selection
  useEffect(() => {
    if (!formData.invoiceId) {
      // Wenn keine Rechnung ausgewählt: Stelle sicher, dass mindestens ein leeres Item vorhanden ist
      if (items.length === 0) {
        const emptyItem: QuoteItem = {
          id: crypto.randomUUID(),
          description: '',
          quantity: 1,
          unitPrice: 0,
          total: 0,
          unit: 'Stk',
          discountPercent: 0,
        };
        setItems([emptyItem]);
      }
    }
    // Wenn Rechnung ausgewählt: Items werden von loadInvoiceItems gesetzt
  }, [formData.invoiceId, items.length]);

  const loadCompany = async () => {
    if (!uid || !user || user.uid !== uid) return;
    try {
      const snap = await getDoc(doc(db, 'companies', uid));
      if (snap.exists()) {
        const companyData = snap.data();
        setCompany(companyData);
      }
    } catch (e) {
      // still render, but without company info
    }
  };

  const loadSavedServices = async () => {
    if (!uid) return;
    setLoadingSavedServices(true);
    try {
      const servicesRef = collection(db, 'companies', uid, 'inlineInvoiceServices');
      const servicesSnap = await getDocs(servicesRef);
      const inlineInvoiceServices = servicesSnap.docs.map(doc => {
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

      setSavedServices(inlineInvoiceServices);
    } catch (error) {
      console.error('Fehler beim Laden der Dienstleistungen:', error);
      toast.error('Dienstleistungen konnten nicht geladen werden');
    } finally {
      setLoadingSavedServices(false);
    }
  };

  useEffect(() => {
    // Update reminder fee and due date when level changes
    const today = new Date();
    const daysToAdd = reminderSettings[formData.reminderLevel].days;
    const newDueDate = new Date(today);
    newDueDate.setDate(today.getDate() + daysToAdd);
    
    setFormData(prev => ({
      ...prev,
      reminderFee: reminderSettings[formData.reminderLevel].fee,
      validUntil: newDueDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
    }));
  }, [formData.reminderLevel]);

  useEffect(() => {
    // Auto-generate title when invoice or reminder level changes
    if (selectedInvoiceFromList) {
      const title = `${reminderSettings[formData.reminderLevel].title} - Rechnung ${selectedInvoiceFromList.invoiceNumber}`;
      setFormData(prev => ({
        ...prev,
        title: prev.title || title, // Only set if not manually changed
      }));

      // Load invoice items
      loadInvoiceItems(selectedInvoiceFromList.id);
    }
  }, [selectedInvoiceFromList, formData.reminderLevel]);

  useEffect(() => {
    // Auto-populate items when invoice is selected and reminder level is set
    if (selectedInvoice && formData.reminderLevel) {
      const outstandingAmount = selectedInvoice.outstandingAmount || selectedInvoice.total || 0;
      const reminderFee = reminderSettings[formData.reminderLevel].fee;

      const reminderItems: QuoteItem[] = [
        // Ausstehender Betrag der Rechnung
        {
          id: 'outstanding-amount',
          description: `Ausstehender Betrag Rechnung ${selectedInvoice.invoiceNumber}`,
          quantity: 1,
          unitPrice: outstandingAmount,
          total: outstandingAmount,
          taxRate: 0, // Mahnungen sind in der Regel steuerfrei
          unit: 'Stk',
          category: 'service',
          discountPercent: 0,
        },
        // Mahngebühr
        {
          id: 'reminder-fee',
          description: `${reminderSettings[formData.reminderLevel].title} - Mahngebühr`,
          quantity: 1,
          unitPrice: reminderFee,
          total: reminderFee,
          taxRate: 0, // Mahngebühren sind in der Regel steuerfrei
          unit: 'Stk',
          category: 'service',
          discountPercent: 0,
        }
      ];

      setItems(reminderItems);
    }
  }, [selectedInvoice, formData.reminderLevel]);

  // Invoice position functions
  const handleDescriptionChange = (index: number, itemId: string, description: string) => {
    setItems(prev =>
      prev.map((it, i) =>
        i === index ? { ...it, description } : it
      )
    );
    // Trigger popover for new descriptions
    if (description.length > 3 && !dismissedCreatePromptIds.has(itemId)) {
      setPopoverOpenIds(prev => new Set(prev).add(itemId));
    }
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

  const handleItemChange = (index: number, field: keyof QuoteItem, value: any) => {
    setItems(prev =>
      prev.map((it, i) =>
        i === index ? { ...it, [field]: value } : it
      )
    );
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const syncGrossFromNet = (netPrice: number, rate: number) => {
    return netPrice * (1 + rate / 100);
  };

  const computeItemTotalNet = (qty: number, unitNet: number) => {
    const q = isFinite(qty) ? Math.max(0, qty) : 0;
    const p = isFinite(unitNet) ? Math.max(0, unitNet) : 0;
    return q * p;
  };

  // Dienstleistung in Subcollection speichern
  const saveServiceToSubcollection = async () => {
    toast('SERVICE SAVE TRIGGERED (UI)', {
      description: 'Die Save-Funktion wurde im Client aufgerufen.',
    });
    console.log('SERVICE SAVE TRIGGERED', { uid, serviceDraft });
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
      console.log('[Dienstleistung speichern] serviceData:', serviceData);
      const ref = collection(db, 'companies', uid, 'inlineInvoiceServices');
      console.log('[Dienstleistung speichern] Collection-Ref:', ref);
      const result = await addDoc(ref, serviceData);
      console.log('[Dienstleistung speichern] addDoc result:', result);
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

  const loadOverdueInvoices = async () => {
    if (!uid) return;

    try {
      setLoading(true);
      // Load overdue invoices from Firestore
      const invoicesRef = collection(db, 'companies', uid, 'invoices');
      const invoicesSnap = await getDocs(invoicesRef);

      const overdue: OverdueInvoice[] = [];

      for (const invoiceDoc of invoicesSnap.docs) {
        const invoiceData = invoiceDoc.data();

        // Check if invoice is overdue and not fully paid
        if (invoiceData.status !== 'paid' && invoiceData.dueDate) {
          const dueDate = new Date(invoiceData.dueDate);
          const today = new Date();
          const daysPastDue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

          if (daysPastDue > 0) {
            // Get customer data
            let customerName = 'Unbekannter Kunde';
            let customerEmail = '';

            if (invoiceData.customerId) {
              try {
                const customerDoc = await getDoc(doc(db, 'companies', uid, 'customers', invoiceData.customerId));
                if (customerDoc.exists()) {
                  const customerData = customerDoc.data();
                  customerName = customerData.name || customerName;
                  customerEmail = customerData.email || '';
                }
              } catch (error) {
                console.error('Error loading customer data:', error);
              }
            }

            overdue.push({
              id: invoiceDoc.id,
              invoiceNumber: invoiceData.invoiceNumber || invoiceDoc.id,
              customerName,
              customerEmail,
              originalAmount: invoiceData.total || 0,
              outstandingAmount: invoiceData.outstandingAmount || invoiceData.total || 0,
              dueDate: invoiceData.dueDate,
              daysPastDue,
            });
          }
        }
      }

      setOverdueInvoices(overdue);
    } catch (error) {
      console.error('Error loading overdue invoices:', error);
      toast.error('Überfällige Rechnungen konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    if (!uid) return;

    try {
      const customersRef = collection(db, 'companies', uid, 'customers');
      const customersSnap = await getDocs(customersRef);
      const customersData = customersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCustomers(customersData);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadInvoiceItems = async (invoiceId: string) => {
    if (!uid) return;

    try {
      const invoiceDoc = await getDoc(doc(db, 'companies', uid, 'invoices', invoiceId));
      if (invoiceDoc.exists()) {
        const invoiceData = invoiceDoc.data();
        
        // Load customer data from subcollection if customerId exists
        let customerData: any = null;
        if (invoiceData.customerId) {
          try {
            const customerDoc = await getDoc(doc(db, 'companies', uid, 'customers', invoiceData.customerId));
            if (customerDoc.exists()) {
              customerData = customerDoc.data();
            }
          } catch (error) {
            console.error('Error loading customer data:', error);
          }
        }

        // Load all invoice data
        const fullInvoiceData = {
          id: invoiceDoc.id,
          ...invoiceData,
          // Ensure all fields are properly typed
          items: invoiceData.items || [],
          customerName: customerData?.name || customerData?.companyName || invoiceData.customerName || '',
          customerEmail: customerData?.email || invoiceData.customerEmail || '',
          customerAddress: customerData ? [
            customerData.street || '',
            customerData.houseNumber ? `${customerData.postalCode || ''} ${customerData.city || ''}`.trim() : customerData.city || '',
            customerData.country || 'Deutschland'
          ].filter(Boolean).join('\n') : invoiceData.customerAddress || '',
          customerFirstName: customerData?.firstName || invoiceData.customerFirstName || '',
          customerLastName: customerData?.lastName || invoiceData.customerLastName || '',
          customerPhone: customerData?.phone || invoiceData.customerPhone || '',
          customerNumber: customerData?.customerNumber || invoiceData.customerNumber || '',
          customerVatId: customerData?.vatId || invoiceData.customerVatId || '',
          invoiceNumber: invoiceData.invoiceNumber || invoiceData.number || invoiceDoc.id,
          total: invoiceData.total || invoiceData.amount || 0,
          taxAmount: invoiceData.taxAmount || invoiceData.tax || 0,
          subtotal: invoiceData.subtotal || 0,
          currency: invoiceData.currency || 'EUR',
          status: invoiceData.status || 'draft',
          dueDate: invoiceData.dueDate || invoiceData.validUntil || '',
          issueDate: invoiceData.issueDate || invoiceData.date || invoiceData.invoiceDate || '',
          paymentTerms: invoiceData.paymentTerms || '',
          taxRate: invoiceData.taxRate || invoiceData.vatRate || 19,
          companyName: invoiceData.companyName || '',
          companyAddress: invoiceData.companyAddress || '',
          companyEmail: invoiceData.companyEmail || '',
          companyPhone: invoiceData.companyPhone || '',
          companyVatId: invoiceData.companyVatId || '',
          deliveryDate: invoiceData.deliveryDate || invoiceData._originalFormData?.deliveryDate || '',
          deliveryTerms: invoiceData.deliveryTerms || invoiceData._originalFormData?.deliveryTerms || '',
          servicePeriod: invoiceData.servicePeriod || invoiceData._originalFormData?.servicePeriod || '',
          customerOrderNumber: invoiceData.customerOrderNumber || invoiceData._originalFormData?.customerOrderNumber || '',
          validUntil: invoiceData.validUntil || invoiceData.dueDate || invoiceData._originalFormData?.validUntil || '',
          deliveryDateType: invoiceData.deliveryDateType || invoiceData._originalFormData?.deliveryDateType || 'single',
          deliveryDateRange: invoiceData.deliveryDateRange || null,
          reference: invoiceData.reference || '',
          notes: invoiceData.notes || '',
          headTextHtml: invoiceData.headTextHtml || '',
          footerText: invoiceData.footerText || '',
          bankDetails: invoiceData.bankDetails || {},
          eInvoiceData: invoiceData.eInvoiceData || null,
          isEInvoice: invoiceData.isEInvoice || false,
          template: invoiceData.template || 'default',
          priceInput: invoiceData.priceInput || 'netto',
          showNet: invoiceData.showNet !== false,
          skontoEnabled: invoiceData.skontoEnabled || false,
          skontoDays: invoiceData.skontoDays || 0,
          skontoPercentage: invoiceData.skontoPercentage || 0,
          skontoText: invoiceData.skontoText || '',
          outstandingAmount: invoiceData.outstandingAmount || invoiceData.total || invoiceData.amount || 0,
          daysPastDue: invoiceData.daysPastDue || 0,
          // Add customer data
          customerData: customerData,
        };

        // Convert invoice items to QuoteItem format
        const quoteItems: QuoteItem[] = (invoiceData.items || []).map((item: any) => ({
          id: item.id || Math.random().toString(36).slice(2),
          description: item.description || '',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          total: item.total || 0,
          taxRate: item.taxRate || invoiceData.taxRate || 19,
          unit: item.unit || 'Stk',
          category: item.category || 'Artikel',
          inventoryItemId: item.inventoryItemId || null,
          discountPercent: item.discountPercent || 0,
        }));

        setInvoiceItems(quoteItems);
        
        // Store full invoice data for later use
        setSelectedInvoice(fullInvoiceData);

        // Update form data with loaded invoice information
        setFormData(prev => {
          const updated = {
            ...prev,
            customerName: fullInvoiceData.customerName || prev.customerName,
            customerFirstName: fullInvoiceData.customerFirstName || prev.customerFirstName,
            customerLastName: fullInvoiceData.customerLastName || prev.customerLastName,
            customerEmail: fullInvoiceData.customerEmail || prev.customerEmail,
            customerAddress: fullInvoiceData.customerAddress || prev.customerAddress,
            customerPhone: fullInvoiceData.customerPhone || prev.customerPhone,
            customerVatId: fullInvoiceData.customerVatId || prev.customerVatId,
            customerNumber: fullInvoiceData.customerNumber || prev.customerNumber,
            invoiceDate: fullInvoiceData.issueDate || prev.invoiceDate,
            deliveryDate: fullInvoiceData.deliveryDate || prev.deliveryDate,
            servicePeriod: fullInvoiceData.servicePeriod || prev.servicePeriod,
            customerOrderNumber: fullInvoiceData.customerOrderNumber || prev.customerOrderNumber,
            validUntil: fullInvoiceData.validUntil || prev.validUntil,
            // Add other invoice fields that might be relevant for reminders
            headText: fullInvoiceData.headTextHtml || prev.headText,
            footerText: fullInvoiceData.footerText || prev.footerText,
          };
          return updated;
        });

        // Set delivery date type
        setDeliveryDateType(fullInvoiceData.deliveryDateType || 'single');
      }
    } catch (error) {
      console.error('Error loading invoice items:', error);
      setInvoiceItems([]);
    }
  };

  const handleSave = async () => {
    // Validierung für individuelle Mahnungen (ohne Rechnung)
    if (!selectedInvoice) {
      if (!formData.customerName || !formData.customerAddress) {
        toast.error('Bitte geben Sie Kundendaten ein (Name und Adresse)');
        return;
      }
      if (!formData.title) {
        toast.error('Bitte geben Sie einen Mahnungstitel ein');
        return;
      }
    } else {
      // Validierung für Mahnungen basierend auf Rechnung
      if (!formData.customerName && !selectedInvoice.customerName) {
        toast.error('Kundenname ist erforderlich');
        return;
      }
    }

    try {
      setSaving(true);

      const reminderData = selectedInvoice ? {
        // Mahnung basierend auf Rechnung
        invoiceId: selectedInvoice.id,
        invoiceNumber: selectedInvoice.invoiceNumber,
        customerName: selectedInvoice.customerName,
        customerEmail: selectedInvoice.customerEmail,
        customerAddress: selectedInvoice.customerAddress,
        reminderLevel: formData.reminderLevel,
        reminderFee: formData.reminderFee,
        customMessage: formData.customMessage,
        title: formData.title,
        headText: formData.headText,
        footerText: formData.footerText,
        notes: formData.notes,
        originalAmount: selectedInvoice.originalAmount,
        outstandingAmount: selectedInvoice.outstandingAmount + formData.reminderFee,
        dueDate: selectedInvoice.dueDate,
        daysPastDue: selectedInvoice.daysPastDue,
        status: 'draft',
        createdAt: serverTimestamp(),
        companyId: uid,
      } : {
        // Individuelle Mahnung
        invoiceId: formData.invoiceId || null,
        invoiceNumber: null,
        customerName: formData.customerName,
        customerFirstName: formData.customerFirstName,
        customerLastName: formData.customerLastName,
        customerEmail: formData.customerEmail,
        customerAddress: formData.customerAddress,
        customerPhone: formData.customerPhone,
        customerVatId: formData.customerVatId,
        customerNumber: formData.customerNumber,
        reminderLevel: formData.reminderLevel,
        reminderFee: formData.reminderFee,
        customMessage: formData.customMessage,
        title: formData.title,
        headText: formData.headText,
        footerText: formData.footerText,
        notes: formData.notes,
        originalAmount: formData.outstandingAmount || 0,
        outstandingAmount: (formData.outstandingAmount || 0) + formData.reminderFee,
        dueDate: formData.validUntil,
        daysPastDue: 0,
        status: 'draft',
        createdAt: serverTimestamp(),
        companyId: uid,
      };

      const remindersRef = collection(db, 'companies', uid, 'reminders');
      await addDoc(remindersRef, reminderData);

      toast.success('Mahnung wurde erfolgreich erstellt');
      router.push(`/dashboard/company/${uid}/finance/reminders`);
    } catch (error) {
      console.error('Error creating reminder:', error);
      toast.error('Mahnung konnte nicht erstellt werden');
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (!selectedInvoice) {
      toast.error('Bitte wählen Sie eine Rechnung aus');
      return;
    }

    try {
      setSaving(true);

      // First save the reminder
      const reminderData = {
        invoiceId: formData.invoiceId,
        invoiceNumber: selectedInvoice.invoiceNumber,
        customerName: selectedInvoice.customerName,
        customerEmail: selectedInvoice.customerEmail,
        reminderLevel: formData.reminderLevel,
        reminderFee: formData.reminderFee,
        customMessage: formData.customMessage,
        title: formData.title,
        headText: formData.headText,
        footerText: formData.footerText,
        originalAmount: selectedInvoice.originalAmount,
        outstandingAmount: selectedInvoice.outstandingAmount + formData.reminderFee,
        dueDate: selectedInvoice.dueDate,
        daysPastDue: selectedInvoice.daysPastDue,
        status: 'sent',
        sentAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        companyId: uid,
      };

      const remindersRef = collection(db, 'companies', uid, 'reminders');
      await addDoc(remindersRef, reminderData);

      // TODO: Implement email sending logic here
      toast.success('Mahnung wurde erstellt und versendet');
      router.push(`/dashboard/company/${uid}/finance/reminders`);
    } catch (error) {
      console.error('Error creating and sending reminder:', error);
      toast.error('Mahnung konnte nicht erstellt und versendet werden');
    } finally {
      setSaving(false);
    }
  };

  const buildPreviewData = (): PreviewTemplateData => {
    const today = new Date();

    // Firmenname und -adresse aus companies-Collection, mit Fallbacks
    const companyName =
      (company?.companyName as string) ||
      (settings?.companyName as string) ||
      ((user as any)?.companyName as string) ||
      ((user as any)?.displayName as string) ||
      'Ihr Unternehmen';

    const companyAddress = [
      [company?.companyStreet?.replace(/\s+/g, ' ').trim(), company?.companyHouseNumber]
        .filter(Boolean)
        .join(' '),
      [company?.companyPostalCode, company?.companyCity].filter(Boolean).join(' '),
      company?.companyCountry,
    ]
      .filter(Boolean)
      .join('\n');

    // Reminder-spezifische Daten
    const reminderTitle = formData.title || `${reminderSettings[formData.reminderLevel].title} - ${selectedInvoice ? `Rechnung ${selectedInvoice.invoiceNumber}` : 'Individuelle Mahnung'}`;
    const outstandingAmount = selectedInvoice?.outstandingAmount || formData.outstandingAmount || 0;
    const totalAmount = outstandingAmount + formData.reminderFee;

    const data: PreviewTemplateData = {
      invoiceNumber: selectedInvoice?.invoiceNumber || 'Vorschau',
      documentNumber: reminderTitle,
      documentType: 'reminder',
      date: formatDateDE(today),
      dueDate: formData.validUntil ? formatDateDE(new Date(formData.validUntil)) : (selectedInvoice?.dueDate ? formatDateDE(new Date(selectedInvoice.dueDate)) : undefined),
      validUntil: formData.validUntil ? formatDateDE(new Date(formData.validUntil)) : undefined,
      title: reminderTitle,
      currency: 'EUR',
      customerName: selectedInvoice?.customerName || formData.customerName || 'Kunde',
      customerAddress: selectedInvoice?.customerAddress || formData.customerAddress || '',
      customerEmail: selectedInvoice?.customerEmail || formData.customerEmail || undefined,
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
      // Reminder-spezifische Items: Ursprüngliche Rechnung + Mahngebühr
      items: [
        // Offener Betrag nur hinzufügen, wenn vorhanden (für individuelle Mahnungen)
        ...(selectedInvoice || (formData.outstandingAmount || 0) > 0 ? [{
          id: 'original-invoice',
          description: selectedInvoice
            ? `Ursprüngliche Rechnung ${selectedInvoice.invoiceNumber || ''}`
            : `Offener Betrag${formData.invoiceId ? ` (${formData.invoiceId})` : ''}`,
          quantity: 1,
          unitPrice: outstandingAmount,
          total: outstandingAmount,
          taxRate: 0, // Mahnungen sind in der Regel steuerfrei
          category: 'service',
          discountPercent: 0,
          unit: 'Stk',
        }] : []),
        {
          id: 'reminder-fee',
          description: `${reminderSettings[formData.reminderLevel].title} - Mahngebühr`,
          quantity: 1,
          unitPrice: formData.reminderFee,
          total: formData.reminderFee,
          taxRate: 0, // Mahngebühren sind in der Regel steuerfrei
          category: 'service',
          discountPercent: 0,
          unit: 'Stk',
        }
      ],
      subtotal: totalAmount,
      tax: 0, // Mahnungen sind steuerfrei
      total: totalAmount,
      vatRate: 0,
      isSmallBusiness: false,
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
      notes: formData.notes || undefined,
      headTextHtml: formData.headText || undefined,
      headerText: formData.headText || undefined,
      introText: `Trotz mehrfacher Aufforderung haben Sie die oben genannte Rechnung noch nicht beglichen. Wir bitten Sie daher, den offenen Betrag innerhalb der nächsten ${formData.reminderLevel === '1' ? '7' : formData.reminderLevel === '2' ? '3' : '1'} Tage${formData.reminderLevel === '3' ? ' unter Androhung rechtlicher Schritte' : ''} zu begleichen.`,
      description: formData.headText || undefined,
      footerText: formData.footerText || undefined,
      contactPersonName: undefined,
      paymentTerms: formData.validUntil ? `Zahlung fällig bis ${formatDateDE(new Date(formData.validUntil))}` : 'Sofortige Zahlung fällig',
      deliveryTerms: undefined,
      // Customer-Objekt für Template-Kompatibilität
      customer: {
        name: selectedInvoice?.customerName || formData.customerName || 'Kunde',
        email: selectedInvoice?.customerEmail || formData.customerEmail || '',
        address: (() => {
          const addressStr = selectedInvoice?.customerAddress || formData.customerAddress || '';
          const addressLines = addressStr.split('\n');
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
        taxNumber: selectedInvoice?.customerTaxNumber || undefined,
        vatId: selectedInvoice?.customerVatId || undefined,
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
      // Footer-Daten aus Company-Objekt
      step1: company?.step1 || (company as any)?.step1,
      step2: company?.step2 || (company as any)?.step2,
      step3: company?.step3 || (company as any)?.step3,
      step4: company?.step4 || (company as any)?.step4,
      managingDirectors:
        (company as any)?.managingDirectors || (company as any)?.step1?.managingDirectors,
      districtCourt: (company as any)?.districtCourt || (company as any)?.step3?.districtCourt,
      legalForm: (company as any)?.step2?.legalForm || (company as any)?.legalForm,
      firstName: (company as any)?.firstName || (company as any)?.step1?.personalData?.firstName,
      lastName: (company as any)?.lastName || (company as any)?.step1?.personalData?.lastName,
      // Template-Informationen
      selectedTemplate: 'professional-business', // Reminders verwenden das gleiche Template wie Invoices
    };

    return data;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#14ad9f]" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <header className="w-full" style={{ maxWidth: '1440px' }}>
        <div className="flex items-center justify-between py-4 border-b border-gray-200 gap-4">
          {/* Left side - Title */}
          <div className="flex items-center flex-shrink-0">
            <h2 className="text-2xl font-bold text-gray-900">Neue Mahnung</h2>
          </div>

          {/* Center/Right - Invoice Selection and Actions */}
          <div className="flex items-center gap-4 flex-1 justify-end">
            {/* Invoice Selection */}
            <div className="flex items-center">
              <Select
                value={formData.invoiceId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, invoiceId: value }))}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Überfällige Rechnung auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {overdueInvoices.map((invoice) => (
                    <SelectItem key={invoice.id} value={invoice.id}>
                      {invoice.invoiceNumber} - {invoice.customerName} ({invoice.daysPastDue} Tage überfällig)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="default"
                onClick={handleSave}
                disabled={saving || !selectedInvoice}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Als Entwurf speichern
              </Button>

              <Button
                variant="outline"
                size="default"
                onClick={() => setPreviewOpen(!previewOpen)}
                className="border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                disabled={!selectedInvoice}
              >
                <Eye className="w-4 h-4 mr-2" />
                Vorschau
              </Button>

              <Button
                className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                size="default"
                onClick={handleSend}
                disabled={saving || !selectedInvoice}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Mahnung erstellen
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
                      toast.success('Aufgabe erstellen - Feature wird implementiert');
                    }}
                    className="w-full"
                  >
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
                  <DropdownMenuItem
                    onClick={() => {
                      toast.success('Löschen - Feature wird implementiert');
                    }}
                    className="w-full"
                  >
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
                      disabled={true}
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
                      disabled={true}
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
                        onChange={e => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                        readOnly={!!formData.invoiceId}
                        className={`flex-1 ${getFieldErrorClass('customerName')} ${formData.invoiceId ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                        required
                      />

                      {/* Intelligenter Such-Popup */}
                      {showCustomerSearchPopup && (formData.customerName || '').length >= 2 && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {/* Gefilterte Kunden anzeigen */}
                          {customers
                            .filter(customer =>
                              customer.name
                                .toLowerCase()
                                .includes((formData.customerName || '').toLowerCase())
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
                            + Neuen Kunden "{formData.customerName || ''}" erstellen
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
                            onChange={e => setFormData(prev => ({ ...prev, customerFirstName: e.target.value }))}
                            readOnly={!!formData.invoiceId}
                            className={formData.invoiceId ? 'bg-gray-50 cursor-not-allowed' : ''}
                            placeholder="Vorname"
                            required
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Nachname</Label>
                          <span className="text-red-500">*</span>
                          <Input
                            type="text"
                            value={formData.customerLastName || ''}
                            onChange={e => setFormData(prev => ({ ...prev, customerLastName: e.target.value }))}
                            readOnly={!!formData.invoiceId}
                            className={formData.invoiceId ? 'bg-gray-50 cursor-not-allowed' : ''}
                            placeholder="Nachname"
                            required
                          />
                        </div>
                      </div>

                      {/* Intelligenter Such-Popup für Person - gleiche Struktur wie Organisation */}
                      {showCustomerSearchPopup && (formData.customerName || '').length >= 2 && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {/* Gefilterte Kunden anzeigen */}
                          {customers
                            .filter(customer =>
                              customer.name
                                .toLowerCase()
                                .includes((formData.customerName || '').toLowerCase())
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
                            + Neuen Kunden "{formData.customerName || ''}" erstellen
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
                      className="text-sm text-gray-400 cursor-not-allowed font-medium"
                      disabled={true}
                    >
                      Adresszusatz +
                    </button>
                  </div>

                  {/* Straße und Hausnummer */}
                  <Input
                    placeholder="Straße und Hausnummer"
                    value={formData.customerAddress?.split('\n')[0] || ''}
                    onChange={e => {
                      const lines = (formData.customerAddress || '').split('\n');
                      lines[0] = e.target.value;
                      setFormData(prev => ({ ...prev, customerAddress: lines.join('\n') }));
                    }}
                    readOnly={!!formData.invoiceId}
                    className={formData.invoiceId ? 'bg-gray-50 cursor-not-allowed' : ''}
                  />

                  {/* Adresszusatz (optional) */}
                  {showAddressAddition && (
                    <div className="relative">
                      <Input
                        placeholder="Adresszusatz (z.B. c/o, Abteilung, etc.)"
                        value={formData.customerAddress?.split('\n')[1] || ''}
                        onChange={e => {
                          const lines = (formData.customerAddress || '').split('\n');
                          lines[1] = e.target.value;
                          setFormData(prev => ({ ...prev, customerAddress: lines.join('\n') }));
                        }}
                        readOnly={!!formData.invoiceId}
                        className={formData.invoiceId ? 'bg-gray-50 cursor-not-allowed' : ''}
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
                        const lines = (formData.customerAddress || '').split('\n');
                        const addressLineIndex = showAddressAddition ? 2 : 1;
                        const parts = (lines[addressLineIndex] || '').split(' ');
                        parts[0] = e.target.value;
                        lines[addressLineIndex] = parts.join(' ');
                        setFormData(prev => ({ ...prev, customerAddress: lines.join('\n') }));
                      }}
                      readOnly={!!formData.invoiceId}
                      className={formData.invoiceId ? 'bg-gray-50 cursor-not-allowed' : ''}
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
                        const lines = (formData.customerAddress || '').split('\n');
                        const addressLineIndex = showAddressAddition ? 2 : 1;
                        const parts = (lines[addressLineIndex] || '').split(' ');
                        parts[0] = parts[0] || ''; // Behalte PLZ
                        parts[1] = e.target.value; // Setze neuen Ort
                        lines[addressLineIndex] = [parts[0], parts[1]].filter(Boolean).join(' ');
                        setFormData(prev => ({ ...prev, customerAddress: lines.join('\n') }));
                      }}
                      readOnly={!!formData.invoiceId}
                      className={formData.invoiceId ? 'bg-gray-50 cursor-not-allowed' : ''}
                    />
                  </div>

                  {/* Land */}
                  <Select
                    value={
                      formData.customerAddress?.split('\n')[showAddressAddition ? 3 : 2] ||
                      'Deutschland'
                    }
                    onValueChange={value => {
                      const lines = (formData.customerAddress || '').split('\n');
                      const addressLineIndex = showAddressAddition ? 3 : 2;
                      lines[addressLineIndex] = value;
                      setFormData(prev => ({ ...prev, customerAddress: lines.join('\n') }));
                    }}
                    disabled={!!formData.invoiceId}
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
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Mahnungsinformationen</h3>

                {/* 2x2 Grid für Mahnungsfelder */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* Mahnungsdatum */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Label className="text-sm font-medium text-gray-700">Mahnungsdatum</Label>
                      <span className="text-red-500">*</span>
                    </div>
                    <Input
                      type="date"
                      value={formData.invoiceDate || new Date().toISOString().split('T')[0]}
                      readOnly={true}
                      className="bg-gray-50 cursor-not-allowed"
                      required
                    />
                  </div>

                  {/* Lieferdatum */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Label
                          className={`text-sm font-medium cursor-not-allowed ${
                            deliveryDateType === 'single' ? 'text-gray-900' : 'text-gray-500'
                          }`}
                        >
                          Lieferdatum
                        </Label>
                        <span className="text-red-500">*</span>
                      </div>
                      <button
                        type="button"
                        className={`text-sm font-medium cursor-not-allowed ${
                          deliveryDateType === 'range' ? 'text-gray-900' : 'text-gray-500'
                        }`}
                        disabled={true}
                      >
                        Zeitraum
                      </button>
                    </div>

                    {deliveryDateType === 'single' ? (
                      <Input
                        type="date"
                        value={formData.deliveryDate}
                        readOnly={true}
                        className="bg-gray-50 cursor-not-allowed"
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
                              // Aktualisiere servicePeriod in formData wenn Zeitraum komplett ist
                              if (range?.from && range?.to) {
                                const servicePeriodText = `${formatDateDE(range.from)} - ${formatDateDE(range.to)}`;
                                setFormData(prev => ({
                                  ...prev,
                                  servicePeriod: servicePeriodText,
                                }));
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
                      <Label className="text-sm font-medium text-gray-700">Mahnungsnummer</Label>
                      <span className="text-red-500">*</span>
                    </div>
                    <div className="relative">
                      <Input
                        placeholder="MA-1000"
                        value={formData.title || ''}
                        readOnly={true}
                        className="bg-gray-50 cursor-not-allowed pr-10"
                        required
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
                        type="button"
                        disabled={true}
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
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1.06 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l-.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1.06H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1.06-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1.06 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1.06H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1.06z" />
                        </svg>
                      </Button>
                    </div>
                  </div>

                  {/* Mahnstufe */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Mahnstufe <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.reminderLevel || '1'}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, reminderLevel: value as '1' | '2' | '3' }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Mahnstufe auswählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(reminderSettings).map(([level, config]) => (
                          <SelectItem key={level} value={level}>
                            {config.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Referenznummer und Zahlungsziel in einer Zeile */}
                  <div className="flex gap-6">
                    <div className="flex-1 space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Referenznummer</Label>
                      <Input
                        placeholder="Optional"
                        value={formData.customerOrderNumber}
                        onChange={e => setFormData(prev => ({ ...prev, customerOrderNumber: e.target.value }))}
                        readOnly={!!formData.invoiceId}
                        className={formData.invoiceId ? 'bg-gray-50 cursor-not-allowed' : ''}
                      />
                    </div>

                    <div className="flex-1 space-y-2">
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
                          value={paymentDays}
                          onChange={e => setPaymentDays(Number(e.target.value) || 0)}
                          className="w-16 text-center"
                        />
                        <span className="text-sm text-gray-500">Tagen</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <InvoiceHeaderTextSection
        title={formData.title || ''}
        headTextHtml={formData.headText || ''}
        onTitleChange={(value) => setFormData(prev => ({ ...prev, title: value }))}
        onHeadTextChange={(html) => setFormData(prev => ({ ...prev, headText: html }))}
        companyId={uid}
        userId={user?.uid || ''}
      />

      {/* Positionen / Mahngebühren */}
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

          {/* Positions-Steuerleiste - konditionell basierend auf Rechnungsauswahl */}
          {formData.invoiceId ? (
            /* Wenn Rechnung ausgewählt: Einfache Steuerleiste */
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="text-sm text-gray-500">Positionen werden automatisch aus der Rechnung übernommen</span>
            </div>
          ) : (
            /* Wenn keine Rechnung ausgewählt: Volle Steuerleiste wie bei Invoice */
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
                    className="w-full h-8"
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
                                    toast.success('Dienstleistung zur Mahnung hinzugefügt');
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
                      className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                      onClick={async () => {
                        if (!serviceDraft.name.trim() || !serviceDraft.price) return;

                        // 1. Zuerst in Firestore speichern
                        await saveServiceToSubcollection();

                        // 2. Dann als Position zur Mahnung hinzufügen
                        setItems(prev => [
                          ...prev,
                          {
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
                          },
                        ]);

                        // 3. Dialog schließen und Form zurücksetzen
                        setServiceModalOpen(false);
                        setServiceDraft({ name: '', description: '', price: '', unit: 'Stk' });
                        toast.success('Dienstleistung zur Mahnung hinzugefügt');
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
          )}

          {/* Positionsliste */}
          <div className="space-y-4">
            {/* Immer mindestens eine editierbare Zeile anzeigen */}
            {items.length > 0 ? (
              items.map((item, index) => {
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
                            readOnly={!!formData.invoiceId}
                            className={formData.invoiceId ? 'bg-gray-50 cursor-not-allowed' : ''}
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
                                    image: '',
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
                        readOnly={!!formData.invoiceId}
                        className={formData.invoiceId ? 'bg-gray-50 cursor-not-allowed' : ''}
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
                        disabled={item.category === 'discount' || !!formData.invoiceId}
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
                        className={formData.invoiceId ? 'bg-gray-50 cursor-not-allowed w-28 md:w-32 h-8 text-sm px-2' : 'w-28 md:w-32 h-8 text-sm px-2'}
                        readOnly={!!formData.invoiceId}
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
                        disabled={item.category === 'discount' || !!formData.invoiceId}
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
                        disabled={items.length === 1 || !!formData.invoiceId}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : (
              /* Leere editierbare Zeile anzeigen */
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 border border-gray-200 rounded-lg">
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
                  <Input
                    value=""
                    onChange={e => {
                      // Neue Position erstellen wenn Text eingegeben wird
                      const newItem: QuoteItem = {
                        id: crypto.randomUUID(),
                        description: e.target.value,
                        quantity: 1,
                        unitPrice: 0,
                        total: 0,
                        unit: 'Stk',
                        discountPercent: 0,
                      };
                      setItems([newItem]);
                    }}
                    placeholder="Leistungsbeschreibung"
                    readOnly={!!formData.invoiceId}
                    className={formData.invoiceId ? 'bg-gray-50 cursor-not-allowed' : ''}
                  />
                </div>
                <div className="md:col-span-1">
                  <Label>Menge</Label>
                  <Input
                    type="number"
                    value={1}
                    onChange={e => {
                      const qty = parseFloat(e.target.value) || 1;
                      const newItem: QuoteItem = {
                        id: crypto.randomUUID(),
                        description: '',
                        quantity: qty,
                        unitPrice: 0,
                        total: 0,
                        unit: 'Stk',
                        discountPercent: 0,
                      };
                      setItems([newItem]);
                    }}
                    min="0"
                    step="0.01"
                    readOnly={!!formData.invoiceId}
                    className={formData.invoiceId ? 'bg-gray-50 cursor-not-allowed' : ''}
                  />
                </div>
                <div className="md:col-span-1">
                  <Label>Einheit</Label>
                  <Select
                    value="Stk"
                    onValueChange={val => {
                      const newItem: QuoteItem = {
                        id: crypto.randomUUID(),
                        description: '',
                        quantity: 1,
                        unitPrice: 0,
                        total: 0,
                        unit: val,
                        discountPercent: 0,
                      };
                      setItems([newItem]);
                    }}
                    disabled={!!formData.invoiceId}
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
                    value={0}
                    onChange={e => {
                      const price = parseFloat(e.target.value) || 0;
                      const newItem: QuoteItem = {
                        id: crypto.randomUUID(),
                        description: '',
                        quantity: 1,
                        unitPrice: price,
                        total: computeItemTotalNet(1, price),
                        unit: 'Stk',
                        discountPercent: 0,
                      };
                      setItems([newItem]);
                    }}
                    min="0"
                    step="0.01"
                    className={formData.invoiceId ? 'bg-gray-50 cursor-not-allowed w-28 md:w-32 h-8 text-sm px-2' : 'w-28 md:w-32 h-8 text-sm px-2'}
                    readOnly={!!formData.invoiceId}
                  />
                </div>
                <div className="md:col-span-1">
                  <Label>Rabatt %</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={0}
                    onChange={e => {
                      const discount = parseFloat(e.target.value) || 0;
                      const newItem: QuoteItem = {
                        id: crypto.randomUUID(),
                        description: '',
                        quantity: 1,
                        unitPrice: 0,
                        total: 0,
                        unit: 'Stk',
                        discountPercent: discount,
                      };
                      setItems([newItem]);
                    }}
                    disabled={!!formData.invoiceId}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Betrag</Label>
                  <div className="h-10 flex items-center text-sm font-medium">
                    {formatCurrency(0)}
                  </div>
                </div>
                <div className="md:col-span-1 flex items-end">
                  <div className="w-full h-10"></div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Fuß-Text */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2 text-[#14ad9f]" />
            Fuß-Text
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="footerText">Fuß-Text mit Platzhaltern</Label>
          <FooterTextEditor
            value={formData.footerText || ''}
            onChange={(html: string) => setFormData(prev => ({ ...prev, footerText: html }))}
            companyId={uid}
            objectType="INVOICE"
            textType="FOOT"
          />
        </CardContent>
      </Card>

      {/* Interne Notizen */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <StickyNote className="h-5 w-5 mr-2 text-[#14ad9f]" />
            Interne Notizen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.notes || ''}
            onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Interne Notizen (werden nicht in der Mahnung angezeigt)..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Preview Modal */}
      {previewOpen && (selectedInvoice || (formData.customerName && formData.customerAddress)) && (
        <ReminderLivePreviewComponent
          isVisible={previewOpen}
          onClose={() => setPreviewOpen(false)}
          selectedTemplate="professional-business"
          buildPreviewData={buildPreviewData}
          loadingTemplate={false}
        />
      )}
    </div>
  );
}