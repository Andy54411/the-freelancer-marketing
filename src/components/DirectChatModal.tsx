'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle, AlertTriangle } from 'lucide-react';
import { db } from '@/firebase/clients';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDoc,
  setDoc
} from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

interface DirectChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  providerId: string;
  providerName: string;
  companyId: string;
  companyName: string;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderType: 'company' | 'provider';
  text: string;
  timestamp: any;
}

// Content-Filter für Kontaktdaten
class ContactDataFilter {
  private static phonePatterns = [
    // Deutsche Telefonnummern
    /(\+49|0049|\+\s*49)[\s\-\.]*\d{2,4}[\s\-\.]*\d{3,8}[\s\-\.]*\d{0,6}/g,
    /0\d{3,4}[\s\-\.]?\d{3,8}/g,
    // Internationale Nummern
    /\+\d{1,4}[\s\-\.]?\d{2,4}[\s\-\.]?\d{3,8}[\s\-\.]?\d{0,6}/g,
    // Allgemeine Telefonnummer-Muster
    /\d{3,4}[\s\-\.]\d{3,8}[\s\-\.]\d{0,6}/g,
    /\d{10,15}/g,
    // Telefonnummer mit Buchstaben
    /(?:tel|phone|telefon|handy|mobile)[\s\.:]*[\+\d\s\-\.]{7,20}/gi,
  ];

  private static emailPatterns = [
    // E-Mail-Adressen
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    // E-Mail ohne @ (Umgehungsversuche)
    /[a-zA-Z0-9._%+-]+\s*(at|AT|\[at\]|\(at\))\s*[a-zA-Z0-9.-]+\s*(dot|DOT|\[dot\]|\(dot\))\s*[a-zA-Z]{2,}/g,
    /[a-zA-Z0-9._%+-]+\s*@\s*[a-zA-Z0-9.-]+\s*\.\s*[a-zA-Z]{2,}/g,
    // Umschreibungen
    /(?:e-?mail|email|mail)[\s\.:]*[a-zA-Z0-9._%+-\s@]{5,50}/gi,
  ];

  private static contactKeywords = [
    // Deutsche Begriffe
    'telefon', 'handy', 'mobile', 'nummer', 'anrufen', 'whatsapp', 'signal', 'telegram',
    'email', 'e-mail', 'mail', 'schreib mir', 'kontaktier mich', 'ruf mich an',
    'meine nummer', 'mein handy', 'meine mail', 'erreichbar unter',
    // Englische Begriffe
    'phone', 'call me', 'contact me', 'reach me', 'my number', 'my phone', 'my email',
    // Varianten und Umgehungen
    'tel', 'tel.', 'tel:', 'mob', 'mob.', 'mob:', '@', 'at', 'punkt', 'dot',
    // Social Media
    'instagram', 'facebook', 'linkedin', 'xing', 'skype', 'discord'
  ];

  private static websitePatterns = [
    // URLs und Websites
    /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/g,
    /(?:www\.)[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/g,
    /[a-zA-Z0-9-]+\.(com|de|org|net|eu|co\.uk|at|ch)(?:\/[^\s]*)?/g,
  ];

  static containsContactData(text: string): { blocked: boolean; reason: string; suggestions: string[] } {
    const normalizedText = text.toLowerCase().replace(/\s+/g, ' ');
    
    // Prüfe Telefonnummern
    for (const pattern of this.phonePatterns) {
      if (pattern.test(text)) {
        return {
          blocked: true,
          reason: 'Telefonnummern sind im Chat nicht erlaubt',
          suggestions: [
            'Nutzen Sie die Buchungs-Funktion für einen Termin',
            'Verwenden Sie unser integriertes Nachrichtensystem',
            'Kontaktdaten können nach der Buchung ausgetauscht werden'
          ]
        };
      }
    }

    // Prüfe E-Mail-Adressen
    for (const pattern of this.emailPatterns) {
      if (pattern.test(text)) {
        return {
          blocked: true,
          reason: 'E-Mail-Adressen sind im Chat nicht erlaubt',
          suggestions: [
            'Kommunizieren Sie über unser sicheres Chat-System',
            'Nach einer Buchung erhalten Sie automatisch die Kontaktdaten',
            'Nutzen Sie die "Termin buchen" Funktion'
          ]
        };
      }
    }

    // Prüfe Website/URLs
    for (const pattern of this.websitePatterns) {
      if (pattern.test(text)) {
        return {
          blocked: true,
          reason: 'Links und Websites sind im Chat nicht erlaubt',
          suggestions: [
            'Beschreiben Sie Ihr Anliegen direkt hier im Chat',
            'Teilen Sie relevante Informationen als Text',
            'Nach der Buchung können weitere Details ausgetauscht werden'
          ]
        };
      }
    }

    // Prüfe Kontakt-Keywords in Kombination mit verdächtigen Mustern
    const hasContactKeyword = this.contactKeywords.some(keyword => 
      normalizedText.includes(keyword)
    );

    if (hasContactKeyword) {
      // Zusätzliche Prüfung auf Zahlen nach Kontakt-Keywords
      const hasNumbersAfterKeyword = /(?:telefon|handy|mobile|nummer|phone|call|mail|email|kontakt|reach)[\s\w]*\d{3,}/gi.test(text);
      if (hasNumbersAfterKeyword) {
        return {
          blocked: true,
          reason: 'Kontaktdaten-Austausch ist im Chat nicht erlaubt',
          suggestions: [
            'Nutzen Sie unsere sichere Buchungs-Plattform',
            'Kontaktdaten werden automatisch nach der Buchung freigegeben',
            'Beschreiben Sie Ihr Projekt hier im Chat'
          ]
        };
      }
    }

    return { blocked: false, reason: '', suggestions: [] };
  }

  static sanitizeMessage(text: string): string {
    let sanitized = text;
    
    // Entferne potentielle Kontaktdaten
    this.phonePatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[Telefonnummer entfernt]');
    });
    
    this.emailPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[E-Mail entfernt]');
    });
    
    this.websitePatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[Link entfernt]');
    });
    
    return sanitized;
  }
}

export default function DirectChatModal({
  isOpen,
  onClose,
  providerId,
  providerName,
  companyId,
  companyName
}: DirectChatModalProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [chatId, setChatId] = useState<string>('');
  const [warningMessage, setWarningMessage] = useState<{ reason: string; suggestions: string[] } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Generiere eine eindeutige Chat-ID basierend auf beiden Teilnehmern
  const generateChatId = (companyId: string, providerId: string) => {
    return [companyId, providerId].sort().join('_');
  };

  useEffect(() => {
    if (!isOpen || !user || !providerId) return;

    const currentUserId = user.uid;
    const chatId = generateChatId(currentUserId, providerId);
    setChatId(chatId);

    // Chat-Dokument erstellen falls es nicht existiert
    const initializeChat = async () => {
      try {
        const chatRef = doc(db, 'directChats', chatId);
        const chatDoc = await getDoc(chatRef);
        
        if (!chatDoc.exists()) {
          await setDoc(chatRef, {
            participants: [currentUserId, providerId],
            companyId: currentUserId,
            providerId,
            companyName,
            providerName,
            createdAt: serverTimestamp(),
            lastUpdated: serverTimestamp()
          });
        }
      } catch (error) {
        console.error('Fehler beim Initialisieren des Chats:', error);
      }
    };

    initializeChat();

    // Nachrichten in Echtzeit abhören
    const messagesRef = collection(db, 'directChats', chatId, 'messages');
    const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));
    
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesList: Message[] = [];
      snapshot.forEach((doc) => {
        messagesList.push({
          id: doc.id,
          ...doc.data()
        } as Message);
      });
      setMessages(messagesList);
    }, (error) => {
      console.error('Fehler beim Abhören der Nachrichten:', error);
    });

    return () => unsubscribe();
  }, [isOpen, user, providerId, companyName, providerName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setNewMessage(text);

    // Live-Validierung während der Eingabe
    if (text.length > 10) {
      const filterResult = ContactDataFilter.containsContactData(text);
      if (filterResult.blocked) {
        setWarningMessage({ reason: filterResult.reason, suggestions: filterResult.suggestions });
      } else {
        setWarningMessage(null);
      }
    } else {
      setWarningMessage(null);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !user) return;

    // Finale Validierung vor dem Senden
    const filterResult = ContactDataFilter.containsContactData(newMessage);
    if (filterResult.blocked) {
      setWarningMessage({ reason: filterResult.reason, suggestions: filterResult.suggestions });
      return;
    }

    setSending(true);
    try {
      const messagesRef = collection(db, 'directChats', chatId, 'messages');
      await addDoc(messagesRef, {
        senderId: user.uid,
        senderName: companyName,
        senderType: 'company',
        text: newMessage.trim(),
        timestamp: serverTimestamp()
      });

      setNewMessage('');
      setWarningMessage(null);
    } catch (error) {
      console.error('Fehler beim Senden der Nachricht:', error);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md h-[500px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#14ad9f] rounded-full flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Chat mit {providerName}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Sicherer Chat - Kontaktdaten werden nach Buchung freigegeben
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Message */}
        {warningMessage && (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4 mx-4 mt-4 rounded">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-300">
                  {warningMessage.reason}
                </p>
                <ul className="mt-2 text-sm text-red-700 dark:text-red-400 list-disc list-inside">
                  {warningMessage.suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="mb-2">Starten Sie die Unterhaltung mit {providerName}</p>
              <div className="text-xs bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <p className="font-medium text-blue-800 dark:text-blue-300 mb-1">Hinweis:</p>
                <p className="text-blue-600 dark:text-blue-400">
                  Aus Sicherheitsgründen können Kontaktdaten erst nach einer Buchung ausgetauscht werden.
                </p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                    message.senderId === user?.uid
                      ? 'bg-[#14ad9f] text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                  <p className={`text-xs mt-1 ${
                    message.senderId === user?.uid ? 'text-teal-100' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {message.timestamp?.toDate?.()?.toLocaleTimeString('de-DE', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <form onSubmit={sendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={handleMessageChange}
              placeholder="Beschreiben Sie Ihr Projekt..."
              className={`flex-1 px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent transition-colors ${
                warningMessage 
                  ? 'border-red-300 dark:border-red-600' 
                  : 'border-gray-200 dark:border-gray-600'
              }`}
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending || !!warningMessage}
              className="bg-[#14ad9f] hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
