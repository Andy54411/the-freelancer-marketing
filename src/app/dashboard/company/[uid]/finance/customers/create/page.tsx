'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Loader2, Trash2, UserPlus, Star, CheckCircle, XCircle, History, Users, FileText, Receipt, CreditCard, Upload, Printer, Download, Edit, User, Check, File, Folder, Book, Mail, DollarSign, MoreHorizontal, Save, X, Info, HelpCircle, Plus, Tag, ChevronDown, Settings, InfoIcon } from 'lucide-react';
import { toast } from 'sonner';
import { validateVATNumber, getVATFormat } from '@/utils/vatValidation';
import { NumberSequenceService, type NumberSequence } from '@/services/numberSequenceService';
import { CustomerService } from '@/services/customerService';
import NumberSequenceModal from '@/components/accounting/NumberSequenceModal';

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

export interface Customer {
  id: string;
  customerNumber: string;
  name: string;
  email: string;
  phone?: string;
  // Legacy address für Kompatibilität
  address: string;
  // Strukturierte Adresse
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  taxNumber?: string;
  vatId?: string;
  vatValidated?: boolean;
  isSupplier?: boolean; // Unterscheidung zwischen Kunde und Lieferant
  totalInvoices: number;
  totalAmount: number;
  // Erweiterte Felder
  website?: string;
  notes?: string;
  paymentTerms?: string; // z.B. "30 Tage netto"
  discount?: number; // Standardrabatt in %
  currency?: string; // Standard: EUR
  language?: string; // Sprache für Dokumente
  // B2B-spezifische Felder
  companySize?: string; // Klein, Mittel, Groß
  industry?: string; // Branche
  creditLimit?: number; // Kreditlimit
  // Kontaktpersonen
  contacts?: ContactPerson[];
  // Metadaten
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export default function CreateCustomerPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  // State Management - ALL HOOKS MUST BE BEFORE EARLY RETURNS
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [contacts, setContacts] = useState<ContactPerson[]>([]);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [referenceFieldType, setReferenceFieldType] = useState<'customerReference' | 'leitwegId'>('customerReference');
  const [showReferenceTooltip, setShowReferenceTooltip] = useState(false);
  const [showEInvoiceTooltip, setShowEInvoiceTooltip] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);

  // Tooltip State
  const [tooltips, setTooltips] = useState({
    debitorInfo: false,
    creditorInfo: false
  });

  // Customer number management
  const [nextCustomerNumber, setNextCustomerNumber] = useState('1003');
  const [showNumberingModal, setShowNumberingModal] = useState(false);
  const [showNumberSequenceModal, setShowNumberSequenceModal] = useState(false);
  const [currentNumberSequence, setCurrentNumberSequence] = useState<NumberSequence | null>(null);

  // Generate customer number for any organization type - FIXED VERSION
  const generateCustomerNumber = async (organizationType: string = 'Kunde') => {
    try {
      if (!params?.uid || typeof params.uid !== 'string') return;
      
      console.log(`🔢 Generiere ${organizationType}-Nummer...`);
      
      // Erst prüfen, ob der Nummernkreis existiert
      const sequences = await NumberSequenceService.getNumberSequences(params.uid);
      const targetSequence = sequences.find(seq => seq.type === organizationType);
      
      if (!targetSequence) {
        // Fallback-Nummern für jeden Typ
        const fallbackNumbers = {
          'Kunde': 'KD-001',
          'Lieferant': 'LF-001',
          'Partner': 'PA-001',
          'Interessenten': 'IN-001'
        };
        const fallbackNumber = fallbackNumbers[organizationType as keyof typeof fallbackNumbers] || `${organizationType.substring(0, 2).toUpperCase()}-001`;
        
        setNextCustomerNumber(fallbackNumber);
        handleInputChange('customerNumber', fallbackNumber);
        console.log(`⚠️ Verwende Fallback für ${organizationType}: ${fallbackNumber}`);
        return;
      }
      
      // Zeige Preview-Nummer (ohne zu inkrementieren)
      const previewNumber = NumberSequenceService.formatNumber(targetSequence.nextNumber, targetSequence.format);
      setNextCustomerNumber(previewNumber);
      handleInputChange('customerNumber', previewNumber);
      console.log(`✅ ${organizationType}-Nummer: ${previewNumber}`);
      
    } catch (error) {
      console.error(`Fehler beim Generieren der ${organizationType}-Nummer:`, error);
      // Fallback zur manuellen Generierung
      const prefix = organizationType === 'Kunde' ? 'KD' : organizationType === 'Lieferant' ? 'LF' : organizationType === 'Partner' ? 'PA' : 'IN';
      const fallbackNumber = `${prefix}-${Date.now().toString().slice(-3)}`;
      setNextCustomerNumber(fallbackNumber);
      handleInputChange('customerNumber', fallbackNumber);
      toast.error(`Fehler bei ${organizationType}-Nummer, verwende Fallback: ${fallbackNumber}`);
    }
  };

  // Load initial customer number on mount
  useEffect(() => {
    // Synchronisiere alle Nummernkreise beim ersten Laden
    const initializeNumberSequences = async () => {
      if (!params?.uid || typeof params.uid !== 'string') return;
      
      try {
        console.log('🔄 Synchronisiere alle Nummernkreise...');
        await Promise.all([
          NumberSequenceService.syncSequenceWithRealData(params.uid, 'Kunde'),
          NumberSequenceService.syncSequenceWithRealData(params.uid, 'Lieferant'),
          NumberSequenceService.syncSequenceWithRealData(params.uid, 'Partner'),
          NumberSequenceService.syncSequenceWithRealData(params.uid, 'Interessenten')
        ]);
        
        // Generiere Nummer für den Standard-Typ 'Kunde'
        await generateCustomerNumber('Kunde');
      } catch (error) {
        console.error('Fehler bei Nummernkreis-Initialisierung:', error);
      }
    };
    
    initializeNumberSequences();
  }, []);

  // Form State
  const [customerType, setCustomerType] = useState<'person' | 'organisation'>('organisation');
  const [formData, setFormData] = useState({
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
    customerNumber: '1003', // Automatisch generiert
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
    tags: [] as string[],
  });

  // Tab Definitions - nur relevante Tabs für neue Kunden
  const tabs = [
    { id: 'overview', label: 'Grunddaten', icon: FileText, count: null },
    { id: 'contacts', label: 'Kontakte', icon: Users, count: contacts.length },
    { id: 'payment', label: 'Zahlungsinformationen', icon: CreditCard, count: null }
  ];



  // Input Handler
  const handleInputChange = (field: string, value: string | number | boolean | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Update isSupplier and customer number when organizationType changes
  React.useEffect(() => {
    const isSupplier = formData.organizationType === 'Lieferant';
    
    // Update isSupplier flag
    setFormData(prev => ({
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

    // Always generate new number when organizationType changes
    if (expectedPrefix && currentPrefix !== expectedPrefix) {
      console.log(`🔄 OrganizationType geändert zu: ${formData.organizationType}, generiere neue Nummer...`);
      generateCustomerNumber(formData.organizationType);
    }
  }, [formData.organizationType]);

  // Legacy function for backward compatibility  
  const generateNextSupplierNumber = () => generateCustomerNumber('Lieferant');

  // VAT Validation
  const handleVATValidation = async () => {
    if (!formData.vatId) return;
    
    setLoading(true);
    try {
      const isValid = await validateVATNumber(formData.vatId);
      if (isValid) {
        handleInputChange('vatValidated', true);
        toast.success('USt-IdNr. ist gültig');
      } else {
        handleInputChange('vatValidated', false);
        toast.error('USt-IdNr. ist ungültig');
      }
    } catch (error) {
      handleInputChange('vatValidated', false);
      toast.error('Fehler bei der VAT-Validierung');
    }
    setLoading(false);
  };

  // Contact Management
  const addContact = () => {
    const newContact: ContactPerson = {
      id: Date.now().toString(),
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      position: '',
      department: '',
      isPrimary: contacts.length === 0
    };
    setContacts([...contacts, newContact]);
  };

  const updateContact = (id: string, field: keyof ContactPerson, value: string | boolean) => {
    setContacts(contacts.map(contact => 
      contact.id === id ? { ...contact, [field]: value } : contact
    ));
  };

  const removeContact = (id: string) => {
    setContacts(contacts.filter(contact => contact.id !== id));
  };

  const setPrimaryContact = (id: string) => {
    setContacts(contacts.map(contact => ({
      ...contact,
      isPrimary: contact.id === id
    })));
  };

  // Form Submission
  const handleSave = async () => {
    // Validierung basierend auf Kundentyp
    if (customerType === 'person') {
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        toast.error('Bitte geben Sie Vor- und Nachname ein');
        return;
      }
    } else {
      if (!formData.companyName.trim()) {
        toast.error('Bitte geben Sie einen Firmennamen ein');
        return;
      }
    }

    // Zusätzliche Pflichtfeld-Validierung
    if (!formData.email.trim()) {
      toast.error('Bitte geben Sie eine E-Mail-Adresse ein');
      return;
    }

    if (!formData.street.trim() || !formData.city.trim() || !formData.postalCode.trim()) {
      toast.error('Bitte geben Sie eine vollständige Adresse ein');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Bitte geben Sie eine gültige E-Mail-Adresse ein');
      return;
    }

    if (!params?.uid || typeof params.uid !== 'string') {
      toast.error('Firma-ID nicht verfügbar');
      return;
    }

    setLoading(true);
    try {
      // ✅ WICHTIG: Generiere die korrekte Nummer basierend auf dem gewählten Typ
      console.log(`🔄 SAVE DEBUG: Typ=${formData.organizationType}, Aktuelle Nummer=${formData.customerNumber}`);
      let finalCustomerNumber = formData.customerNumber;
      
      // Prüfe ob die aktuelle Nummer zum gewählten Typ passt
      const expectedPrefix = {
        'Kunde': 'KD',
        'Lieferant': 'LF',
        'Partner': 'PA',
        'Interessenten': 'IN'
      }[formData.organizationType];
      
      console.log(`🔍 Erwarteter Prefix: ${expectedPrefix}, Aktuelle Nummer startet mit: ${formData.customerNumber.substring(0, 2)}`);
      
      if (expectedPrefix && !formData.customerNumber.startsWith(expectedPrefix)) {
        console.log(`⚠️ MISMATCH! Nummer ${formData.customerNumber} passt nicht zu Typ ${formData.organizationType}`);
        console.log(`🔄 Generiere neue ${formData.organizationType}-Nummer...`);
        
        const result = await NumberSequenceService.getNextNumberForType(params.uid, formData.organizationType);
        finalCustomerNumber = result.formattedNumber;
        console.log(`✅ Neue ${formData.organizationType}-Nummer generiert: ${finalCustomerNumber}`);
        
        // Update auch das Formular für Anzeige
        setFormData(prev => ({
          ...prev,
          customerNumber: finalCustomerNumber
        }));
      } else {
        console.log(`✅ Nummer ${formData.customerNumber} passt zu Typ ${formData.organizationType}`);
      }
      
      console.log(`💾 FINAL: Speichere mit Nummer: ${finalCustomerNumber}`);

      // Generiere Anzeigenamen basierend auf Kundentyp
      const displayName = customerType === 'person' 
        ? `${formData.title ? formData.title + ' ' : ''}${formData.firstName} ${formData.lastName}`.trim()
        : formData.companyName;

      // Erstelle legacy address string für Kompatibilität
      const legacyAddress = `${formData.street}\n${formData.postalCode} ${formData.city}\n${formData.country}`;

      // Erstelle Customer-Objekt für Firebase
      const customerData = {
        // Grunddaten
        customerNumber: finalCustomerNumber, // ✅ Verwende die korrekte Nummer
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
        
        // Person-spezifische Felder (falls customerType === 'person')
        firstName: customerType === 'person' ? formData.firstName : '',
        lastName: customerType === 'person' ? formData.lastName : '',
        title: customerType === 'person' ? formData.title : '',
        position: formData.position, // Position kann auch bei Organisationen relevant sein
        
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
        
        // Zusätzliche Informationen
        notes: formData.notes,
        tags: formData.tags,
        language: formData.language,
        
        // Kontaktpersonen
        contactPersons: contacts.map(contact => ({
          id: contact.id,
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          phone: contact.phone,
          position: contact.position,
          department: contact.department,
          isPrimary: contact.isPrimary
        }))
      };

      // Speichere Kunden in Firebase Subcollection
      const customerId = await CustomerService.addCustomer(params.uid, customerData);
      
      console.log(`✅ Kunde erfolgreich erstellt: ${customerId}`);
      toast.success('Kunde erfolgreich erstellt');
      router.push(`/dashboard/company/${params.uid}/finance/contacts`);
    } catch (error) {
      console.error('❌ Fehler beim Erstellen des Kunden:', error);
      toast.error('Fehler beim Erstellen des Kunden');
    }
    setLoading(false);
  };

  // Cancel Action
  const handleCancel = () => {
    router.push(`/dashboard/company/${uid}/finance/contacts`);
  };

  // Tag Management
  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      handleInputChange('tags', [...formData.tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    handleInputChange('tags', formData.tags.filter(tag => tag !== tagToRemove));
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setShowActionsMenu(false);
      }
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setShowTypeDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Grunddaten */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Grunddaten</h3>
              
              {/* Type Selector */}
              <div className="mb-6">
                <Label className="block text-sm font-medium text-gray-700 mb-3">Kundentyp</Label>
                <div className="flex rounded-lg border border-gray-300 p-1 bg-gray-50">
                  <button
                    type="button"
                    onClick={() => setCustomerType('person')}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                      customerType === 'person'
                        ? 'bg-[#14ad9f] text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-white'
                    }`}
                  >
                    <User className="h-4 w-4 inline mr-2" />
                    Person
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerType('organisation')}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                      customerType === 'organisation'
                        ? 'bg-[#14ad9f] text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-white'
                    }`}
                  >
                    <Users className="h-4 w-4 inline mr-2" />
                    Organisation
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customerType === 'person' ? (
                  <>
                    {/* Person-Geschäftsfelder */}
                    <div>
                      <Label htmlFor="title">Anrede</Label>
                      <select
                        id="title"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                      >
                        <option value="">Bitte wählen</option>
                        <option value="Herr">Herr</option>
                        <option value="Frau">Frau</option>
                        <option value="Dr.">Dr.</option>
                        <option value="Prof.">Prof.</option>
                        <option value="Prof. Dr.">Prof. Dr.</option>
                      </select>
                    </div>

                    {/* Titel (akademisch) */}
                    <div>
                      <Label htmlFor="academicTitle">Titel</Label>
                      <Input
                        id="academicTitle"
                        value={formData.academicTitle || ''}
                        onChange={(e) => handleInputChange('academicTitle', e.target.value)}
                        placeholder="z.B. MBA, M.Sc."
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="firstName">Vorname *</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        placeholder="Max"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="lastName">Nachname *</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        placeholder="Mustermann"
                        className="mt-1"
                      />
                    </div>

                    {/* Namenszusatz */}
                    <div>
                      <Label htmlFor="nameSuffix">Namenszusatz</Label>
                      <Input
                        id="nameSuffix"
                        value={formData.nameSuffix || ''}
                        onChange={(e) => handleInputChange('nameSuffix', e.target.value)}
                        placeholder="z.B. jun., sen."
                        className="mt-1"
                      />
                    </div>

                    {/* Kunden-Nr. / Lieferanten-Nr. mit Nummernkreise-Icon */}
                    <div>
                      <Label htmlFor="customerNumber" className="text-sm font-medium text-gray-700">
                        {{
                          'Kunde': 'Kunden-Nr.',
                          'Lieferant': 'Lieferanten-Nr.',
                          'Partner': 'Partner-Nr.', 
                          'Interessenten': 'Interessenten-Nr.'
                        }[formData.organizationType] || 'Kontakt-Nr.'} <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative mt-1">
                        <Input
                          id="customerNumber"
                          value={formData.customerNumber}
                          onChange={(e) => handleInputChange('customerNumber', e.target.value)}
                          placeholder="1003"
                          required
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              if (!params?.uid || typeof params.uid !== 'string') {
                                toast.error('Firma-ID nicht verfügbar');
                                return;
                              }
                              
                              // Lade die entsprechende Nummernkreis basierend auf Typ
                              const sequenceType = formData.organizationType; // Direkt den Typ verwenden
                              const sequences = await NumberSequenceService.getNumberSequences(params.uid);
                              const sequence = sequences.find(seq => seq.type === sequenceType);
                              
                              if (sequence) {
                                setCurrentNumberSequence(sequence);
                                setShowNumberSequenceModal(true);
                              } else {
                                toast.error(`${sequenceType}-Nummernkreis nicht gefunden`);
                              }
                            } catch (error) {
                              console.error('Fehler beim Laden der Nummernkreise:', error);
                              toast.error('Fehler beim Laden der Nummernkreise');
                            }
                          }}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          title="Nummernkreis-Einstellungen"
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Typ Dropdown */}
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-1 block">Typ</Label>
                      <div className="relative" ref={typeDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                          className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md bg-white text-left focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                        >
                          <span>{formData.organizationType}</span>
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        </button>
                        {showTypeDropdown && (
                          <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-50">
                            <div className="py-1">
                              {['Kunde', 'Lieferant', 'Partner', 'Interessent'].map((type) => (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => {
                                    handleInputChange('organizationType', type);
                                    setShowTypeDropdown(false);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  {type}
                                </button>
                              ))}
                              <hr className="my-1" />
                              <button
                                type="button"
                                onClick={() => {
                                  toast.info('Neuen Kontakt-Typen erstellen - Feature wird implementiert');
                                  setShowTypeDropdown(false);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-[#14ad9f] hover:bg-gray-50 transition-colors"
                              >
                                Neuen Kontakt-Typen erstellen
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="position">Position</Label>
                      <Input
                        id="position"
                        value={formData.position}
                        onChange={(e) => handleInputChange('position', e.target.value)}
                        placeholder="z.B. Geschäftsführer"
                        className="mt-1"
                      />
                    </div>

                    {/* Buchhaltungskonten */}
                    <div className="md:col-span-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Debitoren-Nr. */}
                        <div className="relative">
                          <Label htmlFor="debitorNumber" className="text-sm font-medium text-gray-700">
                            Debitoren-Nr.
                            {formData.organizationType === 'Lieferant' && (
                              <span className="text-xs text-gray-400 ml-1">(optional)</span>
                            )}
                          </Label>
                          <div className="relative">
                            <Input
                              id="debitorNumber"
                              type="number"
                              min="0"
                              step="1"
                              value={formData.debitorNumber}
                              onChange={(e) => handleInputChange('debitorNumber', e.target.value)}
                              className="mt-1 pr-8"
                              disabled={formData.organizationType === 'Lieferant'}
                            />
                            <button
                              type="button"
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 mt-0.5"
                              onMouseEnter={() => setTooltips(prev => ({ ...prev, debitorInfo: true }))}
                              onMouseLeave={() => setTooltips(prev => ({ ...prev, debitorInfo: false }))}
                            >
                              <InfoIcon className="h-4 w-4" />
                            </button>
                            {tooltips.debitorInfo && (
                              <div className="absolute right-0 top-full mt-1 bg-gray-800 text-white text-xs rounded px-2 py-1 z-10 w-48 shadow-lg">
                                Für ausgehende Rechnungen und Kundenforderungen. Wird bei Kunden und Interessenten verwendet.
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Kreditoren-Nr. */}
                        <div className="relative">
                          <Label htmlFor="creditorNumber" className="text-sm font-medium text-gray-700">
                            Kreditoren-Nr.
                            {formData.organizationType !== 'Lieferant' && (
                              <span className="text-xs text-gray-400 ml-1">(optional)</span>
                            )}
                          </Label>
                          <div className="relative">
                            <Input
                              id="creditorNumber"
                              type="number"
                              min="0"
                              step="1"
                              value={formData.creditorNumber}
                              onChange={(e) => handleInputChange('creditorNumber', e.target.value)}
                              className="mt-1 pr-8"
                              disabled={formData.organizationType !== 'Lieferant' && formData.organizationType !== 'Partner'}
                            />
                            <button
                              type="button"
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 mt-0.5"
                              onMouseEnter={() => setTooltips(prev => ({ ...prev, creditorInfo: true }))}
                              onMouseLeave={() => setTooltips(prev => ({ ...prev, creditorInfo: false }))}
                            >
                              <InfoIcon className="h-4 w-4" />
                            </button>
                            {tooltips.creditorInfo && (
                              <div className="absolute right-0 top-full mt-1 bg-gray-800 text-white text-xs rounded px-2 py-1 z-10 w-48 shadow-lg">
                                Für eingehende Rechnungen und Verbindlichkeiten. Wird bei Lieferanten verwendet.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Organisation-spezifische Felder */}
                    <div className="md:col-span-2">
                      <Label htmlFor="companyName">Firmenname / Organisation *</Label>
                      <Input
                        id="companyName"
                        value={formData.companyName}
                        onChange={(e) => handleInputChange('companyName', e.target.value)}
                        placeholder="z.B. Mustermann GmbH"
                        className="mt-1"
                      />
                    </div>

                    {/* Kunden-Nr. / Lieferanten-Nr. mit Nummernkreise-Icon */}
                    <div>
                      <Label htmlFor="customerNumber" className="text-sm font-medium text-gray-700">
                        {{
                          'Kunde': 'Kunden-Nr.',
                          'Lieferant': 'Lieferanten-Nr.',
                          'Partner': 'Partner-Nr.', 
                          'Interessenten': 'Interessenten-Nr.'
                        }[formData.organizationType] || 'Kontakt-Nr.'} <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative mt-1">
                        <Input
                          id="customerNumber"
                          value={formData.customerNumber}
                          onChange={(e) => handleInputChange('customerNumber', e.target.value)}
                          placeholder="1003"
                          required
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              if (!params?.uid || typeof params.uid !== 'string') {
                                toast.error('Firma-ID nicht verfügbar');
                                return;
                              }
                              
                              // Lade die entsprechende Nummernkreis basierend auf Typ
                              const sequenceType = formData.organizationType; // Direkt den Typ verwenden
                              const sequences = await NumberSequenceService.getNumberSequences(params.uid);
                              const sequence = sequences.find(seq => seq.type === sequenceType);
                              
                              if (sequence) {
                                setCurrentNumberSequence(sequence);
                                setShowNumberSequenceModal(true);
                              } else {
                                toast.error(`${sequenceType}-Nummernkreis nicht gefunden`);
                              }
                            } catch (error) {
                              console.error('Fehler beim Laden der Nummernkreise:', error);
                              toast.error('Fehler beim Laden der Nummernkreise');
                            }
                          }}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          title="Nummernkreis-Einstellungen"
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Typ Dropdown */}
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-1 block">Typ</Label>
                      <div className="relative" ref={typeDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                          className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md bg-white text-left focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                        >
                          <span>{formData.organizationType}</span>
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        </button>
                        {showTypeDropdown && (
                          <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-50">
                            <div className="py-1">
                              {['Kunde', 'Lieferant', 'Partner', 'Interessent'].map((type) => (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => {
                                    handleInputChange('organizationType', type);
                                    setShowTypeDropdown(false);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  {type}
                                </button>
                              ))}
                              <hr className="my-1" />
                              <button
                                type="button"
                                onClick={() => {
                                  toast.info('Neuen Kontakt-Typen erstellen - Feature wird implementiert');
                                  setShowTypeDropdown(false);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-[#14ad9f] hover:bg-gray-50 transition-colors"
                              >
                                Neuen Kontakt-Typen erstellen
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>



                    {/* Buchhaltungskonten */}
                    <div className="md:col-span-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Debitoren-Nr. */}
                        <div className="relative">
                          <Label htmlFor="debitorNumber" className="text-sm font-medium text-gray-700">
                            Debitoren-Nr.
                            {formData.organizationType === 'Lieferant' && (
                              <span className="text-xs text-gray-400 ml-1">(optional)</span>
                            )}
                          </Label>
                          <div className="relative">
                            <Input
                              id="debitorNumber"
                              type="number"
                              min="0"
                              step="1"
                              value={formData.debitorNumber}
                              onChange={(e) => handleInputChange('debitorNumber', e.target.value)}
                              className="mt-1 pr-8"
                              disabled={formData.organizationType === 'Lieferant'}
                            />
                            <button
                              type="button"
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 mt-0.5"
                              onMouseEnter={() => setTooltips(prev => ({ ...prev, debitorInfo: true }))}
                              onMouseLeave={() => setTooltips(prev => ({ ...prev, debitorInfo: false }))}
                            >
                              <InfoIcon className="h-4 w-4" />
                            </button>
                            {tooltips.debitorInfo && (
                              <div className="absolute right-0 top-full mt-1 bg-gray-800 text-white text-xs rounded px-2 py-1 z-10 w-48 shadow-lg">
                                Für ausgehende Rechnungen und Kundenforderungen. Wird bei Kunden und Interessenten verwendet.
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Kreditoren-Nr. */}
                        <div className="relative">
                          <Label htmlFor="creditorNumber" className="text-sm font-medium text-gray-700">
                            Kreditoren-Nr.
                            {formData.organizationType !== 'Lieferant' && (
                              <span className="text-xs text-gray-400 ml-1">(optional)</span>
                            )}
                          </Label>
                          <div className="relative">
                            <Input
                              id="creditorNumber"
                              type="number"
                              min="0"
                              step="1"
                              value={formData.creditorNumber}
                              onChange={(e) => handleInputChange('creditorNumber', e.target.value)}
                              className="mt-1 pr-8"
                              disabled={formData.organizationType !== 'Lieferant' && formData.organizationType !== 'Partner'}
                            />
                            <button
                              type="button"
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 mt-0.5"
                              onMouseEnter={() => setTooltips(prev => ({ ...prev, creditorInfo: true }))}
                              onMouseLeave={() => setTooltips(prev => ({ ...prev, creditorInfo: false }))}
                            >
                              <InfoIcon className="h-4 w-4" />
                            </button>
                            {tooltips.creditorInfo && (
                              <div className="absolute right-0 top-full mt-1 bg-gray-800 text-white text-xs rounded px-2 py-1 z-10 w-48 shadow-lg">
                                Für eingehende Rechnungen und Verbindlichkeiten. Wird bei Lieferanten verwendet.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                
                {/* Gemeinsame Felder */}
                <div>
                  <Label htmlFor="email">E-Mail-Adresse</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder={customerType === 'person' ? 'max.mustermann@email.de' : 'kontakt@kunde.de'}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+49 123 456789"
                    className="mt-1"
                  />
                </div>
                {customerType === 'organisation' && (
                  <div className="md:col-span-2">
                    <Label htmlFor="website">Webseite</Label>
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      placeholder="https://www.kunde.de"
                      className="mt-1"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Adresse */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Adresse</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="street">Straße und Hausnummer</Label>
                  <Input
                    id="street"
                    value={formData.street}
                    onChange={(e) => handleInputChange('street', e.target.value)}
                    placeholder="Musterstraße 123"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="postalCode">PLZ</Label>
                  <Input
                    id="postalCode"
                    value={formData.postalCode}
                    onChange={(e) => handleInputChange('postalCode', e.target.value)}
                    placeholder="12345"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="city">Ort</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="Musterstadt"
                    className="mt-1"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="country">Land</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Steuerliche Daten */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Steuerliche Daten</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="taxNumber">Steuernummer</Label>
                  <Input
                    id="taxNumber"
                    value={formData.taxNumber}
                    onChange={(e) => handleInputChange('taxNumber', e.target.value)}
                    placeholder="12/345/67890"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="vatId">USt-IdNr.</Label>
                  <div className="flex mt-1">
                    <Input
                      id="vatId"
                      value={formData.vatId}
                      onChange={(e) => handleInputChange('vatId', e.target.value)}
                      placeholder="DE123456789"
                      className="rounded-r-none"
                    />
                    <Button
                      type="button"
                      onClick={handleVATValidation}
                      disabled={!formData.vatId || loading}
                      className="rounded-l-none bg-[#14ad9f] hover:bg-[#129488] text-white"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Format: {getVATFormat(formData.country)}
                  </p>
                </div>
              </div>
            </div>



            {/* Zusätzliche Informationen */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Zusätzliche Informationen</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="companySize">Unternehmensgröße</Label>
                  <select
                    id="companySize"
                    value={formData.companySize}
                    onChange={(e) => handleInputChange('companySize', e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                  >
                    <option value="">Nicht angegeben</option>
                    <option value="Kleinstunternehmen">Kleinstunternehmen (1-9 MA)</option>
                    <option value="Kleinunternehmen">Kleinunternehmen (10-49 MA)</option>
                    <option value="Mittelunternehmen">Mittelunternehmen (50-249 MA)</option>
                    <option value="Großunternehmen">Großunternehmen (250+ MA)</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="industry">Branche</Label>
                  <Input
                    id="industry"
                    value={formData.industry}
                    onChange={(e) => handleInputChange('industry', e.target.value)}
                    placeholder="z.B. Maschinenbau"
                    className="mt-1"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="notes">Notizen</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Interne Notizen zum Kunden..."
                    rows={3}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Tags System */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <Label className="text-sm font-medium text-gray-700 mb-3 block">Tags</Label>
                
                {/* Tag Input */}
                <div className="flex gap-2 mb-4">
                  <div className="flex-1">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={handleTagKeyPress}
                      placeholder="Tags hinzufügen..."
                      className="w-full"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={addTag}
                    disabled={!newTag.trim()}
                    className="bg-[#14ad9f] hover:bg-[#129488] text-white px-4"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Tags Display */}
                {formData.tags.length === 0 ? (
                  <div className="text-center py-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
                    <Tag className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Keine Tags hinzugefügt</p>
                    <p className="text-xs text-gray-400">Fügen Sie Tags hinzu, um Kunden zu kategorisieren</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-[#14ad9f] text-white text-sm rounded-full"
                      >
                        <Tag className="h-3 w-3" />
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:bg-[#129488] rounded-full p-0.5 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-2">
                  Tags helfen dabei, Kunden zu kategorisieren und zu filtern. Beispiele: VIP-Kunde, Großkunde, Neukunde
                </p>
              </div>
            </div>
          </div>
        );

      case 'contacts':
        return (
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Kontaktpersonen</h3>
                <Button
                  onClick={addContact}
                  className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Person hinzufügen
                </Button>
              </div>

              {contacts.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Keine Kontaktpersonen</h3>
                  <p className="text-gray-500">Fügen Sie eine Kontaktperson hinzu, um zu beginnen.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {contacts.map((contact) => (
                    <div key={contact.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <User className="h-5 w-5 text-gray-400" />
                          <span className="font-medium text-gray-900">
                            Kontaktperson {contacts.indexOf(contact) + 1}
                          </span>
                          {contact.isPrimary && (
                            <span className="bg-[#14ad9f] text-white px-2 py-1 rounded-full text-xs font-medium">
                              Hauptkontakt
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {!contact.isPrimary && (
                            <Button
                              onClick={() => setPrimaryContact(contact.id)}
                              variant="outline"
                              size="sm"
                            >
                              <Star className="h-4 w-4 mr-1" />
                              Als Hauptkontakt
                            </Button>
                          )}
                          <Button
                            onClick={() => removeContact(contact.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Vorname</Label>
                          <Input
                            value={contact.firstName}
                            onChange={(e) => updateContact(contact.id, 'firstName', e.target.value)}
                            placeholder="Max"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Nachname</Label>
                          <Input
                            value={contact.lastName}
                            onChange={(e) => updateContact(contact.id, 'lastName', e.target.value)}
                            placeholder="Mustermann"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>E-Mail</Label>
                          <Input
                            type="email"
                            value={contact.email}
                            onChange={(e) => updateContact(contact.id, 'email', e.target.value)}
                            placeholder="max.mustermann@kunde.de"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Telefon</Label>
                          <Input
                            value={contact.phone || ''}
                            onChange={(e) => updateContact(contact.id, 'phone', e.target.value)}
                            placeholder="+49 123 456789"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Position</Label>
                          <Input
                            value={contact.position || ''}
                            onChange={(e) => updateContact(contact.id, 'position', e.target.value)}
                            placeholder="Geschäftsführer"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Abteilung</Label>
                          <Input
                            value={contact.department || ''}
                            onChange={(e) => updateContact(contact.id, 'department', e.target.value)}
                            placeholder="Einkauf"
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'payment':
        return (
          <div className="space-y-6">
            {/* Geschäftsbedingungen */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Geschäftsbedingungen</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="paymentTerms">Zahlungsbedingungen</Label>
                  <select
                    id="paymentTerms"
                    value={formData.paymentTerms}
                    onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                  >
                    <option value="Sofort">Sofort</option>
                    <option value="7 Tage netto">7 Tage netto</option>
                    <option value="14 Tage netto">14 Tage netto</option>
                    <option value="30 Tage netto">30 Tage netto</option>
                    <option value="60 Tage netto">60 Tage netto</option>
                    <option value="90 Tage netto">90 Tage netto</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="discount">Standardrabatt (%)</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.discount}
                    onChange={(e) => handleInputChange('discount', parseFloat(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="creditLimit">Kreditlimit (€)</Label>
                  <Input
                    id="creditLimit"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.creditLimit}
                    onChange={(e) => handleInputChange('creditLimit', parseFloat(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Währung</Label>
                  <select
                    id="currency"
                    value={formData.currency}
                    onChange={(e) => handleInputChange('currency', e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                  >
                    <option value="EUR">EUR - Euro</option>
                    <option value="USD">USD - US-Dollar</option>
                    <option value="GBP">GBP - Britisches Pfund</option>
                    <option value="CHF">CHF - Schweizer Franken</option>
                    <option value="AED">AED - VAE-Dirham</option>
                    <option value="AFN">AFN - Afghani</option>
                    <option value="ALL">ALL - Lek</option>
                    <option value="AMD">AMD - Armenischer Dram</option>
                    <option value="ANG">ANG - Niederländische Antillen-Gulden</option>
                    <option value="AOA">AOA - Kwanza</option>
                    <option value="ARS">ARS - Argentinischer Peso</option>
                    <option value="AUD">AUD - Australischer Dollar</option>
                    <option value="AWG">AWG - Aruba-Florin</option>
                    <option value="AZN">AZN - Aserbaidschan-Manat</option>
                    <option value="BAM">BAM - Konvertible Mark</option>
                    <option value="BBD">BBD - Barbados-Dollar</option>
                    <option value="BDT">BDT - Taka</option>
                    <option value="BGN">BGN - Lew</option>
                    <option value="BHD">BHD - Bahrain-Dinar</option>
                    <option value="BIF">BIF - Burundi-Franc</option>
                    <option value="BMD">BMD - Bermuda-Dollar</option>
                    <option value="BND">BND - Brunei-Dollar</option>
                    <option value="BOB">BOB - Boliviano</option>
                    <option value="BRL">BRL - Real</option>
                    <option value="BSD">BSD - Bahama-Dollar</option>
                    <option value="BTN">BTN - Ngultrum</option>
                    <option value="BWP">BWP - Pula</option>
                    <option value="BYN">BYN - Belarussischer Rubel</option>
                    <option value="BZD">BZD - Belize-Dollar</option>
                    <option value="CAD">CAD - Kanadischer Dollar</option>
                    <option value="CDF">CDF - Kongo-Franc</option>
                    <option value="CLP">CLP - Chilenischer Peso</option>
                    <option value="CNY">CNY - Yuan Renminbi</option>
                    <option value="COP">COP - Kolumbianischer Peso</option>
                    <option value="CRC">CRC - Colón</option>
                    <option value="CUP">CUP - Kubanischer Peso</option>
                    <option value="CVE">CVE - Kap-Verde-Escudo</option>
                    <option value="CZK">CZK - Tschechische Krone</option>
                    <option value="DJF">DJF - Dschibuti-Franc</option>
                    <option value="DKK">DKK - Dänische Krone</option>
                    <option value="DOP">DOP - Dominikanischer Peso</option>
                    <option value="DZD">DZD - Algerischer Dinar</option>
                    <option value="EGP">EGP - Ägyptisches Pfund</option>
                    <option value="ERN">ERN - Nakfa</option>
                    <option value="ETB">ETB - Birr</option>
                    <option value="FJD">FJD - Fidschi-Dollar</option>
                    <option value="FKP">FKP - Falkland-Pfund</option>
                    <option value="GEL">GEL - Lari</option>
                    <option value="GGP">GGP - Guernsey-Pfund</option>
                    <option value="GHS">GHS - Ghana Cedi</option>
                    <option value="GIP">GIP - Gibraltar-Pfund</option>
                    <option value="GMD">GMD - Dalasi</option>
                    <option value="GNF">GNF - Guinea-Franc</option>
                    <option value="GTQ">GTQ - Quetzal</option>
                    <option value="GYD">GYD - Guyana-Dollar</option>
                    <option value="HKD">HKD - Hongkong-Dollar</option>
                    <option value="HNL">HNL - Lempira</option>
                    <option value="HRK">HRK - Kuna</option>
                    <option value="HTG">HTG - Gourde</option>
                    <option value="HUF">HUF - Forint</option>
                    <option value="IDR">IDR - Rupiah</option>
                    <option value="ILS">ILS - Neuer Schekel</option>
                    <option value="IMP">IMP - Isle of Man Pfund</option>
                    <option value="INR">INR - Indische Rupie</option>
                    <option value="IQD">IQD - Irakischer Dinar</option>
                    <option value="IRR">IRR - Iranischer Rial</option>
                    <option value="ISK">ISK - Isländische Krone</option>
                    <option value="JEP">JEP - Jersey-Pfund</option>
                    <option value="JMD">JMD - Jamaika-Dollar</option>
                    <option value="JOD">JOD - Jordanischer Dinar</option>
                    <option value="JPY">JPY - Yen</option>
                    <option value="KES">KES - Kenia-Schilling</option>
                    <option value="KGS">KGS - Som</option>
                    <option value="KHR">KHR - Riel</option>
                    <option value="KMF">KMF - Komoren-Franc</option>
                    <option value="KPW">KPW - Nordkoreanischer Won</option>
                    <option value="KRW">KRW - Won</option>
                    <option value="KWD">KWD - Kuwait-Dinar</option>
                    <option value="KYD">KYD - Kaiman-Dollar</option>
                    <option value="KZT">KZT - Tenge</option>
                    <option value="LAK">LAK - Kip</option>
                    <option value="LBP">LBP - Libanesisches Pfund</option>
                    <option value="LKR">LKR - Sri-Lanka-Rupie</option>
                    <option value="LRD">LRD - Liberianischer Dollar</option>
                    <option value="LSL">LSL - Loti</option>
                    <option value="LYD">LYD - Libyscher Dinar</option>
                    <option value="MAD">MAD - Marokkanischer Dirham</option>
                    <option value="MDL">MDL - Moldau-Leu</option>
                    <option value="MGA">MGA - Ariary</option>
                    <option value="MKD">MKD - Denar</option>
                    <option value="MMK">MMK - Kyat</option>
                    <option value="MNT">MNT - Tugrik</option>
                    <option value="MOP">MOP - Pataca</option>
                    <option value="MRU">MRU - Ouguiya</option>
                    <option value="MUR">MUR - Mauritius-Rupie</option>
                    <option value="MVR">MVR - Rufiyaa</option>
                    <option value="MWK">MWK - Malawi-Kwacha</option>
                    <option value="MXN">MXN - Mexikanischer Peso</option>
                    <option value="MYR">MYR - Ringgit</option>
                    <option value="MZN">MZN - Metical</option>
                    <option value="NAD">NAD - Namibia-Dollar</option>
                    <option value="NGN">NGN - Naira</option>
                    <option value="NIO">NIO - Córdoba Oro</option>
                    <option value="NOK">NOK - Norwegische Krone</option>
                    <option value="NPR">NPR - Nepalesische Rupie</option>
                    <option value="NZD">NZD - Neuseeland-Dollar</option>
                    <option value="OMR">OMR - Rial Omani</option>
                    <option value="PAB">PAB - Balboa</option>
                    <option value="PEN">PEN - Sol</option>
                    <option value="PGK">PGK - Kina</option>
                    <option value="PHP">PHP - Philippinischer Peso</option>
                    <option value="PKR">PKR - Pakistanische Rupie</option>
                    <option value="PLN">PLN - Zloty</option>
                    <option value="PYG">PYG - Guarani</option>
                    <option value="QAR">QAR - Katar-Riyal</option>
                    <option value="RON">RON - Leu</option>
                    <option value="RSD">RSD - Serbischer Dinar</option>
                    <option value="RUB">RUB - Russischer Rubel</option>
                    <option value="RWF">RWF - Ruanda-Franc</option>
                    <option value="SAR">SAR - Saudi-Riyal</option>
                    <option value="SBD">SBD - Salomonen-Dollar</option>
                    <option value="SCR">SCR - Seychellen-Rupie</option>
                    <option value="SDG">SDG - Sudanesisches Pfund</option>
                    <option value="SEK">SEK - Schwedische Krone</option>
                    <option value="SGD">SGD - Singapur-Dollar</option>
                    <option value="SHP">SHP - St. Helena-Pfund</option>
                    <option value="SLE">SLE - Leone</option>
                    <option value="SLL">SLL - Leone (alt)</option>
                    <option value="SOS">SOS - Somalia-Schilling</option>
                    <option value="SRD">SRD - Suriname-Dollar</option>
                    <option value="SSP">SSP - Südsudanesisches Pfund</option>
                    <option value="STN">STN - Dobra</option>
                    <option value="SYP">SYP - Syrisches Pfund</option>
                    <option value="SZL">SZL - Lilangeni</option>
                    <option value="THB">THB - Baht</option>
                    <option value="TJS">TJS - Somoni</option>
                    <option value="TMT">TMT - Turkmenistan-Manat</option>
                    <option value="TND">TND - Tunesischer Dinar</option>
                    <option value="TOP">TOP - Pa'anga</option>
                    <option value="TRY">TRY - Türkische Lira</option>
                    <option value="TTD">TTD - Trinidad-und-Tobago-Dollar</option>
                    <option value="TVD">TVD - Tuvalu-Dollar</option>
                    <option value="TWD">TWD - Taiwan-Dollar</option>
                    <option value="TZS">TZS - Tansania-Schilling</option>
                    <option value="UAH">UAH - Hrywnja</option>
                    <option value="UGX">UGX - Uganda-Schilling</option>
                    <option value="UYU">UYU - Uruguayischer Peso</option>
                    <option value="UZS">UZS - Sum</option>
                    <option value="VED">VED - Bolívar Soberano</option>
                    <option value="VES">VES - Bolívar Soberano</option>
                    <option value="VND">VND - Dong</option>
                    <option value="VUV">VUV - Vatu</option>
                    <option value="WST">WST - Tala</option>
                    <option value="XAF">XAF - CFA-Franc BEAC</option>
                    <option value="XCD">XCD - Ostkaribischer Dollar</option>
                    <option value="XDR">XDR - Sonderziehungsrecht</option>
                    <option value="XOF">XOF - CFA-Franc BCEAO</option>
                    <option value="XPF">XPF - CFP-Franc</option>
                    <option value="YER">YER - Jemen-Rial</option>
                    <option value="ZAR">ZAR - Rand</option>
                    <option value="ZMW">ZMW - Sambia-Kwacha</option>
                    <option value="ZWL">ZWL - Simbabwe-Dollar</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bankdaten */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Bankdaten</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bankName">Bankname</Label>
                  <Input
                    id="bankName"
                    value={formData.bankName}
                    onChange={(e) => handleInputChange('bankName', e.target.value)}
                    placeholder="z.B. Deutsche Bank"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="accountHolder">Kontoinhaber</Label>
                  <Input
                    id="accountHolder"
                    value={formData.accountHolder}
                    onChange={(e) => handleInputChange('accountHolder', e.target.value)}
                    placeholder="Max Mustermann"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="iban">IBAN</Label>
                  <Input
                    id="iban"
                    value={formData.iban}
                    onChange={(e) => handleInputChange('iban', e.target.value)}
                    placeholder="DE89 3704 0044 0532 0130 00"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="bic">BIC/SWIFT</Label>
                  <Input
                    id="bic"
                    value={formData.bic}
                    onChange={(e) => handleInputChange('bic', e.target.value)}
                    placeholder="COBADEFFXXX"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Zahlungsbedingungen */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Zahlungsbedingungen</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="preferredPaymentMethod">Bevorzugte Zahlungsart</Label>
                  <select
                    id="preferredPaymentMethod"
                    value={formData.preferredPaymentMethod}
                    onChange={(e) => handleInputChange('preferredPaymentMethod', e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                  >
                    <option value="Überweisung">Überweisung</option>
                    <option value="Lastschrift">Lastschrift</option>
                    <option value="Kreditkarte">Kreditkarte</option>
                    <option value="PayPal">PayPal</option>
                    <option value="Bar">Barzahlung</option>
                    <option value="Scheck">Scheck</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="defaultInvoiceDueDate">Standardfälligkeit (Tage)</Label>
                  <Input
                    id="defaultInvoiceDueDate"
                    type="number"
                    min="1"
                    max="365"
                    value={formData.defaultInvoiceDueDate}
                    onChange={(e) => handleInputChange('defaultInvoiceDueDate', parseInt(e.target.value) || 30)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="earlyPaymentDiscount">Skonto (%)</Label>
                  <Input
                    id="earlyPaymentDiscount"
                    type="number"
                    min="0"
                    max="50"
                    step="0.01"
                    value={formData.earlyPaymentDiscount}
                    onChange={(e) => handleInputChange('earlyPaymentDiscount', parseFloat(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="earlyPaymentDays">Skonto-Tage</Label>
                  <Input
                    id="earlyPaymentDays"
                    type="number"
                    min="1"
                    max="90"
                    value={formData.earlyPaymentDays}
                    onChange={(e) => handleInputChange('earlyPaymentDays', parseInt(e.target.value) || 14)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Mahnwesen */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Mahnwesen</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="reminderFee">Mahngebühr (€)</Label>
                  <Input
                    id="reminderFee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.reminderFee}
                    onChange={(e) => handleInputChange('reminderFee', parseFloat(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="lateFee">Verzugszinsen (% p.a.)</Label>
                  <Input
                    id="lateFee"
                    type="number"
                    min="0"
                    max="20"
                    step="0.01"
                    value={formData.lateFee}
                    onChange={(e) => handleInputChange('lateFee', parseFloat(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div className="md:col-span-2">
                  <div className="flex items-center gap-3">
                    <input
                      id="automaticReminders"
                      type="checkbox"
                      checked={formData.automaticReminders}
                      onChange={(e) => handleInputChange('automaticReminders', e.target.checked)}
                      className="h-4 w-4 text-[#14ad9f] focus:ring-[#14ad9f] border-gray-300 rounded"
                    />
                    <Label htmlFor="automaticReminders" className="text-sm font-medium text-gray-700">
                      Automatische Zahlungserinnerungen aktivieren
                    </Label>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Wenn aktiviert, werden automatisch Zahlungserinnerungen versendet.
                  </p>
                </div>
              </div>
            </div>

            {/* E-Rechnung */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">E-Rechnung</h3>
              
              {/* E-Rechnung Toggle */}
              <div className="mb-6">
                <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3">
                      {/* Toggle Switch */}
                      <div className="relative">
                        <input
                          id="eInvoiceEnabled"
                          type="checkbox"
                          checked={formData.eInvoiceEnabled}
                          onChange={(e) => handleInputChange('eInvoiceEnabled', e.target.checked)}
                          className="sr-only"
                        />
                        <label
                          htmlFor="eInvoiceEnabled"
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:ring-offset-2 cursor-pointer ${
                            formData.eInvoiceEnabled ? 'bg-[#14ad9f]' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              formData.eInvoiceEnabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </label>
                      </div>
                      <label htmlFor="eInvoiceEnabled" className="text-sm font-medium text-blue-900 cursor-pointer">
                        E-Rechnung Standard
                      </label>
                    </div>
                    <div className="relative">
                      <HelpCircle 
                        className="h-4 w-4 text-blue-600 cursor-help" 
                        onMouseEnter={() => setShowEInvoiceTooltip(true)}
                        onMouseLeave={() => setShowEInvoiceTooltip(false)}
                      />
                      {showEInvoiceTooltip && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-50">
                          E-Rechnungen sind ab 2025 für B2B-Geschäfte in Deutschland verpflichtend (§14 UStG)
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-blue-700 font-medium">
                    Ab 2025 verpflichtend
                  </div>
                </div>
              </div>

              {formData.eInvoiceEnabled && (
                <div className="space-y-4">
                  {/* Referenz-Feld (umschaltbar) */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label 
                        htmlFor={referenceFieldType === 'customerReference' ? 'customerReference' : 'leitwegId'} 
                        className="text-sm font-medium text-gray-700"
                      >
                        {referenceFieldType === 'customerReference' ? 'Kundenreferenz' : 'Leitweg-ID'}
                        {referenceFieldType === 'customerReference' && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      <button
                        type="button"
                        onClick={() => {
                          setReferenceFieldType(referenceFieldType === 'customerReference' ? 'leitwegId' : 'customerReference');
                        }}
                        className="text-sm text-[#14ad9f] hover:text-[#129488] font-medium"
                      >
                        {referenceFieldType === 'customerReference' ? 'Leitweg-ID' : 'Kundenreferenz'}
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id={referenceFieldType === 'customerReference' ? 'customerReference' : 'leitwegId'}
                        value={referenceFieldType === 'customerReference' ? formData.customerReference : formData.leitwegId}
                        onChange={(e) => handleInputChange(
                          referenceFieldType === 'customerReference' ? 'customerReference' : 'leitwegId', 
                          e.target.value
                        )}
                        placeholder={
                          referenceFieldType === 'customerReference' 
                            ? "z.B. Auftragsnummer, ..." 
                            : "z.B. 991-12345-12"
                        }
                        className="pr-10"
                        required={referenceFieldType === 'customerReference'}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <div className="relative">
                          <Info 
                            className="h-4 w-4 text-gray-400 cursor-help" 
                            onMouseEnter={() => setShowReferenceTooltip(true)}
                            onMouseLeave={() => setShowReferenceTooltip(false)}
                          />
                          {showReferenceTooltip && (
                            <div className="absolute right-0 bottom-full mb-2 w-80 p-3 bg-gray-800 text-white text-xs rounded shadow-lg z-50">
                              {referenceFieldType === 'customerReference' ? (
                                <>
                                  <strong>Kundenreferenz:</strong><br/>
                                  Sollte dir keine Referenz vorliegen, gib einfach 00 an. Ist der Empfänger eine Behörde, nutze die Leitweg-ID.
                                </>
                              ) : (
                                <>
                                  <strong>Leitweg-ID:</strong><br/>
                                  • Nur für öffentliche Auftraggeber erforderlich<br/>
                                  • Format: 991-XXXXX-XX<br/>
                                  • Eindeutige Adressierung in der Verwaltung<br/>
                                  • Wird vom Auftraggeber bereitgestellt
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* E-Rechnung Formate */}
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Unterstützte E-Rechnung Formate</h4>
                    <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span>XRechnung 3.0</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span>ZUGFeRD 2.3</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span>Factur-X 1.0.7</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span>PEPPOL BIS 3.0</span>
                      </div>
                    </div>
                  </div>

                  {/* Compliance Hinweis */}
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
                    <div className="flex items-start gap-3">
                      <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <h4 className="font-medium text-amber-900 mb-1">Gesetzliche Vorgaben (§14 UStG)</h4>
                        <p className="text-amber-800">
                          Ab dem 1. Januar 2025 sind E-Rechnungen für B2B-Transaktionen in Deutschland verpflichtend. 
                          Übergangsfristen gelten bis 2027 für kleinere Unternehmen.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Zusätzliche Informationen */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Zusätzliche Zahlungshinweise</h3>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Skonto-Regelung</h4>
                  <p className="text-sm text-blue-800">
                    {formData.earlyPaymentDiscount > 0 
                      ? `Bei Zahlung innerhalb von ${formData.earlyPaymentDays} Tagen gewähren wir ${formData.earlyPaymentDiscount}% Skonto.`
                      : 'Kein Skonto konfiguriert.'
                    }
                  </p>
                </div>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Zahlungsübersicht</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Bevorzugte Zahlungsart: {formData.preferredPaymentMethod}</li>
                    <li>• Fälligkeit: {formData.defaultInvoiceDueDate} Tage nach Rechnungsdatum</li>
                    <li>• Mahngebühr: {formData.reminderFee.toFixed(2)} €</li>
                    {formData.lateFee > 0 && <li>• Verzugszinsen: {formData.lateFee}% p.a.</li>}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Bitte wählen Sie einen Tab</h3>
              <p className="text-gray-500">Verwenden Sie die Navigation oben, um zwischen den Bereichen zu wechseln.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Back Button & Title */}
            <div className="flex items-center gap-4">
              <Button
                onClick={handleCancel}
                variant="ghost"
                className="p-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Neuen Kunden erstellen</h1>
                <p className="text-sm text-gray-500">Erstellen Sie einen neuen Kunden mit allen erforderlichen Informationen</p>
              </div>
            </div>

            {/* Action Menu */}
            <div className="relative" ref={actionsMenuRef}>
              <Button
                onClick={() => setShowActionsMenu(!showActionsMenu)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <MoreHorizontal className="h-4 w-4" />
                Aktionen
              </Button>
              {/* Dropdown Menu */}
              {showActionsMenu && (
                <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        handleSave();
                        setShowActionsMenu(false);
                      }}
                      disabled={loading}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-3 animate-spin" />
                          Speichere...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-3" />
                          Speichern
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        handleCancel();
                        setShowActionsMenu(false);
                      }}
                      disabled={loading}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <X className="h-4 w-4 mr-3" />
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto py-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium whitespace-nowrap rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-[#14ad9f] text-white'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  {tab.count !== null && tab.count > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      activeTab === tab.id 
                        ? 'bg-white text-[#14ad9f]' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderTabContent()}
      </div>

      {/* NumberSequence Modal */}
      <NumberSequenceModal
        isOpen={showNumberSequenceModal}
        onClose={() => {
          setShowNumberSequenceModal(false);
          setCurrentNumberSequence(null);
        }}
        onSave={async (updates: Partial<NumberSequence> & { id: string }) => {
          try {
            // Aktualisiere die Nummernkreis-Einstellungen
            await NumberSequenceService.updateNumberSequence(
              params?.uid as string,
              updates.id,
              {
                format: updates.format,
                nextNumber: updates.nextNumber
              }
            );

            // Aktualisiere die Kundennummer-Vorschau
            const newCustomerNumber = NumberSequenceService.formatNumber(
              updates.nextNumber!,
              updates.format!
            );

            setFormData(prev => ({
              ...prev,
              customerNumber: newCustomerNumber
            }));

            toast.success('Nummernkreis-Einstellungen aktualisiert');
          } catch (error) {
            console.error('Fehler beim Aktualisieren der Nummernkreise:', error);
            toast.error('Fehler beim Aktualisieren der Einstellungen');
          }
        }}
        sequence={currentNumberSequence}
      />
    </div>
  );
}