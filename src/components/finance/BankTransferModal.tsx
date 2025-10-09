'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Info, Plus, Search } from 'lucide-react';
import { BankAccount } from '@/types/banking';
import NewCustomerModal from './NewCustomerModal';

interface Contact {
  id: string;
  name: string;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  iban?: string;
  bic?: string;
  email?: string;
  phone?: string;
  bankName?: string;
}

interface BankTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: BankAccount[];
  onSubmit: (transferData: BankTransferData) => Promise<void>;
  companyId: string;
  onCreateContact?: () => void;
}

interface Invoice {
  id: string;
  documentNumber: string;
  customerName: string;
  total: number;
  status: string;
  dueDate?: string;
  customerNumber?: string;
  remainingAmount?: number;
}

interface Expense {
  id: string;
  documentNumber: string;
  supplierName: string;
  total: number;
  status: string;
  dueDate?: string;
  supplierNumber?: string;
  remainingAmount?: number;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeNumber?: string;
  position?: string;
  bankAccount?: {
    iban: string;
    bic: string;
    bankName?: string;
  };
}

interface BankTransferData {
  selectedAccount: BankAccount | null;
  selectedContact: Contact | null;
  selectedInvoice: Invoice | null;
  selectedExpense: Expense | null;
  selectedEmployee: Employee | null;
  receiverName: string;
  iban: string;
  bic: string;
  purpose: string;
  amount: number;
  executionDate: string;
}

const BankTransferModal: React.FC<BankTransferModalProps> = ({
  isOpen,
  onClose,
  accounts,
  onSubmit,
  companyId,
  onCreateContact
}) => {
  const [formData, setFormData] = useState<BankTransferData>({
    selectedAccount: null,
    selectedContact: null,
    selectedInvoice: null,
    selectedExpense: null,
    selectedEmployee: null,
    receiverName: '',
    iban: '',
    bic: '',
    purpose: '',
    amount: 0,
    executionDate: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [documentType, setDocumentType] = useState<'invoice' | 'expense' | 'employee'>('invoice');
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        selectedAccount: accounts[0] || null,
        selectedContact: null,
        selectedInvoice: null,
        selectedExpense: null,
        selectedEmployee: null,
        receiverName: '',
        iban: '',
        bic: '',
        purpose: '',
        amount: 0,
        executionDate: ''
      });
      setErrors({});
      setSearchTerm('');
      loadContacts();
      loadInvoices();
      loadExpenses();
      loadEmployees();
    }
  }, [isOpen, accounts]);

  // Load contacts from Firestore
  const loadContacts = async () => {
    if (!companyId) return;
    
    setLoadingContacts(true);
    try {
      const { collection, getDocs } = await import('firebase/firestore');
      const { db } = await import('@/firebase/clients');
      
      const contactsRef = collection(db, 'companies', companyId, 'customers');
      const snapshot = await getDocs(contactsRef);
      
      console.log('🔍 Lade Kontakte...', snapshot.docs.length, 'Dokumente gefunden');
      
      const loadedContacts: Contact[] = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('📋 Kontakt Daten:', {
          id: doc.id,
          companyName: data.companyName,
          name: data.name,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          iban: data.iban,
          bic: data.bic,
          bankName: data.bankName,
          accountHolder: data.accountHolder
        });
        
        // Verbesserte Name-Erstellung mit mehreren Fallbacks
        let displayName = data.companyName || data.name;
        if (!displayName && (data.firstName || data.lastName)) {
          displayName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
        }
        if (!displayName) {
          displayName = 'Unbekannter Kontakt';
        }
        
        return {
          id: doc.id,
          name: displayName,
          companyName: data.companyName,
          firstName: data.firstName,
          lastName: data.lastName,
          iban: data.iban,
          bic: data.bic,
          email: data.email,
          phone: data.phone,
          bankName: data.bankName
        };
      });
      
      console.log('✅ Kontakte geladen:', loadedContacts.map(c => c.name));
      setContacts(loadedContacts);
    } catch (error) {
      console.error('Fehler beim Laden der Kontakte:', error);
    } finally {
      setLoadingContacts(false);
    }
  };

  // Load invoices from Firestore
  const loadInvoices = async () => {
    if (!companyId) return;
    
    setLoadingInvoices(true);
    try {
      const { collection, getDocs, query, where } = await import('firebase/firestore');
      const { db } = await import('@/firebase/clients');
      
      // Load unpaid invoices
      const invoicesRef = collection(db, 'companies', companyId, 'invoices');
      const unpaidQuery = query(invoicesRef, where('status', '!=', 'paid'));
      const snapshot = await getDocs(unpaidQuery);
      
      const loadedInvoices: Invoice[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          documentNumber: data.documentNumber || data.invoiceNumber || `INV-${doc.id.slice(-6)}`,
          customerName: data.customerName || data.customer?.name || 'Unbekannter Kunde',
          total: data.total || data.totalAmount || 0,
          status: data.status || 'open',
          dueDate: data.dueDate,
          customerNumber: data.customerNumber || data.customer?.customerNumber,
          remainingAmount: data.remainingAmount || data.total || data.totalAmount || 0
        };
      });
      
      // Sort by due date (overdue first)
      loadedInvoices.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
      
      setInvoices(loadedInvoices);
    } catch (error) {
      console.error('Fehler beim Laden der Rechnungen:', error);
    } finally {
      setLoadingInvoices(false);
    }
  };

  // Load expenses from transaction_links subcollection
  const loadExpenses = async () => {
    if (!companyId) return;
    
    setLoadingInvoices(true); // Reuse loading state
    try {
      const { collection, getDocs, query, where } = await import('firebase/firestore');
      const { db } = await import('@/firebase/clients');
      
      // Load transaction links that represent expenses/belege
      const transactionLinksRef = collection(db, 'companies', companyId, 'transaction_links');
      const snapshot = await getDocs(transactionLinksRef);
      
      const loadedExpenses: Expense[] = [];
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        
        // Check if this is an expense-type transaction link
        // Assuming expenses have documentNumber starting with 'BE-' or have specific fields
        if (data.documentNumber?.startsWith('BE-') || data.documentType === 'expense') {
          loadedExpenses.push({
            id: doc.id,
            documentNumber: data.documentNumber || `BE-${doc.id.slice(-6)}`,
            supplierName: data.supplierName || data.customerName || 'Unbekannter Lieferant',
            total: data.documentAmount || data.amount || 0,
            status: data.status || 'open',
            dueDate: data.dueDate,
            supplierNumber: data.supplierNumber || data.customerNumber,
            remainingAmount: data.remainingAmount || data.documentAmount || data.amount || 0
          });
        }
      });
      
      // Sort by document number or creation date
      loadedExpenses.sort((a, b) => {
        return b.documentNumber.localeCompare(a.documentNumber);
      });
      
      setExpenses(loadedExpenses);
    } catch (error) {
      console.error('Fehler beim Laden der Belege aus transaction_links:', error);
    } finally {
      setLoadingInvoices(false);
    }
  };

  // Load employees from Firestore
  const loadEmployees = async () => {
    if (!companyId) return;
    
    setLoadingEmployees(true);
    try {
      const { collection, getDocs } = await import('firebase/firestore');
      const { db } = await import('@/firebase/clients');
      
      const employeesRef = collection(db, 'companies', companyId, 'employees');
      const snapshot = await getDocs(employeesRef);
      
      const loadedEmployees: Employee[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          employeeNumber: data.employeeNumber,
          position: data.position,
          bankAccount: data.bankAccount ? {
            iban: data.bankAccount.iban || '',
            bic: data.bankAccount.bic || '',
            bankName: data.bankAccount.bankName || ''
          } : undefined
        };
      });
      
      setEmployees(loadedEmployees);
    } catch (error) {
      console.error('Fehler beim Laden der Mitarbeiter:', error);
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Handle contact selection
  const handleContactSelect = (contact: Contact) => {
    console.log('🏦 Kontakt ausgewählt:', {
      name: contact.name,
      iban: contact.iban,
      bic: contact.bic,
      bankName: contact.bankName
    });

    const newFormData = {
      ...formData,
      selectedContact: contact,
      receiverName: contact.name,
      iban: contact.iban || '',
      bic: contact.bic || ''
    };

    console.log('💰 Bankdaten werden eingefüllt:', {
      'IBAN eingefüllt': newFormData.iban,
      'BIC eingefüllt': newFormData.bic,
      'Empfänger': newFormData.receiverName
    });

    setFormData(newFormData);
    setSearchTerm(contact.name);
    setShowContactDropdown(false);
    
    // Clear errors
    setErrors(prev => ({
      ...prev,
      receiverName: '',
      iban: contact.iban ? '' : prev.iban, // Clear IBAN error only if we have IBAN data
      bic: contact.bic ? '' : prev.bic     // Clear BIC error only if we have BIC data
    }));
  };

  // Handle invoice selection
  const handleInvoiceSelect = (invoice: Invoice) => {
    const newFormData = {
      ...formData,
      selectedInvoice: invoice,
      amount: invoice.remainingAmount || invoice.total,
      purpose: `Rechnung ${invoice.documentNumber}${invoice.customerNumber ? ` - Kunde ${invoice.customerNumber}` : ''}`
    };

    // If we can find a matching contact for this customer, pre-fill contact data
    const matchingContact = contacts.find(contact => 
      contact.name.toLowerCase() === invoice.customerName.toLowerCase() ||
      contact.companyName?.toLowerCase() === invoice.customerName.toLowerCase()
    );

    if (matchingContact) {
      newFormData.selectedContact = matchingContact;
      newFormData.receiverName = matchingContact.name;
      newFormData.iban = matchingContact.iban || '';
      newFormData.bic = matchingContact.bic || '';
      setSearchTerm(matchingContact.name);
    } else {
      newFormData.receiverName = invoice.customerName;
      setSearchTerm(invoice.customerName);
    }

    setFormData(newFormData);
    
    // Clear errors
    setErrors(prev => ({
      ...prev,
      amount: '',
      purpose: '',
      receiverName: ''
    }));
  };

  // Handle expense selection
  const handleExpenseSelect = (expense: Expense) => {
    const newFormData = {
      ...formData,
      selectedExpense: expense,
      selectedInvoice: null, // Clear invoice selection
      amount: expense.remainingAmount || expense.total,
      purpose: `Beleg ${expense.documentNumber}${expense.supplierNumber ? ` - Lieferant ${expense.supplierNumber}` : ''}`
    };

    // If we can find a matching contact for this supplier, pre-fill contact data
    const matchingContact = contacts.find(contact => 
      contact.name.toLowerCase() === expense.supplierName.toLowerCase() ||
      contact.companyName?.toLowerCase() === expense.supplierName.toLowerCase()
    );

    if (matchingContact) {
      newFormData.selectedContact = matchingContact;
      newFormData.receiverName = matchingContact.name;
      newFormData.iban = matchingContact.iban || '';
      newFormData.bic = matchingContact.bic || '';
      setSearchTerm(matchingContact.name);
    } else {
      newFormData.receiverName = expense.supplierName;
      setSearchTerm(expense.supplierName);
    }

    setFormData(newFormData);
    
    // Clear errors
    setErrors(prev => ({
      ...prev,
      amount: '',
      purpose: '',
      receiverName: ''
    }));
  };

  // Handle employee selection
  const handleEmployeeSelect = (employee: Employee) => {
    const newFormData = {
      ...formData,
      selectedEmployee: employee,
      selectedInvoice: null, // Clear other selections
      selectedExpense: null,
      receiverName: `${employee.firstName} ${employee.lastName}`,
      iban: employee.bankAccount?.iban || '',
      bic: employee.bankAccount?.bic || '',
      purpose: `Gehaltszahlung ${employee.employeeNumber ? `- ${employee.employeeNumber}` : ''}`
    };

    setFormData(newFormData);
    setSearchTerm(`${employee.firstName} ${employee.lastName}`);
    
    // Clear errors
    setErrors(prev => ({
      ...prev,
      purpose: '',
      receiverName: '',
      iban: employee.bankAccount?.iban ? '' : prev.iban,
      bic: employee.bankAccount?.bic ? '' : prev.bic
    }));
  };

  // Handle customer creation success
  const handleCustomerCreated = (customerId: string) => {
    console.log('✅ Neuer Kunde erstellt mit ID:', customerId);
    
    // Modal schließen
    setShowNewCustomerModal(false);
    
    // Kontakte neu laden
    loadContacts();
    
    // TODO: Optional den neuen Kunden automatisch auswählen
    // Dafür müssten wir den Kunden aus Firestore laden
  };

  // Filter contacts based on search term
  const filteredContacts = contacts.filter(contact => {
    if (!searchTerm) return false;
    
    const searchLower = searchTerm.toLowerCase();
    
    return (
      // Name (Primary)
      contact.name.toLowerCase().includes(searchLower) ||
      // Company Name
      (contact.companyName && contact.companyName.toLowerCase().includes(searchLower)) ||
      // First + Last Name
      (contact.firstName && contact.firstName.toLowerCase().includes(searchLower)) ||
      (contact.lastName && contact.lastName.toLowerCase().includes(searchLower)) ||
      // Full Name Combination
      (contact.firstName && contact.lastName && 
       `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(searchLower)) ||
      // Email
      (contact.email && contact.email.toLowerCase().includes(searchLower)) ||
      // Phone
      (contact.phone && contact.phone.includes(searchTerm))
    );
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.contact-dropdown-container')) {
        setShowContactDropdown(false);
      }
    };

    if (showContactDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showContactDropdown]);

  // IBAN validation
  const validateIBAN = (iban: string): boolean => {
    const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/;
    return ibanRegex.test(iban.replace(/\s/g, ''));
  };

  // BIC validation
  const validateBIC = (bic: string): boolean => {
    const bicRegex = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
    return bicRegex.test(bic);
  };

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.selectedAccount) {
      newErrors.selectedAccount = 'Bitte wählen Sie ein Konto aus';
    }

    if (!formData.receiverName.trim()) {
      newErrors.receiverName = 'Empfängername ist erforderlich';
    }

    if (!formData.iban.trim()) {
      newErrors.iban = 'IBAN ist erforderlich';
    } else if (!validateIBAN(formData.iban)) {
      newErrors.iban = 'Ungültige IBAN';
    }

    if (!formData.bic.trim()) {
      newErrors.bic = 'BIC ist erforderlich';
    } else if (!validateBIC(formData.bic)) {
      newErrors.bic = 'Ungültige BIC';
    }

    if (!formData.purpose.trim()) {
      newErrors.purpose = 'Verwendungszweck ist erforderlich';
    }

    if (formData.amount <= 0) {
      newErrors.amount = 'Betrag muss größer als 0 sein';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Fehler bei der Überweisung:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof BankTransferData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const formatIBAN = (iban: string): string => {
    return iban.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-900">
            Überweisung tätigen
          </h1>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Lastkonto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lastkonto
              <div className="inline-block ml-1" title="Überweisungen können nur mit einem Online Zahlungskonto durchgeführt werden.">
                <Info className="inline h-4 w-4 text-gray-400" />
              </div>
            </label>
            <div className="flex items-center border border-gray-300 rounded-md">
              <div className="w-6 h-6 bg-blue-500 rounded-sm mx-3 flex-shrink-0"></div>
              <select
                value={formData.selectedAccount?.id || ''}
                onChange={(e) => {
                  const account = accounts.find(acc => acc.id === e.target.value);
                  handleInputChange('selectedAccount', account || null);
                }}
                className="flex-1 p-2 border-none bg-transparent focus:outline-none focus:ring-0"
                required
              >
                <option value="">Konto auswählen</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.accountName || account.bankName} {account.iban && `(${account.iban.slice(-4)})`}
                  </option>
                ))}
              </select>
            </div>
            {errors.selectedAccount && (
              <p className="text-red-500 text-xs mt-1">{errors.selectedAccount}</p>
            )}
          </div>

          {/* Dokument auswählen (Optional) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Dokument auswählen
                <span className="text-xs text-gray-500 ml-1">(optional)</span>
              </label>
              
              {/* Toggle Tabs */}
              <div className="flex bg-gray-100 rounded-md p-1">
                <button
                  type="button"
                  onClick={() => {
                    setDocumentType('invoice');
                    setFormData({
                      ...formData,
                      selectedInvoice: null,
                      selectedExpense: null,
                      selectedEmployee: null
                    });
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    documentType === 'invoice'
                      ? 'bg-[#14ad9f] text-white'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Rechnung
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDocumentType('expense');
                    setFormData({
                      ...formData,
                      selectedInvoice: null,
                      selectedExpense: null,
                      selectedEmployee: null
                    });
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    documentType === 'expense'
                      ? 'bg-[#14ad9f] text-white'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Beleg
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDocumentType('employee');
                    setFormData({
                      ...formData,
                      selectedInvoice: null,
                      selectedExpense: null,
                      selectedEmployee: null
                    });
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    documentType === 'employee'
                      ? 'bg-[#14ad9f] text-white'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Mitarbeiter
                </button>
              </div>
            </div>

            {/* Document Selector */}
            {documentType === 'invoice' ? (
              <select
                value={formData.selectedInvoice?.id || ''}
                onChange={(e) => {
                  const invoice = invoices.find(inv => inv.id === e.target.value);
                  if (invoice) {
                    handleInvoiceSelect(invoice);
                  } else {
                    setFormData({
                      ...formData,
                      selectedInvoice: null
                    });
                  }
                }}
                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] ${
                  !formData.selectedAccount ? 'bg-gray-100' : 'border-gray-300'
                }`}
                disabled={!formData.selectedAccount || loadingInvoices}
              >
                <option value="">
                  {loadingInvoices ? 'Rechnungen werden geladen...' : 'Keine Rechnung auswählen'}
                </option>
                {invoices.map(invoice => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.documentNumber} - {invoice.customerName} - {invoice.remainingAmount?.toFixed(2) || invoice.total.toFixed(2)}€
                    {invoice.dueDate && new Date(invoice.dueDate) < new Date() ? ' (ÜBERFÄLLIG)' : ''}
                  </option>
                ))}
              </select>
            ) : documentType === 'expense' ? (
              <select
                value={formData.selectedExpense?.id || ''}
                onChange={(e) => {
                  const expense = expenses.find(exp => exp.id === e.target.value);
                  if (expense) {
                    handleExpenseSelect(expense);
                  } else {
                    setFormData({
                      ...formData,
                      selectedExpense: null
                    });
                  }
                }}
                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] ${
                  !formData.selectedAccount ? 'bg-gray-100' : 'border-gray-300'
                }`}
                disabled={!formData.selectedAccount || loadingInvoices}
              >
                <option value="">
                  {loadingInvoices ? 'Belege werden geladen...' : 'Keinen Beleg auswählen'}
                </option>
                {expenses.map(expense => (
                  <option key={expense.id} value={expense.id}>
                    {expense.documentNumber} - {expense.supplierName} - {expense.remainingAmount?.toFixed(2) || expense.total.toFixed(2)}€
                    {expense.dueDate && new Date(expense.dueDate) < new Date() ? ' (ÜBERFÄLLIG)' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={formData.selectedEmployee?.id || ''}
                onChange={(e) => {
                  const employee = employees.find(emp => emp.id === e.target.value);
                  if (employee) {
                    handleEmployeeSelect(employee);
                  } else {
                    setFormData({
                      ...formData,
                      selectedEmployee: null
                    });
                  }
                }}
                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] ${
                  !formData.selectedAccount ? 'bg-gray-100' : 'border-gray-300'
                }`}
                disabled={!formData.selectedAccount || loadingEmployees}
              >
                <option value="">
                  {loadingEmployees ? 'Mitarbeiter werden geladen...' : 'Keinen Mitarbeiter auswählen'}
                </option>
                {employees.map(employee => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName} {employee.position ? `- ${employee.position}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Zahlungsempfänger */}
          <div className="relative contact-dropdown-container">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zahlungsempfänger
            </label>
            <div className="relative">
              <div className="flex">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowContactDropdown(true);
                      // Reset selected contact if user is typing
                      if (formData.selectedContact && e.target.value !== formData.selectedContact.name) {
                        setFormData({
                          ...formData,
                          selectedContact: null,
                          receiverName: e.target.value
                        });
                      }
                    }}
                    onFocus={() => setShowContactDropdown(true)}
                    placeholder="Kontakt suchen oder Name eingeben"
                    className={`w-full pl-10 pr-4 p-2 border rounded-md focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] ${
                      !formData.selectedAccount ? 'bg-gray-100' : ''
                    } ${errors.receiverName ? 'border-red-500' : 'border-gray-300'}`}
                    disabled={!formData.selectedAccount}
                    required
                  />
                </div>
                <button
                  type="button"
                  className="ml-2 px-3 py-2 text-sm font-medium text-[#14ad9f] bg-white border border-[#14ad9f] rounded-md hover:bg-[#14ad9f] hover:text-white transition-colors disabled:opacity-50"
                  disabled={!formData.selectedAccount}
                  title="Neuen Kontakt anlegen"
                  onClick={() => {
                    setShowNewCustomerModal(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              
              {/* Contact Dropdown */}
              {showContactDropdown && searchTerm && !loadingContacts && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {filteredContacts.length > 0 ? (
                    filteredContacts.map((contact) => (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => handleContactSelect(contact)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {contact.name}
                            </div>
                            {contact.email && (
                              <div className="text-xs text-gray-500">
                                {contact.email}
                              </div>
                            )}
                          </div>
                          {contact.iban && (
                            <div className="text-xs text-gray-400">
                              {contact.iban.slice(-4)}
                            </div>
                          )}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-500">
                      Keine Kontakte gefunden
                    </div>
                  )}
                </div>
              )}
              
              {loadingContacts && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-4 text-center">
                  <div className="text-sm text-gray-500">Kontakte werden geladen...</div>
                </div>
              )}
            </div>
            {errors.receiverName && (
              <p className="text-red-500 text-xs mt-1">{errors.receiverName}</p>
            )}
          </div>

          {/* IBAN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              IBAN
            </label>
            <input
              type="text"
              value={formData.iban}
              onChange={(e) => {
                const value = e.target.value.toUpperCase();
                handleInputChange('iban', formatIBAN(value));
              }}
              placeholder="DE00 0000 0000 0000 0000 00"
              className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] ${
                !formData.selectedAccount ? 'bg-gray-100' : ''
              } ${errors.iban ? 'border-red-500' : 'border-gray-300'}`}
              disabled={!formData.selectedAccount}
              required
            />
            {errors.iban && (
              <p className="text-red-500 text-xs mt-1">{errors.iban}</p>
            )}
          </div>

          {/* BIC */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              BIC
            </label>
            <input
              type="text"
              value={formData.bic}
              onChange={(e) => handleInputChange('bic', e.target.value.toUpperCase())}
              placeholder="DEUTDEFFXXX"
              className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] ${
                !formData.selectedAccount ? 'bg-gray-100' : ''
              } ${errors.bic ? 'border-red-500' : 'border-gray-300'}`}
              disabled={!formData.selectedAccount}
              required
            />
            {errors.bic && (
              <p className="text-red-500 text-xs mt-1">{errors.bic}</p>
            )}
          </div>

          {/* Betrag */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Betrag
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.amount || ''}
                onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                placeholder="Betrag eingeben"
                className={`w-full p-2 pr-8 border rounded-md focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] ${
                  !formData.selectedAccount ? 'bg-gray-100' : ''
                } ${errors.amount ? 'border-red-500' : 'border-gray-300'}`}
                disabled={!formData.selectedAccount}
                required
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                {formData.selectedAccount?.currency || '€'}
              </span>
            </div>
            {errors.amount && (
              <p className="text-red-500 text-xs mt-1">{errors.amount}</p>
            )}
          </div>

          {/* Ausführungsdatum */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ausführungsdatum
            </label>
            <div className="relative">
              <input
                type="date"
                value={formData.executionDate}
                onChange={(e) => handleInputChange('executionDate', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] ${
                  !formData.selectedAccount ? 'bg-gray-100' : ''
                } ${!formData.executionDate ? 'text-transparent' : ''}`}
                disabled={!formData.selectedAccount}
                style={!formData.executionDate ? { color: 'transparent' } : {}}
              />
              {!formData.executionDate && (
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                  Nächstmöglich
                </span>
              )}
            </div>
          </div>

          {/* Verwendungszweck - Spans across both columns */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Verwendungszweck
            </label>
            <input
              type="text"
              value={formData.purpose}
              onChange={(e) => handleInputChange('purpose', e.target.value)}
              placeholder="Verwendungszweck oder Rechnungsnummer"
              maxLength={140}
              className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] ${
                !formData.selectedAccount ? 'bg-gray-100' : ''
              } ${errors.purpose ? 'border-red-500' : 'border-gray-300'}`}
              disabled={!formData.selectedAccount}
              required
            />
            {errors.purpose && (
              <p className="text-red-500 text-xs mt-1">{errors.purpose}</p>
            )}
          </div>

          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !formData.selectedAccount}
            className="px-4 py-2 text-sm font-medium text-white bg-[#14ad9f] rounded-md hover:bg-[#129488] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Wird übertragen...' : 'Bezahlen'}
          </button>
        </div>
      </div>

      {/* NewCustomerModal */}
      <NewCustomerModal
        open={showNewCustomerModal}
        onOpenChange={setShowNewCustomerModal}
        companyId={companyId}
        onSaved={handleCustomerCreated}
        persistDirectly={true}
      />
    </div>
  );
};

export default BankTransferModal;