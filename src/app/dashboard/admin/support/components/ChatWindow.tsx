'use client';

import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 as FiLoader, Send as FiSend } from 'lucide-react';
import ChatMessageBubble from '@/app/dashboard/user/[uid]/components/Support/ChatMessageBubble';
import type { ChatMessage } from '@/app/dashboard/user/[uid]/components/Support/SupportChatInterface';

interface ChatWindowProps {
  chatId: string;
}

export default function ChatWindow({ chatId }: ChatWindowProps) {
  const { user: adminUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Funktion zum Laden der Nachrichten über API
  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/support/${chatId}/messages`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setMessages(data.messages || []);
      } else {
        console.error('Fehler beim Laden der Nachrichten:', data.error);
      }
    } catch (error) {
      console.error(`Error fetching messages for chat ${chatId}:`, error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();

    // Markiere Chat als gelesen, wenn er geöffnet wird
    const markChatAsRead = async () => {
      try {
        await fetch(`/api/admin/support/${chatId}/messages`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ markAsRead: true }),
        });
      } catch (error) {
        console.error('Failed to mark chat as read:', error);
      }
    };

    markChatAsRead();

    // Lade Nachrichten alle 5 Sekunden neu für Live-Updates
    const interval = setInterval(loadMessages, 5000);

    return () => clearInterval(interval);
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !adminUser) return;

    setIsSending(true);

    try {
      const response = await fetch(`/api/admin/support/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newMessage.trim(),
          senderId: adminUser.uid,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setNewMessage('');
        // Lade Nachrichten neu, um die neue Nachricht anzuzeigen
        await loadMessages();
      } else {
        console.error('Fehler beim Senden der Nachricht:', data.error);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-full">
        <FiLoader className="animate-spin text-4xl text-teal-500 mb-4" />
        <span className="text-gray-600">Nachrichten werden geladen...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-teal-50 p-4">
        <h3 className="text-lg font-semibold text-teal-800">
          Support Chat - {chatId.replace('support_chat_', '')}
        </h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            Noch keine Nachrichten in diesem Chat.
          </div>
        ) : (
          messages.map(message => (
            <ChatMessageBubble
              key={message.id}
              message={message}
              isCurrentUser={message.senderId === adminUser?.uid}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t bg-white p-4">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Nachricht eingeben..."
            disabled={isSending}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={isSending || !newMessage.trim()}
            className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isSending ? <FiLoader className="animate-spin" size={16} /> : <FiSend size={16} />}
            <span>Senden</span>
          </button>
        </form>
      </div>
    </div>
  );
}
