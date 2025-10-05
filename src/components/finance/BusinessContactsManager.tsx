'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CustomerService } from '@/services/customerService';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Building2, 
  UserCheck, 
  UserPlus, 
  Search, 
  Filter, 
  Download, 
  Plus,
  Check,
  Edit,
  Eye,
  Mail,
  Phone,
  MapPin,
  Trash2,
  FileText,
  Receipt,
  Archive,
  History,
  MoreHorizontal
} from 'lucide-react';
import { toast } from 'sonner';
import { Customer } from './AddCustomerModal';
import { CustomerDetailModal } from './CustomerDetailModal';
import { EditCustomerModal } from './EditCustomerModal';
import { updateCustomerStats } from '@/utils/customerStatsUtils';
import { NumberSequenceService } from '@/services/numberSequenceService';

// Tab-Konfiguration
const CONTACT_TABS = [
  { 
    id: 'all', 
    label: 'Alle', 
    icon: Users,
    filter: null 
  },
  { 
    id: 'customers', 
    label: 'Kunden', 
    icon: UserCheck,
    filter: 'customer'
  },
  { 
    id: 'suppliers', 
    label: 'Lieferanten', 
    icon: Building2,
    filter: 'supplier'
  },
  { 
    id: 'partners', 
    label: 'Partner', 
    icon: UserPlus,
    filter: 'partner'
  },
  { 
    id: 'prospects', 
    label: 'Interessenten', 
    icon: Users,
    filter: 'prospect'
  }
];

// Combined interface for all business contacts
interface BusinessContact extends Customer {
  contactType: 'customer' | 'supplier' | 'partner' | 'prospect';
  isSupplier?: boolean;
  supplierNumber?: string;
}

interface BusinessContactsManagerProps {
  companyId: string;
}

export function BusinessContactsManager({ companyId }: BusinessContactsManagerProps) {
  const { user } = useAuth();
  const router = useRouter();
  
  // Read initial tab from URL parameters
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam && ['all', 'customers', 'suppliers', 'partners', 'prospects'].includes(tabParam)) {
        return tabParam;
      }
    }
    return 'all';
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Combined contacts data
  const [allContacts, setAllContacts] = useState<BusinessContact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<BusinessContact[]>([]);
  
  // Modal states
  const [selectedContact, setSelectedContact] = useState<BusinessContact | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [editingContact, setEditingContact] = useState<BusinessContact | null>(null);
  
  // Contact stats
  const [contactStats, setContactStats] = useState<{
    [contactId: string]: { totalAmount: number; totalInvoices: number };
  }>({});

  // Load all business contacts (customers + suppliers)
  const loadAllContacts = async () => {
    try {
      setLoading(true);

      // Load customers
      const customers = await CustomerService.getCustomers(companyId);
      
      const customerContacts: BusinessContact[] = customers.map(customer => ({
        ...customer,
        contactType: customer.isSupplier ? 'supplier' : 'customer',
        isSupplier: customer.isSupplier || false
      }));

      // TODO: Load suppliers from separate collection if needed
      // For now, we filter customers with isSupplier flag

      setAllContacts(customerContacts);
      setFilteredContacts(customerContacts);
      
      // Load stats for all contacts
      await loadContactStats(customerContacts);
      
    } catch (error) {
      console.error('Fehler beim Laden der Geschäftspartner:', error);
      toast.error('Fehler beim Laden der Geschäftspartner');
    } finally {
      setLoading(false);
    }
  };

  // Load contact statistics (use existing fields from customer data)
  const loadContactStats = async (contacts: BusinessContact[]) => {
    const stats: { [contactId: string]: { totalAmount: number; totalInvoices: number } } = {};
    
    // Verwende die bereits vorhandenen Statistiken aus den Customer-Objekten
    for (const contact of contacts) {
      stats[contact.id] = {
        totalAmount: contact.totalAmount || 0,
        totalInvoices: contact.totalInvoices || 0
      };
    }
    
    setContactStats(stats);
  };

  // Filter contacts based on active tab and search
  useEffect(() => {
    let filtered = [...allContacts];

    // Filter by tab
    if (activeTab !== 'all') {
      const tabConfig = CONTACT_TABS.find(tab => tab.id === activeTab);
      if (tabConfig?.filter) {
        switch (tabConfig.filter) {
          case 'customer':
            filtered = filtered.filter(contact => !contact.isSupplier);
            break;
          case 'supplier':
            filtered = filtered.filter(contact => contact.isSupplier);
            break;
          case 'partner':
          case 'prospect':
            // TODO: Implement when we have these contact types
            filtered = [];
            break;
        }
      }
    }

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(contact =>
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.customerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (contact.city && contact.city.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredContacts(filtered);
  }, [allContacts, activeTab, searchTerm]);

  // Load data on mount
  useEffect(() => {
    if (companyId) {
      loadAllContacts();
    }
  }, [companyId]);

  // Handle contact actions
  const handleViewContact = (contact: BusinessContact) => {
    setSelectedContact(contact);
    setShowDetailModal(true);
  };

  const handleEditContact = (contact: BusinessContact) => {
    setEditingContact(contact);
    setShowEditModal(true);
  };

  const handleDeleteContact = async (contact: BusinessContact) => {
    if (!confirm(`Möchten Sie ${contact.name} wirklich löschen?`)) return;
    
    try {
      // Use CustomerService for deletion (works for both customers and suppliers)
      await CustomerService.deleteCustomer(companyId, contact.id);
      toast.success(`${contact.name} wurde gelöscht`);
      loadAllContacts();
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      toast.error('Fehler beim Löschen des Kontakts');
    }
  };

  // Create new contact handlers
  const handleCreateCustomer = () => {
    router.push(`/dashboard/company/${companyId}/finance/customers/create`);
  };



  // Export functionality
  const handleExportContacts = async () => {
    try {
      const csvData = await CustomerService.exportCustomersCSV(companyId);
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `business-contacts-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      toast.success('Export erfolgreich!');
    } catch (error) {
      console.error('Export-Fehler:', error);
      toast.error('Fehler beim Export');
    }
  };

  // Empty state check
  const showEmptyState = !loading && allContacts.length === 0;

  // Empty State (SevDesk-style)
  if (showEmptyState) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <Users className="h-16 w-16 text-[#14ad9f] mx-auto mb-4" />
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">
              Deine Business-Kontakte - Alle an einem Ort.
            </h3>
            
            <div className="space-y-3 text-left mb-8">
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 text-[#14ad9f] flex-shrink-0" />
                <span className="text-gray-700">Verwalte deine Kunden & Lieferanten</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 text-[#14ad9f] flex-shrink-0" />
                <span className="text-gray-700">Nutze gespeicherte Kundendaten für Rechnungen & Angebote</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 text-[#14ad9f] flex-shrink-0" />
                <span className="text-gray-700">Hinterlege kundenspezifische Rabatte und Informationen</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button 
                onClick={handleCreateCustomer}
                className="bg-[#14ad9f] hover:bg-[#129488] text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Kontakt erstellen
              </Button>
              <Button variant="outline" onClick={handleExportContacts}>
                <Download className="h-4 w-4 mr-2" />
                Kontakte importieren
              </Button>
            </div>

            <hr className="my-6 border-gray-200" />
            
            <p className="text-sm text-gray-500">
              Schaue gerne in unserem{' '}
              <a href="#" className="text-[#14ad9f] hover:underline">Hilfe-Center</a>{' '}
              vorbei. Es gibt außerdem ein{' '}
              <a href="#" className="text-[#14ad9f] hover:underline">Video</a>{' '}
              in dem wir dir schnell und einfach die wichtigsten Funktionen erklären.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <Card>
        <CardContent className="p-6">
          {/* Tab Navigation */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex space-x-1">
              {CONTACT_TABS.map((tab) => {
                const IconComponent = tab.icon;
                const contactCount = tab.id === 'all' 
                  ? allContacts.length 
                  : allContacts.filter(c => {
                      switch (tab.filter) {
                        case 'customer': return !c.isSupplier;
                        case 'supplier': return c.isSupplier;
                        default: return false;
                      }
                    }).length;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-[#14ad9f] text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    <IconComponent className="h-4 w-4" />
                    {tab.label}
                    {contactCount > 0 && (
                      <Badge variant="secondary" className="ml-1 bg-white/20">
                        {contactCount}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleExportContacts}>
                <Download className="h-4 w-4 mr-2" />
                Exportieren
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>

              <Button onClick={handleCreateCustomer} className="bg-[#14ad9f] hover:bg-[#129488]">
                <Plus className="h-4 w-4 mr-2" />
                Kontakt erstellen
              </Button>
            </div>
          </div>

          {/* Filter Bar */}
          {showFilters && (
            <div className="border-t border-gray-100 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Suche</label>
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Name, E-Mail, Nummer..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Land</label>
                  <select className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#14ad9f] focus:ring-1 focus:ring-[#14ad9f]">
                    <option value="">Alle Länder</option>
                    <option value="DE">Deutschland</option>
                    <option value="AT">Österreich</option>
                    <option value="CH">Schweiz</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stadt</label>
                  <Input placeholder="Stadt eingeben" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Typ</label>
                  <select className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#14ad9f] focus:ring-1 focus:ring-[#14ad9f]">
                    <option value="">Alle anzeigen</option>
                    <option value="companies">Nur Organisationen</option>
                    <option value="persons">Nur Personen</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-4">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSearchTerm('')}
                >
                  Filter zurücksetzen
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contacts Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f] mx-auto"></div>
              <p className="mt-2 text-gray-600">Lade Geschäftspartner...</p>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
                <div className="grid grid-cols-7 gap-4 text-sm font-medium text-gray-700">
                  <div className="flex items-center gap-2">Typ</div>
                  <div>Nr.</div>
                  <div className="col-span-2">Name</div>
                  <div>Ort</div>
                  <div>Umsatz</div>
                  <div className="text-right">Aktionen</div>
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-gray-200">
                {filteredContacts.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    {searchTerm ? 'Keine Treffer für Ihre Suche' : 'Keine Kontakte gefunden'}
                  </div>
                ) : (
                  filteredContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleViewContact(contact)}
                    >
                      <div className="grid grid-cols-7 gap-4 items-center">
                        {/* Type & Badge */}
                        <div className="flex items-center gap-2">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            contact.isSupplier ? 'bg-orange-100' : 'bg-blue-100'
                          }`}>
                            {contact.isSupplier ? (
                              <Building2 className="h-4 w-4 text-orange-600" />
                            ) : (
                              <UserCheck className="h-4 w-4 text-blue-600" />
                            )}
                          </div>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${contact.isSupplier ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}
                          >
                            {contact.isSupplier ? 'L' : 'K'}
                          </Badge>
                        </div>

                        {/* Number */}
                        <div>
                          <span className="font-mono text-sm font-medium">
                            {contact.isSupplier ? contact.supplierNumber || contact.customerNumber : contact.customerNumber}
                          </span>
                        </div>

                        {/* Name & Email */}
                        <div className="col-span-2 min-w-0">
                          <div className="font-medium text-gray-900 truncate">{contact.name}</div>
                          {contact.email && (
                            <div className="text-sm text-gray-500 truncate">{contact.email}</div>
                          )}
                        </div>

                        {/* Location */}
                        <div className="min-w-0">
                          <div className="text-sm text-gray-900 truncate">
                            {contact.city && contact.postalCode ? (
                              <>
                                <span className="text-xs text-gray-400">{contact.country || 'DE'}-</span>
                                {contact.postalCode} {contact.city}
                              </>
                            ) : (
                              contact.city || contact.country || '-'
                            )}
                          </div>
                          {contact.phone && (
                            <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <Phone className="h-3 w-3" />
                              {contact.phone}
                            </div>
                          )}
                        </div>

                        {/* Revenue */}
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {contactStats[contact.id]?.totalAmount ? 
                              `€${contactStats[contact.id].totalAmount.toLocaleString('de-DE')}` : 
                              '-'
                            }
                          </div>
                          <div className="text-xs text-gray-500">
                            {contactStats[contact.id]?.totalInvoices || 0} Rechnungen
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-1">
                          <div 
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditContact(contact)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteContact(contact)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Active Tab Info */}
      <div className="text-sm text-gray-500">
        Aktiver Tab: <span className="font-medium">{CONTACT_TABS.find(t => t.id === activeTab)?.label}</span> 
        {' '}({filteredContacts.length} von {allContacts.length} Kontakten)
      </div>

      {/* Modals */}
      {selectedContact && (
        <CustomerDetailModal
          customer={selectedContact}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedContact(null);
          }}
          onCustomerUpdated={() => loadAllContacts()}
        />
      )}

      {editingContact && (
        <EditCustomerModal
          customer={editingContact}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingContact(null);
          }}
          onUpdateCustomer={async (updatedCustomer) => {
            try {
              await CustomerService.updateCustomer(companyId, updatedCustomer.id, updatedCustomer);
              toast.success('Kontakt wurde aktualisiert');
              loadAllContacts();
              setShowEditModal(false);
            } catch (error) {
              console.error('Fehler beim Aktualisieren:', error);
              toast.error('Fehler beim Aktualisieren des Kontakts');
            }
          }}
        />
      )}


    </div>
  );
}