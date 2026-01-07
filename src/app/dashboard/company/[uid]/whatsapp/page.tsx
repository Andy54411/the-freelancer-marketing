'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Send,
  Search,
  User,
  Loader2,
  MoreVertical,
  Archive,
  Trash2,
  CheckCheck,
  Clock,
  Wifi,
  WifiOff,
  X,
  Plus,
  ChevronDown,
  Globe,
  MessageCircle,
  Users,
  Settings,
  RefreshCw,
  Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEffect, useState, useRef, useCallback } from 'react';
import { WhatsAppService, WhatsAppMessage } from '@/services/whatsapp.service';
import { toast } from 'sonner';
import { handleApiResponse } from '@/hooks/useFirestoreIndexHandler';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// WhatsApp Logo als SVG-Komponente
function WhatsAppLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

// Avatar Komponente für Chats (basierend auf Name oder Telefonnummer)
function ChatAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base"
  };
  
  // Initialen aus Name oder Telefonnummer generieren
  const initials = name.startsWith('+') || /^\d/.test(name)
    ? name.slice(-2).toUpperCase()
    : name
        .split(' ')
        .map(n => n.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
  
  // Farben basierend auf Namen generieren
  const colors = [
    'from-blue-500 to-blue-600',
    'from-purple-500 to-purple-600',
    'from-pink-500 to-pink-600',
    'from-orange-500 to-orange-600',
    'from-teal-500 to-teal-600',
    'from-green-500 to-green-600',
    'from-indigo-500 to-indigo-600',
    'from-red-500 to-red-600',
  ];
  const colorIndex = name.charCodeAt(0) % colors.length;
  
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${colors[colorIndex]} flex items-center justify-center flex-shrink-0`}>
      <span className="text-white font-semibold">{initials}</span>
    </div>
  );
}

// Agent Avatar
function AgentAvatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const sizeClasses = {
    sm: "w-6 h-6 text-[10px]",
    md: "w-8 h-8 text-xs"
  };
  
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center flex-shrink-0 ring-2 ring-white`}>
      <span className="text-white font-semibold">{name.charAt(0).toUpperCase()}</span>
    </div>
  );
}

interface WhatsAppConnection {
  phoneNumber: string;
  isConnected: boolean;
  connectedAt?: string;
  accessToken?: string;
  phoneNumberId?: string;
  tokenExpiresAt?: string;
  status?: string;
}

interface ChatTag {
  id: string;
  name: string;
  color: string;
}

// Chat-Historie Eintrag
interface ChatHistoryEntry {
  id: string;
  date: Date;
  action: 'opened' | 'closed' | 'handled' | 'assigned' | 'tagged';
  agent: string;
  tags: string[];
}

// Kontakt-Informationen
interface ContactInfo {
  id?: string;
  customerId?: string;
  customerNumber?: string;
  name?: string;
  email?: string;
  phone: string;
  address?: string;
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  company?: string;
  website?: string;
  notes?: string;
  taxNumber?: string;
  vatId?: string;
  industry?: string;
  legalForm?: string;
  tags?: string[];
  totalInvoices?: number;
  totalAmount?: number;
  customerSince?: string | Date;
  lastActivity?: string | Date;
  totalChats?: number;
  customerLink?: string;
}

// Chat-Status für Filter
type ChatStatus = 'open' | 'waiting_on_me' | 'waiting_on_user' | 'closed' | 'archived';

// Chat-Objekt für die Chat-Liste (basierend auf WhatsApp-Nachrichten)
interface WhatsAppChat {
  phone: string;
  customerId?: string;
  customerName?: string;
  lastMessage: WhatsAppMessage;
  unreadCount: number;
  status?: ChatStatus;
  assignedTo?: string;
  lastInboundAt?: Date;
  lastOutboundAt?: Date;
}

type ChatFilter = 'open' | 'waiting_on_me' | 'waiting_on_user';

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
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  
  // Chat Tags - werden pro Chat aus Firestore geladen
  const [chatTags, setChatTags] = useState<ChatTag[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatHistoryEntry[]>([]);
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [chatStartTime, setChatStartTime] = useState<Date | null>(null);
  
  const suggestedTags = [
    { id: 's1', name: 'Support', color: 'bg-blue-100 text-blue-700' },
    { id: 's2', name: 'Bestellung', color: 'bg-green-100 text-green-700' },
    { id: 's3', name: 'Reklamation', color: 'bg-red-100 text-red-700' },
    { id: 's4', name: 'Anfrage', color: 'bg-purple-100 text-purple-700' },
    { id: 's5', name: 'Rückerstattung', color: 'bg-orange-100 text-orange-700' },
  ];

  // Handle OAuth Callback success/error from URL parameters
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    
    if (success === 'true') {
      toast.success('WhatsApp erfolgreich verbunden!');
      // Entferne Query-Parameter aus URL
      router.replace(`/dashboard/company/${uid}/whatsapp`);
    } else if (error) {
      const errorMessages: Record<string, string> = {
        'token_exchange_failed': 'Autorisierung fehlgeschlagen. Bitte versuche es erneut.',
        'no_phone_number_found': 'Keine WhatsApp Business Nummer gefunden. Hast du deine Nummer bei Meta registriert?',
        'firebase_unavailable': 'Datenbank nicht verfügbar. Bitte versuche es später erneut.',
        'missing_params': 'Fehlende Parameter. Bitte starte den Verbindungsvorgang erneut.',
        'callback_failed': 'Verbindung fehlgeschlagen. Bitte versuche es erneut.',
      };
      toast.error(errorMessages[error] || `Fehler: ${error}`);
      router.replace(`/dashboard/company/${uid}/whatsapp`);
    }
  }, [searchParams, uid, router]);

  useEffect(() => {
    setIsMounted(true);
    if (!uid) return;
    
    loadData();
    
    // Echtzeit-Listener für Chat-Liste (neue eingehende Nachrichten)
    const messagesRef = collection(db, 'companies', uid, 'whatsappMessages');
    const q = query(messagesRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, async () => {
      // Chat-Liste neu laden wenn sich Nachrichten ändern
      try {
        const chatList = await WhatsAppService.getChats(uid);
        setChats(chatList);
      } catch {
        // Fehler ignorieren
      }
    });
    
    return () => unsubscribe();
  }, [uid]);

  // Timer für Chat-Dauer (aktualisiert alle 10 Sekunden)
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!chatStartTime) return;
    const timer = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(timer);
  }, [chatStartTime]);

  useEffect(() => {
    if (!selectedChat || !uid) return;
    
    // Echtzeit-Listener für Nachrichten
    const normalizedPhone = selectedChat.phone.replace(/\D/g, '');
    const messagesRef = collection(db, 'companies', uid, 'whatsappMessages');
    
    // Query für diese Telefonnummer (mit verschiedenen Formaten)
    const q = query(
      messagesRef,
      orderBy('createdAt', 'asc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allMessages = snapshot.docs.map(doc => {
        const data = doc.data();
        // Convert Firestore Timestamp to Date
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
      
      // Filtere nach Telefonnummer (verschiedene Formate berücksichtigen)
      const filteredMessages = allMessages.filter(msg => {
        const msgPhone = (msg.customerPhone || '').replace(/\D/g, '');
        return msgPhone === normalizedPhone || 
               msgPhone.endsWith(normalizedPhone) || 
               normalizedPhone.endsWith(msgPhone);
      });
      
      // Sortiere nach Datum
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
      
      // Auto-scroll nach unten bei neuen Nachrichten
      setTimeout(() => {
        document.getElementById('chat-messages')?.scrollTo({ top: 999999, behavior: 'smooth' });
      }, 100);
    });
    
    return () => unsubscribe();
  }, [selectedChat, uid]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [connection, chatList] = await Promise.all([
        WhatsAppService.getConnection(uid),
        WhatsAppService.getChats(uid),
      ]);
      
      // Automatische Token-Erneuerung im Hintergrund wenn Token bald abläuft
      if (connection?.isConnected && connection?.accessToken && connection?.tokenExpiresAt) {
        const expiresAt = new Date(connection.tokenExpiresAt);
        const now = new Date();
        const daysUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        
        // Wenn abgelaufen oder weniger als 7 Tage bis Ablauf, automatisch erneuern
        if (daysUntilExpiry < 7) {
          try {
            const refreshResponse = await fetch('/api/whatsapp/renew-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                companyId: uid,
                attemptAutoRenew: true 
              }),
            });
            
            const refreshResult = await refreshResponse.json();
            
            // Wenn Token abgelaufen und Erneuerung fehlgeschlagen, Verbindung zurücksetzen
            if (!refreshResult.success && daysUntilExpiry <= 0) {
              // Verbindung ist abgelaufen - User muss sich neu verbinden
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
            // Bei Netzwerkfehler fortfahren, nicht blockieren
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
  };

  const loadMessages = async (phone: string) => {
    try {
      const msgs = await WhatsAppService.getMessagesByPhone(uid, phone);
      setMessages(msgs);
      setTimeout(() => {
        document.getElementById('chat-messages')?.scrollTo({ top: 999999, behavior: 'smooth' });
      }, 100);
    } catch {
      setMessages([]);
    }
  };

  const handleInitiateConnection = async () => {
    if (!phoneNumberInput.trim()) return;
    try {
      setIsConnecting(true);
      
      // Rufe API auf, die den Meta Embedded Signup Flow initiiert
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
        throw new Error(errorData.details || errorData.error || 'Fehler beim Initiieren der Verbindung');
      }
      
      const data = await response.json();
      
      if (data.signupUrl) {
        // Öffne Meta OAuth Popup
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
          toast.info('Bitte melde dich bei Facebook an und wähle deine WhatsApp Business Nummer');
          
          // Polling um zu prüfen ob Popup geschlossen wurde
          const pollTimer = setInterval(async () => {
            if (popup.closed) {
              clearInterval(pollTimer);
              // Prüfe ob Verbindung erfolgreich war
              const connection = await WhatsAppService.getConnection(uid);
              if (connection?.isConnected && connection?.accessToken) {
                setWhatsappConnection({
                  phoneNumber: connection.phoneNumber,
                  isConnected: true,
                  connectedAt: connection.connectedAt,
                });
                toast.success('WhatsApp erfolgreich verbunden!');
              } else {
                toast.info('Verbindung abgebrochen. Bitte versuche es erneut.');
              }
              setIsConnecting(false);
            }
          }, 1000);
        } else {
          toast.error('Popup wurde blockiert. Bitte erlaube Popups für diese Seite.');
          setIsConnecting(false);
        }
      } else {
        throw new Error('Keine Signup-URL erhalten');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Verbindung fehlgeschlagen');
      setIsConnecting(false);
    }
  };

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
      
      // Speichere Aktivität im Kundenprofil für Mitarbeiter-Nachverfolgung
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
      }).catch(() => {}); // Fire and forget - Fehler ignorieren
      
      setMessageText('');
      await loadMessages(selectedChat.phone);
      // Aktualisiere Chat-Liste
      const chatList = await WhatsAppService.getChats(uid);
      setChats(chatList);
    } catch {
      toast.error('Nachricht konnte nicht gesendet werden');
    } finally {
      setIsSending(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await WhatsAppService.disconnectConnection(uid);
      setWhatsappConnection(null);
      toast.success('WhatsApp getrennt');
    } catch {
      toast.error('Fehler beim Trennen');
    }
  };

  const handleArchiveChat = async (customerId: string, customerName: string) => {
    try {
      const response = await fetch('/api/whatsapp/chat/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: uid, customerId }),
      });
      if (!response.ok) throw new Error('Archivierung fehlgeschlagen');
      toast.success(`Chat mit ${customerName} archiviert`);
      if (selectedChat?.phone === customerId) {
        setSelectedChat(null);
        setMessages([]);
      }
      // Aktualisiere Chat-Liste
      const chatList = await WhatsAppService.getChats(uid);
      setChats(chatList);
    } catch {
      toast.error('Fehler beim Archivieren');
    }
  };

  const handleDeleteChat = async (phone: string, customerName: string) => {
    if (!confirm(`Möchtest du den Chat mit ${customerName} wirklich löschen?`)) return;
    try {
      const response = await fetch('/api/whatsapp/chat/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: uid, phone }),
      });
      if (!response.ok) throw new Error('Löschen fehlgeschlagen');
      toast.success(`Chat mit ${customerName} gelöscht`);
      if (selectedChat?.phone === phone) {
        setSelectedChat(null);
        setMessages([]);
      }
      // Aktualisiere Chat-Liste
      const chatList = await WhatsAppService.getChats(uid);
      setChats(chatList);
    } catch {
      toast.error('Fehler beim Löschen');
    }
  };

  const handleCloseChat = async () => {
    if (!selectedChat) return;
    
    // Speichere Historie-Eintrag
    try {
      await fetch('/api/whatsapp/chat/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: uid,
          phone: selectedChat.phone,
          action: 'closed',
          agent: 'Nutzer', // TODO: Echten Nutzernamen verwenden
          tags: chatTags.map(t => t.name),
        }),
      });
    } catch {
      // Ignoriere Fehler beim Speichern der Historie
    }
    
    setSelectedChat(null);
    setMessages([]);
    setChatTags([]);
    setChatHistory([]);
    setContactInfo(null);
    setChatStartTime(null);
    toast.success('Chat geschlossen');
  };

  // Lade Chat-Informationen wenn ein Chat ausgewählt wird
  const loadChatInfo = async (phone: string) => {
    try {
      // Lade Tags für diesen Chat
      const tagsResponse = await fetch(`/api/whatsapp/chat/tags?companyId=${uid}&phone=${encodeURIComponent(phone)}`);
      if (tagsResponse.ok) {
        const tagsData = await tagsResponse.json();
        // Prüfe auf Index-Fehler
        if (!handleApiResponse(tagsData)) {
          setChatTags(tagsData.tags || []);
        }
      }
      
      // Lade Chat-Historie
      const historyResponse = await fetch(`/api/whatsapp/chat/history?companyId=${uid}&phone=${encodeURIComponent(phone)}`);
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        // Prüfe auf Index-Fehler
        if (!handleApiResponse(historyData)) {
          setChatHistory(historyData.history || []);
        }
      }
      
      // Lade Kontakt-Info
      const contactResponse = await fetch(`/api/whatsapp/chat/contact?companyId=${uid}&phone=${encodeURIComponent(phone)}`);
      if (contactResponse.ok) {
        const contactData = await contactResponse.json();
        // Prüfe auf Index-Fehler
        if (!handleApiResponse(contactData)) {
          setContactInfo(contactData.contact || null);
        }
      }
      
      // Setze Chat-Startzeit
      setChatStartTime(new Date());
      
      // Speichere dass Chat geöffnet wurde
      await fetch('/api/whatsapp/chat/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: uid,
          phone,
          action: 'opened',
          agent: 'Nutzer', // TODO: Echten Nutzernamen verwenden
          tags: [],
        }),
      });
    } catch {
      // Fehler beim Laden ignorieren
    }
  };

  const addTag = async (tag: ChatTag) => {
    if (!selectedChat || chatTags.find(t => t.id === tag.id)) return;
    
    const newTags = [...chatTags, tag];
    setChatTags(newTags);
    
    // Speichere in Firestore
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
      // Bei Fehler Tag wieder entfernen
      setChatTags(chatTags);
    }
  };

  const removeTag = async (tagId: string) => {
    if (!selectedChat) return;
    
    const newTags = chatTags.filter(t => t.id !== tagId);
    setChatTags(newTags);
    
    // Speichere in Firestore
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
      // Bei Fehler Tags wiederherstellen
      setChatTags(chatTags);
    }
  };

  // Berechne Chat-Zeit
  const getChatDuration = (): string => {
    if (!chatStartTime) return '00:00';
    const now = new Date();
    const diffMs = now.getTime() - chatStartTime.getTime();
    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} min`;
  };

  // Formatiere Datum für Historie
  const formatHistoryDate = (date: Date | string) => {
    const d = date instanceof Date ? date : new Date(date);
    return {
      day: d.getDate().toString().padStart(2, '0'),
      month: d.toLocaleDateString('de-DE', { month: 'short' }),
    };
  };

  // Formatiere "Kunde seit"
  const getCustomerSince = (): string => {
    if (!contactInfo?.customerSince) {
      // Fallback: Nutze erstes Nachrichtendatum
      if (messages.length > 0) {
        const firstMsg = messages[0];
        const date = firstMsg.createdAt instanceof Date 
          ? firstMsg.createdAt 
          : new Date(firstMsg.createdAt);
        return date.getFullYear().toString();
      }
      return new Date().getFullYear().toString();
    }
    const since = new Date(contactInfo.customerSince);
    return since.getFullYear().toString();
  };

  // Formatiere letzte Aktivität
  const getLastActivity = (): string => {
    if (!contactInfo?.lastActivity && messages.length === 0) {
      return 'Unbekannt';
    }
    
    const lastDate = contactInfo?.lastActivity 
      ? new Date(contactInfo.lastActivity)
      : messages.length > 0 
        ? (messages[messages.length - 1].createdAt instanceof Date 
            ? messages[messages.length - 1].createdAt as Date
            : new Date(messages[messages.length - 1].createdAt))
        : new Date();
    
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

  // Bestimme Chat-Status basierend auf Nachrichtenrichtung und Zeit
  // WICHTIG: inbound = Kunde hat geschrieben → wir müssen antworten = waiting_on_me
  //          outbound = wir haben geschrieben → wir warten auf Kunde = waiting_on_user
  const getChatStatus = (chat: WhatsAppChat): ChatStatus => {
    // Wenn expliziter Status gesetzt ist, nutze diesen
    if (chat.status && chat.status !== 'open') {
      return chat.status;
    }
    
    const lastMsg = chat.lastMessage;
    if (!lastMsg) return 'open';
    
    // Direkt das direction-Feld der WhatsAppMessage nutzen
    // inbound = Kunde hat geschrieben → wir müssen antworten → "Wartet auf mich"
    // outbound = wir haben geschrieben → Kunde muss antworten → "Wartet auf Kunde"
    if (lastMsg.direction === 'inbound') {
      return 'waiting_on_me';
    }
    if (lastMsg.direction === 'outbound') {
      return 'waiting_on_user';
    }
    
    // Fallback: Prüfe ob 'from' oder 'to' Felder vorhanden sind
    const msgAny = lastMsg as unknown as { from?: string; to?: string };
    if (msgAny.from && !msgAny.to) {
      // Hat 'from' aber kein 'to' → eingehend → waiting_on_me
      return 'waiting_on_me';
    }
    if (msgAny.to && !msgAny.from) {
      // Hat 'to' aber kein 'from' → ausgehend → waiting_on_user
      return 'waiting_on_user';
    }
    
    return 'open';
  };

  // Filter-Logik für Chats
  const filteredChats = chats
    .filter(chat => {
      // Archivierte und geschlossene Chats ausblenden
      if (chat.status === 'archived' || chat.status === 'closed') {
        return false;
      }
      
      // Textsuche
      const matchesSearch = searchQuery === '' || 
        (chat.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.phone.includes(searchQuery);
      
      if (!matchesSearch) return false;
      
      // Filter nach Status
      const chatStatus = getChatStatus(chat);
      
      switch (activeFilter) {
        case 'open':
          // Alle offenen Chats (nicht geschlossen/archiviert)
          return true;
        case 'waiting_on_me':
          // Chats wo letzte Nachricht eingehend war
          return chatStatus === 'waiting_on_me';
        case 'waiting_on_user':
          // Chats wo letzte Nachricht ausgehend war
          return chatStatus === 'waiting_on_user';
        default:
          return true;
      }
    })
    .sort((a, b) => {
      if (!reorderByLatest) {
        // Alphabetisch nach Name/Telefonnummer
        const nameA = a.customerName || a.phone;
        const nameB = b.customerName || b.phone;
        return nameA.localeCompare(nameB);
      }
      
      // Nach neuester Nachricht sortieren
      const getTimestamp = (msg: WhatsAppMessage): number => {
        if (!msg?.createdAt) return 0;
        if (msg.createdAt instanceof Date) return msg.createdAt.getTime();
        if (typeof msg.createdAt === 'object' && 'seconds' in msg.createdAt) {
          return msg.createdAt.seconds * 1000;
        }
        return new Date(msg.createdAt).getTime();
      };
      
      return getTimestamp(b.lastMessage) - getTimestamp(a.lastMessage);
    });

  // Zähle Chats pro Filter für Badge-Anzeige
  const getFilterCount = (filter: ChatFilter): number => {
    return chats.filter(chat => {
      if (chat.status === 'archived' || chat.status === 'closed') return false;
      const status = getChatStatus(chat);
      switch (filter) {
        case 'open':
          return true;
        case 'waiting_on_me':
          return status === 'waiting_on_me';
        case 'waiting_on_user':
          return status === 'waiting_on_user';
        default:
          return true;
      }
    }).length;
  };

  const getTimeAgo = (date?: string | Date | { seconds: number; nanoseconds?: number }) => {
    if (!date) return '';
    const now = new Date();
    let then: Date;
    
    if (date instanceof Date) {
      then = date;
    } else if (typeof date === 'object' && 'seconds' in date) {
      // Firestore Timestamp
      then = new Date(date.seconds * 1000);
    } else {
      then = new Date(date);
    }
    
    if (isNaN(then.getTime())) return '';
    
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Jetzt';
    if (diffMins < 60) return `${diffMins} Min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} Std`;
    return then.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  // Hilfsfunktion für Timestamp-Konvertierung
  const parseTimestamp = (timestamp: unknown): Date | null => {
    if (!timestamp) return null;
    
    // Firestore Timestamp (mit toDate Methode)
    if (typeof timestamp === 'object' && timestamp !== null && 'toDate' in timestamp && typeof (timestamp as { toDate: () => Date }).toDate === 'function') {
      return (timestamp as { toDate: () => Date }).toDate();
    }
    
    // Firestore Timestamp (mit seconds/nanoseconds)
    if (typeof timestamp === 'object' && timestamp !== null && 'seconds' in timestamp) {
      return new Date((timestamp as { seconds: number }).seconds * 1000);
    }
    
    // Date-Objekt
    if (timestamp instanceof Date) {
      return timestamp;
    }
    
    // String oder Number
    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) return date;
    }
    
    return null;
  };

  const formatMessageTime = (timestamp: unknown): string => {
    const date = parseTimestamp(timestamp);
    if (!date) return '';
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  // Formatiert Telefonnummer für Anzeige
  const formatPhoneNumber = (phone: string): string => {
    if (!phone) return '';
    // Entferne führende Nullen nach Ländercode und formatiere
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('49')) {
      return `+49 ${cleaned.slice(2, 5)} ${cleaned.slice(5)}`;
    }
    return phone.startsWith('+') ? phone : `+${phone}`;
  };

  // Prüfe ob Verbindung vollständig ist (mit accessToken und phoneNumberId)
  const isFullyConnected = whatsappConnection?.isConnected && 
    whatsappConnection?.accessToken && 
    whatsappConnection?.phoneNumberId;

  if (!isMounted) return null;

  // Setup Screen - Zeige wenn nicht verbunden ODER wenn Token fehlt
  if (!isFullyConnected) {
    const isPending = whatsappConnection?.isConnected && (!whatsappConnection?.accessToken || !whatsappConnection?.phoneNumberId);
    
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-[#25D366] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <WhatsAppLogo className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">WhatsApp verbinden</h1>
            <p className="text-gray-500">
              {isPending 
                ? 'Verbindung unvollständig - bitte erneut verbinden' 
                : 'Verbinde deine Business-Nummer mit Taskilo'}
            </p>
          </div>

          {isPending && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                Die vorherige Verbindung wurde nicht abgeschlossen. Bitte verbinde dich erneut mit Meta.
              </p>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              WhatsApp Business Nummer
            </label>
            <Input
              placeholder="+49 123 456789"
              value={phoneNumberInput}
              onChange={e => setPhoneNumberInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleInitiateConnection()}
              disabled={isConnecting}
              className="mb-4 h-12 text-lg"
            />
            <Button
              onClick={handleInitiateConnection}
              disabled={isConnecting || !phoneNumberInput.trim()}
              className="w-full h-12 bg-[#25D366] hover:bg-[#128C7E] text-white font-medium"
            >
              {isConnecting ? (
                <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Verbinden...</>
              ) : (
                'Mit Meta verbinden'
              )}
            </Button>
          </div>

          <div className="mt-6 space-y-3">
            {['Eigene Nummer nutzen', '1.000 Chats/Monat gratis', 'Ende-zu-Ende verschlüsselt'].map(text => (
              <div key={text} className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-5 h-5 rounded-full bg-[#25D366]/10 flex items-center justify-center">
                  <CheckCheck className="w-3 h-3 text-[#25D366]" />
                </div>
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>
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

  // Main Chat Interface - 3 Panel Layout
  return (
    <div className="h-full flex bg-white">
      {/* LEFT PANEL - Active Chats */}
      <div className="w-80 border-r border-gray-200 flex flex-col bg-white">
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <WhatsAppLogo className="w-5 h-5 text-[#25D366]" />
            <h2 className="font-semibold text-gray-900">Aktive Chats</h2>
          </div>
          
          {/* Filter Tabs */}
          <div className="flex gap-1 mb-4">
            {[
              { key: 'open', label: 'Offen', icon: MessageCircle },
              { key: 'waiting_on_me', label: 'Wartet auf mich', icon: Clock },
              { key: 'waiting_on_user', label: 'Wartet auf Kunde', icon: Users },
            ].map(tab => {
              const count = getFilterCount(tab.key as ChatFilter);
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key as ChatFilter)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 px-2 rounded-lg text-xs transition-colors relative ${
                    activeFilter === tab.key
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <div className="relative">
                    <tab.icon className="w-4 h-4" />
                    {count > 0 && (
                      <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] bg-[#25D366] text-white text-[10px] font-medium rounded-full flex items-center justify-center px-0.5">
                        {count > 99 ? '99+' : count}
                      </span>
                    )}
                  </div>
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Sortierung Toggle */}
          <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
            <span>Neueste Nachrichten oben</span>
            <button
              onClick={() => setReorderByLatest(!reorderByLatest)}
              className={`w-9 h-5 rounded-full transition-colors ${
                reorderByLatest ? 'bg-[#25D366]' : 'bg-gray-300'
              }`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
                reorderByLatest ? 'translate-x-4' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {/* Suche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Chats durchsuchen..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-gray-50 border-0 text-sm"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {filteredChats.length === 0 ? (
            <div className="p-8 text-center">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Keine Chats gefunden</p>
              <p className="text-xs text-gray-400 mt-2">Sende eine Nachricht, um einen Chat zu starten</p>
            </div>
          ) : (
            filteredChats.map((chat) => (
              <div
                key={chat.phone}
                onClick={async () => {
                  setSelectedChat(chat);
                  loadChatInfo(chat.phone);
                  
                  // Markiere Nachrichten als gelesen
                  if (chat.unreadCount > 0) {
                    await WhatsAppService.markMessagesAsRead(uid, chat.phone);
                    // Aktualisiere Chat-Liste um Badge zu entfernen
                    const updatedChats = await WhatsAppService.getChats(uid);
                    setChats(updatedChats);
                  }
                }}
                className={`group flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                  selectedChat?.phone === chat.phone ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                }`}
              >
                <div className="relative">
                  <ChatAvatar name={chat.customerName || chat.phone} size="md" />
                  {chat.unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-[10px] text-white font-bold">{chat.unreadCount}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900 truncate text-sm">
                      {chat.customerName || formatPhoneNumber(chat.phone)}
                    </p>
                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {getTimeAgo(chat.lastMessage.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {chat.lastMessage.direction === 'outbound' ? 'Du: ' : ''}
                    {chat.lastMessage.body}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-6 h-6 p-0 opacity-0 group-hover:opacity-100"
                      onClick={e => e.stopPropagation()}
                    >
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleArchiveChat(chat.phone, chat.customerName || chat.phone)}>
                      <Archive className="w-4 h-4 mr-2" /> Archivieren
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleDeleteChat(chat.phone, chat.customerName || chat.phone)} className="text-red-600">
                      <Trash2 className="w-4 h-4 mr-2" /> Löschen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Wifi className="w-3 h-3 text-[#25D366]" />
              <span>{whatsappConnection.phoneNumber}</span>
            </div>
            <button onClick={handleDisconnect} className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1">
              <WifiOff className="w-3 h-3" /> Trennen
            </button>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/dashboard/company/${uid}/whatsapp/templates`}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs text-gray-600 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Vorlagen
            </a>
            <a
              href={`/dashboard/company/${uid}/whatsapp/settings`}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs text-gray-600 transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              Einstellungen
            </a>
          </div>
        </div>
      </div>

      {/* MIDDLE PANEL - Active Chat */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="h-14 px-4 flex items-center justify-between bg-white border-b border-gray-100">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-gray-900">Active chat</h3>
              </div>
              <div className="flex items-center gap-3">
                {/* Assigned To */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Assigned to</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-50">
                        <AgentAvatar name="Andy" size="sm" />
                        <span className="text-sm font-medium text-gray-700">Andy Staudinger</span>
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Andy Staudinger</DropdownMenuItem>
                      <DropdownMenuItem>Team Member 2</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>Neu zuweisen...</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                {/* Close Chat Button */}
                <Button
                  onClick={handleCloseChat}
                  className="bg-red-500 hover:bg-red-600 text-white text-sm h-8 px-4"
                >
                  Close chat
                </Button>
                
                <ChevronDown className="w-5 h-5 text-gray-400 cursor-pointer" />
              </div>
            </div>

            {/* Messages */}
            <div id="chat-messages" className="flex-1 overflow-y-auto p-6">
              {/* Date Separator */}
              <div className="flex items-center justify-center mb-6">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="px-4 text-xs text-gray-400">{formatDate(new Date().toISOString())}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <WhatsAppLogo className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Noch keine Nachrichten</p>
                    <p className="text-sm text-gray-400">Schreibe die erste Nachricht</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                      <div className="flex items-end gap-2 max-w-[70%]">
                        {msg.direction === 'inbound' && (
                          <ChatAvatar name={selectedChat?.customerName || selectedChat?.phone || ''} size="sm" />
                        )}
                        <div
                          className={`px-4 py-2 rounded-2xl ${
                            msg.direction === 'outbound'
                              ? 'bg-[#3B82F6] text-white rounded-br-sm'
                              : 'bg-white text-gray-900 rounded-bl-sm shadow-sm'
                          }`}
                        >
                          <p className="text-sm">{msg.body}</p>
                          <div className={`flex items-center justify-end gap-1 mt-1 ${msg.direction === 'outbound' ? 'text-white/70' : 'text-gray-400'}`}>
                            <span className="text-[10px]">
                              {formatMessageTime(msg.createdAt)}
                            </span>
                            {msg.direction === 'outbound' && <CheckCheck className="w-3 h-3" />}
                          </div>
                        </div>
                        {msg.direction === 'outbound' && (
                          <AgentAvatar name="Andy" size="sm" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* New Message Separator (wenn neue Nachrichten) */}
              {messages.length > 0 && (
                <div className="flex items-center justify-center mt-6">
                  <div className="flex-1 h-px bg-blue-200" />
                  <span className="px-4 text-xs text-blue-500 font-medium">New message</span>
                  <div className="flex-1 h-px bg-blue-200" />
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-100">
              <div className="flex items-center gap-3">
                <Input
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  disabled={isSending}
                  className="flex-1 h-11 bg-gray-50 border-gray-200"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isSending || !messageText.trim()}
                  className="h-11 w-11 p-0 bg-[#3B82F6] hover:bg-blue-600"
                >
                  {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 bg-[#25D366]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <WhatsAppLogo className="w-10 h-10 text-[#25D366]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">WhatsApp Business</h3>
              <p className="text-gray-500">Wähle einen Chat aus der Liste</p>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT PANEL - Chat Information */}
      {selectedChat && showInfoPanel && (
        <div className="w-80 border-l border-gray-200 flex flex-col bg-white">
          {/* Contact Header */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{contactInfo?.name || selectedChat.customerName || formatPhoneNumber(selectedChat.phone)}</h3>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => loadChatInfo(selectedChat.phone)}
                  className="p-1.5 hover:bg-gray-100 rounded"
                  title="Aktualisieren"
                >
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
                  <a href={`mailto:${contactInfo.email}`} className="hover:text-blue-500">{contactInfo.email}</a>
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
                {/* Kundennummer */}
                {contactInfo.customerNumber && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Kundennummer:</span>
                    <span className="text-gray-900 font-medium">{contactInfo.customerNumber}</span>
                  </div>
                )}
                
                {/* Adresse */}
                {contactInfo.address && (
                  <div className="text-xs">
                    <span className="text-gray-500 block mb-1">Adresse:</span>
                    <span className="text-gray-900">{contactInfo.address}</span>
                  </div>
                )}
                
                {/* Website */}
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
                
                {/* USt-IdNr */}
                {contactInfo.vatId && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">USt-IdNr:</span>
                    <span className="text-gray-900">{contactInfo.vatId}</span>
                  </div>
                )}
                
                {/* Steuernummer */}
                {contactInfo.taxNumber && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Steuernummer:</span>
                    <span className="text-gray-900">{contactInfo.taxNumber}</span>
                  </div>
                )}
                
                {/* Branche */}
                {contactInfo.industry && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Branche:</span>
                    <span className="text-gray-900">{contactInfo.industry}</span>
                  </div>
                )}
                
                {/* Statistiken */}
                {(contactInfo.totalInvoices !== undefined && contactInfo.totalInvoices > 0) && (
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Rechnungen:</span>
                      <span className="text-gray-900 font-medium">{contactInfo.totalInvoices}</span>
                    </div>
                    {contactInfo.totalAmount !== undefined && contactInfo.totalAmount > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Gesamtumsatz:</span>
                        <span className="text-gray-900 font-medium">
                          {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(contactInfo.totalAmount)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Notizen */}
                {contactInfo.notes && (
                  <div className="text-xs">
                    <span className="text-gray-500 block mb-1">Notizen:</span>
                    <p className="text-gray-700 bg-gray-50 rounded p-2">{contactInfo.notes}</p>
                  </div>
                )}
                
                {/* Tags */}
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
                
                {/* Link zur Kundenseite */}
                {contactInfo.customerLink && (
                  <Link
                    href={contactInfo.customerLink}
                    className="block w-full mt-3 px-3 py-2 bg-[#14ad9f] text-white text-xs font-medium text-center rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    Kundenprofil öffnen
                  </Link>
                )}
                
                {/* Kein Kunde gefunden */}
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
          <div className="flex border-b border-gray-100">
            <button className="flex-1 px-4 py-3 text-sm font-medium text-blue-600 border-b-2 border-blue-600">
              Chat Informationen
            </button>
            <button className="flex-1 px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700">
              Integrationen
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Chat Tags */}
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Chat Tags</h4>
              <div className="flex flex-wrap gap-2">
                {chatTags.length === 0 ? (
                  <p className="text-xs text-gray-400">Keine Tags vergeben</p>
                ) : (
                  chatTags.map(tag => (
                    <span
                      key={tag.id}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${tag.color}`}
                    >
                      <X
                        className="w-3 h-3 cursor-pointer hover:opacity-70"
                        onClick={() => removeTag(tag.id)}
                      />
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
                    .filter(st => !chatTags.find(ct => ct.name === st.name))
                    .map(tag => (
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
                  <span className="text-gray-900 font-medium">{getChatDuration()}</span>
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
                            {actionLabels[entry.action] || entry.action} <span className="font-medium">{entry.agent}</span>
                          </p>
                          {entry.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {entry.tags.map(tag => (
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
          </div>
        </div>
      )}
    </div>
  );
}
