'use client';

import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Edit, Search, Eye, Mail, Phone, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { AddCustomerModal, Customer } from './AddCustomerModal';

interface CustomerManagerProps {
  companyId: string;
}

export function CustomerManager({ companyId }: CustomerManagerProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [nextCustomerNumber, setNextCustomerNumber] = useState('KD-001');

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

  // Load customers from Firestore
  const loadCustomers = async () => {
    try {
      setLoading(true);
      const customersQuery = query(
        collection(db, 'customers'),
        where('companyId', '==', companyId),
        orderBy('createdAt', 'desc')
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
          address: data.address || '',
          taxNumber: data.taxNumber,
          vatId: data.vatId,
          totalInvoices: data.totalInvoices || 0,
          totalAmount: data.totalAmount || 0,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        });
      });

      setCustomers(loadedCustomers);
      setNextCustomerNumber(generateNextCustomerNumber(loadedCustomers));
    } catch (error) {
      console.error('Fehler beim Laden der Kunden:', error);
      toast.error('Fehler beim Laden der Kundendaten');
    } finally {
      setLoading(false);
    }
  };

  // Add new customer
  const handleAddCustomer = async (
    customerData: Omit<Customer, 'id' | 'totalInvoices' | 'totalAmount' | 'createdAt'>
  ) => {
    try {
      const newCustomer = {
        ...customerData,
        companyId,
        totalInvoices: 0,
        totalAmount: 0,
        createdAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, 'customers'), newCustomer);

      const addedCustomer: Customer = {
        ...customerData,
        id: docRef.id,
        totalInvoices: 0,
        totalAmount: 0,
        createdAt: new Date().toISOString(),
      };

      setCustomers(prev => [addedCustomer, ...prev]);
      setNextCustomerNumber(generateNextCustomerNumber([addedCustomer, ...customers]));

      toast.success(`Kunde ${customerData.name} erfolgreich hinzugefügt`);
    } catch (error) {
      console.error('Fehler beim Hinzufügen des Kunden:', error);
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
          <AddCustomerModal
            onAddCustomer={handleAddCustomer}
            nextCustomerNumber={nextCustomerNumber}
          />
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
                          <span className="break-words">{customer.address}</span>
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
                        {formatCurrency(customer.totalAmount)}
                      </div>
                      <div className="text-sm text-gray-500 mb-2">
                        {customer.totalInvoices} Rechnungen
                      </div>
                      <div className="text-xs text-gray-400">
                        Seit {formatDate(customer.createdAt)}
                      </div>

                      <div className="flex gap-1 mt-3">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
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
    </Card>
  );
}
