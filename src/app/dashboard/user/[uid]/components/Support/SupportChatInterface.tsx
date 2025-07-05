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
  getDoc, updateDoc
} from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { FiLoader, FiSend, FiUser, FiCpu } from 'react-icons/fi';
import { useAuth } from '@/contexts/AuthContext';

interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderType: 'kunde' | 'support';
  timestamp: any; // Should be Firestore Timestamp
}

interface SupportChatInterfaceProps {
  onClose: () => void;
}

const formatMessageTimestamp = (timestamp: any): string => {
  if (!timestamp || typeof timestamp.toDate !== 'function') return '';
  const date = timestamp.toDate();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (date >= startOfToday) {
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const SupportChatInterface: React.FC<SupportChatInterfaceProps> = ({ onClose }) => {
  const { user: userProfile, firebaseUser: currentUser } = useAuth();
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const chatId = currentUser ? `support_chat_${currentUser.uid}` : null;

  // KORREKTUR: Robusterer useEffect für Listener-Management
  useEffect(() => {
    if (!chatId || !currentUser || !userProfile) {
      setLoading(false);
      return;
    }

    // KORREKTUR: Die korrekte Collection 'supportChats' verwenden.
    const chatDocRef = doc(db, 'supportChats', chatId);
    const messagesCollectionRef = collection(chatDocRef, 'messages');
    const q = query(messagesCollectionRef, orderBy('timestamp', 'asc'));

    // Richte den Listener für Nachrichten ein.
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const loadedMessages = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ChatMessage));
      setChatMessages(loadedMessages);
      setLoading(false); // Set loading to false after first successful fetch
    }, (error) => {
      console.error("Fehler beim Laden der Chat-Nachrichten:", error);
      setChatError("Nachrichten konnten nicht geladen werden.");
      setLoading(false);
    });

    // Prüfe und erstelle das Chat-Dokument asynchron, ohne den Listener zu blockieren.
    const ensureChatDocumentExists = async () => {
      try {
        const docSnap = await getDoc(chatDocRef);
        if (!docSnap.exists()) {
          console.log(`[SupportChat] Chat-Dokument für ${chatId} existiert nicht. Erstelle es...`);
          // KORREKTUR: Dokumentenstruktur an die 'supportChats'-Regeln anpassen.
          await setDoc(chatDocRef, {
            userId: currentUser.uid, // Wichtig für die Sicherheitsregeln
            userName: `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || `User (${currentUser.uid.substring(0, 6)})`,
            userAvatarUrl: (userProfile as any).profilePictureURL || null,
            isLocked: false,
            lastMessage: {
              text: 'Support-Chat gestartet.',
              timestamp: serverTimestamp(),
              senderId: currentUser.uid,
              isReadBySupport: true, // Initial message is read by default
            },
            lastUpdated: serverTimestamp(),
          });
        }
      } catch (error) {
        console.error("Fehler beim Sicherstellen des Chat-Dokuments:", error);
        setChatError("Chat konnte nicht initialisiert werden.");
      }
    };

    ensureChatDocumentExists();

    // Die Cleanup-Funktion wird korrekt zurückgegeben und beendet den Listener.
    return () => unsubscribe();
  }, [chatId, currentUser, userProfile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSendMessage = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    const messageToSend = message.trim();
    if (!messageToSend || !currentUser || !userProfile || !chatId || isSending) return;

    // --- VALIDIERUNG: Verhindert das Senden von E-Mails oder Telefonnummern ---
    const sanitizedText = messageToSend.toLowerCase().replace(/\s/g, '');
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    const phoneRegex = /\d{8,}/;

    if (emailRegex.test(sanitizedText) || phoneRegex.test(sanitizedText)) {
      setChatError("Die Weitergabe von Kontaktdaten wie E-Mails oder Telefonnummern ist nicht gestattet.");
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
      senderName: `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || 'Kunde',
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
      console.error("Fehler beim Senden der Nachricht: ", error);
      setChatError("Nachricht konnte nicht gesendet werden.");
    } finally {
      setIsSending(false);
    }
  }, [message, currentUser, userProfile, chatId, isSending]);

  return (
    <div className="flex flex-col h-[70vh] max-h-[500px] bg-white w-full -m-6"> {/* Negative margin to fill modal */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center items-center h-full"><FiLoader className="animate-spin text-2xl text-teal-500" /></div>
        ) : (
          chatMessages.map(message => (
            <div key={message.id} className={`flex items-start gap-3 ${message.senderId === currentUser?.uid ? 'justify-end' : 'justify-start'}`} title={`Gesendet von ${message.senderName}`}>
              {message.senderId !== currentUser?.uid && (<div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0" title="Support"><FiCpu className="text-teal-600" /></div>)}
              <div className={`max-w-[80%] p-3 rounded-lg ${message.senderId === currentUser?.uid ? 'bg-teal-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                <p>{message.text}</p>
                <p className={`text-xs mt-1 ${message.senderId === currentUser?.uid ? 'text-teal-100' : 'text-gray-500'} text-right`}>
                  {formatMessageTimestamp(message.timestamp)}
                </p>
              </div>
              {message.senderId === currentUser?.uid && (<div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center shrink-0"><FiUser className="text-white" /></div>)}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-gray-50 flex items-center space-x-3">
        {chatError && (
          <p className="text-xs text-red-600 flex-1">{chatError}</p>
        )}
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Nachricht eingeben..."
          className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={!message.trim() || loading || isSending}
          className="p-3 bg-teal-500 text-white rounded-full hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isSending ? <FiLoader className="animate-spin" size={20} /> : <FiSend size={20} />}
        </button>
      </form>
    </div>
  );
};

export default SupportChatInterface;
