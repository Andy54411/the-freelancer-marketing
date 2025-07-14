'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation'; // NEU
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import ChatList from './ChatList';
import { ChatWindow } from './ChatWindow';
import { MessageSquare as FiMessageSquare, Loader2 as FiLoader } from 'lucide-react';

export interface ChatSession {
  id: string;
  lastMessage: {
    text: string;
    timestamp: any; // Firestore Timestamp
    senderId: string;
    isReadBySupport: boolean; // Renamed for clarity
  };
  userName: string;
  userAvatarUrl?: string;
  userId: string;
  status?: 'bot' | 'human' | 'closed'; // NEU: Chat-Status
}

const AdminSupportChat = () => {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // NEU

  // NEU: Die Komponente wird jetzt über die URL gesteuert.
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedChatId = searchParams.get('chatId');

  useEffect(() => {
    const q = query(
      collection(db, 'supportChats'),
      // KORREKTUR: Nur Chats abrufen, die menschliche Aufmerksamkeit erfordern ('human').
      // Dies ist effizienter und erfordert einen einfacheren Index.
      where('status', '==', 'human'),
      orderBy('lastUpdated', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      querySnapshot => {
        const chatSessions = querySnapshot.docs.map(chatDoc => {
          const chatData = chatDoc.data();

          return {
            id: chatDoc.id,
            ...chatData,
            userName: chatData.userName || 'Unbekannter Benutzer',
            userAvatarUrl: chatData.userAvatarUrl || undefined,
          } as ChatSession;
        });

        setChats(chatSessions);
        setLoading(false);
        setError(null);
      },
      error => {
        console.error('Error fetching chat sessions: ', error);
        setError(
          'Fehler beim Laden der Chats. Bitte prüfen Sie Ihre Firebase-Sicherheitsregeln und die Netzwerkverbindung.'
        );
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // NEU: Diese Funktion aktualisiert die URL, anstatt nur den State zu setzen.
  const handleSelectChat = (chatId: string) => {
    router.push(`/dashboard/admin/support?chatId=${chatId}`);
  };

  return (
    // KORREKTUR: 'h-full' statt 'h-screen' verwenden, damit sich die Komponente
    // korrekt in das Admin-Layout einfügt. Zusätzliche Stile für ein besseres Aussehen.
    <div className="h-full flex bg-white dark:bg-gray-900 border rounded-lg overflow-hidden shadow-sm">
      <ChatList
        chats={chats}
        selectedChatId={selectedChatId}
        onSelectChat={handleSelectChat}
        loading={loading}
      />
      <div className="flex-1 flex flex-col">
        {error && <div className="text-red-500 p-4">{error}</div>}
        {selectedChatId ? (
          <ChatWindow chatId={selectedChatId} key={selectedChatId} />
        ) : (
          <div className="flex flex-col justify-center items-center h-full text-gray-500">
            <FiMessageSquare size={48} />
            <p className="mt-4 text-lg">Wählen Sie einen Chat aus, um zu beginnen.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSupportChat;
