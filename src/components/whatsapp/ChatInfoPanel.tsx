'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Globe, Mail, ChevronDown, X, Plus, RefreshCw, Settings } from 'lucide-react';
import { formatPhoneNumber, getChatDuration, parseTimestamp } from './utils';
import type { ChatTag, ChatHistoryEntry, ContactInfo, WhatsAppMessage } from './types';
import {
  OrderConfirmationIntegration,
  ShipmentTrackingIntegration,
  AppointmentReminderIntegration,
  AutoNotificationsIntegration,
} from './integrations';

interface ChatInfoPanelProps {
  uid: string;
  selectedChat: {
    phone: string;
    customerId?: string;
    customerName?: string;
  };
  messages: WhatsAppMessage[];
  chatTags: ChatTag[];
  setChatTags: (tags: ChatTag[]) => void;
  chatHistory: ChatHistoryEntry[];
  contactInfo: ContactInfo | null;
  chatStartTime: Date | null;
  onRefresh: () => void;
}

const suggestedTags: ChatTag[] = [
  { id: 's1', name: 'Support', color: 'bg-blue-100 text-blue-700' },
  { id: 's2', name: 'Bestellung', color: 'bg-green-100 text-green-700' },
  { id: 's3', name: 'Reklamation', color: 'bg-red-100 text-red-700' },
  { id: 's4', name: 'Anfrage', color: 'bg-purple-100 text-purple-700' },
  { id: 's5', name: 'Rückerstattung', color: 'bg-orange-100 text-orange-700' },
];

export default function ChatInfoPanel({
  uid,
  selectedChat,
  messages,
  chatTags,
  setChatTags,
  chatHistory,
  contactInfo,
  chatStartTime,
  onRefresh,
}: ChatInfoPanelProps) {
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [, setTick] = useState(0);
  const [activeTab, setActiveTab] = useState<'info' | 'integrations'>('info');

  // Timer für Chat-Dauer (aktualisiert alle 10 Sekunden)
  useEffect(() => {
    if (!chatStartTime) return;
    const timer = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(timer);
  }, [chatStartTime]);

  const addTag = async (tag: ChatTag) => {
    if (chatTags.find((t) => t.id === tag.id)) return;

    const newTags = [...chatTags, tag];
    setChatTags(newTags);

    try {
      await fetch('/api/whatsapp/chat/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: uid,
          phone: selectedChat.phone,
          tags: newTags,
        }),
      });
    } catch {
      setChatTags(chatTags);
    }
  };

  const removeTag = async (tagId: string) => {
    const newTags = chatTags.filter((t) => t.id !== tagId);
    setChatTags(newTags);

    try {
      await fetch('/api/whatsapp/chat/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: uid,
          phone: selectedChat.phone,
          tags: newTags,
        }),
      });
    } catch {
      setChatTags(chatTags);
    }
  };

  const getCustomerSince = (): string => {
    if (!contactInfo?.customerSince) {
      if (messages.length > 0) {
        const firstMsg = messages[0];
        const date = parseTimestamp(firstMsg.createdAt);
        return date ? date.getFullYear().toString() : new Date().getFullYear().toString();
      }
      return new Date().getFullYear().toString();
    }
    const since = parseTimestamp(contactInfo.customerSince);
    return since ? since.getFullYear().toString() : new Date().getFullYear().toString();
  };

  const getLastActivity = (): string => {
    if (!contactInfo?.lastActivity && messages.length === 0) {
      return 'Unbekannt';
    }

    const lastDate = contactInfo?.lastActivity
      ? parseTimestamp(contactInfo.lastActivity)
      : messages.length > 0
        ? parseTimestamp(messages[messages.length - 1].createdAt)
        : new Date();

    if (!lastDate) return 'Unbekannt';

    const now = new Date();
    const diffMs = now.getTime() - lastDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Gerade eben';
    if (diffMins < 5) return 'Vor wenigen Minuten';
    if (diffMins < 60) return `Vor ${diffMins} Minuten`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Vor ${diffHours} Stunden`;
    const diffDays = Math.floor(diffHours / 24);
    return `Vor ${diffDays} Tagen`;
  };

  const formatHistoryDate = (date: Date | string) => {
    const d = date instanceof Date ? date : new Date(date);
    return {
      day: d.getDate().toString().padStart(2, '0'),
      month: d.toLocaleDateString('de-DE', { month: 'short' }),
    };
  };

  return (
    <div className="w-80 border-l border-gray-200 flex flex-col bg-white h-full overflow-hidden shrink-0">
      {/* Scrollable Content Container */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Contact Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">
                {contactInfo?.name || selectedChat.customerName || formatPhoneNumber(selectedChat.phone)}
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={onRefresh} className="p-1.5 hover:bg-gray-100 rounded" title="Aktualisieren">
                <RefreshCw className="w-4 h-4 text-gray-400" />
              </button>
              <button className="p-1.5 hover:bg-gray-100 rounded">
                <Settings className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Contact Note */}
          <p className="text-sm text-gray-600 mt-3 line-clamp-2">
            Kunde seit {getCustomerSince()}. {getLastActivity()}.
          </p>

          {/* Technical Details */}
          <div className="mt-4 space-y-2 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5" />
              <span>{formatPhoneNumber(selectedChat.phone)}</span>
            </div>
            {contactInfo?.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5" />
                <a href={`mailto:${contactInfo.email}`} className="hover:text-blue-500">
                  {contactInfo.email}
                </a>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowMoreDetails(!showMoreDetails)}
            className="text-xs text-blue-500 hover:text-blue-600 mt-2 flex items-center gap-1"
          >
            {showMoreDetails ? 'Weniger Details' : 'Mehr Details'}
            <ChevronDown className={`w-3 h-3 transition-transform ${showMoreDetails ? 'rotate-180' : ''}`} />
          </button>

          {/* Erweiterte Kundendetails */}
          {showMoreDetails && contactInfo && (
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
              {contactInfo.customerNumber && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Kundennummer:</span>
                  <span className="text-gray-900 font-medium">{contactInfo.customerNumber}</span>
                </div>
              )}

              {contactInfo.address && (
                <div className="text-xs">
                  <span className="text-gray-500 block mb-1">Adresse:</span>
                  <span className="text-gray-900">{contactInfo.address}</span>
                </div>
              )}

              {contactInfo.website && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Website:</span>
                  <a
                    href={contactInfo.website.startsWith('http') ? contactInfo.website : `https://${contactInfo.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {contactInfo.website}
                  </a>
                </div>
              )}

              {contactInfo.vatId && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">USt-IdNr:</span>
                  <span className="text-gray-900">{contactInfo.vatId}</span>
                </div>
              )}

              {contactInfo.taxNumber && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Steuernummer:</span>
                  <span className="text-gray-900">{contactInfo.taxNumber}</span>
                </div>
              )}

              {contactInfo.industry && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Branche:</span>
                  <span className="text-gray-900">{contactInfo.industry}</span>
                </div>
              )}

              {contactInfo.totalInvoices !== undefined && contactInfo.totalInvoices > 0 && (
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Rechnungen:</span>
                    <span className="text-gray-900 font-medium">{contactInfo.totalInvoices}</span>
                  </div>
                  {contactInfo.totalAmount !== undefined && contactInfo.totalAmount > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Gesamtumsatz:</span>
                      <span className="text-gray-900 font-medium">
                        {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(
                          contactInfo.totalAmount
                        )}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {contactInfo.notes && (
                <div className="text-xs">
                  <span className="text-gray-500 block mb-1">Notizen:</span>
                  <p className="text-gray-700 bg-gray-50 rounded p-2">{contactInfo.notes}</p>
                </div>
              )}

              {contactInfo.tags && contactInfo.tags.length > 0 && (
                <div className="text-xs">
                  <span className="text-gray-500 block mb-1">Kunden-Tags:</span>
                  <div className="flex flex-wrap gap-1">
                    {contactInfo.tags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {contactInfo.customerLink && (
                <Link
                  href={contactInfo.customerLink}
                  className="block w-full mt-3 px-3 py-2 bg-[#14ad9f] text-white text-xs font-medium text-center rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Kundenprofil öffnen
                </Link>
              )}

              {!contactInfo.customerId && (
                <div className="text-xs text-gray-500 italic">
                  Dieser Kontakt ist noch nicht als Kunde angelegt.
                  <Link
                    href={`/dashboard/company/${uid}/finance/contacts?action=new&phone=${encodeURIComponent(selectedChat.phone)}&name=${encodeURIComponent(contactInfo.name || '')}`}
                    className="block mt-2 text-blue-500 hover:underline"
                  >
                    Als Kunde anlegen
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="sticky top-0 flex border-b border-gray-100 bg-white z-10">
          <button 
            onClick={() => setActiveTab('info')}
            className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'info' 
                ? 'text-blue-600 border-blue-600' 
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            Chat Informationen
          </button>
          <button 
            onClick={() => setActiveTab('integrations')}
            className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'integrations' 
                ? 'text-blue-600 border-blue-600' 
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            Integrationen
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
        
        {/* Integrationen Tab */}
        {activeTab === 'integrations' && (
          <div className="space-y-4">
            <OrderConfirmationIntegration uid={uid} contactPhone={selectedChat.phone} />
            <ShipmentTrackingIntegration uid={uid} contactPhone={selectedChat.phone} />
            <AppointmentReminderIntegration uid={uid} contactPhone={selectedChat.phone} />
            <AutoNotificationsIntegration uid={uid} contactPhone={selectedChat.phone} />

            {/* Hinweis */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">
                Aktivierte Integrationen werden für diesen Kontakt angewendet. 
                Globale Einstellungen findest du in den 
                <Link href={`/dashboard/company/${uid}/whatsapp/settings`} className="text-blue-500 hover:underline ml-1">
                  WhatsApp-Einstellungen
                </Link>.
              </p>
            </div>
          </div>
        )}
        
        {/* Chat Info Tab */}
        {activeTab === 'info' && (
          <>
        {/* Chat Tags */}
        <div>
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Chat Tags</h4>
          <div className="flex flex-wrap gap-2">
            {chatTags.length === 0 ? (
              <p className="text-xs text-gray-400">Keine Tags vergeben</p>
            ) : (
              chatTags.map((tag) => (
                <span
                  key={tag.id}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${tag.color}`}
                >
                  <X className="w-3 h-3 cursor-pointer hover:opacity-70" onClick={() => removeTag(tag.id)} />
                  {tag.name}
                </span>
              ))
            )}
          </div>

          {/* Suggested Tags */}
          <div className="mt-3">
            <p className="text-xs text-gray-400 mb-2">Vorgeschlagene Tags:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedTags
                .filter((st) => !chatTags.find((ct) => ct.name === st.name))
                .map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => addTag(tag)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
                  >
                    <Plus className="w-3 h-3" />
                    {tag.name}
                  </button>
                ))}
            </div>
          </div>
        </div>

        {/* Time */}
        <div>
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Zeit</h4>
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Aktuelle Zeit:</span>
              <span className="text-gray-900 font-medium">
                {new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} (CET)
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Chat-Dauer:</span>
              <span className="text-gray-900 font-medium">{getChatDuration(chatStartTime)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Nachrichten:</span>
              <span className="text-gray-900 font-medium">{messages.length}</span>
            </div>
          </div>
        </div>

        {/* Chat History */}
        <div>
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Chat-Verlauf</h4>
          <div className="space-y-3">
            {chatHistory.length === 0 ? (
              <p className="text-xs text-gray-400">Noch keine Einträge</p>
            ) : (
              chatHistory.slice(0, 10).map((entry) => {
                const dateInfo = formatHistoryDate(entry.date);
                const actionLabels: Record<string, string> = {
                  opened: 'Geöffnet von',
                  closed: 'Geschlossen von',
                  handled: 'Bearbeitet von',
                  assigned: 'Zugewiesen an',
                  tagged: 'Getaggt von',
                };
                return (
                  <div key={entry.id} className="flex gap-3">
                    <div className="w-10 text-center">
                      <div className="text-sm font-semibold text-gray-900">{dateInfo.day}</div>
                      <div className="text-[10px] text-gray-400">{dateInfo.month}</div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-700">
                        {actionLabels[entry.action] || entry.action}{' '}
                        <span className="font-medium">{entry.agent}</span>
                      </p>
                      {entry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {entry.tags.map((tag) => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        </>) /* Ende Chat Info Tab */}
      </div>
      </div>
    </div>
  );
}
