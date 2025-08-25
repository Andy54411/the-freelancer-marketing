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
  const [chat, setChat] = useState<any>(null); // Chat-Document State
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

    // Listener für Chat-Dokument
    const chatUnsubscribe = onSnapshot(
      chatDocRef,
      doc => {
        if (doc.exists()) {
          setChat(doc.data());
        }
      },
      error => {

      }
    );

    // Richte den Listener für Nachrichten ein.
    const messagesUnsubscribe = onSnapshot(
      q,
      querySnapshot => {
        const loadedMessages = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            // Konvertiere Firestore Timestamp zu JavaScript Date
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp),
          } as ChatMessage;
        });
        setChatMessages(loadedMessages);
        setLoading(false); // Set loading to false after first successful fetch
      },
      error => {

        setChatError('Nachrichten konnten nicht geladen werden.');
        setLoading(false);
      }
    );

    // Prüfe und erstelle das Chat-Dokument asynchron, ohne den Listener zu blockieren.
    const ensureChatDocumentExists = async () => {
      try {
        const docSnap = await getDoc(chatDocRef);
        if (!docSnap.exists()) {

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
              senderId: 'system',
              isReadBySupport: true, // Initial message is read by default
            },
            lastUpdated: serverTimestamp(),
            users: [currentUser.uid], // NEU: Das 'users'-Array von Anfang an hinzufügen, damit der Bot es lesen kann.
            status: 'bot', // NEU: Chat standardmäßig im Bot-Modus starten, damit der Chatbot antwortet.
          });

          // Füge eine Begrüßungsnachricht hinzu
          await addDoc(messagesCollectionRef, {
            text: 'Willkommen im Taskilo Support! Ich bin Ihr KI-Assistent und helfe Ihnen gerne bei Fragen zu unserer Plattform. Bei komplexeren Anliegen leite ich Sie automatisch an unser Support-Team weiter.',
            senderId: 'gemini-bot',
            senderName: 'Taskilo Support Bot',
            senderType: 'bot' as const,
            timestamp: serverTimestamp(),
            chatUsers: [currentUser.uid, 'support_user_placeholder'],
          });
        } else {
          // NEU: Prüfen, ob das existierende Dokument den 'status' hat.
          // Wenn nicht, wird er hinzugefügt, um alte Chats zu migrieren.
          const chatData = docSnap.data();
          // KORREKTUR: Setze den Status bei JEDEM Öffnen des Chats auf 'bot',
          // um sicherzustellen, dass jede neue Konversation mit dem Bot beginnt.
          if (chatData.status !== 'bot') {

            await updateDoc(chatDocRef, { status: 'bot' });
          }
        }
        setIsChatReady(true); // Chat ist jetzt initialisiert und bereit zum Senden.
      } catch (error) {

        setChatError('Chat konnte nicht initialisiert werden.');
        setIsChatReady(false);
      }
    };

    ensureChatDocumentExists();

    // Die Cleanup-Funktion wird korrekt zurückgegeben und beendet beide Listener.
    return () => {
      chatUnsubscribe();
      messagesUnsubscribe();
    };
  }, [chatId, currentUser, userProfile]);

  useEffect(() => {
    // Nur scrollen wenn der Chat bereits geladen ist und nicht beim ersten Laden
    if (!loading && chatMessages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, loading]);

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

        // NEU: Prüfe Chat-Status - wenn "bot", sende an Gemini API
        const chatDoc = await getDoc(chatDocRef);
        const chatData = chatDoc.data();

        if (chatData?.status === 'bot') {
          // Hole Chat-Historie für Gemini-Kontext
          const chatHistory = chatMessages.map(msg => ({
            role: msg.senderId === currentUser.uid ? 'user' : 'model',
            parts: [{ text: msg.text }],
          }));

          // Sende an Gemini API
          try {
            const geminiResponse = await fetch('/api/chat', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-user-id': currentUser.uid, // Für Eskalations-Tracking
              },
              body: JSON.stringify({
                message: messageToSend,
                history: chatHistory,
              }),
            });

            const geminiData = await geminiResponse.json();

            if (geminiData.text) {
              // Füge Bot-Antwort hinzu
              await addDoc(messagesCollectionRef, {
                text: geminiData.text,
                senderId: 'gemini-bot',
                senderName: 'Taskilo Support Bot',
                senderType: 'bot' as const,
                timestamp: serverTimestamp(),
                chatUsers: [currentUser.uid, 'support_user_placeholder'],
              });

              // Update lastMessage
              await updateDoc(chatDocRef, {
                lastMessage: {
                  text: geminiData.text,
                  timestamp: serverTimestamp(),
                  senderId: 'gemini-bot',
                  isReadBySupport: true,
                },
                lastUpdated: serverTimestamp(),
              });

              // Prüfe auf Eskalation
              if (geminiData.escalated) {
                // Chat-Status auf "human" ändern
                await updateDoc(chatDocRef, {
                  status: 'human',
                  escalatedAt: serverTimestamp(),
                  escalationReason: 'Bot escalation requested',
                });

                // Zeige Eskalations-Nachricht
                setTimeout(async () => {
                  await addDoc(messagesCollectionRef, {
                    text: 'Ein Taskilo-Mitarbeiter wird sich in Kürze um Ihre Anfrage kümmern. Bitte haben Sie einen Moment Geduld.',
                    senderId: 'system',
                    senderName: 'System',
                    senderType: 'system' as const,
                    timestamp: serverTimestamp(),
                    chatUsers: [currentUser.uid, 'support_user_placeholder'],
                    systemPayload: {
                      agentName: 'Support-Team',
                    },
                  });
                }, 1000);
              }
            }
          } catch (geminiError) {

            // Fallback: Setze Status auf "human" für manuelle Bearbeitung
            await updateDoc(chatDocRef, {
              status: 'human',
              escalatedAt: serverTimestamp(),
              escalationReason: 'Bot API error',
            });
          }
        }
      } catch (error) {

        setChatError('Nachricht konnte nicht gesendet werden.');
      } finally {
        setIsSending(false);
      }
    },
    [message, currentUser, userProfile, chatId, isSending]
  );

  return (
    <div className="flex flex-col h-[70vh] max-h-[500px] bg-white w-full -m-6">
      {/* Chat Header mit Status-Indikator */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-800">Support-Chat</h3>
        <div className="flex items-center gap-2">
          {chat?.status === 'bot' && (
            <div className="flex items-center gap-1 text-sm text-blue-600">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              KI-Assistent
            </div>
          )}
          {chat?.status === 'human' && (
            <div className="flex items-center gap-1 text-sm text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Support-Mitarbeiter
            </div>
          )}
        </div>
      </div>

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
