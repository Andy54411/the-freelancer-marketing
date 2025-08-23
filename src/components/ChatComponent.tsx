'use client';

import React, { useState, useEffect, useRef, FormEvent } from 'react';
import {
  addDoc,
  serverTimestamp,
  Timestamp,
  doc,
  getDoc,
  setDoc,
  collection,
} from 'firebase/firestore';
import { db } from '@/firebase/clients'; // Still needed for sending messages
import { useAuth } from '@/contexts/AuthContext';
import { Send as FiSend, Loader2 as FiLoader } from 'lucide-react';
import { Badge } from '@/components/ui/badge'; // Badge für Statusanzeige importieren

// Interface für ein Chat-Nachrichten-Dokument in Firestore
interface ChatMessage {
  id: string; // Dokument-ID von Firestore
  senderId: string;
  senderName: string;
  senderType: 'kunde' | 'anbieter';
  text: string;
  timestamp: Timestamp; // Firestore Timestamp Typ
}

// Interface für das Benutzerprofil aus Firestore (für senderType und senderName)
interface UserProfileData {
  firstName?: string;
  lastName?: string;
  companyName?: string;
  user_type?: 'kunde' | 'anbieter' | 'firma'; // Korrigierter Typ wie besprochen
}

interface ChatComponentProps {
  orderId: string;
  participants: {
    customerId: string;
    providerId: string;
  };
  orderStatus?: string | null; // NEU: Prop für den Auftragsstatus
}

// NEUE HILFSFUNKTION: Formatiert den Zeitstempel für eine bessere Lesbarkeit
const formatMessageTimestamp = (timestamp: any): string => {
  if (!timestamp) return '';

  let date: Date;

  // Handle different timestamp formats
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    // Firestore Timestamp object
    date = timestamp.toDate();
  } else if (timestamp.seconds) {
    // Firestore Timestamp-like object with seconds
    date = new Date(timestamp.seconds * 1000);
  } else if (timestamp instanceof Date) {
    // Regular Date object
    date = timestamp;
  } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    // String or number timestamp
    date = new Date(timestamp);
  } else {
    return '';
  }

  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

  if (date >= startOfToday) {
    // Heute: Nur Uhrzeit
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }
  if (date >= startOfYesterday) {
    // Gestern: "Gestern, HH:mm"
    return `Gestern, ${date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
  }
  // Älter: "TT.MM.JJJJ"
  return date.toLocaleDateString('de-DE');
};

// NEU: Hilfsfunktion zum Formatieren des Status
const formatStatus = (status: string | null | undefined): string => {
  if (!status) return 'Unbekannt';
  // Ersetzt Unterstriche durch Leerzeichen und macht den ersten Buchstaben jedes Wortes groß
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const ChatComponent: React.FC<ChatComponentProps> = ({ orderId, participants, orderStatus }) => {
  const authContext = useAuth();
  const currentUser = authContext?.user || null;
  const firebaseUser = authContext?.firebaseUser || null;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [chatLoading, setChatLoading] = useState(true);
  const [userProfileLoading, setUserProfileLoading] = useState(true);
  const [chatError, setChatError] = useState<string | null>(null);
  const [loggedInUserProfile, setLoggedInUserProfile] = useState<UserProfileData | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false); // Neuer State für Sende-Button

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-Scroll deaktiviert um störendes Verhalten zu vermeiden
  // useEffect(() => {
  //   messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  // }, [messages]);

  // Laden des Benutzerprofils, sobald currentUser verfügbar ist
  useEffect(() => {
    if (currentUser) {
      const fetchUserProfile = async () => {
        setUserProfileLoading(true);
        try {
          const userDocRef = doc(db, 'users', currentUser.uid); // This is a one-time read, which is fine.
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setLoggedInUserProfile(userDocSnap.data() as UserProfileData);
          } else {
            console.warn(
              'ChatComponent: Benutzerprofil nicht in Firestore gefunden für:',
              currentUser.uid
            );
            setLoggedInUserProfile(null);
          }
        } catch (error) {
          console.error('ChatComponent: Fehler beim Laden des Benutzerprofils:', error);
          setChatError('Fehler beim Laden des Benutzerprofils');
        } finally {
          setUserProfileLoading(false);
        }
      };
      fetchUserProfile();
    } else {
      setLoggedInUserProfile(null);
      setUserProfileLoading(false);
    }
  }, [currentUser]);

  // Load chat messages using API instead of direct Firebase access
  useEffect(() => {
    if (!currentUser?.uid || !orderId) {
      return;
    }

    setChatLoading(true);
    setChatError(null);

    const loadChatMessages = async () => {
      try {
        const response = await fetch('/api/getOrderChat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${await firebaseUser?.getIdToken()}`,
          },
          body: JSON.stringify({ orderId }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch chat messages');
        }

        const result = await response.json();

        if (result.success && result.messages) {
          const fetchedMessages: ChatMessage[] = result.messages.map((msg: any) => ({
            id: msg.id,
            senderId: msg.senderId,
            senderName: msg.senderName,
            senderType: msg.senderType,
            text: msg.text,
            timestamp: msg.timestamp,
          }));
          setMessages(fetchedMessages);
        }
      } catch (error) {
        console.error(
          `[ChatComponent] Fehler beim Laden der Chat-Nachrichten für orderId: ${orderId}`,
          error
        );
        setChatError('Fehler beim Laden der Nachrichten');
      } finally {
        setChatLoading(false);
      }
    };

    loadChatMessages();

    // Set up polling for new messages every 5 seconds
    const pollInterval = setInterval(loadChatMessages, 5000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [currentUser?.uid, orderId, firebaseUser]);

  // Nachricht senden
  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    const messageToSend = newMessageText.trim();

    // Deaktiviere das Senden, wenn Text leer, Benutzer nicht angemeldet oder Profil noch lädt/fehlt
    if (
      !messageToSend ||
      !currentUser ||
      !orderId ||
      !loggedInUserProfile ||
      isSendingMessage ||
      !participants
    ) {
      return;
    }

    // --- NEUE VALIDIERUNG ---
    // Regex für E-Mail-Adressen. Wir normalisieren den Text, um Umgehungsversuche zu erschweren.
    const sanitizedText = messageToSend
      .toLowerCase()
      .replace(/\s+at\s+/g, '@')
      .replace(/\(at\)/g, '@')
      .replace(/\s+dot\s+/g, '.')
      .replace(/\(dot\)/g, '.')
      .replace(/\s/g, ''); // Entfernt ALLE Leerzeichen, um "test @ test . de" zu fangen
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;

    if (emailRegex.test(sanitizedText)) {
      setChatError('E-Mail-Adresse wurde blockiert');
      return; // Senden blockieren
    }

    // Regex für Telefonnummern. Wir entfernen alle nicht-numerischen Zeichen und suchen dann
    // nach einer Sequenz von 8 oder mehr Ziffern, um Umgehungsversuche zu erschweren.
    const digitsOnly = messageToSend.replace(/\D/g, '');
    const phoneRegex = /\d{8,}/; // Sucht nach 8 oder mehr aufeinanderfolgenden Ziffern
    if (phoneRegex.test(digitsOnly)) {
      setChatError('Telefonnummer wurde blockiert');
      return; // Senden blockieren
    }
    // --- ENDE VALIDIERUNG ---

    setIsSendingMessage(true); // Sende-Vorgang starten
    setChatError(null); // Fehler zurücksetzen

    let senderName: string = loggedInUserProfile.firstName || 'Unbekannt';
    let senderType: 'kunde' | 'anbieter' = 'kunde';

    // Prüfung auf 'firma' als user_type
    if (loggedInUserProfile.user_type === 'firma') {
      senderType = 'anbieter';
      senderName = loggedInUserProfile.companyName || loggedInUserProfile.firstName || 'Anbieter';
    }

    const messagePayload = {
      senderId: currentUser.uid,
      senderName: senderName,
      senderType: senderType,
      text: messageToSend,
      timestamp: serverTimestamp(),
      chatUsers: [participants.customerId, participants.providerId], // Hinzufügen, um die Sicherheitsregel zu erfüllen
    };

    const lastMessagePayload = {
      text: messageToSend,
      senderId: currentUser.uid,
      timestamp: serverTimestamp(),
      isRead: false, // Wichtig für die Benachrichtigung!
    };

    try {
      // 1. Nachricht zur Chat-History hinzufügen (wie bisher)
      const messagesRef = collection(db, 'auftraege', orderId, 'nachrichten');
      await addDoc(messagesRef, messagePayload);

      // 2. Top-Level Chat-Dokument für Benachrichtigungen aktualisieren
      const chatDocRef = doc(db, 'chats', orderId);
      // KORREKTUR: setDoc mit { merge: true } verwenden. Dies erstellt das Dokument, falls es nicht existiert,
      // oder aktualisiert es, ohne andere Felder (wie isLocked) zu überschreiben.
      await setDoc(
        chatDocRef,
        {
          users: [participants.customerId, participants.providerId], // Beide Teilnehmer
          lastMessage: lastMessagePayload,
          lastUpdated: serverTimestamp(),
        },
        { merge: true }
      );

      setNewMessageText(''); // Eingabefeld nach erfolgreichem Senden leeren
    } catch (error) {
      console.error('Fehler beim Senden der Nachricht:', error);
      setChatError('Fehler beim Senden der Nachricht');
    } finally {
      setIsSendingMessage(false); // Sende-Vorgang beenden
    }
  };

  const overallLoading = chatLoading || userProfileLoading;

  if (overallLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <FiLoader className="animate-spin text-3xl text-[#14ad9f] mr-2" />
        {chatLoading ? 'Lade Chat...' : 'Lade Benutzerdaten...'}
      </div>
    );
  }

  // Zeige Fehler, wenn kein Benutzer angemeldet ist oder Profil nicht geladen werden konnte
  if (!currentUser || !loggedInUserProfile) {
    return (
      <div className="text-center p-4 text-gray-600">
        {chatError || 'Fehler beim Laden des Profils'}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        {/* Header mit Auftrags-ID und Status-Badge */}
        <div className="flex justify-between items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-800 truncate">Chat: {orderId}</h3>
          {/* Zeige den Status-Badge nur an, wenn ein Status übergeben wurde */}
          {orderStatus && (
            <Badge variant="outline" className="flex-shrink-0">
              {formatStatus(orderStatus)}
            </Badge>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-10">Keine Nachrichten vorhanden</div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.senderId === currentUser.uid ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] p-3 rounded-lg ${
                  msg.senderId === currentUser.uid
                    ? 'bg-[#14ad9f] text-white'
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                <p className="text-xs font-semibold mb-1">
                  {msg.senderName} ({msg.senderType === 'kunde' ? 'Kunde' : 'Anbieter'})
                </p>
                <p className="text-sm break-words">{msg.text}</p>
                <p className="text-right text-xs mt-1 opacity-75">
                  {formatMessageTimestamp(msg.timestamp)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 flex items-center">
        <textarea
          value={newMessageText}
          onChange={e => setNewMessageText(e.target.value)}
          placeholder="Nachricht eingeben..."
          className="flex-1 p-2 border border-gray-300 rounded-md resize-none mr-2 focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
          rows={1}
          onKeyPress={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage(e);
            }
          }}
        />
        <button
          type="submit"
          className="bg-[#14ad9f] text-white p-3 rounded-full hover:bg-[#129a8f] transition-colors flex items-center justify-center"
          disabled={!newMessageText.trim() || overallLoading || isSendingMessage}
        >
          {isSendingMessage ? <FiLoader className="animate-spin" /> : <FiSend size={20} />}
        </button>
      </form>
    </div>
  );
};

export default ChatComponent;
