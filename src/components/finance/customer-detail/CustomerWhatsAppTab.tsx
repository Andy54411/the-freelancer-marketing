'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  MessageSquare,
  Send,
  Phone,
  Loader2,
  ExternalLink,
  CheckCheck,
  Clock,
  FileText,
  Receipt,
} from 'lucide-react';
import { Customer } from '../AddCustomerModal';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import Link from 'next/link';

interface CustomerWhatsAppTabProps {
  customer: Customer;
  companyId: string;
}

interface WhatsAppMessage {
  id: string;
  content: string;
  direction: 'inbound' | 'outbound';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  createdAt: Date;
  messageType?: 'text' | 'document' | 'invoice';
  documentName?: string;
  invoiceNumber?: string;
}

interface WhatsAppActivity {
  id: string;
  type: 'whatsapp';
  title: string;
  description: string;
  timestamp: Date;
  messageCount?: number;
  direction?: 'inbound' | 'outbound';
}

export function CustomerWhatsAppTab({ customer, companyId }: CustomerWhatsAppTabProps) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [activities, setActivities] = useState<WhatsAppActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasWhatsApp, setHasWhatsApp] = useState(false);

  // Normalisierte Telefonnummer für Suche
  const normalizedPhone = customer.phone?.replace(/\D/g, '') || '';

  useEffect(() => {
    if (!customer?.id || !companyId || !normalizedPhone) {
      setLoading(false);
      return;
    }

    // Lade WhatsApp-Nachrichten für diese Telefonnummer
    const messagesRef = collection(db, 'companies', companyId, 'whatsappMessages');
    
    // Suche nach Nachrichten mit dieser Telefonnummer
    const messagesUnsubscribe = onSnapshot(
      messagesRef,
      (snapshot) => {
        const loadedMessages: WhatsAppMessage[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          const msgPhone = data.customerPhone?.replace(/\D/g, '') || '';
          
          // Prüfe ob Telefonnummer übereinstimmt (letzte 10 Ziffern)
          if (msgPhone.slice(-10) === normalizedPhone.slice(-10) || 
              normalizedPhone.slice(-10) === msgPhone.slice(-10)) {
            loadedMessages.push({
              id: doc.id,
              content: data.content || data.text || '',
              direction: data.direction || (data.isOutbound ? 'outbound' : 'inbound'),
              status: data.status || 'sent',
              createdAt: data.createdAt?.toDate?.() || new Date(),
              messageType: data.messageType || 'text',
              documentName: data.documentName,
              invoiceNumber: data.invoiceNumber,
            });
          }
        });

        // Sortiere nach Datum (neueste zuerst)
        loadedMessages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
        setMessages(loadedMessages);
        setHasWhatsApp(loadedMessages.length > 0);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    // Lade WhatsApp-Aktivitäten aus customer activities
    const activitiesRef = collection(
      db,
      'companies',
      companyId,
      'customers',
      customer.id,
      'activities'
    );

    const activitiesUnsubscribe = onSnapshot(
      activitiesRef,
      (snapshot) => {
        const loadedActivities: WhatsAppActivity[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.type === 'whatsapp') {
            loadedActivities.push({
              id: doc.id,
              type: 'whatsapp',
              title: data.title || 'WhatsApp-Nachricht',
              description: data.description || '',
              timestamp: data.timestamp?.toDate?.() || new Date(),
              messageCount: data.messageCount,
              direction: data.direction,
            });
          }
        });

        // Sortiere nach Datum (neueste zuerst)
        loadedActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setActivities(loadedActivities);
      }
    );

    return () => {
      messagesUnsubscribe();
      activitiesUnsubscribe();
    };
  }, [customer?.id, companyId, normalizedPhone]);

  // Formatiere Datum für Anzeige
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Heute, ${date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Gestern, ${date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays < 7) {
      return date.toLocaleDateString('de-DE', { weekday: 'long', hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('de-DE', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Status-Icon für Nachrichten
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case 'sent':
        return <Clock className="w-3 h-3 text-gray-400" />;
      default:
        return null;
    }
  };

  // Nachrichtentyp-Icon
  const getMessageTypeIcon = (type?: string) => {
    switch (type) {
      case 'document':
        return <FileText className="w-4 h-4 text-gray-500" />;
      case 'invoice':
        return <Receipt className="w-4 h-4 text-[#14ad9f]" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#14ad9f]" />
      </div>
    );
  }

  // Keine Telefonnummer vorhanden
  if (!customer.phone) {
    return (
      <div className="text-center py-20">
        <Phone className="h-16 w-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Keine Telefonnummer</h3>
        <p className="text-gray-500 mb-6 text-sm">
          Für diesen Kunden ist keine Telefonnummer hinterlegt.
        </p>
      </div>
    );
  }

  // Keine WhatsApp-Kommunikation
  if (!hasWhatsApp && activities.length === 0) {
    return (
      <div className="text-center py-20">
        <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Keine WhatsApp-Kommunikation</h3>
        <p className="text-gray-500 mb-6 text-sm max-w-md mx-auto">
          Mit diesem Kunden wurde noch nicht über WhatsApp kommuniziert.
          Starten Sie einen Chat, um die Kommunikation hier zu verfolgen.
        </p>
        <Link
          href={`/dashboard/company/${companyId}/whatsapp?phone=${encodeURIComponent(customer.phone)}`}
          className="inline-flex items-center gap-2 px-5 py-2 bg-[#25D366] text-white text-sm rounded-lg hover:bg-green-600 transition-colors font-medium"
        >
          <Send className="w-4 h-4" />
          WhatsApp-Chat starten
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header mit Link zum WhatsApp-Chat */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">WhatsApp-Kommunikation</h3>
          <p className="text-sm text-gray-500">{messages.length} Nachrichten mit diesem Kunden</p>
        </div>
        <Link
          href={`/dashboard/company/${companyId}/whatsapp?phone=${encodeURIComponent(customer.phone || '')}`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white text-sm rounded-lg hover:bg-green-600 transition-colors font-medium"
        >
          <ExternalLink className="w-4 h-4" />
          Chat öffnen
        </Link>
      </div>

      {/* Statistiken */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900">{messages.length}</div>
            <div className="text-sm text-gray-500">Nachrichten gesamt</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900">
              {messages.filter(m => m.direction === 'inbound').length}
            </div>
            <div className="text-sm text-gray-500">Eingehend</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900">
              {messages.filter(m => m.direction === 'outbound').length}
            </div>
            <div className="text-sm text-gray-500">Gesendet</div>
          </CardContent>
        </Card>
      </div>

      {/* Aktivitäten-Verlauf (für andere Mitarbeiter sichtbar) */}
      {activities.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b border-gray-100">
              <h4 className="font-medium text-gray-900">Aktivitäten-Verlauf</h4>
              <p className="text-xs text-gray-500">Dokumentierte WhatsApp-Interaktionen</p>
            </div>
            <div className="divide-y divide-gray-100">
              {activities.slice(0, 10).map((activity) => (
                <div key={activity.id} className="px-4 py-3 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{activity.description}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(activity.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Letzte Nachrichten (Vorschau) */}
      <Card>
        <CardContent className="p-0">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Letzte Nachrichten</h4>
              <p className="text-xs text-gray-500">Die letzten 20 Nachrichten</p>
            </div>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            <div className="p-4 space-y-3">
              {messages.slice(0, 20).map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      msg.direction === 'outbound'
                        ? 'bg-[#25D366] text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {/* Nachrichtentyp-Icon */}
                    {msg.messageType && msg.messageType !== 'text' && (
                      <div className="flex items-center gap-2 mb-1 pb-1 border-b border-white/20">
                        {getMessageTypeIcon(msg.messageType)}
                        <span className="text-xs opacity-80">
                          {msg.messageType === 'invoice' ? `Rechnung ${msg.invoiceNumber}` : msg.documentName}
                        </span>
                      </div>
                    )}
                    <p className="text-sm">{msg.content}</p>
                    <div className={`flex items-center gap-1 mt-1 text-xs ${
                      msg.direction === 'outbound' ? 'text-white/70' : 'text-gray-500'
                    }`}>
                      <span>{msg.createdAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
                      {msg.direction === 'outbound' && getStatusIcon(msg.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
