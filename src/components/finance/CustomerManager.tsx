'use client';

import React, { useState, useEffect } from 'react';
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
import { auth } from '@/firebase/clients';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Edit, Search, Eye, Mail, Phone, MapPin, Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AddCustomerModal, Customer } from './AddCustomerModal';
import { CustomerDetailModal } from './CustomerDetailModal';
import { EditCustomerModal } from './EditCustomerModal';
import { calculateCustomerStats, updateCustomerStats } from '@/utils/customerStatsUtils';

interface CustomerManagerProps {
  companyId: string;
}

export function CustomerManager({ companyId }: CustomerManagerProps) {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [nextCustomerNumber, setNextCustomerNumber] = useState('KD-001');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerStats, setCustomerStats] = useState<{
    [customerId: string]: { totalAmount: number; totalInvoices: number };
  }>({});

  // Generiere eine eindeutige Kundennummer
  const generateUniqueCustomerNumber = (existingNumbers: string[]): string => {
    const kdNumbers = existingNumbers
      .filter(num => num && num.startsWith('KD-'))
      .map(num => parseInt(num.replace('KD-', ''), 10))
      .filter(num => !isNaN(num));

    let nextNumber = Math.max(...kdNumbers, 0) + 1;
    let newNumber = `KD-${String(nextNumber).padStart(3, '0')}`;

    // Sicherstellen, dass die Nummer wirklich eindeutig ist
    while (existingNumbers.includes(newNumber)) {
      nextNumber++;
      newNumber = `KD-${String(nextNumber).padStart(3, '0')}`;
    }

    return newNumber;
  };

  // Generate next customer number
  const generateNextCustomerNumber = (existingCustomers: Customer[]) => {
    if (existingCustomers.length === 0) {
      return 'KD-001';
    }

    const numbers = existingCustomers
      .map(c => c.customerNumber)
      .filter(num => num.startsWith('KD-'))
      .map(num => parseInt(num.replace('KD-', ''), 10))
      .filter(num => !isNaN(num));

    const highestNumber = Math.max(...numbers, 0);
    return `KD-${String(highestNumber + 1).padStart(3, '0')}`;
  };

  // Normalize customer name for fuzzy matching (similar to supplier system)
  const normalizeCustomerName = (name: string): string => {
    if (!name) return '';

    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  };

  // Fuzzy match customer names (similar to supplier system)
  const fuzzyMatchCustomer = (
    searchName: string,
    existingCustomers: Customer[]
  ): Customer | null => {
    if (!searchName) return null;

    const normalizedSearch = normalizeCustomerName(searchName);

    for (const customer of existingCustomers) {
      const normalizedCustomer = normalizeCustomerName(customer.name);

      // Exact match
      if (normalizedCustomer === normalizedSearch) {
        return customer;
      }

      // Partial match (search name contains customer name or vice versa)
      if (
        normalizedSearch.includes(normalizedCustomer) ||
        normalizedCustomer.includes(normalizedSearch)
      ) {
        // Only match if significant overlap (avoid false positives)
        const overlapRatio =
          Math.min(normalizedSearch.length, normalizedCustomer.length) /
          Math.max(normalizedSearch.length, normalizedCustomer.length);
        if (overlapRatio > 0.6) {
          return customer;
        }
      }
    }

    return null;
  };

  // Lade Kundenstatistiken im Hintergrund (ohne DB-Update)
  const loadCustomerStatsInBackground = async (customerList: Customer[]) => {
    try {
      const stats: { [customerId: string]: { totalAmount: number; totalInvoices: number } } = {};

      for (const customer of customerList) {
        try {
          const customerStats = await calculateCustomerStats(companyId, customer.name);
          stats[customer.id] = customerStats;

          // SOFORTIGE UPDATE in der Datenbank für künftige Ladevorgänge
          if (
            user?.uid &&
            (customerStats.totalAmount !== customer.totalAmount ||
              customerStats.totalInvoices !== customer.totalInvoices)
          ) {
            try {
              await updateCustomerStats(customer.id, customerStats, user.uid);
            } catch (error) {}
          }
        } catch (error) {
          stats[customer.id] = { totalAmount: 0, totalInvoices: 0 };
        }
      }

      setCustomerStats(stats);
    } catch (error) {}
  };

  // Aktualisiere Kundenstatistiken im Hintergrund
  const updateCustomerStatsInBackground = async (customerList: Customer[]) => {
    if (!user?.uid) {
      return;
    }

    try {
      for (const customer of customerList) {
        try {
          const stats = await calculateCustomerStats(companyId, customer.name);

          // Nur aktualisieren, wenn sich die Werte geändert haben
          if (
            stats.totalAmount !== customer.totalAmount ||
            stats.totalInvoices !== customer.totalInvoices
          ) {
            await updateCustomerStats(customer.id, stats, user.uid);

            // Aktualisiere lokalen State
            setCustomers(prev =>
              prev.map(c =>
                c.id === customer.id
                  ? { ...c, totalAmount: stats.totalAmount, totalInvoices: stats.totalInvoices }
                  : c
              )
            );
          }
        } catch (error) {}
      }
    } catch (error) {}
  };

  // Load customers from Firestore
  const loadCustomers = async () => {
    try {
      // Debug-Logs entfernt

      setLoading(true);

      // TEMPORÄRE VEREINFACHTE QUERY - Index-Problem umgehen
      const customersQuery = query(
        collection(db, 'customers'),
        where('companyId', '==', companyId)
        // Temporär ohne isSupplier Filter und orderBy
      );

      const querySnapshot = await getDocs(customersQuery);

      const loadedCustomers: Customer[] = [];

      querySnapshot.forEach(doc => {
        const data = doc.data();

        loadedCustomers.push({
          id: doc.id,
          customerNumber: data.customerNumber || 'KD-000',
          name: data.name || '',
          email: data.email || '',
          phone: data.phone,
          // Legacy address fallback für alte Kunden
          address: data.address || '',
          // Neue strukturierte Adresse
          street: data.street || '',
          city: data.city || '',
          postalCode: data.postalCode || '',
          country: data.country || '',
          taxNumber: data.taxNumber,
          vatId: data.vatId,
          vatValidated: data.vatValidated || false,
          isSupplier: data.isSupplier || false, // Defaultwert für alte Daten
          totalInvoices: data.totalInvoices || 0,
          totalAmount: data.totalAmount || 0,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          contactPersons: data.contactPersons || [],
          companyId: data.companyId || companyId,
        });
      });

      // Client-seitige Filterung und Sortierung
      const filteredCustomers = loadedCustomers
        .filter(customer => {
          // Robuste Filterung: Nur echte Kunden (keine Lieferanten)
          // - Explizit isSupplier === false ODER
          // - isSupplier ist undefined/null UND customerNumber beginnt NICHT mit "LF-"
          const isNotSupplier =
            customer.isSupplier === false ||
            (customer.isSupplier == null && !customer.customerNumber?.startsWith('LF-'));

          return isNotSupplier;
        })
        .sort((a, b) => {
          // Sortierung nach createdAt (neueste zuerst)
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });

      setCustomers(filteredCustomers);
      setNextCustomerNumber(generateNextCustomerNumber(filteredCustomers));

      // Lade die korrekten Statistiken für jeden Kunden
      loadCustomerStatsInBackground(filteredCustomers);
    } catch (error) {
      toast.error('Fehler beim Laden der Kundendaten');
    } finally {
      setLoading(false);
    }
  };

  // Add new customer
  const handleAddCustomer = async (
    customerData: Omit<Customer, 'id' | 'totalInvoices' | 'totalAmount' | 'createdAt' | 'companyId'>
  ) => {
    try {
      // Debug-Logs entfernt

      if (!user) {
        throw new Error('Benutzer nicht authentifiziert');
      }

      // Verify user has permission to add customers to this company
      if (user.uid !== companyId) {
        throw new Error('Keine Berechtigung für diese Firma');
      }

      // Generiere neue Kundennummer BEVOR das Speichern
      const actualCustomerNumber =
        customerData.customerNumber || generateNextCustomerNumber(customers);

      // Filter undefined values for Firebase compatibility
      const cleanCustomerData = Object.entries({
        ...customerData,
        customerNumber: actualCustomerNumber, // Verwende die generierte Nummer
      }).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = value;
        }
        return acc;
      }, {} as any);

      // Clean contact persons - remove undefined fields
      if (cleanCustomerData.contactPersons) {
        cleanCustomerData.contactPersons = cleanCustomerData.contactPersons.map((cp: any) => {
          return Object.entries(cp).reduce((acc, [key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              acc[key] = value;
            }
            return acc;
          }, {} as any);
        });
      }

      const newCustomer = {
        ...cleanCustomerData,
        companyId,
        isSupplier: false, // Explizit als Kunde markieren (nicht Lieferant)
        totalInvoices: 0,
        totalAmount: 0,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        lastModifiedBy: user.uid,
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'customers'), newCustomer);

      const addedCustomer: Customer = {
        ...customerData,
        customerNumber: actualCustomerNumber, // Verwende die tatsächlich gespeicherte Nummer
        id: docRef.id,
        companyId,
        isSupplier: false, // Explizit als Kunde markieren
        totalInvoices: 0,
        totalAmount: 0,
        createdAt: new Date().toISOString(),
      };

      setCustomers(prev => [addedCustomer, ...prev]);

      // Generiere die NÄCHSTE Kundennummer für den nächsten Kunden
      const nextNum = generateNextCustomerNumber([addedCustomer, ...customers]);
      setNextCustomerNumber(nextNum);

      toast.success(`Kunde ${customerData.name} erfolgreich hinzugefügt`);
    } catch (error) {
      // More detailed error logging
      if (error instanceof Error) {
      }

      toast.error(
        `Fehler beim Hinzufügen des Kunden: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      );
      throw error;
    }
  };

  // Automatically create customers from existing invoices
  const createCustomersFromInvoices = async () => {
    try {
      // Debug-Logs entfernt

      // Load existing invoices
      const invoicesQuery = query(
        collection(db, 'invoices'),
        where('companyId', '==', companyId),
        orderBy('createdAt', 'desc')
      );

      const invoicesSnapshot = await getDocs(invoicesQuery);

      const uniqueCustomerNames = new Set<string>();
      const allInvoices: any[] = [];

      // Collect unique customer names from invoices
      invoicesSnapshot.forEach(doc => {
        const invoice = doc.data();
        allInvoices.push({ id: doc.id, ...invoice });

        if (invoice.customerName && invoice.customerName.trim()) {
          uniqueCustomerNames.add(invoice.customerName.trim());
        }
      });

      let createdCount = 0;
      const creationErrors: string[] = [];

      // Create customers that don't exist yet
      for (const customerName of uniqueCustomerNames) {
        const existingCustomer = fuzzyMatchCustomer(customerName, customers);

        if (!existingCustomer) {
          try {
            const newCustomerNumber = generateNextCustomerNumber([
              ...customers,
              ...Array(createdCount).fill(null),
            ]);

            const newCustomerData = {
              customerNumber: newCustomerNumber,
              name: customerName,
              email: '', // Will be empty initially
              phone: '',
              address: '',
              street: '',
              city: '',
              postalCode: '',
              country: 'Deutschland',
              taxNumber: '',
              vatId: '',
              vatValidated: false,
              contactPersons: [],
            };

            await handleAddCustomer(newCustomerData);
            createdCount++;

            // Small delay to avoid overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            const errorMessage = `Failed to create customer ${customerName}: ${error instanceof Error ? error.message : String(error)}`;

            creationErrors.push(errorMessage);
          }
        } else {
        }
      }

      if (createdCount > 0) {
        toast.success(`${createdCount} Kunden automatisch aus Rechnungen erstellt`);
      } else if (uniqueCustomerNames.size === 0) {
        toast.info('Keine Rechnungen mit Kundennamen gefunden');
      } else {
        toast.info('Alle Kunden aus Rechnungen sind bereits vorhanden');
      }

      if (creationErrors.length > 0) {
        toast.error(`${creationErrors.length} Fehler beim Erstellen von Kunden (siehe Konsole)`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      toast.error(`Kritischer Fehler: ${errorMessage}`);
    }
  };

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDetailModal(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowEditModal(true);
  };

  // Update customer in Firebase
  const handleUpdateCustomer = async (updatedCustomer: Customer) => {
    try {
      if (!user) {
        throw new Error('Benutzer nicht authentifiziert');
      }

      // Verify user has permission to update customers for this company
      if (user.uid !== companyId) {
        throw new Error('Keine Berechtigung für diese Firma');
      }

      // Filter undefined values for Firebase compatibility
      const cleanCustomerData = Object.entries(updatedCustomer).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null && key !== 'id') {
          acc[key] = value;
        }
        return acc;
      }, {} as any);

      // Clean contact persons - remove undefined fields
      if (cleanCustomerData.contactPersons) {
        cleanCustomerData.contactPersons = cleanCustomerData.contactPersons.map((cp: any) => {
          return Object.entries(cp).reduce((acc, [key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              acc[key] = value;
            }
            return acc;
          }, {} as any);
        });
      }

      // Add update metadata
      cleanCustomerData.lastModifiedBy = user.uid;
      cleanCustomerData.updatedAt = serverTimestamp();

      const customerRef = doc(db, 'companies', companyId, 'customers', updatedCustomer.id);
      await updateDoc(customerRef, cleanCustomerData);

      // Update local state
      setCustomers(prev => prev.map(c => (c.id === updatedCustomer.id ? updatedCustomer : c)));
    } catch (error) {
      // More detailed error logging
      if (error instanceof Error) {
      }

      throw error;
    }
  };

  // Delete customer from Firebase
  const handleDeleteCustomer = async (customer: Customer) => {
    try {
      if (!user) {
        throw new Error('Benutzer nicht authentifiziert');
      }

      // Verify user has permission to delete customers for this company
      if (user.uid !== companyId) {
        throw new Error('Keine Berechtigung für diese Firma');
      }

      // Confirm deletion
      if (!confirm(`Möchten Sie den Kunden "${customer.name}" wirklich löschen?`)) {
        return;
      }

      const customerRef = doc(db, 'companies', companyId, 'customers', customer.id);
      await deleteDoc(customerRef);

      // Update local state
      setCustomers(prev => prev.filter(c => c.id !== customer.id));

      toast.success('Kunde erfolgreich gelöscht');
    } catch (error) {
      toast.error('Fehler beim Löschen des Kunden');
      throw error;
    }
  };

  // Filter customers based on search term
  const filteredCustomers = customers.filter(
    customer =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.customerNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  useEffect(() => {
    if (companyId) {
      loadCustomers();
    }
  }, [companyId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
            <span className="ml-2 text-gray-600">Lade Kundendaten...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Kunden</CardTitle>
            <CardDescription>
              Verwalten Sie Ihre Kundendaten ({customers.length} Kunden)
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <AddCustomerModal
              onAddCustomer={handleAddCustomer}
              nextCustomerNumber={nextCustomerNumber}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Kunden suchen..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
              name="customer-search"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Customer List */}
        <div className="space-y-4">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                {searchTerm ? 'Keine Kunden gefunden' : 'Noch keine Kunden vorhanden'}
              </div>
              {!searchTerm && (
                <AddCustomerModal
                  onAddCustomer={handleAddCustomer}
                  nextCustomerNumber={nextCustomerNumber}
                />
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCustomers.map(customer => (
                <div
                  key={customer.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {customer.customerNumber}
                        </Badge>
                        <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span>{customer.email}</span>
                        </div>

                        {customer.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            <span>{customer.phone}</span>
                          </div>
                        )}

                        <div className="flex items-start gap-2 md:col-span-2">
                          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span className="break-words">
                            {customer.street ||
                            customer.city ||
                            customer.postalCode ||
                            customer.country
                              ? // Neue strukturierte Adresse
                                `${customer.street}${customer.street ? ', ' : ''}${customer.postalCode}${customer.postalCode ? ' ' : ''}${customer.city}${customer.city && customer.country ? ', ' : ''}${customer.country}`
                              : // Fallback auf legacy address
                                customer.address}
                          </span>
                        </div>

                        {(customer.taxNumber || customer.vatId) && (
                          <div className="md:col-span-2 pt-2 border-t border-gray-100">
                            {customer.taxNumber && (
                              <span className="text-xs text-gray-500 mr-4">
                                Steuer-Nr: {customer.taxNumber}
                              </span>
                            )}
                            {customer.vatId && (
                              <span className="text-xs text-gray-500">
                                USt-IdNr: {customer.vatId}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right ml-4">
                      <div className="font-semibold text-lg text-gray-900 mb-1">
                        {formatCurrency(
                          customerStats[customer.id]?.totalAmount || customer.totalAmount
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mb-2">
                        {customerStats[customer.id]?.totalInvoices || customer.totalInvoices}{' '}
                        Rechnungen
                      </div>
                      <div className="text-xs text-gray-400">
                        Seit {formatDate(customer.createdAt)}
                      </div>

                      <div className="flex gap-1 mt-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewCustomer(customer)}
                          title="Kunde anzeigen"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCustomer(customer)}
                          title="Kunde bearbeiten"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCustomer(customer)}
                          title="Kunde löschen"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      {/* Customer Detail Modal */}
      <CustomerDetailModal
        customer={selectedCustomer}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedCustomer(null);
        }}
        onCustomerUpdated={() => {
          // Lade die Kunden neu, um aktualisierte Statistiken zu zeigen
          loadCustomers();
        }}
      />

      {/* Edit Customer Modal */}
      <EditCustomerModal
        customer={editingCustomer}
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingCustomer(null);
        }}
        onUpdateCustomer={handleUpdateCustomer}
      />
    </Card>
  );
}
