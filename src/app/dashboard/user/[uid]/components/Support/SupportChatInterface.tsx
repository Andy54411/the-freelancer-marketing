// SupportChatInterface.tsx
'use client';

import React, { useState, useEffect, useRef, FormEvent, useCallback } from 'react';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  setDoc, // setDoc is still needed for initial creation
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { FiLoader, FiSend, FiUser, FiCpu } from 'react-icons/fi';
import { useAuth } from '@/contexts/AuthContext';

import ChatMessageBubble from './ChatMessageBubble'; // Import der neuen Komponente

// NEU: Eine Schnittstelle für die Nutzdaten einer Systemnachricht
export interface SystemMessagePayload {
  agentName: string;
  agentAvatarUrl?: string | null;
}

export interface ChatMessage {
  // Exportiert für die Verwendung in ChatMessageBubble
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderType: 'kunde' | 'support' | 'bot' | 'system'; // 'system' als senderType hinzugefügt
  timestamp: any; // Should be Firestore Timestamp
  systemPayload?: SystemMessagePayload; // NEU: Optionale Nutzdaten für Systemnachrichten
  chatUsers?: string[]; // Hinzugefügt für Konsistenz
}

interface SupportChatInterfaceProps {
  onClose: () => void;
}

const SupportChatInterface: React.FC<SupportChatInterfaceProps> = ({ onClose }) => {
  const { user: userProfile, firebaseUser: currentUser } = useAuth();
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isChatReady, setIsChatReady] = useState(false); // NEU: State, um sicherzustellen, dass der Chat initialisiert ist.
  const [chatError, setChatError] = useState<string | null>(null);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const chatId = currentUser ? `support_chat_${currentUser.uid}` : null;

  // KORREKTUR: Robusterer useEffect für Listener-Management
  useEffect(() => {
    if (!chatId || !currentUser || !userProfile) {
      setLoading(false);
      setIsChatReady(false);
      return;
    }

    // KORREKTUR: Die korrekte Collection 'supportChats' verwenden.
    const chatDocRef = doc(db, 'supportChats', chatId);
    const messagesCollectionRef = collection(chatDocRef, 'messages');
    const q = query(messagesCollectionRef, orderBy('timestamp', 'asc'));

    // Richte den Listener für Nachrichten ein.
    const unsubscribe = onSnapshot(
      q,
      querySnapshot => {
        const loadedMessages = querySnapshot.docs.map(
          doc =>
            ({
              id: doc.id,
              ...doc.data(),
            }) as ChatMessage
        );
        setChatMessages(loadedMessages);
        setLoading(false); // Set loading to false after first successful fetch
      },
      error => {
        console.error('Fehler beim Laden der Chat-Nachrichten:', error);
        setChatError('Nachrichten konnten nicht geladen werden.');
        setLoading(false);
      }
    );

    // Prüfe und erstelle das Chat-Dokument asynchron, ohne den Listener zu blockieren.
    const ensureChatDocumentExists = async () => {
      try {
        const docSnap = await getDoc(chatDocRef);
        if (!docSnap.exists()) {
          console.log(`[SupportChat] Chat-Dokument für ${chatId} existiert nicht. Erstelle es...`);
          // KORREKTUR: Dokumentenstruktur an die 'supportChats'-Regeln anpassen.
          await setDoc(chatDocRef, {
            userId: currentUser.uid, // Wichtig für die Sicherheitsregeln
            userName:
              `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() ||
              `User (${currentUser.uid.substring(0, 6)})`,
            userAvatarUrl: (userProfile as any).profilePictureURL || null,
            isLocked: false,
            lastMessage: {
              text: 'Support-Chat gestartet.',
              timestamp: serverTimestamp(),
              senderId: currentUser.uid,
              isReadBySupport: true, // Initial message is read by default
            },
            lastUpdated: serverTimestamp(),
            users: [currentUser.uid], // NEU: Das 'users'-Array von Anfang an hinzufügen, damit der Bot es lesen kann.
            status: 'bot', // NEU: Chat standardmäßig im Bot-Modus starten, damit der Chatbot antwortet.
          });
        } else {
          // NEU: Prüfen, ob das existierende Dokument den 'status' hat.
          // Wenn nicht, wird er hinzugefügt, um alte Chats zu migrieren.
          const chatData = docSnap.data();
          // KORREKTUR: Setze den Status bei JEDEM Öffnen des Chats auf 'bot',
          // um sicherzustellen, dass jede neue Konversation mit dem Bot beginnt.
          if (chatData.status !== 'bot') {
            console.log(
              `[SupportChat] Chat-Dokument ${chatId} existiert, aber Status ist '${chatData.status || 'undefined'}'. Setze auf 'bot' zurück...`
            );
            await updateDoc(chatDocRef, { status: 'bot' });
          }
        }
        setIsChatReady(true); // Chat ist jetzt initialisiert und bereit zum Senden.
      } catch (error) {
        console.error('Fehler beim Sicherstellen des Chat-Dokuments:', error);
        setChatError('Chat konnte nicht initialisiert werden.');
        setIsChatReady(false);
      }
    };

    ensureChatDocumentExists();

    // Die Cleanup-Funktion wird korrekt zurückgegeben und beendet den Listener.
    return () => unsubscribe();
  }, [chatId, currentUser, userProfile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const messageToSend = message.trim();
      if (!messageToSend || !currentUser || !userProfile || !chatId || isSending) return;

      // --- VALIDIERUNG: Verhindert das Senden von E-Mails oder Telefonnummern ---
      const sanitizedText = messageToSend.toLowerCase().replace(/\s/g, '');
      const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
      const phoneRegex = /\d{8,}/;

      if (emailRegex.test(sanitizedText) || phoneRegex.test(sanitizedText)) {
        setChatError(
          'Die Weitergabe von Kontaktdaten wie E-Mails oder Telefonnummern ist nicht gestattet.'
        );
        return;
      }

      setIsSending(true);
      setChatError(null);

      // KORREKTUR: Die korrekte Collection 'supportChats' verwenden.
      const chatDocRef = doc(db, 'supportChats', chatId);
      const messagesCollectionRef = collection(chatDocRef, 'messages');

      const messageData = {
        text: messageToSend,
        senderId: currentUser.uid,
        senderName:
          `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || 'Kunde',
        senderType: 'kunde' as const,
        timestamp: serverTimestamp(),
        // KORREKTUR: chatUsers hinzufügen, um die 'canCreateMessage'-Sicherheitsregel zu erfüllen.
        chatUsers: [currentUser.uid, 'support_user_placeholder'],
      };

      try {
        // Nachricht zur Subkollektion hinzufügen
        await addDoc(messagesCollectionRef, messageData);

        // KORREKTUR: Top-Level Chat-Dokument NUR mit der letzten Nachricht aktualisieren.
        // Dies funktioniert jetzt, da die 'update'-Regel in firestore.rules korrigiert wurde.
        await updateDoc(chatDocRef, {
          lastMessage: {
            text: messageToSend,
            timestamp: serverTimestamp(),
            senderId: currentUser.uid,
            isReadBySupport: false, // Eine neue Nachricht vom Kunden ist für den Support ungelesen.
          },
          lastUpdated: serverTimestamp(),
        });

        setMessage('');
      } catch (error) {
        console.error('Fehler beim Senden der Nachricht: ', error);
        setChatError('Nachricht konnte nicht gesendet werden.');
      } finally {
        setIsSending(false);
      }
    },
    [message, currentUser, userProfile, chatId, isSending]
  );

  return (
    <div className="flex flex-col h-[70vh] max-h-[500px] bg-white w-full -m-6">
      {' '}
      {/* Negative margin to fill modal */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <FiLoader className="animate-spin text-2xl text-teal-500" />
          </div>
        ) : (
          chatMessages.map(msg => (
            <ChatMessageBubble
              key={msg.id}
              message={msg}
              isCurrentUser={msg.senderId === currentUser?.uid}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <form
        onSubmit={handleSendMessage}
        className="p-4 border-t border-gray-200 bg-gray-50 flex items-center space-x-3"
      >
        {chatError && <p className="text-xs text-red-600 flex-1">{chatError}</p>}
        <input
          type="text"
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Nachricht eingeben..."
          className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={!message.trim() || loading || isSending || !isChatReady} // NEU: Senden wird blockiert, bis der Chat bereit ist.
          className="p-3 bg-teal-500 text-white rounded-full hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isSending ? <FiLoader className="animate-spin" size={20} /> : <FiSend size={20} />}
        </button>
      </form>
    </div>
  );
};

export default SupportChatInterface;
