'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Plus, Loader2, Phone, ChevronDown, Trash2, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface WhatsAppConnection {
  wabaId: string;
  phoneNumberId: string;
  phoneNumber: string;
  displayName: string;
  status: 'active' | 'pending_customer' | 'disconnected';
  assignedCustomerId?: string;
  defaultCountryCode: string;
  connectedAt: string;
}

export default function WhatsAppConnectionsPage() {
  const params = useParams();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  const [connections, setConnections] = useState<WhatsAppConnection[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedConnection, setExpandedConnection] = useState<string | null>(null);

  useEffect(() => {
    if (uid) {
      loadConnections();
      loadCustomers();
    }
  }, [uid]);

  useEffect(() => {
    console.log('Customers state:', customers);
  }, [customers]);

  const loadConnections = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/whatsapp/connection?companyId=${uid}`);
      if (response.ok) {
        const data = await response.json();
        if (data.isConnected) {
          setConnections([
            {
              wabaId: data.wabaId || '1119639836922483',
              phoneNumberId: data.phoneNumberId || '',
              phoneNumber: data.phoneNumber || '',
              displayName: data.displayName || 'Taskilo.de',
              status: data.assignedCustomerId ? 'active' : 'pending_customer',
              assignedCustomerId: data.assignedCustomerId,
              defaultCountryCode: data.defaultCountryCode || 'DE',
              connectedAt: data.connectedAt || new Date().toISOString(),
            },
          ]);
          if (data.wabaId) {
            setExpandedConnection(data.wabaId);
          }
        }
      }
    } catch (error) {
      console.error('Error loading connections:', error);
      toast.error('Fehler beim Laden der Verbindungen');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const { CustomerService } = await import('@/services/customerService');
      const allCustomers = await CustomerService.getCustomers(uid);
      console.log('Loaded customers:', allCustomers); // Debug
      setCustomers(allCustomers || []);
    } catch (error) {
      console.error('Error loading customers:', error);
      setCustomers([]);
    }
  };

  const handleAssignCustomer = async (connectionId: string, customerId: string) => {
    try {
      console.log('Assigning customer:', { connectionId, customerId, companyId: uid });

      // Optimistisches Update - sofort UI aktualisieren
      setConnections(prevConnections =>
        prevConnections.map(conn =>
          conn.wabaId === connectionId
            ? { ...conn, assignedCustomerId: customerId, status: 'active' as const }
            : conn
        )
      );

      const response = await fetch('/api/whatsapp/connection/assign-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: uid,
          customerId,
        }),
      });

      const data = await response.json();
      console.log('Assign response:', data);

      if (!response.ok) {
        // Bei Fehler: Zurücksetzen
        await loadConnections();
        throw new Error(data.error || 'Fehler beim Zuweisen');
      }

      toast.success('Kunde erfolgreich zugewiesen');
    } catch (error) {
      console.error('Error assigning customer:', error);
      toast.error('Fehler beim Zuweisen des Kunden');
    }
  };

  const handleUpdateCountryCode = async (connectionId: string, countryCode: string) => {
    try {
      const response = await fetch('/api/whatsapp/connection/update-country', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: uid,
          defaultCountryCode: countryCode,
        }),
      });

      if (!response.ok) throw new Error('Fehler beim Aktualisieren');

      toast.success('Vorwahl aktualisiert');
      loadConnections();
    } catch (error) {
      toast.error('Fehler beim Aktualisieren der Vorwahl');
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!confirm('Möchtest du diese WhatsApp-Verbindung wirklich trennen?')) return;

    try {
      const response = await fetch('/api/whatsapp/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: uid }),
      });

      if (!response.ok) throw new Error('Fehler beim Trennen');

      toast.success('Verbindung getrennt');
      loadConnections();
    } catch (error) {
      toast.error('Fehler beim Trennen der Verbindung');
    }
  };

  const getCustomerName = (customerId?: string) => {
    if (!customerId) return null;
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return null;
    return (
      customer.name ||
      `${customer.firstName || ''} ${customer.lastName || ''}`.trim() ||
      'Unbekannt'
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Verbindungen laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">WhatsApp Verbindungen</h1>
            <p className="text-sm text-gray-600 max-w-3xl">
              Verwalte deine WhatsApp for Business Verbindungen.
            </p>
          </div>
          <Button className="bg-teal-600 hover:bg-teal-700">
            <Plus className="h-4 w-4 mr-2" />
            Neue Verbindung
          </Button>
        </div>
      </div>

      {/* Connections List */}
      <div className="flex-1 overflow-y-auto p-6">
        {connections.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="max-w-md mx-auto">
              <Phone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Keine Verbindungen</h3>
              <p className="text-sm text-gray-600 mb-6">
                Du hast noch keine WhatsApp Business Nummer verbunden. Erstelle eine neue Verbindung
                um loszulegen.
              </p>
              <Button className="bg-teal-600 hover:bg-teal-700">
                <Plus className="h-4 w-4 mr-2" />
                Neue Verbindung
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {connections.map(connection => (
              <div
                key={connection.wabaId}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden"
              >
                {/* Connection Header */}
                <div className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <button
                    onClick={() =>
                      setExpandedConnection(
                        expandedConnection === connection.wabaId ? null : connection.wabaId
                      )
                    }
                    className="flex items-center gap-4 flex-1"
                  >
                    {/* WhatsApp Icon */}
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <svg
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-6 h-6"
                      >
                        <path
                          d="M10 18.75C14.8325 18.75 18.75 14.8325 18.75 10C18.75 5.16751 14.8325 1.25 10 1.25C5.16751 1.25 1.25 5.16751 1.25 10C1.25 11.5693 1.66312 13.0421 2.38655 14.3156L1.25 18.75L5.82179 17.6899C7.06336 18.3659 8.48682 18.75 10 18.75Z"
                          fill="#25D366"
                        />
                        <path
                          d="M7.81251 5.93761C7.60447 5.51975 7.28533 5.55675 6.96292 5.55675C6.38673 5.55675 5.48828 6.24692 5.48828 7.5314C5.48828 8.58411 5.95216 9.73645 7.51526 11.4603C9.02378 13.1239 11.0059 13.9844 12.6514 13.9551C14.2969 13.9258 14.6354 12.5098 14.6354 12.0316C14.6354 11.8197 14.5039 11.7139 14.4133 11.6852C13.8525 11.4161 12.8183 10.9146 12.583 10.8204C12.3477 10.7262 12.2248 10.8537 12.1484 10.923C11.935 11.1263 11.512 11.7257 11.3672 11.8605C11.2224 11.9953 11.0064 11.9271 10.9166 11.8761C10.5859 11.7434 9.68933 11.3446 8.97467 10.6518C8.09083 9.79504 8.03896 9.50027 7.87244 9.23788C7.73922 9.02796 7.83698 8.89917 7.88576 8.84289C8.07619 8.62316 8.33913 8.28393 8.45705 8.11535C8.57496 7.94677 8.48135 7.69082 8.42518 7.53141C8.18361 6.84582 7.97895 6.2719 7.81251 5.93761Z"
                          fill="white"
                        />
                      </svg>
                    </div>

                    {/* Connection Info */}
                    <div className="text-left">
                      <div className="font-semibold text-gray-900">{connection.displayName}</div>
                      <div className="text-sm text-gray-500">ID: {connection.wabaId}</div>
                    </div>
                  </button>

                  <div className="flex items-center gap-3">
                    {/* Delete Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDisconnect(connection.wabaId)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    {/* Expand Icon */}
                    <button
                      onClick={() =>
                        setExpandedConnection(
                          expandedConnection === connection.wabaId ? null : connection.wabaId
                        )
                      }
                      className="p-1"
                    >
                      <ChevronDown
                        className={`h-5 w-5 text-gray-400 transition-transform ${
                          expandedConnection === connection.wabaId ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Connection Details (Expanded) */}
                {expandedConnection === connection.wabaId && (
                  <div className="border-t border-gray-200">
                    <table className="w-full">
                      <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                        <tr>
                          <th className="px-6 py-3">Profile</th>
                          <th className="px-6 py-3">Kunde</th>
                          <th className="px-6 py-3">Standard Vorwahl</th>
                          <th className="px-6 py-3">Status</th>
                          <th className="px-6 py-3">Links</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-gray-200">
                          {/* Profile */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                <Phone className="w-5 h-5 text-green-700" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">
                                  {connection.displayName}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {connection.phoneNumber}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Kunde */}
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <Select
                                  value={connection.assignedCustomerId || 'none'}
                                  onValueChange={value => {
                                    if (value !== 'none') {
                                      handleAssignCustomer(connection.wabaId, value);
                                    }
                                  }}
                                >
                                  <SelectTrigger className="w-48">
                                    <SelectValue>
                                      {connection.assignedCustomerId
                                        ? getCustomerName(connection.assignedCustomerId) ||
                                          'Kunde nicht gefunden'
                                        : 'Wähle einen Kunden'}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {!connection.assignedCustomerId && (
                                      <SelectItem value="none" disabled>
                                        Wähle einen Kunden
                                      </SelectItem>
                                    )}
                                    {customers.length === 0 ? (
                                      <div className="px-2 py-4 text-sm text-gray-500 text-center">
                                        Keine Kunden gefunden
                                      </div>
                                    ) : (
                                      customers.map(customer => (
                                        <SelectItem key={customer.id} value={customer.id}>
                                          {customer.name ||
                                            `${customer.firstName || ''} ${customer.lastName || ''}`.trim()}
                                        </SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                                {customers.length === 0 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={loadCustomers}
                                    className="text-xs text-gray-500 hover:text-teal-600"
                                  >
                                    Neu laden
                                  </Button>
                                )}
                              </div>
                              {customers.length > 0 && (
                                <div className="text-xs text-gray-500">
                                  {customers.length} Kunde{customers.length !== 1 ? 'n' : ''}{' '}
                                  verfügbar
                                </div>
                              )}
                              {connection.assignedCustomerId && (
                                <div className="text-xs text-teal-600 font-medium">
                                  ✓ Zugewiesen: {getCustomerName(connection.assignedCustomerId)}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Standard Vorwahl */}
                          <td className="px-6 py-4">
                            <Select
                              value={connection.defaultCountryCode}
                              onValueChange={value =>
                                handleUpdateCountryCode(connection.wabaId, value)
                              }
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="DE">🇩🇪 +49</SelectItem>
                                <SelectItem value="AT">🇦🇹 +43</SelectItem>
                                <SelectItem value="CH">🇨🇭 +41</SelectItem>
                                <SelectItem value="US">🇺🇸 +1</SelectItem>
                                <SelectItem value="GB">🇬🇧 +44</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4">
                            {connection.status === 'active' ? (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                Kunde zugewiesen ✓
                              </Badge>
                            ) : (
                              <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                                ⚠ Kunde zuweisen
                              </Badge>
                            )}
                          </td>

                          {/* Links (Actions) */}
                          <td className="px-6 py-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>Details anzeigen</DropdownMenuItem>
                                <DropdownMenuItem>Einstellungen</DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600">
                                  Verbindung trennen
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add Another Connection Button */}
        {connections.length > 0 && (
          <div className="mt-6">
            <Button
              variant="outline"
              className="w-full border-2 border-dashed border-gray-300 hover:border-teal-600 hover:bg-teal-50"
            >
              <svg viewBox="0 0 40 40" className="w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M16.7,39.8C7.2,38.1,0,29.9,0,20C0,9,9,0,20,0s20,9,20,20c0,9.9-7.2,18.1-16.7,19.8l-1.1-0.9h-4.4L16.7,39.8z"
                  fill="url(#fb-gradient)"
                />
                <path
                  d="M27.8,25.6l0.9-5.6h-5.3v-3.9c0-1.6,0.6-2.8,3-2.8h2.6V8.2c-1.4-0.2-3-0.4-4.4-0.4c-4.6,0-7.8,2.8-7.8,7.8V20h-5v5.6h5v14.1c1.1,0.2,2.2,0.3,3.3,0.3c1.1,0,2.2-0.1,3.3-0.3V25.6H27.8z"
                  fill="#FFFFFF"
                />
                <defs>
                  <linearGradient
                    id="fb-gradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="40"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0" stopColor="#0062E0" />
                    <stop offset="1" stopColor="#19AFFF" />
                  </linearGradient>
                </defs>
              </svg>
              Weitere Verbindung hinzufügen
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
