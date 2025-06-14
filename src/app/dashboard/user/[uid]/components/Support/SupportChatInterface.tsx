// SupportChatInterface.tsx
import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp, DocumentData } from 'firebase/firestore';
import { db } from '@/firebase/clients'; // Annahme: db ist Ihre Firestore-Instanz

interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  timestamp: Date; // Für lokale Anzeige, Firestore würde Timestamp verwenden
  // Optional: displayName?: string;
}

interface SupportChatInterfaceProps {
  currentUser: User;
  onClose: () => void;
  chatId?: string; // Optional, falls Sie Chat-Sessions verwalten (z.B. 'user_{currentUser.uid}')
}

const SupportChatInterface: React.FC<SupportChatInterfaceProps> = ({ currentUser, onClose, chatId }) => {
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  // useEffect Hook zum Laden von Nachrichten und Abonnieren von Updates
  // Dies ist ein Platzhalter. Für eine echte Implementierung würden Sie hier Firestore-Listener verwenden.
  useEffect(() => {
    if (!chatId) return; // Benötigt eine chatId, um Nachrichten zu laden/speichern
    const messagesCollectionRef = collection(db, 'supportChats', chatId, 'messages');
    const q = query(messagesCollectionRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const loadedMessages: ChatMessage[] = [];
      querySnapshot.forEach((doc: DocumentData) => {
        const data = doc.data();
        const timestamp = data.timestamp as Timestamp | null; // Type assertion
        loadedMessages.push({
          id: doc.id,
          text: data.text,
          senderId: data.senderId,
          timestamp: timestamp ? timestamp.toDate() : new Date(), // Firestore Timestamp zu Date konvertieren
          // displayName: data.displayName
        });
      });
      setChatMessages(loadedMessages);
    });

    return () => unsubscribe();
  }, [chatId]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const newMessage: ChatMessage = {
      id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, // Eindeutigere lokale ID
      text: message.trim(),
      senderId: currentUser.uid,
      timestamp: new Date(),
      // displayName: currentUser.displayName || currentUser.email?.split('@')[0] || "User"
    };
    // Für lokale Demo (ohne Firestore-Anbindung):
    setChatMessages(prevMessages => [...prevMessages, newMessage]);
    setMessage('');
  };

  return (
    <div className="flex flex-col h-[60vh] sm:h-[50vh] bg-white">
      <div className="flex-grow overflow-y-auto p-4 space-y-2 border-b border-gray-200">
        {chatMessages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.senderId === currentUser.uid ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] sm:max-w-[70%]`}>
              {/* Optional: Absendername anzeigen, wenn nicht der aktuelle Benutzer und vorhanden */}
              {/* {msg.senderId !== currentUser.uid && msg.displayName && (
                <p className={`text-xs text-gray-500 mb-0.5 ${msg.senderId === currentUser.uid ? 'text-right' : 'text-left'}`}>{msg.displayName}</p>
              )} */}
              <div className={`inline-block p-2 px-3 rounded-lg text-sm shadow-sm ${msg.senderId === currentUser.uid ? 'bg-[#14ad9f] text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
                {msg.text}
              </div>
              <p className={`text-xs text-gray-400 mt-1 ${msg.senderId === currentUser.uid ? 'text-right' : 'text-left'}`}>
                {msg.timestamp.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-gray-500 text-center">
              Willkommen beim Support-Chat! <br />
              Stellen Sie Ihre Frage, wir helfen Ihnen gerne weiter.
            </p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-3 sm:p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Nachricht eingeben..."
            className="flex-grow border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] outline-none transition-shadow duration-150"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); // Verhindert Zeilenumbruch im Input bei Enter
                handleSendMessage();
              }
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className="bg-[#14ad9f] text-white px-4 py-2 rounded-md hover:bg-[#129a8f] transition-colors focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Senden
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupportChatInterface;
