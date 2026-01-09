'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Link2,
  Search,
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  X,
  Check,
  Loader2,
  ExternalLink,
  Unlink,
} from 'lucide-react';
import { db } from '@/firebase/clients';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { toast } from 'sonner';
import Link from 'next/link';

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  type?: 'customer' | 'supplier' | 'partner';
}

interface ContactLinkerProps {
  companyId: string;
  contactPhone: string;
  currentCustomerId?: string | null;
  currentCustomerName?: string | null;
  onLink?: (customerId: string, customerName: string) => void;
  onUnlink?: () => void;
}

export default function ContactLinker({
  companyId,
  contactPhone,
  currentCustomerId,
  currentCustomerName: _currentCustomerName,
  onLink,
  onUnlink,
}: ContactLinkerProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [linkedCustomer, setLinkedCustomer] = useState<Customer | null>(null);

  // Lade verknüpften Kunden
  const loadLinkedCustomer = useCallback(async () => {
    if (!currentCustomerId || !companyId) {
      setLinkedCustomer(null);
      return;
    }

    try {
      const response = await fetch(
        `/api/whatsapp/chat/contact?companyId=${companyId}&contactId=${contactPhone.replace(/\D/g, '')}`
      );
      const data = await response.json();

      if (data.success && data.crmCustomer) {
        setLinkedCustomer({
          id: data.crmCustomer.id,
          name: data.crmCustomer.name,
          email: data.crmCustomer.email,
          phone: data.crmCustomer.phone,
          company: data.crmCustomer.company,
          address: data.crmCustomer.address,
          city: data.crmCustomer.city,
          postalCode: data.crmCustomer.postalCode,
        });
      }
    } catch {
      // Fehler ignorieren
    }
  }, [companyId, currentCustomerId, contactPhone]);

  useEffect(() => {
    loadLinkedCustomer();
  }, [loadLinkedCustomer]);

  // Suche Kunden
  const searchCustomers = async (searchTerm: string) => {
    if (!searchTerm.trim() || searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `/api/whatsapp/chat/contact?companyId=${companyId}&query=${encodeURIComponent(searchTerm)}&limit=10`
      );
      const data = await response.json();

      if (data.success && data.customers) {
        setSearchResults(data.customers);
      } else {
        // Fallback: Lokale Suche
        const customersSnapshot = await getDocs(
          query(collection(db, 'companies', companyId, 'customers'), limit(50))
        );

        const searchLower = searchTerm.toLowerCase();
        const matches = customersSnapshot.docs
          .map(docSnap => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              name: d.name || `${d.firstName || ''} ${d.lastName || ''}`.trim(),
              email: d.email,
              phone: d.phone,
              company: d.company,
              type: d.type,
            };
          })
          .filter(c => {
            const fields = [c.name, c.email, c.phone, c.company]
              .filter(Boolean)
              .map(f => f?.toLowerCase());
            return fields.some(f => f?.includes(searchLower));
          })
          .slice(0, 10);

        setSearchResults(matches);
      }
    } catch {
      toast.error('Fehler bei der Suche');
    } finally {
      setLoading(false);
    }
  };

  // Debounced Search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isSearching && searchQuery) {
        searchCustomers(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, isSearching]);

  // Verknüpfe Kontakt
  const handleLink = async (customer: Customer) => {
    try {
      setLinking(true);

      const response = await fetch('/api/whatsapp/chat/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          contactId: contactPhone.replace(/\D/g, ''),
          customerId: customer.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setLinkedCustomer(customer);
        setIsSearching(false);
        setSearchQuery('');
        setSearchResults([]);
        onLink?.(customer.id, customer.name);
        toast.success(`Mit ${customer.name} verknüpft`);
      } else {
        throw new Error(data.error);
      }
    } catch {
      toast.error('Verknüpfung fehlgeschlagen');
    } finally {
      setLinking(false);
    }
  };

  // Entferne Verknüpfung
  const handleUnlink = async () => {
    if (!confirm('Möchten Sie die CRM-Verknüpfung wirklich entfernen?')) return;

    try {
      setLinking(true);

      const response = await fetch(
        `/api/whatsapp/chat/contact?companyId=${companyId}&contactId=${contactPhone.replace(/\D/g, '')}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (data.success) {
        setLinkedCustomer(null);
        onUnlink?.();
        toast.success('Verknüpfung entfernt');
      } else {
        throw new Error(data.error);
      }
    } catch {
      toast.error('Fehler beim Entfernen der Verknüpfung');
    } finally {
      setLinking(false);
    }
  };

  // Verknüpfter Kunde anzeigen
  if (linkedCustomer && !isSearching) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-green-50 border-b border-green-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">CRM-Verknüpfung</span>
          </div>
          <button
            onClick={handleUnlink}
            disabled={linking}
            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
            title="Verknüpfung entfernen"
          >
            {linking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Unlink className="w-4 h-4" />
            )}
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#14ad9f]/10 flex items-center justify-center shrink-0">
              {linkedCustomer.company ? (
                <Building2 className="w-5 h-5 text-[#14ad9f]" />
              ) : (
                <User className="w-5 h-5 text-[#14ad9f]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-medium text-gray-900 truncate">{linkedCustomer.name}</h4>
              {linkedCustomer.company && (
                <p className="text-sm text-gray-500 truncate">{linkedCustomer.company}</p>
              )}
            </div>
          </div>

          {linkedCustomer.email && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="truncate">{linkedCustomer.email}</span>
            </div>
          )}

          {linkedCustomer.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="w-4 h-4 text-gray-400" />
              <span>{linkedCustomer.phone}</span>
            </div>
          )}

          {(linkedCustomer.address || linkedCustomer.city) && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="truncate">
                {[linkedCustomer.address, linkedCustomer.postalCode, linkedCustomer.city]
                  .filter(Boolean)
                  .join(', ')}
              </span>
            </div>
          )}

          <Link
            href={`/dashboard/company/${companyId}/finance/contacts?id=${linkedCustomer.id}`}
            className="flex items-center justify-center gap-2 w-full px-3 py-2 mt-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Kundenprofil öffnen
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>
    );
  }

  // Suchansicht
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">CRM-Verknüpfung</span>
        </div>
        {isSearching && (
          <button
            onClick={() => {
              setIsSearching(false);
              setSearchQuery('');
              setSearchResults([]);
            }}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-4">
        {!isSearching ? (
          <button
            onClick={() => setIsSearching(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-[#14ad9f] hover:text-[#14ad9f] transition-colors"
          >
            <User className="w-5 h-5" />
            <span className="font-medium">Mit CRM-Kontakt verknüpfen</span>
          </button>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Name, E-Mail oder Telefon suchen..."
                autoFocus
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
              />
              {loading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="max-h-64 overflow-y-auto space-y-1">
                {searchResults.map(customer => (
                  <button
                    key={customer.id}
                    onClick={() => handleLink(customer)}
                    disabled={linking}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-left transition-colors disabled:opacity-50"
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{customer.name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {[customer.email, customer.phone].filter(Boolean).join(' | ')}
                      </p>
                    </div>
                    {linking ? (
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    ) : (
                      <Check className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {searchQuery.length >= 2 && !loading && searchResults.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                <User className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Keine Kunden gefunden</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
