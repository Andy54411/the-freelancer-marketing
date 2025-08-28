'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, User, Building, Clock, Check, CheckCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/firebase/clients';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  doc,
  updateDoc,
  where,
  getDocs
} from 'firebase/firestore';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderType: 'customer' | 'provider';
  timestamp: any;
  read: boolean;
}

interface QuoteChatProps {
  quoteId: string;
  customerId: string;
  providerId: string;
  customerName: string;
  providerName: string;
  currentUserType: 'customer' | 'provider';
}

export default function QuoteChat({ 
  quoteId, 
  customerId, 
  providerId, 
  customerName, 
  providerName,
  currentUserType 
}: QuoteChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { firebaseUser } = useAuth();

  // Chat-Container referenz für Auto-Scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Nachrichten laden
  useEffect(() => {
    if (!quoteId) return;

    const messagesRef = collection(db, 'quotes', quoteId, 'chat');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      
      setMessages(messagesData);

      // Markiere Nachrichten als gelesen wenn Chat geöffnet ist
      if (isExpanded) {
        markMessagesAsRead();
      }
    });

    return () => unsubscribe();
  }, [quoteId, isExpanded]);

  // Nachrichten als gelesen markieren
  const markMessagesAsRead = async () => {
    if (!firebaseUser || !quoteId) return;

    try {
      const messagesRef = collection(db, 'quotes', quoteId, 'chat');
      const q = query(
        messagesRef, 
        where('senderId', '!=', firebaseUser.uid),
        where('read', '==', false)
      );
      
      const snapshot = await getDocs(q);
      
      const updatePromises = snapshot.docs.map(doc => 
        updateDoc(doc.ref, { read: true })
      );
      
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Fehler beim Markieren der Nachrichten als gelesen:', error);
    }
  };

  // Nachricht senden
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !firebaseUser || loading) return;

    setLoading(true);
    
    try {
      const messagesRef = collection(db, 'quotes', quoteId, 'chat');
      
      await addDoc(messagesRef, {
        text: newMessage.trim(),
        senderId: firebaseUser.uid,
        senderName: currentUserType === 'customer' ? customerName : providerName,
        senderType: currentUserType,
        timestamp: serverTimestamp(),
        read: false
      });

      setNewMessage('');
    } catch (error) {
      console.error('Fehler beim Senden der Nachricht:', error);
    } finally {
      setLoading(false);
    }
  };

  // Ungelesene Nachrichten zählen
  const unreadCount = messages.filter(msg => 
    msg.senderId !== firebaseUser?.uid && !msg.read
  ).length;

  if (!isExpanded) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <MessageCircle className="h-5 w-5 text-[#14ad9f]" />
            <span className="text-sm font-medium text-gray-900">
              Direkte Kommunikation
            </span>
          </div>
          {unreadCount > 0 && (
            <div className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount}
            </div>
          )}
        </button>
        <p className="text-xs text-gray-500 mt-1">
          Chatten Sie direkt mit {currentUserType === 'customer' ? 'dem Anbieter' : 'dem Kunden'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-5 w-5 text-[#14ad9f]" />
          <div>
            <h3 className="text-sm font-medium text-gray-900">
              Chat mit {currentUserType === 'customer' ? providerName : customerName}
            </h3>
            <p className="text-xs text-gray-500">
              {currentUserType === 'customer' ? 'Anbieter' : 'Kunde'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <span className="text-sm">Minimieren</span>
        </button>
      </div>

      {/* Messages Area */}
      <div className="h-64 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>Noch keine Nachrichten.</p>
            <p>Starten Sie das Gespräch!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.senderId === firebaseUser?.uid;
            
            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                    isOwnMessage
                      ? 'bg-[#14ad9f] text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {!isOwnMessage && (
                    <div className="flex items-center gap-1 mb-1">
                      {message.senderType === 'provider' ? (
                        <Building className="h-3 w-3" />
                      ) : (
                        <User className="h-3 w-3" />
                      )}
                      <span className="text-xs font-medium">
                        {message.senderName}
                      </span>
                    </div>
                  )}
                  
                  <p className="text-sm">{message.text}</p>
                  
                  <div className={`flex items-center gap-1 mt-1 ${
                    isOwnMessage ? 'justify-end' : 'justify-start'
                  }`}>
                    <Clock className="h-3 w-3 opacity-70" />
                    <span className="text-xs opacity-70">
                      {message.timestamp?.toDate().toLocaleTimeString('de-DE', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    {isOwnMessage && (
                      <div className="ml-1">
                        {message.read ? (
                          <CheckCheck className="h-3 w-3 text-green-200" />
                        ) : (
                          <Check className="h-3 w-3 opacity-70" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={sendMessage} className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Nachricht eingeben..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent text-sm"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || loading}
            className="bg-[#14ad9f] hover:bg-[#129488] disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-2 rounded-md transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
