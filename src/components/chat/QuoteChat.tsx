'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  getDocs,
} from 'firebase/firestore';
import ChatNotificationBell from './ChatNotificationBell';

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
  currentUserType,
}: QuoteChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { firebaseUser } = useAuth();

  // Chat-Container referenz für Auto-Scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Nachrichten laden mit Real-time Updates
  useEffect(() => {
    if (!quoteId || !firebaseUser) return;

    console.log('🔄 QuoteChat: Setting up real-time listener for quoteId:', quoteId);
    setIsConnected(false);

    const messagesRef = collection(db, 'quotes', quoteId, 'chat');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        console.log('📨 QuoteChat: Real-time update received, docs:', snapshot.docs.length);
        setIsConnected(true);

        const messagesData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            text: data.text || '',
            senderId: data.senderId || '',
            senderName: data.senderName || '',
            senderType: data.senderType || 'customer',
            timestamp: data.timestamp,
            read: data.read || false,
          };
        }) as Message[];

        console.log('📝 QuoteChat: Processed messages:', messagesData.length);
        setMessages(messagesData);

        // Markiere Nachrichten als gelesen wenn Chat geöffnet ist
        if (isExpanded && messagesData.length > 0) {
          setTimeout(() => markMessagesAsRead(), 1000); // Kurze Verzögerung für bessere UX
        }
      },
      error => {
        console.error('❌ QuoteChat: Real-time listener error:', error);
        setIsConnected(false);
      }
    );

    return () => {
      console.log('🛑 QuoteChat: Cleaning up real-time listener');
      setIsConnected(false);
      unsubscribe();
    };
  }, [quoteId, firebaseUser, isExpanded]);

  // Ungelesene Nachrichten zählen
  useEffect(() => {
    if (!firebaseUser?.uid) {
      setUnreadCount(0);
      return;
    }

    const count = messages.filter(msg => msg.senderId !== firebaseUser.uid && !msg.read).length;

    setUnreadCount(count);
    console.log('📊 QuoteChat: Unread count updated:', count);
  }, [messages, firebaseUser?.uid]);

  // Nachrichten als gelesen markieren - optimiert für Real-time
  const markMessagesAsRead = async () => {
    if (!firebaseUser || !quoteId) return;

    try {
      console.log('📖 QuoteChat: Marking messages as read for user:', firebaseUser.uid);

      const unreadMessages = messages.filter(msg => msg.senderId !== firebaseUser.uid && !msg.read);

      if (unreadMessages.length === 0) {
        console.log('📖 QuoteChat: No unread messages to mark');
        return;
      }

      console.log('📖 QuoteChat: Marking', unreadMessages.length, 'messages as read');

      const updatePromises = unreadMessages.map(msg => {
        const messageRef = doc(db, 'quotes', quoteId, 'chat', msg.id);
        return updateDoc(messageRef, { read: true });
      });

      await Promise.all(updatePromises);
      console.log('✅ QuoteChat: Successfully marked messages as read');
    } catch (error) {
      console.error('❌ QuoteChat: Error marking messages as read:', error);
    }
  };

  // Nachricht senden - optimiert für Real-time
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !firebaseUser || loading) return;

    const messageText = newMessage.trim();
    setLoading(true);
    setNewMessage(''); // Sofort leeren für bessere UX

    try {
      console.log('📤 QuoteChat: Sending message:', messageText);

      const messagesRef = collection(db, 'quotes', quoteId, 'chat');

      const messageData = {
        text: messageText,
        senderId: firebaseUser.uid,
        senderName: currentUserType === 'customer' ? customerName : providerName,
        senderType: currentUserType,
        timestamp: serverTimestamp(),
        read: false,
      };

      await addDoc(messagesRef, messageData);
      console.log('✅ QuoteChat: Message sent successfully');
    } catch (error) {
      console.error('❌ QuoteChat: Error sending message:', error);
      // Nachricht wieder in Input setzen bei Fehler
      setNewMessage(messageText);
    } finally {
      setLoading(false);
    }
  };

  if (!isExpanded) {
    return (
      <div className="bg-gradient-to-r from-[#14ad9f] to-[#129488] rounded-lg shadow-lg border-2 border-[#14ad9f] p-4 hover:shadow-xl transition-all duration-200 cursor-pointer">
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full flex items-center justify-between text-left group"
        >
          <div className="flex items-center gap-3">
            <div>
              <span className="text-lg font-bold text-white block">Chat öffnen</span>
              <span className="text-sm text-white/90">
                Direkte Kommunikation mit{' '}
                {currentUserType === 'customer' ? 'dem Anbieter' : 'dem Kunden'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <div className="bg-white text-[#14ad9f] text-sm font-bold rounded-full h-8 w-8 flex items-center justify-center animate-pulse shadow-lg">
                {unreadCount}
              </div>
            )}
            <div className="text-white/80 text-sm font-medium group-hover:text-white transition-colors">
              Aufklappen →
            </div>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border border-[#14ad9f] overflow-hidden w-full max-w-none">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-[#14ad9f]/10 to-[#129488]/10">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Chat mit {currentUserType === 'customer' ? providerName : customerName}
            </h3>
            <div className="text-sm text-gray-600 flex items-center gap-2">
              {currentUserType === 'customer' ? 'Anbieter' : 'Kunde'}
              <span className="flex items-center gap-1">
                <div
                  className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}
                ></div>
                <span className="font-medium">{isConnected ? 'Live' : 'Verbinde...'}</span>
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Notification Bell für ungelesene Nachrichten */}
          {unreadCount > 0 && (
            <ChatNotificationBell unreadCount={unreadCount} size="md" className="animate-pulse" />
          )}
          <button
            onClick={() => setIsExpanded(false)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors font-medium"
          >
            Minimieren ↑
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="h-64 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8">
            <div className="text-2xl mb-2">💬</div>
            <p>Noch keine Nachrichten.</p>
            <p>Starten Sie das Gespräch!</p>
          </div>
        ) : (
          messages.map(message => {
            const isOwnMessage = message.senderId === firebaseUser?.uid;

            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg shadow-sm ${
                    isOwnMessage ? 'bg-[#14ad9f] text-white' : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {!isOwnMessage && (
                    <div className="mb-1">
                      <span className="text-xs font-semibold opacity-75">{message.senderName}</span>
                    </div>
                  )}

                  <p className="text-sm">{message.text}</p>

                  <div
                    className={`flex items-center gap-2 mt-2 text-xs ${
                      isOwnMessage ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <span className="opacity-75">
                      {message.timestamp?.toDate().toLocaleTimeString('de-DE', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {isOwnMessage && (
                      <span className="text-xs opacity-75">{message.read ? '✓✓' : '✓'}</span>
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
      <form onSubmit={sendMessage} className="p-4 border-t border-gray-200 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Nachricht eingeben..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent text-sm"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || loading}
            className="bg-[#14ad9f] hover:bg-[#129488] disabled:bg-gray-300 disabled:cursor-not-allowed text-white w-10 h-10 rounded-lg transition-colors flex items-center justify-center shrink-0"
            title={loading ? 'Sende...' : 'Nachricht senden'}
          >
            {loading ? '⋯' : '→'}
          </button>
        </div>
      </form>
    </div>
  );
}
