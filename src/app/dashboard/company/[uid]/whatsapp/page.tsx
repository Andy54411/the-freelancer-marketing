'use client';

import { useParams } from 'next/navigation';
import {
  MessageCircle,
  Send,
  Search,
  Phone,
  User,
  Loader2,
  Settings,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useEffect, useState } from 'react';
import { WhatsAppService, WhatsAppMessage } from '@/services/whatsapp.service';
import { CustomerService } from '@/services/customerService';
import { Customer } from '@/components/finance/AddCustomerModal';
import { toast } from 'sonner';
import Link from 'next/link';

interface WhatsAppConnection {
  phoneNumber: string;
  isConnected: boolean;
  qrCode?: string;
  connectedAt?: string;
}

export default function WhatsAppPage() {
  const params = useParams();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  const [whatsappConnection, setWhatsappConnection] = useState<WhatsAppConnection | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [phoneNumberInput, setPhoneNumberInput] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && uid) {
      loadWhatsAppConnection();
      loadCustomers();
    }
  }, [uid, isMounted]);

  const loadWhatsAppConnection = async () => {
    if (!uid) return;

    try {
      const response = await fetch(`/api/whatsapp/connection?companyId=${uid}`);
      if (response.ok) {
        const data = await response.json();
        setWhatsappConnection(data);
      }
    } catch (error) {
      console.error('Error loading WhatsApp connection:', error);
    }
  };

  const handleInitiateConnection = async () => {
    if (!uid) return;

    if (!phoneNumberInput.trim()) {
      toast.error('Bitte gib deine WhatsApp-Nummer ein');
      return;
    }

    // Validiere Nummernformat (mindestens 6 Ziffern)
    const onlyDigits = phoneNumberInput.replace(/\D/g, '');
    if (!/^\d{6,15}$/.test(onlyDigits)) {
      toast.error('Ungültiges Nummernformat. Nutze z.B. +49123456789 oder 491234567890');
      return;
    }

    setIsConnecting(true);
    try {
      const response = await fetch('/api/whatsapp/generate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: uid,
          phoneNumber: onlyDigits,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.details || errorData.error || 'Fehler beim Starten der Verbindung'
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Fehler beim Setup');
      }

      // Öffne Facebook Login Dialog (Embedded Signup)
      if (data.signupUrl) {
        const width = 600;
        const height = 800;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;

        const popup = window.open(
          data.signupUrl,
          'WhatsApp Business Login',
          `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
        );

        if (!popup) {
          throw new Error('Popup wurde blockiert. Bitte erlaube Popups für diese Seite.');
        }

        toast.success('Login-Fenster geöffnet! Bitte autorisiere deine WhatsApp Nummer.');

        // Prüfe alle 2 Sekunden ob Verbindung erfolgreich war
        const checkInterval = setInterval(async () => {
          try {
            const statusResponse = await fetch(`/api/whatsapp/connection?companyId=${uid}`);
            const statusData = await statusResponse.json();

            if (statusData?.isConnected) {
              clearInterval(checkInterval);
              if (popup && !popup.closed) {
                popup.close();
              }

              setWhatsappConnection({
                phoneNumber: statusData.phoneNumber || onlyDigits,
                isConnected: true,
                connectedAt: statusData.connectedAt,
              });

              toast.success('✅ WhatsApp erfolgreich verbunden!');
              await loadCustomers();
            }
          } catch (err) {
            // Ignoriere Fehler beim Polling
          }
        }, 2000);

        // Stoppe nach 5 Minuten
        setTimeout(() => clearInterval(checkInterval), 5 * 60 * 1000);
      }
    } catch (error) {
      console.error('Error initiating connection:', error);
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Verbinden';
      toast.error(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!uid) return;

    try {
      const response = await fetch('/api/whatsapp/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: uid }),
      });

      if (!response.ok) {
        throw new Error('Fehler beim Trennen');
      }

      setWhatsappConnection({
        phoneNumber: '',
        isConnected: false,
        qrCode: undefined,
        connectedAt: undefined,
      });

      toast.success('WhatsApp-Verbindung getrennt');
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error(error instanceof Error ? error.message : 'Fehler beim Trennen');
    }
  };

  useEffect(() => {
    if (selectedCustomer) {
      loadMessages();
    }
  }, [selectedCustomer]);

  const loadCustomers = async () => {
    if (!uid) return;

    setIsLoading(true);
    try {
      const allCustomers = await CustomerService.getCustomers(uid);

      // Nur Kunden mit Telefonnummer anzeigen
      const customersWithPhone = allCustomers.filter(c => c.phone && c.phone.trim() !== '');

      setCustomers(customersWithPhone);
    } catch (error) {
      console.error('Error loading customers:', error);
      toast.error('Fehler beim Laden der Kontakte');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!selectedCustomer?.phone) return;

    try {
      const customerMessages = await WhatsAppService.getCustomerMessages(uid, selectedCustomer.id);
      setMessages(customerMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) {
      toast.error('Bitte gib eine Nachricht ein');
      return;
    }

    if (!selectedCustomer?.phone) {
      toast.error('Kunde hat keine Telefonnummer hinterlegt');
      return;
    }

    setIsSending(true);
    try {
      await WhatsAppService.sendMessage(
        uid, // companyId
        selectedCustomer.phone, // toPhone
        messageText, // message
        selectedCustomer.id, // customerId
        selectedCustomer.name // customerName
      );

      setMessageText('');
      toast.success('Nachricht gesendet!');

      // Reload messages
      await loadMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(error instanceof Error ? error.message : 'Fehler beim Senden der Nachricht');
    } finally {
      setIsSending(false);
    }
  };

  const filteredCustomers = customers.filter(
    customer =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Verhindere Hydration Mismatch - zeige nichts bis gemounted
  if (!isMounted) {
    return null;
  }

  // Wenn nicht verbunden, zeige Setup-Screen
  if (!whatsappConnection?.isConnected) {
    return (
      <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardContent className="p-8">
              <div className="text-center">
                <MessageCircle className="h-16 w-16 mx-auto mb-6 text-teal-600" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  WhatsApp Business verbinden
                </h2>
                <p className="text-gray-600 mb-8">
                  Verbinde deine WhatsApp Business Nummer und schreibe direkt aus Taskilo mit deinen
                  Kunden
                </p>

                <div className="max-w-sm mx-auto">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Deine WhatsApp Business Nummer
                    </label>
                    <Input
                      placeholder="+49 123 456789"
                      value={phoneNumberInput}
                      onChange={e => setPhoneNumberInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !isConnecting) {
                          handleInitiateConnection();
                        }
                      }}
                      disabled={isConnecting}
                      className="text-center text-lg"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Die Nummer, mit der du WhatsApp Business nutzt
                    </p>
                  </div>

                  <Button
                    onClick={handleInitiateConnection}
                    disabled={isConnecting || !phoneNumberInput.trim()}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-lg py-6"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Verbindung wird hergestellt...
                      </>
                    ) : (
                      <>
                        <MessageCircle className="h-5 w-5 mr-2" />
                        Mit WhatsApp verbinden
                      </>
                    )}
                  </Button>

                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-900 font-semibold mb-2">
                      Was passiert als nächstes?
                    </p>
                    <ol className="text-xs text-blue-800 space-y-1 text-left">
                      <li>1. Facebook Login-Fenster öffnet sich</li>
                      <li>2. Logge dich mit deinem Meta/Facebook Account ein</li>
                      <li>3. Wähle DEINE WhatsApp Business Nummer aus</li>
                      <li>4. Autorisiere Taskilo den Zugriff</li>
                      <li>5. Fertig! Du kannst mit DEINER Nummer aus Taskilo schreiben</li>
                    </ol>
                  </div>

                  <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-xs text-green-900">
                      <span className="font-semibold">✓ Deine eigene Nummer:</span> Kunden sehen
                      DEINE WhatsApp Business Nummer
                    </p>
                    <p className="text-xs text-green-900 mt-1">
                      <span className="font-semibold">✓ Kostenlos:</span> Erste 1.000
                      Konversationen/Monat gratis
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Kontakte laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      {/* Kontaktliste Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">WhatsApp Kontakte</h2>
              <div className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded-full">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-xs text-green-700">{whatsappConnection?.phoneNumber}</span>
              </div>
            </div>
            <Link href={`/dashboard/company/${uid}/whatsapp/settings`}>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Kontakte durchsuchen..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {filteredCustomers.length} Kontakte mit Telefonnummer
          </div>
        </div>

        {/* Kontaktliste */}
        <div className="flex-1 overflow-y-auto">
          {filteredCustomers.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <User className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">Keine Kontakte gefunden</p>
              <p className="text-xs mt-1">Füge Telefonnummern zu deinen Kunden hinzu</p>
            </div>
          ) : (
            filteredCustomers.map(customer => (
              <button
                key={customer.id}
                onClick={() => setSelectedCustomer(customer)}
                className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                  selectedCustomer?.id === customer.id ? 'bg-teal-50' : ''
                }`}
              >
                <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                  <span className="text-teal-700 font-medium text-sm">
                    {customer.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="font-medium text-gray-900 truncate">{customer.name}</div>
                  <div className="text-sm text-gray-500 flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {customer.phone}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Status */}
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-gray-600">WhatsApp verbunden</span>
            </div>
            <button
              onClick={handleDisconnect}
              className="text-xs text-teal-600 hover:text-teal-700 font-medium"
            >
              Trennen
            </button>
          </div>
        </div>
      </div>

      {/* Chat Bereich */}
      <div className="flex-1 flex flex-col">
        {selectedCustomer ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center">
                    <span className="text-teal-700 font-medium">
                      {selectedCustomer.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedCustomer.name}</h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {selectedCustomer.phone}
                    </p>
                  </div>
                </div>

                {/* WhatsApp App öffnen Button */}
                <Button
                  onClick={() => {
                    const message = messageText.trim() || 'Hallo';
                    WhatsAppService.openChat(selectedCustomer.phone!, message);
                    toast.success('WhatsApp wird geöffnet...');
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  In WhatsApp öffnen
                </Button>
              </div>
            </div>

            {/* Info Banner */}
            <div className="bg-green-50 border-b border-green-200 p-3">
              <div className="flex items-start gap-2">
                <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="h-3 w-3 text-white" />
                </div>
                <div className="flex-1 text-sm">
                  <p className="font-medium text-green-900">Frei schreiben ohne Einschränkungen</p>
                  <p className="text-green-700 text-xs mt-0.5">
                    Klicke auf &quot;In WhatsApp öffnen&quot; um direkt mit deiner WhatsApp Business
                    App zu schreiben - keine Templates erforderlich!
                  </p>
                </div>
              </div>
            </div>

            {/* Nachrichten */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">Noch keine Nachrichten</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Starte die Konversation mit {selectedCustomer.name}
                  </p>
                </div>
              ) : (
                messages.map(message => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.direction === 'outbound' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        message.direction === 'outbound'
                          ? 'bg-teal-600 text-white'
                          : 'bg-white text-gray-900 border border-gray-200'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.body}</p>
                      <p
                        className={`text-xs mt-1 ${
                          message.direction === 'outbound' ? 'text-teal-100' : 'text-gray-500'
                        }`}
                      >
                        {message.createdAt &&
                          new Date(message.createdAt).toLocaleString('de-DE', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Nachricht senden */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Nachricht vorschreiben (öffnet in WhatsApp)..."
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      WhatsAppService.openChat(
                        selectedCustomer.phone!,
                        messageText.trim() || 'Hallo'
                      );
                      toast.success('WhatsApp wird geöffnet...');
                    }
                  }}
                  className="resize-none"
                  rows={2}
                />
                <Button
                  onClick={() => {
                    WhatsAppService.openChat(
                      selectedCustomer.phone!,
                      messageText.trim() || 'Hallo'
                    );
                    toast.success('WhatsApp wird geöffnet...');
                  }}
                  className="bg-green-600 hover:bg-green-700"
                  title="In WhatsApp öffnen"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Nachricht wird in WhatsApp geöffnet - du kannst sie dort bearbeiten und senden
              </p>
            </div>
          </>
        ) : (
          /* Kein Kontakt ausgewählt */
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">WhatsApp Business</h3>
              <p className="text-gray-500 mb-4">Wähle einen Kontakt um zu chatten</p>
              <p className="text-sm text-gray-400">{customers.length} Kontakte verfügbar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
