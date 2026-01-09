'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { WhatsAppService, WhatsAppMessage } from '@/services/whatsapp.service';
import { handleApiResponse } from '@/hooks/useFirestoreIndexHandler';

import {
  SetupScreen,
  ChatListPanel,
  ActiveChatPanel,
  ChatInfoPanel,
} from '@/components/whatsapp';

import type {
  WhatsAppConnection,
  ChatFilter,
  ChatTag,
  ChatHistoryEntry,
  ContactInfo,
  WhatsAppChat,
} from '@/components/whatsapp';

export default function WhatsAppPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  // State
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [whatsappConnection, setWhatsappConnection] = useState<WhatsAppConnection | null>(null);
  const [chats, setChats] = useState<WhatsAppChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<WhatsAppChat | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [phoneNumberInput, setPhoneNumberInput] = useState('');
  const [activeFilter, setActiveFilter] = useState<ChatFilter>('open');
  const [reorderByLatest, setReorderByLatest] = useState(true);
  const [showInfoPanel] = useState(true);

  // Chat Info State
  const [chatTags, setChatTags] = useState<ChatTag[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatHistoryEntry[]>([]);
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [chatStartTime, setChatStartTime] = useState<Date | null>(null);

  // Handle OAuth Callback
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'true') {
      toast.success('WhatsApp erfolgreich verbunden!');
      router.replace(`/dashboard/company/${uid}/whatsapp`);
    } else if (error) {
      const errorMessages: Record<string, string> = {
        token_exchange_failed: 'Autorisierung fehlgeschlagen. Bitte versuche es erneut.',
        no_phone_number_found: 'Keine WhatsApp Business Nummer gefunden.',
        firebase_unavailable: 'Datenbank nicht verfügbar.',
        missing_params: 'Fehlende Parameter.',
        callback_failed: 'Verbindung fehlgeschlagen.',
      };
      toast.error(errorMessages[error] || `Fehler: ${error}`);
      router.replace(`/dashboard/company/${uid}/whatsapp`);
    }
  }, [searchParams, uid, router]);

  // Daten laden
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [connection, chatList] = await Promise.all([
        WhatsAppService.getConnection(uid),
        WhatsAppService.getChats(uid),
      ]);

      // Token-Erneuerung prüfen
      if (connection?.isConnected && connection?.accessToken && connection?.tokenExpiresAt) {
        const expiresAt = new Date(connection.tokenExpiresAt);
        const now = new Date();
        const daysUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

        if (daysUntilExpiry < 7) {
          try {
            const refreshResponse = await fetch('/api/whatsapp/renew-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ companyId: uid, attemptAutoRenew: true }),
            });

            const refreshResult = await refreshResponse.json();

            if (!refreshResult.success && daysUntilExpiry <= 0) {
              setWhatsappConnection({
                ...connection,
                isConnected: false,
                accessToken: undefined,
                phoneNumberId: undefined,
              });
              setChats(chatList);
              setIsLoading(false);
              return;
            }
          } catch {
            // Fehler ignorieren
          }
        }
      }

      setWhatsappConnection(connection);
      setChats(chatList);
    } catch {
      toast.error('Fehler beim Laden der Daten');
    } finally {
      setIsLoading(false);
    }
  }, [uid]);

  // Initial laden + Real-time Listener
  useEffect(() => {
    setIsMounted(true);
    if (!uid) return;

    loadData();

    const messagesRef = collection(db, 'companies', uid, 'whatsappMessages');
    const q = query(messagesRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, async () => {
      try {
        const chatList = await WhatsAppService.getChats(uid);
        setChats(chatList);
      } catch {
        // Fehler ignorieren
      }
    });

    return () => unsubscribe();
  }, [uid, loadData]);

  // Nachrichten-Listener für ausgewählten Chat
  useEffect(() => {
    if (!selectedChat || !uid) return;

    const normalizedPhone = selectedChat.phone.replace(/\D/g, '');
    const messagesRef = collection(db, 'companies', uid, 'whatsappMessages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allMessages = snapshot.docs.map((doc) => {
        const data = doc.data();
        let createdAtValue: Date | string = new Date();
        if (data.createdAt?.toDate) {
          createdAtValue = data.createdAt.toDate();
        } else if (data.createdAt?.seconds) {
          createdAtValue = new Date(data.createdAt.seconds * 1000);
        } else if (data.createdAt) {
          createdAtValue = data.createdAt;
        }

        return {
          id: doc.id,
          ...data,
          createdAt: createdAtValue,
        } as WhatsAppMessage;
      });

      const filteredMessages = allMessages.filter((msg) => {
        const msgPhone = (msg.customerPhone || '').replace(/\D/g, '');
        return (
          msgPhone === normalizedPhone ||
          msgPhone.endsWith(normalizedPhone) ||
          normalizedPhone.endsWith(msgPhone)
        );
      });

      filteredMessages.sort((a, b) => {
        const getMs = (val: Date | string | { seconds: number; nanoseconds: number }): number => {
          if (val instanceof Date) return val.getTime();
          if (typeof val === 'string') return new Date(val).getTime();
          if (val && typeof val === 'object' && 'seconds' in val) return val.seconds * 1000;
          return 0;
        };
        return getMs(a.createdAt) - getMs(b.createdAt);
      });

      setMessages(filteredMessages);

      setTimeout(() => {
        document.getElementById('chat-messages')?.scrollTo({ top: 999999, behavior: 'smooth' });
      }, 100);
    });

    return () => unsubscribe();
  }, [selectedChat, uid]);

  // Chat-Info laden
  const loadChatInfo = async (phone: string) => {
    try {
      const [tagsResponse, historyResponse, contactResponse] = await Promise.all([
        fetch(`/api/whatsapp/chat/tags?companyId=${uid}&phone=${encodeURIComponent(phone)}`),
        fetch(`/api/whatsapp/chat/history?companyId=${uid}&phone=${encodeURIComponent(phone)}`),
        fetch(`/api/whatsapp/chat/contact?companyId=${uid}&phone=${encodeURIComponent(phone)}`),
      ]);

      if (tagsResponse.ok) {
        const tagsData = await tagsResponse.json();
        if (!handleApiResponse(tagsData)) {
          setChatTags(tagsData.tags || []);
        }
      }

      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        if (!handleApiResponse(historyData)) {
          setChatHistory(historyData.history || []);
        }
      }

      if (contactResponse.ok) {
        const contactData = await contactResponse.json();
        if (!handleApiResponse(contactData)) {
          setContactInfo(contactData.contact || null);
        }
      }

      setChatStartTime(new Date());

      await fetch('/api/whatsapp/chat/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: uid,
          phone,
          action: 'opened',
          agent: 'Nutzer',
          tags: [],
        }),
      });
    } catch {
      // Fehler ignorieren
    }
  };

  // Chat auswählen
  const handleSelectChat = async (chat: WhatsAppChat) => {
    setSelectedChat(chat);
    loadChatInfo(chat.phone);

    if (chat.unreadCount > 0) {
      await WhatsAppService.markMessagesAsRead(uid, chat.phone);
      const updatedChats = await WhatsAppService.getChats(uid);
      setChats(updatedChats);
    }
  };

  // Nachricht senden
  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedChat?.phone) return;
    try {
      setIsSending(true);
      await WhatsAppService.sendMessage(
        uid,
        selectedChat.phone,
        messageText.trim(),
        selectedChat.customerId,
        selectedChat.customerName
      );

      fetch('/api/whatsapp/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: uid,
          customerId: selectedChat.customerId,
          phone: selectedChat.phone,
          activityType: 'message_sent',
          title: 'WhatsApp-Nachricht gesendet',
          description: messageText.trim().substring(0, 100) + (messageText.length > 100 ? '...' : ''),
        }),
      }).catch(() => {});

      setMessageText('');
      const chatList = await WhatsAppService.getChats(uid);
      setChats(chatList);
    } catch {
      toast.error('Nachricht konnte nicht gesendet werden');
    } finally {
      setIsSending(false);
    }
  };

  // Chat schließen
  const handleCloseChat = async () => {
    if (!selectedChat) return;

    try {
      await fetch('/api/whatsapp/chat/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: uid,
          phone: selectedChat.phone,
          action: 'closed',
          agent: 'Nutzer',
          tags: chatTags.map((t) => t.name),
        }),
      });
    } catch {
      // Fehler ignorieren
    }

    setSelectedChat(null);
    setMessages([]);
    setChatTags([]);
    setChatHistory([]);
    setContactInfo(null);
    setChatStartTime(null);
    toast.success('Chat geschlossen');
  };

  // Chat archivieren
  const handleArchiveChat = async (phone: string, name: string) => {
    try {
      const response = await fetch('/api/whatsapp/chat/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: uid, customerId: phone }),
      });
      if (!response.ok) throw new Error('Archivierung fehlgeschlagen');
      toast.success(`Chat mit ${name} archiviert`);
      if (selectedChat?.phone === phone) {
        setSelectedChat(null);
        setMessages([]);
      }
      const chatList = await WhatsAppService.getChats(uid);
      setChats(chatList);
    } catch {
      toast.error('Fehler beim Archivieren');
    }
  };

  // Chat löschen
  const handleDeleteChat = async (phone: string, name: string) => {
    if (!confirm(`Möchtest du den Chat mit ${name} wirklich löschen?`)) return;
    try {
      const response = await fetch('/api/whatsapp/chat/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: uid, phone }),
      });
      if (!response.ok) throw new Error('Löschen fehlgeschlagen');
      toast.success(`Chat mit ${name} gelöscht`);
      if (selectedChat?.phone === phone) {
        setSelectedChat(null);
        setMessages([]);
      }
      const chatList = await WhatsAppService.getChats(uid);
      setChats(chatList);
    } catch {
      toast.error('Fehler beim Löschen');
    }
  };

  // WhatsApp verbinden
  const handleConnect = async () => {
    if (!phoneNumberInput.trim()) return;
    try {
      setIsConnecting(true);

      const response = await fetch('/api/whatsapp/generate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: uid,
          phoneNumber: phoneNumberInput.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Verbindung fehlgeschlagen');
      }

      const data = await response.json();

      if (data.signupUrl) {
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const popup = window.open(
          data.signupUrl,
          'WhatsApp Business Signup',
          `width=${width},height=${height},left=${left},top=${top},popup=1`
        );

        if (popup) {
          toast.info('Bitte melde dich bei Facebook an');

          const pollTimer = setInterval(async () => {
            if (popup.closed) {
              clearInterval(pollTimer);
              const connection = await WhatsAppService.getConnection(uid);
              if (connection?.isConnected && connection?.accessToken) {
                setWhatsappConnection({
                  phoneNumber: connection.phoneNumber,
                  isConnected: true,
                  connectedAt: connection.connectedAt,
                });
                toast.success('WhatsApp erfolgreich verbunden!');
              } else {
                toast.info('Verbindung abgebrochen');
              }
              setIsConnecting(false);
            }
          }, 1000);
        } else {
          toast.error('Popup wurde blockiert');
          setIsConnecting(false);
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Verbindung fehlgeschlagen');
      setIsConnecting(false);
    }
  };

  // WhatsApp trennen
  const handleDisconnect = async () => {
    try {
      await WhatsAppService.disconnectConnection(uid);
      setWhatsappConnection(null);
      toast.success('WhatsApp getrennt');
    } catch {
      toast.error('Fehler beim Trennen');
    }
  };

  if (!isMounted) return null;

  // Prüfe ob vollständig verbunden
  const isFullyConnected =
    whatsappConnection?.isConnected &&
    whatsappConnection?.accessToken &&
    whatsappConnection?.phoneNumberId;

  const isPending =
    whatsappConnection?.isConnected &&
    (!whatsappConnection?.accessToken || !whatsappConnection?.phoneNumberId);

  // Setup Screen
  if (!isFullyConnected) {
    return (
      <SetupScreen
        phoneNumberInput={phoneNumberInput}
        setPhoneNumberInput={setPhoneNumberInput}
        isConnecting={isConnecting}
        isPending={isPending}
        onConnect={handleConnect}
      />
    );
  }

  // Loading
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#25D366] mx-auto mb-3" />
          <p className="text-gray-500">Chats laden...</p>
        </div>
      </div>
    );
  }

  // Main Chat Interface
  return (
    <div className="h-full flex bg-white overflow-hidden">
      {/* LEFT PANEL - Chat List */}
      <ChatListPanel
        uid={uid}
        chats={chats}
        selectedChat={selectedChat}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        reorderByLatest={reorderByLatest}
        setReorderByLatest={setReorderByLatest}
        phoneNumber={whatsappConnection?.phoneNumber}
        onSelectChat={handleSelectChat}
        onArchiveChat={handleArchiveChat}
        onDeleteChat={handleDeleteChat}
        onDisconnect={handleDisconnect}
      />

      {/* MIDDLE PANEL - Active Chat */}
      <ActiveChatPanel
        selectedChat={selectedChat}
        messages={messages}
        messageText={messageText}
        setMessageText={setMessageText}
        isSending={isSending}
        onSendMessage={handleSendMessage}
        onCloseChat={handleCloseChat}
        companyId={uid}
        onChatUpdated={() => {
          if (selectedChat) {
            loadChatInfo(selectedChat.phone);
          }
        }}
      />

      {/* RIGHT PANEL - Chat Info */}
      {selectedChat && showInfoPanel && (
        <ChatInfoPanel
          uid={uid}
          selectedChat={selectedChat}
          messages={messages}
          chatTags={chatTags}
          setChatTags={setChatTags}
          chatHistory={chatHistory}
          contactInfo={contactInfo}
          chatStartTime={chatStartTime}
          onRefresh={() => loadChatInfo(selectedChat.phone)}
        />
      )}
    </div>
  );
}
