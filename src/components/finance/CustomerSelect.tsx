'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Search, Plus, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { Customer } from './AddCustomerModal';

interface CustomerSelectProps {
  companyId: string;
  onCustomerSelect: (customer: Customer) => void;
  selectedCustomer?: Customer | null;
  isOpen?: boolean;
  onClose?: () => void;
  onOpenRequest?: () => void; // NEU: Callback für Öffnungsanfrage
}

export function CustomerSelect({
  companyId,
  onCustomerSelect,
  selectedCustomer,
  isOpen = false,
  onClose,
  onOpenRequest, // NEU
}: CustomerSelectProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [internalOpen, setInternalOpen] = useState(false);

  // Use external open state if provided, otherwise use internal
  const open = isOpen !== undefined ? isOpen : internalOpen;

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setInternalOpen(false);
    }
  };

  const handleOpen = () => {
    if (onOpenRequest) {
      // External control - request parent to open dialog
      onOpenRequest();
    } else {
      setInternalOpen(true);
    }
  };

  // Load customers from Firestore
  const loadCustomers = async () => {
    try {
      setLoading(true);
      console.log('🔍 Loading customers for companyId:', companyId);

      const customersQuery = query(
        collection(db, 'customers'),
        where('companyId', '==', companyId),
        orderBy('name', 'asc')
      );

      console.log('📋 Executing Firestore query...');
      const querySnapshot = await getDocs(customersQuery);
      console.log('📊 Query result - docs count:', querySnapshot.size);

      const loadedCustomers: Customer[] = [];

      querySnapshot.forEach(doc => {
        const data = doc.data();
        console.log('📝 Processing customer doc:', doc.id, data);

        // Generiere customerNumber falls nicht vorhanden
        const customerNumber = data.customerNumber || `KD-${doc.id.substring(0, 6).toUpperCase()}`;

        loadedCustomers.push({
          id: doc.id,
          customerNumber,
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          street: data.street || '',
          city: data.city || '',
          postalCode: data.postalCode || '',
          country: data.country || '',
          taxNumber: data.taxNumber || '',
          vatId: data.vatId || '',
          totalInvoices: data.totalInvoices || 0,
          totalAmount: data.totalAmount || 0,
          createdAt:
            data.createdAt?.toDate?.()?.toISOString() ||
            data.createdAt?.toISOString?.() ||
            new Date().toISOString(),
          contactPersons: data.contactPersons || [],
          companyId: data.companyId || companyId,
        });
      });

      console.log('✅ Loaded customers:', loadedCustomers.length);
      console.log(
        '👥 Customer details:',
        loadedCustomers.map(c => ({
          id: c.id,
          name: c.name,
          customerNumber: c.customerNumber,
          companyId: c.companyId,
        }))
      );
      setCustomers(loadedCustomers);
    } catch (error: any) {
      console.error('❌ Error loading customers:', error);
      console.error('🔍 Error details:', {
        code: error.code,
        message: error.message,
        companyId,
        stack: error.stack,
      });

      if (error.code === 'permission-denied') {
        console.error(
          '🚫 Firestore permission denied - check security rules for customers collection'
        );
        toast.error('Keine Berechtigung zum Laden der Kundendaten. Überprüfen Sie Ihre Anmeldung.');
      } else if (error.code === 'failed-precondition') {
        console.error('🗂️ Missing Firestore index - check console for required index');
        toast.error('Firestore Index fehlt - siehe Konsole für Details');
      } else {
        toast.error('Fehler beim Laden der Kundendaten');
      }
    } finally {
      setLoading(false);
    }
  };

  // Filter customers based on search term
  const filteredCustomers = customers.filter(
    customer =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.customerNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCustomerSelect = (customer: Customer) => {
    onCustomerSelect(customer);
    handleClose();
    setSearchTerm('');
  };

  useEffect(() => {
    if (companyId) {
      loadCustomers();
    }
  }, [companyId]);

  return (
    <div className="space-y-2">
      <Label>Kunde auswählen *</Label>

      {selectedCustomer ? (
        <div className="border rounded-lg p-3 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{selectedCustomer.name}</div>
              <div className="text-sm text-gray-600">
                <span className="font-mono">{selectedCustomer.customerNumber}</span>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleOpen}>
              Ändern
            </Button>
          </div>
        </div>
      ) : (
        <Dialog open={open} onOpenChange={handleClose}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full justify-start" onClick={handleOpen}>
              <Building2 className="h-4 w-4 mr-2" />
              Kunde auswählen...
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[800px] w-[90vw]">
            <DialogHeader>
              <DialogTitle>Kunde auswählen</DialogTitle>
              <DialogDescription>
                Wählen Sie einen bestehenden Kunden für diese Rechnung aus.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Kunde suchen..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Customer List */}
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {loading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#14ad9f]"></div>
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <div className="text-center py-8">
                    <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {searchTerm ? 'Keine Kunden gefunden' : 'Keine Kunden vorhanden'}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {searchTerm
                        ? 'Versuchen Sie einen anderen Suchbegriff oder erstellen Sie einen neuen Kunden.'
                        : 'Erstellen Sie zunächst Kunden in der Kundenverwaltung, um sie hier auswählen zu können.'}
                    </p>
                    <Button
                      onClick={() => {
                        window.open(
                          '/dashboard/company/' + companyId + '/finance/customers',
                          '_blank'
                        );
                      }}
                      className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Kunden erstellen
                    </Button>
                  </div>
                ) : (
                  filteredCustomers.map(customer => (
                    <div
                      key={customer.id}
                      className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleCustomerSelect(customer)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-sm text-gray-600">
                            <span className="font-mono">{customer.customerNumber}</span>
                          </div>
                          <div className="text-sm text-gray-500">{customer.email}</div>
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          <div>{customer.totalInvoices} Rechnungen</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add new customer hint */}
              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 text-center">
                  Neuen Kunden hinzufügen? Gehen Sie zu{' '}
                  <span className="text-[#14ad9f] font-medium">Finanzen → Kunden</span>
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
