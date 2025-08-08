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
}

export function CustomerSelect({
  companyId,
  onCustomerSelect,
  selectedCustomer,
  isOpen = false,
  onClose,
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
    if (isOpen === undefined) {
      setInternalOpen(true);
    }
  };

  // Load customers from Firestore
  const loadCustomers = async () => {
    try {
      setLoading(true);
      const customersQuery = query(
        collection(db, 'customers'),
        where('companyId', '==', companyId),
        orderBy('name', 'asc')
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
          contactPersons: data.contactPersons || [],
          companyId: data.companyId || companyId,
        });
      });

      setCustomers(loadedCustomers);
    } catch (error) {
      console.error('Fehler beim Laden der Kunden:', error);
      toast.error('Fehler beim Laden der Kundendaten');
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
              <div className="text-sm text-gray-600">{selectedCustomer.customerNumber}</div>
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

          <DialogContent className="sm:max-w-[500px]">
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
                  <div className="text-center py-4 text-gray-500">
                    {searchTerm ? 'Keine Kunden gefunden' : 'Keine Kunden vorhanden'}
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
                          <div className="text-sm text-gray-600">{customer.customerNumber}</div>
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
