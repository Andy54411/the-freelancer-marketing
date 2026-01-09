'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
'@/components/ui/select';
import { useParams, useSearchParams } from 'next/navigation';
import {
  Loader2,
  Plus,
  FileText,
  Users,
  CreditCard,
  Info,
  Check,
  Building2,
  User,
  X,
  Phone,
  Mail,
  Globe,
  MapPin,
  Receipt,
  Calculator,
  Clock,
  Euro,
  Banknote,
  AlertCircle } from
'lucide-react';
import { toast } from 'sonner';
import { validateVATNumber } from '@/utils/vatValidation';
import { NumberSequenceService, type NumberSequence } from '@/services/numberSequenceService';
import NewCategoryModal from '@/components/finance/NewCategoryModal';

export interface ContactPerson {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  position?: string;
  department?: string;
  isPrimary: boolean;
}

interface Address {
  id: string;
  type: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
}

// Erweiterte Form-Daten Struktur basierend auf der Create-Page
interface ExtendedFormData {
  // Allgemeine Felder
  name: string;
  email: string;
  phone: string;
  // Person-spezifische Felder
  firstName: string;
  lastName: string;
  title: string; // Herr, Frau, Dr., etc.
  academicTitle: string; // MBA, M.Sc., etc.
  nameSuffix: string; // jun., sen., etc.
  position: string;
  // Organisation-spezifische Felder
  companyName: string;
  organizationType: string; // Kunde, Lieferant, Partner, Interessent
  customerNumber: string; // Automatisch generiert
  debitorNumber: string;
  creditorNumber: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  taxNumber: string;
  vatId: string;
  vatValidated: boolean;
  website: string;
  notes: string;
  paymentTerms: string;
  discount: number;
  currency: string;
  language: string;
  companySize: string;
  industry: string;
  creditLimit: number;
  isSupplier: boolean;
  // Zahlungsinformationen
  bankName: string;
  iban: string;
  bic: string;
  accountHolder: string;
  preferredPaymentMethod: string;
  earlyPaymentDiscount: number;
  earlyPaymentDays: number;
  defaultInvoiceDueDate: number;
  reminderFee: number;
  lateFee: number;
  automaticReminders: boolean;
  // E-Rechnung
  eInvoiceEnabled: boolean;
  customerReference: string;
  leitwegId: string;
  // Tags
  tags: string[];
  // Adressen
  addresses: Address[];
}

type CustomerType = 'person' | 'organisation';
type SubTabType = 'overview' | 'contacts' | 'payment' | 'skonto';

// Tab Definitionen
interface TabDefinition {
  id: SubTabType;
  label: string;
  icon: any;
  count?: number | null;
}

export interface NewCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: Partial<{
    name: string;
    firstName?: string;
    lastName?: string;
  }>;
  contactType?: 'organisation' | 'person';
  saving?: boolean;
  onSave?: (values: Record<string, unknown>) => Promise<void>;
  persistDirectly?: boolean;
  companyId: string; // Required für NumberSequenceService
  onSaved?: (customerId: string) => void;
}

const createDefaultAddress = (): Address => ({
  id: Math.random().toString(36).substr(2, 9),
  type: 'Arbeit',
  street: '',
  postalCode: '',
  city: '',
  country: 'Deutschland'
});

const DEFAULT_FORM_DATA: ExtendedFormData = {
  // Allgemeine Felder
  name: '',
  email: '',
  phone: '',
  // Person-spezifische Felder
  firstName: '',
  lastName: '',
  title: '', // Herr, Frau, Dr., etc.
  academicTitle: '', // MBA, M.Sc., etc.
  nameSuffix: '', // jun., sen., etc.
  position: '',
  // Organisation-spezifische Felder
  companyName: '',
  organizationType: 'Kunde', // Kunde, Lieferant, Partner, Interessent
  customerNumber: 'KD-001', // Automatisch generiert
  debitorNumber: '',
  creditorNumber: '',
  street: '',
  city: '',
  postalCode: '',
  country: 'Deutschland',
  taxNumber: '',
  vatId: '',
  vatValidated: false,
  website: '',
  notes: '',
  paymentTerms: '30 Tage netto',
  discount: 0,
  currency: 'EUR',
  language: 'de',
  companySize: '',
  industry: '',
  creditLimit: 0,
  isSupplier: false,
  // Zahlungsinformationen
  bankName: '',
  iban: '',
  bic: '',
  accountHolder: '',
  preferredPaymentMethod: 'Überweisung',
  earlyPaymentDiscount: 0,
  earlyPaymentDays: 14,
  defaultInvoiceDueDate: 30,
  reminderFee: 5.00,
  lateFee: 0,
  automaticReminders: true,
  // E-Rechnung
  eInvoiceEnabled: true,
  customerReference: '00',
  leitwegId: '',
  // Tags
  tags: [],
  // Adressen
  addresses: [createDefaultAddress()]
};

const COUNTRY_OPTIONS = [
'Deutschland',
'Österreich',
'Schweiz',
'Niederlande',
'Belgien',
'Frankreich',
'Italien',
'Spanien',
'Polen',
'Tschechien',
'Ungarn',
'Slowenien',
'Kroatien',
'USA',
'Andere'];


// Tooltip-Komponente in Taskilo-Design mit intelligenter Positionierung
const TooltipIcon = ({ text, icon: Icon = Info }: { text: string; icon?: any }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('top');
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  const handleMouseEnter = () => {
    setShowTooltip(true);
    
    // Intelligente Positionierung basierend auf Viewport
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const _viewportHeight = window.innerHeight;
      
      // Bestimme beste Position
      if (rect.right + 256 > viewportWidth) {
        setPosition('left');
      } else if (rect.left - 256 < 0) {
        setPosition('right');
      } else if (rect.top - 100 < 0) {
        setPosition('bottom');
      } else {
        setPosition('top');
      }
    }
  };
  
  const getTooltipClasses = () => {
    const baseClasses = "absolute z-50 w-64 p-3 text-sm bg-gray-900 text-white rounded-lg shadow-xl border border-gray-700";
    
    switch (position) {
      case 'top':
        return `${baseClasses} bottom-full left-1/2 transform -translate-x-1/2 mb-2`;
      case 'bottom':
        return `${baseClasses} top-full left-1/2 transform -translate-x-1/2 mt-2`;
      case 'left':
        return `${baseClasses} right-full top-1/2 transform -translate-y-1/2 mr-2`;
      case 'right':
        return `${baseClasses} left-full top-1/2 transform -translate-y-1/2 ml-2`;
      default:
        return `${baseClasses} bottom-full left-1/2 transform -translate-x-1/2 mb-2`;
    }
  };
  
  const getArrowClasses = () => {
    const baseArrow = "absolute w-2 h-2 bg-gray-900 transform rotate-45";
    
    switch (position) {
      case 'top':
        return `${baseArrow} top-full left-1/2 -translate-x-1/2 -mt-1`;
      case 'bottom':
        return `${baseArrow} bottom-full left-1/2 -translate-x-1/2 -mb-1`;
      case 'left':
        return `${baseArrow} left-full top-1/2 -translate-y-1/2 -ml-1`;
      case 'right':
        return `${baseArrow} right-full top-1/2 -translate-y-1/2 -mr-1`;
      default:
        return `${baseArrow} top-full left-1/2 -translate-x-1/2 -mt-1`;
    }
  };
  
  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        className="text-[#14ad9f] hover:text-taskilo-hover transition-colors p-1 rounded-full hover:bg-[#14ad9f]/10"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <Icon className="h-4 w-4" />
      </button>
      {showTooltip && (
        <div className={getTooltipClasses()}>
          <div className="relative">
            {text}
            <div className={getArrowClasses()}></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function ContactsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const companyId = params?.uid as string;
  
  // Fixed values for page mode
  const _open = true;
  const _onOpenChange = () => {};
  const _defaultValues: Partial<{ name: string; firstName?: string; lastName?: string; }> | undefined = undefined;
  const _contactType: 'organisation' | 'person' = 'organisation';
  const saving = false;
  const _onSave = undefined;
  const persistDirectly = true;
  const _onSaved = undefined;

  // Prüfe ob Prefill-Parameter vorhanden sind (von Auftragsseite)
  const prefillData = {
    type: searchParams?.get('type') as 'person' | 'organisation' | null,
    name: searchParams?.get('name'),
    firstName: searchParams?.get('firstName'),
    lastName: searchParams?.get('lastName'),
    companyName: searchParams?.get('companyName'),
    email: searchParams?.get('email'),
    phone: searchParams?.get('phone'),
    street: searchParams?.get('street'),
    postalCode: searchParams?.get('postalCode'),
    city: searchParams?.get('city'),
    country: searchParams?.get('country'),
    vatId: searchParams?.get('vatId'),
    taxNumber: searchParams?.get('taxNumber'),
    orderId: searchParams?.get('orderId'), // Referenz zum Ursprungsauftrag
  };

  // State Management - MUSS vor jedem bedingten Return stehen
  const [loading, setLoading] = useState(false);
  const [customerType, setCustomerType] = useState<CustomerType>('organisation');
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('overview');
  const [formData, setFormData] = useState<ExtendedFormData>(DEFAULT_FORM_DATA);
  const [contacts, setContacts] = useState<ContactPerson[]>([]);
  const [, setNextCustomerNumber] = useState('KD-001');
  const [, _setCurrentNumberSequence] = useState<NumberSequence | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [customCategories, setCustomCategories] = useState<
    Array<{id: string;name: string;categoryType: string;}>>(
    []);
  const [referenceFieldType, setReferenceFieldType] = useState<'customerReference' | 'leitwegId'>('customerReference');
  const [newTag, setNewTag] = useState('');
  const [, setShowTypeDropdown] = useState(false);

  // Refs for outside click detection
  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const [, _setDefaultValuesApplied] = useState(false);

  // Tab Definitionen - nur relevante Tabs für neue Kunden
  const tabs: TabDefinition[] = [
  { id: 'overview', label: 'Grunddaten', icon: FileText, count: null },
  { id: 'contacts', label: 'Kontakte', icon: Users, count: contacts.length },
  { id: 'payment', label: 'Zahlungsinformationen', icon: CreditCard, count: null },
  { id: 'skonto', label: 'Skonto & Konditionen', icon: Calculator, count: null }];


  // Generate next customer number using NumberSequenceService
  const generateNextCustomerNumber = async () => {
    if (!companyId) return;
    
    try {

      // Synchronisation läuft im Hintergrund - Berechtigungsfehler sind normal in Development
      Promise.all([
      NumberSequenceService.syncSequenceWithRealData(companyId, 'Kunde'),
      NumberSequenceService.syncSequenceWithRealData(companyId, 'Lieferant'),
      NumberSequenceService.syncSequenceWithRealData(companyId, 'Partner'),
      NumberSequenceService.syncSequenceWithRealData(companyId, 'Interessenten')]
      ).catch(() => {

        // Stille Behandlung - Berechtigungsfehler sind in Development normal
      });
      // Versuche bestehende Sequenzen zu laden
      const sequences = await NumberSequenceService.getNumberSequences(companyId);
      const customerSequence = sequences.find((seq) => seq.type === 'Kunde');

      if (customerSequence && customerSequence.nextNumber) {
        const previewNumber = NumberSequenceService.formatNumber(customerSequence.nextNumber, customerSequence.format);
        setNextCustomerNumber(previewNumber);
        handleInputChange('customerNumber', previewNumber);

      } else {
        // Intelligenter Fallback basierend auf aktueller Zeit
        const now = new Date();
        const timeId = `${now.getFullYear().toString().slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`.slice(-6);
        const fallbackNumber = `KD-${timeId}`;

        setNextCustomerNumber(fallbackNumber);
        handleInputChange('customerNumber', fallbackNumber);

      }
    } catch (error) {
      console.error('❌ Fehler beim Generieren der Kundennummer:', error);

      // Ultimativer Fallback: Timestamp-basiert  
      const timestamp = Date.now();
      const shortId = timestamp.toString().slice(-6);
      const emergencyNumber = `KD-${shortId}`;

      setNextCustomerNumber(emergencyNumber);
      handleInputChange('customerNumber', emergencyNumber);

      console.warn(`⚠️ Emergency Fallback Kundennummer: ${emergencyNumber}`);
    }
  };

  // 🔥 CRITICAL FIX: Separate category loading from tab changes
  useEffect(() => {
    // Page is always open, no modal check needed
    loadCategories();
    generateNextCustomerNumber();
  }, []);

  // Prefill-Daten aus Query-Parametern anwenden (z.B. von Auftragsseite)
  useEffect(() => {
    if (prefillData.name || prefillData.companyName || prefillData.email) {
      // Setze Kundentyp basierend auf prefill type
      if (prefillData.type === 'person') {
        setCustomerType('person');
      } else if (prefillData.type === 'organisation' || prefillData.companyName) {
        setCustomerType('organisation');
      }

      // Wende Prefill-Daten an
      setFormData(prev => ({
        ...prev,
        // Name - bei Person aufteilen, bei Organisation als companyName
        name: prefillData.name || '',
        firstName: prefillData.firstName || (prefillData.name?.split(' ')[0] || ''),
        lastName: prefillData.lastName || (prefillData.name?.split(' ').slice(1).join(' ') || ''),
        companyName: prefillData.companyName || '',
        // Kontakt
        email: prefillData.email || prev.email,
        phone: prefillData.phone || prev.phone,
        // Adresse
        street: prefillData.street || prev.street,
        postalCode: prefillData.postalCode || prev.postalCode,
        city: prefillData.city || prev.city,
        country: prefillData.country || prev.country,
        // Steuerdaten
        vatId: prefillData.vatId || prev.vatId,
        taxNumber: prefillData.taxNumber || prev.taxNumber,
        // Notiz mit Auftragsreferenz
        notes: prefillData.orderId 
          ? `Erstellt aus Auftrag: ${prefillData.orderId}` 
          : prev.notes,
      }));
    }
  }, [prefillData.name, prefillData.companyName, prefillData.email]);

  // DefaultValues werden in einer Page nicht benötigt
  // useEffect für defaultValues entfernt

  // Input Handler
  const handleInputChange = (field: string, value: string | number | boolean | string[]) => {
    // Debug-Logging für organizationType Änderungen
    if (field === 'organizationType') {

    }

    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  // Update isSupplier and customer number when organizationType changes
  useEffect(() => {
    const isSupplier = formData.organizationType === 'Lieferant';

    setFormData((prev) => ({
      ...prev,
      isSupplier: isSupplier
    }));

    // Generate appropriate number sequence based on organizationType
    const currentPrefix = formData.customerNumber.split('-')[0];
    const expectedPrefix = {
      'Kunde': 'KD',
      'Lieferant': 'LF',
      'Partner': 'PA',
      'Interessenten': 'IN'
    }[formData.organizationType];

    if (expectedPrefix && currentPrefix !== expectedPrefix) {
      generateNumberForType(formData.organizationType);
    }
  }, [formData.organizationType]);

  // Generate number for any organization type
  const generateNumberForType = async (type: string) => {
    try {
      if (!companyId) {
        console.error('❌ Keine gültige Company-ID verfügbar');
        return;
      }

      const fallbackNumbers = {
        'Kunde': 'KD-001',
        'Lieferant': 'LF-001',
        'Partner': 'PA-001',
        'Interessenten': 'IN-001'
      };

      const sequences = await NumberSequenceService.getNumberSequences(companyId);
      const sequence = sequences.find((seq) => seq.type === type);

      if (!sequence) {
        const fallbackNumber = fallbackNumbers[type as keyof typeof fallbackNumbers] || `${type}-001`;
        setFormData((prev) => ({
          ...prev,
          customerNumber: fallbackNumber
        }));
        toast.info(`${type}-Nummernkreis wird beim Speichern automatisch erstellt`);
        return;
      }

      const result = await NumberSequenceService.getNextNumberForType(companyId, type);
      setFormData((prev) => ({
        ...prev,
        customerNumber: result.formattedNumber
      }));
    } catch (error) {
      console.error(`❌ Fehler beim Generieren der ${type}-Nummer:`, error);
      toast.error(`Fehler beim Generieren der ${type}-Nummer`);
    }
  };

  const loadCategories = async () => {
    try {
      const { getCategories } = await import('@/utils/api/companyApi');
      const response = await getCategories();
      if (response.success && response.categories) {
        setCustomCategories(response.categories);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Kategorien:', error);
    }
  };

  // VAT Validation
  const validateVAT = async () => {
    if (!formData.vatId.trim()) return;

    try {
      const result = await validateVATNumber(formData.vatId);
      // Extract boolean from result if it's an object, otherwise use as boolean
      const isValid = typeof result === 'boolean' ? result : result?.isValid || false;

      setFormData((prev) => ({
        ...prev,
        vatValidated: isValid
      }));

      if (isValid) {
        toast.success('USt-IdNr. erfolgreich validiert');
      } else {
        toast.error('USt-IdNr. konnte nicht validiert werden');
      }
    } catch (error) {
      console.error('VAT validation error:', error);
      toast.error('Fehler bei der USt-IdNr. Validierung');
      // Set to false on error
      setFormData((prev) => ({
        ...prev,
        vatValidated: false
      }));
    }
  };

  // Tag Management
  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove)
    }));
  };

  // Contact Management
  const addContact = () => {
    const newContact: ContactPerson = {
      id: Math.random().toString(36).substr(2, 9),
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      position: '',
      department: '',
      isPrimary: contacts.length === 0
    };
    setContacts((prev) => [...prev, newContact]);
  };

  const updateContact = (contactId: string, field: keyof ContactPerson, value: string | boolean) => {
    setContacts((prev) => prev.map((contact) =>
    contact.id === contactId ? { ...contact, [field]: value } : contact
    ));
  };

  const removeContact = (contactId: string) => {
    setContacts((prev) => {
      const updated = prev.filter((contact) => contact.id !== contactId);
      // If we removed the primary contact, make the first remaining contact primary
      if (updated.length > 0 && !updated.some((c) => c.isPrimary)) {
        updated[0].isPrimary = true;
      }
      return updated;
    });
  };

  const _addAddress = () => {
    const newAddress = createDefaultAddress();
    setFormData((prev) => ({
      ...prev,
      addresses: [...prev.addresses, newAddress]
    }));
  };

  const _updateAddress = (addressId: string, field: keyof Address, value: string) => {
    setFormData((prev) => ({
      ...prev,
      addresses: prev.addresses.map((addr) =>
      addr.id === addressId ? { ...addr, [field]: value } : addr
      )
    }));
  };

  const _removeAddress = (addressId: string) => {
    setFormData((prev) => ({
      ...prev,
      addresses: prev.addresses.filter((addr) => addr.id !== addressId)
    }));
  };

  // Validation
  const isValid = () => {
    if (customerType === 'person') {
      return formData.firstName.trim() && formData.lastName.trim() && formData.customerNumber.trim();
    } else {
      return formData.companyName.trim() && formData.customerNumber.trim();
    }
  };

  // Outside click handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setShowTypeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Early return after all hooks - React Rules of Hooks compliant
  if (!companyId) {
    return <div className="p-6">Lädt...</div>;
  }

  return (
    <div className="max-w-6xl w-full p-6 bg-white min-h-screen">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">
          {customerType === 'person' ? 'Person erstellen' : 'Organisation erstellen'}
        </h1>
        <p className="text-gray-600 mt-1">
          Erstellen Sie einen neuen {customerType === 'person' ? 'Personenkontakt' : 'Organisationskontakt'} mit automatischer Nummerngenerierung
        </p>
      </div>

        {/* Customer Type Toggle */}
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
          <Label className="text-sm font-medium text-gray-700">Typ:</Label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCustomerType('person')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              customerType === 'person' ?
              'bg-[#14ad9f] text-white shadow-sm' :
              'bg-white text-gray-600 hover:text-gray-800 border border-gray-200'}`
              }>

              <User className="h-4 w-4" />
              Person
            </button>
            <button
              type="button"
              onClick={() => setCustomerType('organisation')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              customerType === 'organisation' ?
              'bg-[#14ad9f] text-white shadow-sm' :
              'bg-white text-gray-600 hover:text-gray-800 border border-gray-200'}`
              }>

              <Building2 className="h-4 w-4" />
              Organisation
            </button>
          </div>
        </div>

        {/* Sub-Tab Navigation */}
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeSubTab === tab.id ?
                'border-[#14ad9f] text-[#14ad9f]' :
                'border-transparent text-gray-500 hover:text-gray-700'}`
                }>

                <IconComponent className="h-4 w-4" />
                {tab.label}
                {typeof tab.count === 'number' && tab.count > 0 &&
                <span className="ml-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                    {tab.count}
                  </span>
                }
              </button>);

          })}
        </div>

        <div className="space-y-6 mt-6">
          {/* Overview Tab - Grunddaten */}
          {activeSubTab === 'overview' &&
          <div className="space-y-6">
              {customerType === 'person' ? (
            /* Person Form */
            <div className="space-y-6">
                  {/* Persönliche Informationen */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Anrede</Label>
                          <Select
                        value={formData.title}
                        onValueChange={(val) => handleInputChange('title', val)}>

                            <SelectTrigger>
                              <SelectValue placeholder="Anrede wählen" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Herr">Herr</SelectItem>
                              <SelectItem value="Frau">Frau</SelectItem>
                              <SelectItem value="Divers">Divers</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Akademischer Titel</Label>
                          <Input
                        value={formData.academicTitle}
                        onChange={(e) => handleInputChange('academicTitle', e.target.value)}
                        placeholder="Dr., Prof., etc." />

                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Vorname *</Label>
                          <Input
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        placeholder="Max" />

                        </div>
                        <div className="space-y-2">
                          <Label>Nachname *</Label>
                          <Input
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        placeholder="Mustermann" />

                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Namenszusatz</Label>
                        <Input
                      value={formData.nameSuffix}
                      onChange={(e) => handleInputChange('nameSuffix', e.target.value)}
                      placeholder="jun., sen., MBA" />

                      </div>

                      <div className="space-y-2">
                        <Label>Position</Label>
                        <Input
                      value={formData.position}
                      onChange={(e) => handleInputChange('position', e.target.value)}
                      placeholder="Geschäftsführer" />

                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label>E-Mail</Label>
                            <TooltipIcon 
                              text="Haupt-E-Mail-Adresse für Rechnungen und Kommunikation. Diese wird auch für Rechnungsversand verwendet."
                              icon={Mail}
                            />
                          </div>
                          <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="max@beispiel.de" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label>Telefon</Label>
                            <TooltipIcon 
                              text="Haupttelefonnummer für Rückfragen und Support. Im Format +49 123 456789 eingeben."
                              icon={Phone}
                            />
                          </div>
                          <Input
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="+49 123 456789" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label>Website</Label>
                          <TooltipIcon 
                            text="Offizielle Website des Unternehmens. Wird in Rechnungen und Dokumenten angezeigt."
                            icon={Globe}
                          />
                        </div>
                        <Input
                      type="url"
                      value={formData.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      placeholder="https://www.beispiel.de" />
                      </div>
                    </div>
                  </div>

                  {/* Notizen - außerhalb des Grids für volle Breite */}
                  <div className="space-y-2">
                    <Label>Notizen</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      placeholder="Weitere Informationen zur Person"
                      rows={3} />
                  </div>
                </div>) : (

            /* Organisation Form */
            <div className="space-y-6">
                  {/* Firmeninformationen */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Firmenname *</Label>
                        <Input
                      value={formData.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                      placeholder="Musterfirma GmbH" />

                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Firmengröße</Label>
                          <Select
                        value={formData.companySize}
                        onValueChange={(val) => handleInputChange('companySize', val)}>

                            <SelectTrigger>
                              <SelectValue placeholder="Größe wählen" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Klein (1-10)">Klein (1-10 MA)</SelectItem>
                              <SelectItem value="Mittel (11-50)">Mittel (11-50 MA)</SelectItem>
                              <SelectItem value="Groß (51-250)">Groß (51-250 MA)</SelectItem>
                              <SelectItem value="Konzern (250+)">Konzern (250+ MA)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Branche</Label>
                          <Input
                        value={formData.industry}
                        onChange={(e) => handleInputChange('industry', e.target.value)}
                        placeholder="IT, Handel, etc." />

                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Website</Label>
                        <Input
                      type="url"
                      value={formData.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      placeholder="https://www.musterfirma.de" />

                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>E-Mail</Label>
                          <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="info@musterfirma.de" />

                        </div>
                        <div className="space-y-2">
                          <Label>Telefon</Label>
                          <Input
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="+49 123 456789" />

                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Kreditlimit (€)</Label>
                        <Input
                      type="number"
                      value={formData.creditLimit}
                      onChange={(e) => handleInputChange('creditLimit', Number(e.target.value))}
                      placeholder="10000"
                      min="0" />
                      </div>

                      <div className="space-y-2">
                        <Label>Kommunikationssprache</Label>
                        <Select
                        value={formData.language}
                        onValueChange={(val) => handleInputChange('language', val)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sprache wählen" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="de">Deutsch</SelectItem>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="fr">Français</SelectItem>
                            <SelectItem value="es">Español</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Notizen - außerhalb des Grids für volle Breite */}
                  <div className="space-y-2">
                    <Label>Notizen</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      placeholder="Weitere Informationen zur Organisation"
                      rows={3} />
                  </div>
                </div>)
            }

              {/* Gemeinsame Felder */}
              <div className="border-t pt-6 space-y-6">
                {/* Nummern und Typ */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Kundennummer *</Label>
                        <Input
                        value={formData.customerNumber}
                        onChange={(e) => handleInputChange('customerNumber', e.target.value)}
                        placeholder="KD-001" />

                      </div>
                      <div className="space-y-2">
                        <Label>Typ</Label>
                        <div className="relative" ref={typeDropdownRef}>
                          <Select
                          value={formData.organizationType}
                          onValueChange={(val: string) => {

                            if (val === 'create-category') {
                              setShowCategoryModal(true);
                            } else {
                              handleInputChange('organizationType', val);
                            }
                          }}>

                            <SelectTrigger>
                              <SelectValue placeholder="Typ wählen" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Kunde">Kunde</SelectItem>
                              <SelectItem value="Lieferant">Lieferant</SelectItem>
                              <SelectItem value="Partner">Partner</SelectItem>
                              <SelectItem value="Interessenten">Interessenten</SelectItem>
                              {customCategories.map((category) =>
                            <SelectItem key={category.id} value={category.categoryType}>
                                  {category.name} ({category.categoryType})
                                </SelectItem>
                            )}
                              <SelectItem
                              value="create-category"
                              className="text-[#14ad9f] font-medium border-t">

                                + Kategorie erstellen
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Buchhaltungsnummern */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label>Debitorennummer</Label>
                          <TooltipIcon 
                            text="Debitorennummer für die Buchhaltung (Kundenkonto). Eindeutige Kennzeichnung des Kunden in der Finanzbuchhaltung."
                            icon={Calculator}
                          />
                        </div>
                        <Input
                        value={formData.debitorNumber}
                        onChange={(e) => handleInputChange('debitorNumber', e.target.value)}
                        placeholder="DEB001" />

                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label>Kreditorennummer</Label>
                          <TooltipIcon 
                            text="Kreditorennummer für die Buchhaltung (Lieferantenkonto). Wird verwendet wenn dieser Kontakt auch als Lieferant auftritt."
                            icon={Building2}
                          />
                        </div>
                        <Input
                        value={formData.creditorNumber}
                        onChange={(e) => handleInputChange('creditorNumber', e.target.value)}
                        placeholder="KRE001" />

                      </div>
                    </div>
                  </div>

                  {/* Adresse */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Adresse</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label>Straße</Label>
                          <TooltipIcon 
                            text="Vollständige Adresse mit Straße und Hausnummer. Wird für Rechnungen und Lieferungen verwendet."
                            icon={MapPin}
                          />
                        </div>
                        <Input
                        value={formData.street}
                        onChange={(e) => handleInputChange('street', e.target.value)}
                        placeholder="Musterstraße 123" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>PLZ</Label>
                          <Input
                          value={formData.postalCode}
                          onChange={(e) => handleInputChange('postalCode', e.target.value)}
                          placeholder="12345" />

                        </div>
                        <div className="space-y-2">
                          <Label>Stadt</Label>
                          <Input
                          value={formData.city}
                          onChange={(e) => handleInputChange('city', e.target.value)}
                          placeholder="Musterstadt" />

                        </div>
                        <div className="space-y-2">
                          <Label>Land</Label>
                          <Select
                          value={formData.country}
                          onValueChange={(val) => handleInputChange('country', val)}>

                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-72">
                              {COUNTRY_OPTIONS.map((country) =>
                            <SelectItem key={country} value={country}>
                                  {country}
                                </SelectItem>
                            )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Steuerliche Informationen */}
                <div className="border-t pt-6 space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Steuerliche Informationen</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 min-h-8">
                        <Label>Steuernummer</Label>
                        <TooltipIcon 
                          text="Deutsche Steuernummer des Unternehmens. Format: 12345/67890. Wird für steuerliche Dokumentation benötigt."
                          icon={Receipt}
                        />
                      </div>
                      <Input
                      value={formData.taxNumber}
                      onChange={(e) => handleInputChange('taxNumber', e.target.value)}
                      placeholder="12345/67890" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 min-h-8">
                        <Label>USt-IdNr.</Label>
                        <TooltipIcon 
                          text="Umsatzsteuer-Identifikationsnummer für EU-Geschäfte. Format: DE123456789. Klicken Sie auf 'Prüfen' zur Validierung."
                          icon={Calculator}
                        />
                        <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={validateVAT}
                        className="h-6 px-2 text-xs">
                          Prüfen
                        </Button>
                        {formData.vatValidated &&
                      <Check className="h-4 w-4 text-green-500" />
                      }
                      </div>
                      <Input
                      value={formData.vatId}
                      onChange={(e) => handleInputChange('vatId', e.target.value)}
                      placeholder="DE123456789" />
                    </div>
                  </div>
                </div>

                {/* E-Rechnung */}
                <div className="border-t pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Label>E-Rechnung Standard</Label>
                      <TooltipIcon 
                        text="Aktiviert elektronische Rechnungsstellung für B2B-Kunden gemäß EU-Standard. Unterstützt XRechnung und ZUGFeRD-Format."
                      />
                      <button
                      type="button"
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:ring-offset-2 ${
                      formData.eInvoiceEnabled ? 'bg-[#14ad9f]' : 'bg-gray-200'}`
                      }
                      onClick={() => handleInputChange('eInvoiceEnabled', !formData.eInvoiceEnabled)}>

                        <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.eInvoiceEnabled ? 'translate-x-6' : 'translate-x-1'}`
                        } />

                      </button>
                    </div>
                  </div>

                  {formData.eInvoiceEnabled &&
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <Label className="flex items-center gap-2">
                            {referenceFieldType === 'customerReference' ? 'Kundenreferenz' : 'Leitweg-ID'}
                            <TooltipIcon 
                              text={referenceFieldType === 'customerReference' 
                                ? "Ihre interne Referenznummer für diesen Kunden (z.B. K-001). Erscheint auf Rechnungen und Angeboten."
                                : "Leitweg-ID für öffentliche Auftraggeber nach XRechnung Standard (Format: 991-12345-12). Pflichtfeld für B2G-Rechnungen."
                              }
                            />
                          </Label>
                          <button
                        type="button"
                        className="text-sm text-[#14ad9f] hover:text-taskilo-hover font-medium"
                        onClick={() =>
                        setReferenceFieldType(
                          referenceFieldType === 'customerReference' ? 'leitwegId' : 'customerReference'
                        )
                        }>

                            {referenceFieldType === 'customerReference' ?
                        'Zu Leitweg-ID wechseln' :
                        'Zu Kundenreferenz wechseln'}
                          </button>
                        </div>
                        <Input
                      value={
                      referenceFieldType === 'customerReference' ?
                      formData.customerReference :
                      formData.leitwegId
                      }
                      onChange={(e) =>
                      handleInputChange(
                        referenceFieldType === 'customerReference' ? 'customerReference' : 'leitwegId',
                        e.target.value
                      )
                      }
                      placeholder={referenceFieldType === 'customerReference' ? '00' : '991-12345-12'} />

                      </div>
                    </div>
                }
                </div>

                {/* Tags */}
                <div className="border-t pt-6 space-y-4">
                  <Label>Tags</Label>
                  <div className="space-y-2">
                    {formData.tags.length > 0 &&
                  <div className="flex flex-wrap gap-2">
                        {formData.tags.map((tag, index) =>
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-[#14ad9f] text-white text-sm rounded-full">

                            {tag}
                            <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:bg-white/20 rounded-full p-0.5">

                              <X className="h-3 w-3" />
                            </button>
                          </span>
                    )}
                      </div>
                  }
                    <div className="flex gap-2">
                      <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Neues Tag eingeben"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} />

                      <Button
                      type="button"
                      variant="outline"
                      onClick={addTag}
                      disabled={!newTag.trim()}>

                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }

          {/* Contacts Tab */}
          {activeSubTab === 'contacts' &&
          <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Kontaktpersonen</h3>
                <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addContact}
                className="flex items-center gap-2">

                  <Plus className="w-4 h-4" />
                  Kontakt hinzufügen
                </Button>
              </div>

              {contacts.length === 0 ?
            <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Noch keine Kontaktpersonen hinzugefügt</p>
                  <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addContact}
                className="mt-4">

                    Ersten Kontakt hinzufügen
                  </Button>
                </div> :

            <div className="space-y-4">
                  {contacts.map((contact, index) =>
              <div key={contact.id} className="border rounded-lg p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium flex items-center gap-2">
                          Kontakt {index + 1}
                          {contact.isPrimary &&
                    <span className="px-2 py-1 bg-[#14ad9f] text-white text-xs rounded-full">
                              Hauptkontakt
                            </span>
                    }
                        </h4>
                        <div className="flex items-center gap-2">
                          {!contact.isPrimary &&
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setContacts((prev) => prev.map((c) => ({ ...c, isPrimary: c.id === contact.id })));
                      }}>

                              Als Hauptkontakt
                            </Button>
                    }
                          <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeContact(contact.id)}
                      className="text-red-600 hover:text-red-700">

                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Vorname</Label>
                          <Input
                      value={contact.firstName}
                      onChange={(e) => updateContact(contact.id, 'firstName', e.target.value)}
                      placeholder="Max" />

                        </div>
                        <div className="space-y-2">
                          <Label>Nachname</Label>
                          <Input
                      value={contact.lastName}
                      onChange={(e) => updateContact(contact.id, 'lastName', e.target.value)}
                      placeholder="Mustermann" />

                        </div>
                        <div className="space-y-2">
                          <Label>E-Mail</Label>
                          <Input
                      type="email"
                      value={contact.email}
                      onChange={(e) => updateContact(contact.id, 'email', e.target.value)}
                      placeholder="max@beispiel.de" />

                        </div>
                        <div className="space-y-2">
                          <Label>Telefon</Label>
                          <Input
                      value={contact.phone || ''}
                      onChange={(e) => updateContact(contact.id, 'phone', e.target.value)}
                      placeholder="+49 123 456789" />

                        </div>
                        <div className="space-y-2">
                          <Label>Position</Label>
                          <Input
                      value={contact.position || ''}
                      onChange={(e) => updateContact(contact.id, 'position', e.target.value)}
                      placeholder="Geschäftsführer" />

                        </div>
                        <div className="space-y-2">
                          <Label>Abteilung</Label>
                          <Input
                      value={contact.department || ''}
                      onChange={(e) => updateContact(contact.id, 'department', e.target.value)}
                      placeholder="Einkauf" />

                        </div>
                      </div>
                    </div>
              )}
                </div>
            }
            </div>
          }

          {/* Payment Tab */}
          {activeSubTab === 'payment' &&
          <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Zahlungsinformationen</h3>

              {/* Zahlungsbedingungen */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>Zahlungsbedingungen</Label>
                      <TooltipIcon 
                        text="Zeitraum bis zur Fälligkeit der Rechnung. Standard ist '30 Tage netto', also Zahlung innerhalb von 30 Tagen ohne Abzug."
                        icon={Clock}
                      />
                    </div>
                    <Select
                    value={formData.paymentTerms}
                    onValueChange={(val) => handleInputChange('paymentTerms', val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Zahlungsbedingungen wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sofort">Sofort</SelectItem>
                        <SelectItem value="7 Tage netto">7 Tage netto</SelectItem>
                        <SelectItem value="14 Tage netto">14 Tage netto</SelectItem>
                        <SelectItem value="30 Tage netto">30 Tage netto</SelectItem>
                        <SelectItem value="60 Tage netto">60 Tage netto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>Bevorzugte Zahlungsart</Label>
                      <TooltipIcon 
                        text="Die bevorzugte Art der Zahlung für diesen Kunden. Wird als Standard für neue Rechnungen verwendet."
                        icon={Banknote}
                      />
                    </div>
                    <Select
                    value={formData.preferredPaymentMethod}
                    onValueChange={(val) => handleInputChange('preferredPaymentMethod', val)}>

                      <SelectTrigger>
                        <SelectValue placeholder="Zahlungsart wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Überweisung">Überweisung</SelectItem>
                        <SelectItem value="Lastschrift">Lastschrift</SelectItem>
                        <SelectItem value="Vorkasse">Vorkasse</SelectItem>
                        <SelectItem value="Kreditkarte">Kreditkarte</SelectItem>
                        <SelectItem value="PayPal">PayPal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Zahlungsziel (Tage)</Label>
                    <Input
                    type="number"
                    value={formData.defaultInvoiceDueDate}
                    onChange={(e) => handleInputChange('defaultInvoiceDueDate', Number(e.target.value))}
                    placeholder="30"
                    min="1"
                    max="365" />
                  </div>
                  <div className="space-y-2">
                    <Label>Standardrabatt (%)</Label>
                    <Input
                    type="number"
                    value={formData.discount}
                    onChange={(e) => handleInputChange('discount', Number(e.target.value))}
                    placeholder="0"
                    min="0"
                    max="100"
                    step="0.1" />
                  </div>
                  <div className="space-y-2">
                    <Label>Währung</Label>
                    <Select
                    value={formData.currency}
                    onValueChange={(val) => handleInputChange('currency', val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Währung wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="CHF">CHF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>



              {/* Bankdaten */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-800">Bankverbindung</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Bank</Label>
                    <Input
                    value={formData.bankName}
                    onChange={(e) => handleInputChange('bankName', e.target.value)}
                    placeholder="Deutsche Bank" />

                  </div>
                  <div className="space-y-2">
                    <Label>Kontoinhaber</Label>
                    <Input
                    value={formData.accountHolder}
                    onChange={(e) => handleInputChange('accountHolder', e.target.value)}
                    placeholder="Max Mustermann" />

                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>IBAN</Label>
                      <TooltipIcon 
                        text="Internationale Bankkontonummer für SEPA-Überweisungen. Format: DE89 3704 0044 0532 0130 00"
                        icon={CreditCard}
                      />
                    </div>
                    <Input
                    value={formData.iban}
                    onChange={(e) => handleInputChange('iban', e.target.value)}
                    placeholder="DE89 3704 0044 0532 0130 00" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>BIC</Label>
                      <TooltipIcon 
                        text="Bank Identifier Code (SWIFT-Code). Beispiel: DEUTDEFF für Deutsche Bank Frankfurt"
                        icon={Building2}
                      />
                    </div>
                    <Input
                    value={formData.bic}
                    onChange={(e) => handleInputChange('bic', e.target.value)}
                    placeholder="DEUTDEFF" />
                  </div>
                </div>
              </div>

              {/* Mahnwesen */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-800">Mahnwesen</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Mahngebühr (€)</Label>
                    <Input
                    type="number"
                    value={formData.reminderFee}
                    onChange={(e) => handleInputChange('reminderFee', Number(e.target.value))}
                    placeholder="5.00"
                    min="0"
                    step="0.01" />

                  </div>
                  <div className="space-y-2">
                    <Label>Verzugszinsen (% p.a.)</Label>
                    <Input
                    type="number"
                    value={formData.lateFee}
                    onChange={(e) => handleInputChange('lateFee', Number(e.target.value))}
                    placeholder="8.0"
                    min="0"
                    step="0.1" />

                  </div>
                  <div className="space-y-2 flex items-center gap-3 col-span-1 lg:col-span-2">
                    <Label>Automatische Mahnungen</Label>
                    <button
                    type="button"
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:ring-offset-2 ${
                    formData.automaticReminders ? 'bg-[#14ad9f]' : 'bg-gray-200'}`
                    }
                    onClick={() => handleInputChange('automaticReminders', !formData.automaticReminders)}>

                      <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.automaticReminders ? 'translate-x-6' : 'translate-x-1'}`
                      } />

                    </button>
                  </div>
                </div>
              </div>
            </div>
          }

          {/* Skonto Tab */}
          {activeSubTab === 'skonto' &&
          <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Skonto & Konditionen</h3>
              
              {/* Einführungstext */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Calculator className="h-5 w-5 text-[#14ad9f] mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Was ist Skonto?</h4>
                    <p className="text-sm text-gray-700">
                      Skonto ist ein Preisnachlass, den Sie Ihren Kunden bei frühzeitiger Zahlung gewähren. 
                      Dies verbessert Ihre Liquidität und reduziert das Ausfallrisiko. Übliche Konditionen sind &ldquo;2% bei Zahlung innerhalb 14 Tagen&rdquo;.
                    </p>
                  </div>
                </div>
              </div>

              {/* Skonto-Grundeinstellungen */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-800">Skonto-Grundeinstellungen</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>Skonto (%)</Label>
                      <TooltipIcon 
                        text="Preisnachlass in Prozent bei Zahlung innerhalb der Skontofrist. Üblich sind 2-3%. Beispiel: 2% Skonto bedeutet bei 1000€ Rechnung nur 980€ bei frühzeitiger Zahlung."
                      />
                    </div>
                    <Input
                      type="number"
                      value={formData.earlyPaymentDiscount}
                      onChange={(e) => handleInputChange('earlyPaymentDiscount', Number(e.target.value))}
                      placeholder="2"
                      min="0"
                      max="100"
                      step="0.1" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>Skontofrist (Tage)</Label>
                      <TooltipIcon 
                        text="Zeitraum in Tagen, in dem der Kunde den Skonto nutzen kann. Standard sind 8-14 Tage. Häufige Formulierung: '14 Tage 2% Skonto, 30 Tage netto'."
                      />
                    </div>
                    <Input
                      type="number"
                      value={formData.earlyPaymentDays}
                      onChange={(e) => handleInputChange('earlyPaymentDays', Number(e.target.value))}
                      placeholder="14"
                      min="0" />
                  </div>
                </div>
              </div>

              {/* Erweiterte Skonto-Optionen */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-800">Erweiterte Konditionen</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>Standardrabatt (%)</Label>
                      <TooltipIcon 
                        text="Genereller Rabatt für diesen Kunden, unabhängig vom Skonto. Wird automatisch auf alle Rechnungen angewendet."
                      />
                    </div>
                    <Input
                      type="number"
                      value={formData.discount}
                      onChange={(e) => handleInputChange('discount', Number(e.target.value))}
                      placeholder="0"
                      min="0"
                      max="100"
                      step="0.1" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>Kreditlimit (€)</Label>
                      <TooltipIcon 
                        text="Maximaler Kreditbetrag für diesen Kunden. Bei Überschreitung werden keine weiteren Lieferungen ohne Vorauszahlung getätigt."
                      />
                    </div>
                    <Input
                      type="number"
                      value={formData.creditLimit}
                      onChange={(e) => handleInputChange('creditLimit', Number(e.target.value))}
                      placeholder="10000"
                      min="0" />
                  </div>
                </div>
              </div>

              {/* Berechnungsbeispiel */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Euro className="h-5 w-5 text-[#14ad9f] mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-2">Berechnungsbeispiel</h4>
                    <div className="space-y-1 text-sm text-gray-700">
                      <div className="flex justify-between">
                        <span>Rechnungsbetrag:</span>
                        <span>1.000,00 €</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Skonto ({formData.earlyPaymentDiscount || 2}%):</span>
                        <span>-{((1000 * (formData.earlyPaymentDiscount || 2)) / 100).toFixed(2)} €</span>
                      </div>
                      <hr className="border-gray-300" />
                      <div className="flex justify-between font-medium">
                        <span>Zu zahlen bei Skonto:</span>
                        <span>{(1000 - (1000 * (formData.earlyPaymentDiscount || 2)) / 100).toFixed(2)} €</span>
                      </div>
                      <div className="text-xs text-gray-600 mt-2">
                        Gültig bei Zahlung innerhalb von {formData.earlyPaymentDays || 14} Tagen
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Wirtschaftliche Bedeutung */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-[#14ad9f] mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Wirtschaftliche Bedeutung</h4>
                    <p className="text-sm text-gray-700">
                      Ein {formData.earlyPaymentDiscount || 2}% Skonto bei {formData.earlyPaymentDays || 14} Tagen entspricht einem 
                      Effektivzins von ca. {(((formData.earlyPaymentDiscount || 2) * 360) / (30 - (formData.earlyPaymentDays || 14))).toFixed(1)}% p.a. 
                      Dies ist meist günstiger als Bankkredite und verbessert Ihre Liquidität erheblich.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          }

          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button variant="outline" onClick={() => window.history.back()}>
              Abbrechen
            </Button>
            <Button
              className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
              disabled={Boolean(saving) || !isValid() || loading}
              onClick={async () => {
                try {
                  setLoading(true);

                  // Ensure we have the correct customer number for the organization type
                  let finalCustomerNumber = formData.customerNumber;

                  // Validate customer number matches organization type
                  const expectedPrefix = {
                    'Kunde': 'KD',
                    'Lieferant': 'LF',
                    'Partner': 'PA',
                    'Interessenten': 'IN'
                  }[formData.organizationType];

                  if (expectedPrefix && !formData.customerNumber.startsWith(expectedPrefix)) {

                    const result = await NumberSequenceService.getNextNumberForType(companyId, formData.organizationType);
                    finalCustomerNumber = result.formattedNumber;

                  }

                  // Generate display name based on customer type
                  const displayName = customerType === 'person' ?
                  `${formData.title ? formData.title + ' ' : ''}${formData.firstName} ${formData.lastName}`.trim() :
                  formData.companyName;

                  // Create legacy address string for compatibility
                  const legacyAddress = `${formData.street}\n${formData.postalCode} ${formData.city}\n${formData.country}`;

                  // Create comprehensive customer data object
                  const customerData = {
                    // Grunddaten
                    customerNumber: finalCustomerNumber,
                    name: displayName,
                    email: formData.email,
                    phone: formData.phone,

                    // Adressdaten
                    address: legacyAddress, // Legacy-Feld für Kompatibilität
                    street: formData.street,
                    city: formData.city,
                    postalCode: formData.postalCode,
                    country: formData.country,

                    // Steuerliche Daten
                    taxNumber: formData.taxNumber,
                    vatId: formData.vatId,
                    vatValidated: formData.vatValidated,

                    // Organisation/Person-spezifische Felder
                    isSupplier: formData.organizationType === 'Lieferant',
                    organizationType: formData.organizationType,

                    // Person-spezifische Felder
                    firstName: customerType === 'person' ? formData.firstName : '',
                    lastName: customerType === 'person' ? formData.lastName : '',
                    title: customerType === 'person' ? formData.title : '',
                    position: formData.position,

                    // Organisation-spezifische Felder
                    companyName: customerType === 'organisation' ? formData.companyName : '',
                    website: formData.website,
                    companySize: formData.companySize,
                    industry: formData.industry,

                    // Buchhaltungskonten
                    debitorNumber: formData.debitorNumber,
                    creditorNumber: formData.creditorNumber,

                    // Geschäftsbedingungen & Zahlungsinformationen
                    paymentTerms: formData.paymentTerms,
                    discount: formData.discount,
                    creditLimit: formData.creditLimit,
                    currency: formData.currency,
                    language: formData.language,

                    // Bankdaten
                    bankName: formData.bankName,
                    iban: formData.iban,
                    bic: formData.bic,
                    accountHolder: formData.accountHolder,

                    // Zahlungsbedingungen
                    preferredPaymentMethod: formData.preferredPaymentMethod,
                    defaultInvoiceDueDate: formData.defaultInvoiceDueDate,
                    earlyPaymentDiscount: formData.earlyPaymentDiscount,
                    earlyPaymentDays: formData.earlyPaymentDays,

                    // Mahnwesen
                    reminderFee: formData.reminderFee,
                    lateFee: formData.lateFee,
                    automaticReminders: formData.automaticReminders,

                    // E-Rechnung
                    eInvoiceEnabled: formData.eInvoiceEnabled,
                    customerReference: formData.customerReference,
                    leitwegId: formData.leitwegId,

                    // Metadaten
                    notes: formData.notes,
                    tags: formData.tags,

                    // Kontaktpersonen
                    contacts: contacts,

                    // Zusätzliche Adressen (falls erweitert)
                    addresses: formData.addresses,

                    // Statistische Initialdaten
                    totalInvoices: 0,
                    totalAmount: 0,
                    createdAt: new Date(),
                    updatedAt: new Date()
                  };

                  if (persistDirectly && companyId) {
                    try {
                      // Use the correct API import for customer creation
                      const { createCustomer } = await import('@/utils/api/companyApi');
                      const response = await createCustomer(companyId, customerData);

                      // Prüfe ob Kunde bereits existiert
                      if (response.exists) {
                        toast.error(`Kunde bereits vorhanden: ${response.existingCustomerName}`, {
                          description: response.error,
                          duration: 5000,
                        });
                        return;
                      }

                      if (response.success && response.customerId) {
                        toast.success(`${displayName} wurde erfolgreich erstellt`);
                        return;
                      } else {
                        throw new Error(response.error || 'Kunde konnte nicht erstellt werden');
                      }
                    } catch (error) {
                      console.error('Fehler beim Speichern des Kunden:', error);
                      toast.error('Fehler beim Speichern des Kunden');
                      return;
                    }
                  }

                  if (_onSave) {
                    // Custom save logic würde hier stehen
                    toast.success('Kunde erfolgreich gespeichert!');
                  }
                } catch (error) {
                  console.error('Fehler beim Erstellen des Kunden:', error);
                  toast.error('Fehler beim Erstellen des Kunden');
                } finally {
                  setLoading(false);
                }
              }}>

              {saving || loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {loading ? 'Wird erstellt...' : 'Speichern'}
            </Button>
          </div>
        </div>

      {/* Category Modal */}
      {companyId &&
      <NewCategoryModal
        open={showCategoryModal}
        onOpenChange={setShowCategoryModal}
        companyId={companyId}
        onSaved={(categoryId, categoryData) => {
          // Setze die neue Kategorie als aktuellen Typ
          handleInputChange('organizationType', categoryData.categoryType);

          // Lade Kategorien-Liste neu um die neue Kategorie zu erhalten
          loadCategories();
        }} />

      }
    </div>);

}