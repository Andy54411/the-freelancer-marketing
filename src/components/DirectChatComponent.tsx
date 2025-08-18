'use client';

import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { db } from '@/firebase/clients';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  Timestamp,
  doc,
  setDoc,
} from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { Send as FiSend, Loader2 as FiLoader } from 'lucide-react';

interface DirectChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderType: 'company' | 'provider';
  text: string;
  timestamp: Timestamp;
}

interface DirectChatComponentProps {
  chatId: string;
  otherUserId: string;
  otherUserName: string;
}

export default function DirectChatComponent({
  chatId,
  otherUserId,
  otherUserName,
}: DirectChatComponentProps) {
  const { user: currentUser } = useAuth();
  const [messages, setMessages] = useState<DirectChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Clean chatId - entferne "direct_" prefix falls vorhanden
  const cleanChatId = chatId.startsWith('direct_') ? chatId.substring(7) : chatId;

  useEffect(() => {
    if (!currentUser || !cleanChatId) return;

    const messagesRef = collection(db, 'directChats', cleanChatId, 'messages');
    const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(
      messagesQuery,
      snapshot => {
        const messagesList: DirectChatMessage[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          messagesList.push({
            id: doc.id,
            senderId: data.senderId,
            senderName: data.senderName,
            senderType: data.senderType,
            text: data.text,
            timestamp: data.timestamp,
          });
        });
        setMessages(messagesList);
        setLoading(false);
      },
      error => {
        console.error('Fehler beim Laden der Nachrichten:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser, cleanChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !currentUser) return;

    setSending(true);
    try {
      const messagesRef = collection(db, 'directChats', cleanChatId, 'messages');
      await addDoc(messagesRef, {
        senderId: currentUser.uid,
        senderName:
          `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'Unbekannt',
        senderType: 'company', // TODO: Bestimme dynamisch basierend auf User-Typ
        text: newMessage.trim(),
        timestamp: serverTimestamp(),
      });

      // Update last message in chat document
      const chatRef = doc(db, 'directChats', cleanChatId);
      await setDoc(
        chatRef,
        {
          lastMessage: {
            text: newMessage.trim(),
            senderId: currentUser.uid,
            senderName:
              `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'Unbekannt',
            timestamp: serverTimestamp(),
          },
          lastUpdated: serverTimestamp(),
        },
        { merge: true }
      );

      setNewMessage('');
    } catch (error) {
      console.error('Fehler beim Senden der Nachricht:', error);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center">
        <FiLoader className="animate-spin text-4xl text-[#14ad9f]" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header */}
      <div className="border-b border-gray-200 p-4 bg-white">
        <h2 className="text-lg font-semibold text-gray-800">{otherUserName}</h2>
        <p className="text-sm text-gray-500">Direkter Chat</p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length > 0 ? (
          messages.map(message => {
            const isOwnMessage = message.senderId === currentUser?.uid;
            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isOwnMessage
                      ? 'bg-[#14ad9f] text-white'
                      : 'bg-white text-gray-800 border border-gray-200'
                  }`}
                >
                  <div className="text-sm">{message.text}</div>
                  <div
                    className={`text-xs mt-1 ${isOwnMessage ? 'text-teal-100' : 'text-gray-500'}`}
                  >
                    {message.timestamp?.toDate().toLocaleTimeString('de-DE', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex justify-center items-center h-full text-gray-500">
            <div className="text-center">
              <p className="text-lg">Noch keine Nachrichten</p>
              <p className="text-sm">Starten Sie die Unterhaltung!</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={sendMessage} className="border-t border-gray-200 p-4 bg-white flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          placeholder="Nachricht eingeben..."
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-[#14ad9f] focus:ring-1 focus:ring-[#14ad9f]"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || sending}
          className="bg-[#14ad9f] text-white px-4 py-2 rounded-lg hover:bg-[#0d8a7a] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {sending ? <FiLoader className="animate-spin" size={16} /> : <FiSend size={16} />}
          Senden
        </button>
      </form>
    </div>
  );
}
