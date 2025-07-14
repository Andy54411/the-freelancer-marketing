'use client';

import React, { useState, useEffect, useRef, FormEvent } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 as FiLoader, Send as FiSend } from 'lucide-react';
import ChatMessageBubble from '@/app/dashboard/user/[uid]/components/Support/ChatMessageBubble';
import type { ChatMessage } from '@/app/dashboard/user/[uid]/components/Support/SupportChatInterface';

interface ChatWindowProps {
  chatId: string;
}

export function ChatWindow({ chatId }: ChatWindowProps) {
  const { user: adminUser, firebaseUser: adminFirebaseUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    const chatDocRef = doc(db, 'supportChats', chatId);
    const messagesRef = collection(chatDocRef, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const loadedMessages = snapshot.docs.map(
          doc => ({ id: doc.id, ...doc.data() }) as ChatMessage
        );
        setMessages(loadedMessages);
        setLoading(false);
      },
      error => {
        console.error(`Error fetching messages for chat ${chatId}:`, error);
        setLoading(false);
      }
    );

    updateDoc(chatDocRef, { 'lastMessage.isReadBySupport': true }).catch(err =>
      console.error('Failed to mark chat as read:', err)
    );

    return () => unsubscribe();
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !adminFirebaseUser || !adminUser) return;

    setIsSending(true);
    const chatDocRef = doc(db, 'supportChats', chatId);
    const messagesRef = collection(chatDocRef, 'messages');

    const isFirstSupportMessage = !messages.some(m => m.senderType === 'support');
    const customerId =
      messages.length > 0 && messages[0].chatUsers
        ? messages[0].chatUsers.find(id => id !== adminFirebaseUser.uid)
        : chatId.replace('support_chat_', '');

    const messageData = {
      text: newMessage.trim(),
      senderId: adminFirebaseUser.uid,
      senderName: adminUser.firstName || 'Support',
      senderType: 'support' as const,
      timestamp: serverTimestamp(),
      chatUsers: [adminFirebaseUser.uid, customerId].filter(Boolean),
    };

    try {
      // NEU: Wenn es die erste Nachricht ist, füge die System-Benachrichtigung hinzu
      if (isFirstSupportMessage) {
        const systemMessageData = {
          text: `${adminUser.firstName || 'Support'} (Support-Mitarbeiter) ist dem Chat beigetreten.`,
          senderId: 'system',
          senderName: 'System',
          senderType: 'system' as const,
          timestamp: serverTimestamp(),
          chatUsers: [adminFirebaseUser.uid, customerId].filter(Boolean),
          systemPayload: {
            agentName:
              `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || 'Support',
            agentAvatarUrl: adminUser.profilePictureURL || null,
          },
        };
        await addDoc(messagesRef, systemMessageData);
      }

      await addDoc(messagesRef, messageData);
      await updateDoc(chatDocRef, {
        lastMessage: {
          text: newMessage.trim(),
          timestamp: serverTimestamp(),
          senderId: adminFirebaseUser.uid,
          isReadBySupport: true,
        },
        lastUpdated: serverTimestamp(),
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending support message:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <FiLoader className="animate-spin text-2xl" />
          </div>
        ) : (
          messages.map(msg => (
            <ChatMessageBubble
              key={msg.id}
              message={msg}
              isCurrentUser={msg.senderId === adminFirebaseUser?.uid}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <form
        onSubmit={handleSendMessage}
        className="p-4 border-t bg-gray-50 dark:bg-gray-900 flex items-center gap-3"
      >
        <input
          type="text"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          placeholder="Als Support antworten..."
          className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || isSending}
          className="p-3 bg-teal-500 text-white rounded-full hover:bg-teal-600 disabled:bg-gray-300"
        >
          {isSending ? <FiLoader className="animate-spin" /> : <FiSend />}
        </button>
      </form>
    </div>
  );
}
