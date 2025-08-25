'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { UNKNOWN_USER_NAME } from '@/constants/strings';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { FiInbox, FiLoader, FiMessageSquare, FiUser, FiSlash } from 'react-icons/fi';
import { db } from '@/firebase/clients'; // Firestore-Instanz
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import ChatComponent from '@/components/ChatComponent';
import DirectChatComponent from '@/components/DirectChatComponent';
import Image from 'next/image';

// --- Interfaces ---
interface OtherUser {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface LastMessage {
  text: string;
  timestamp: Timestamp | null;
  isRead: boolean;
  senderId: string;
}

interface ChatPreview {
  id: string; // Auftrags-ID, die als Chat-ID dient
  otherUser: OtherUser;
  lastMessage: LastMessage;
}

export default function CompanyInboxPage() {
  const params = useParams();
  const uidFromParams = typeof params?.uid === 'string' ? params.uid : '';
  const { user: currentUser, loading: authLoading } = useAuth();

  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [loadingChats, setLoadingChats] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrderStatus, setSelectedOrderStatus] = useState<string | null>(null);
  const [loadingOrderStatus, setLoadingOrderStatus] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) {
      setLoadingChats(false);
      return;
    }

    // Kombiniere beide Chat-Collections
    const loadAllChats = () => {
      setLoadingChats(true);
      const allChats: ChatPreview[] = [];

      // 1. Lade normale Chats aus der 'chats' Collection
      const chatsCollectionRef = collection(db, 'chats');
      const chatsQuery = query(
        chatsCollectionRef,
        where('users', 'array-contains', currentUser.uid),
        where('isLocked', '==', false),
        orderBy('lastUpdated', 'desc')
      );

      // 2. Lade direkte Chats aus der 'directChats' Collection
      const directChatsCollectionRef = collection(db, 'directChats');
      const directChatsQuery = query(
        directChatsCollectionRef,
        where('participants', 'array-contains', currentUser.uid),
        orderBy('lastUpdated', 'desc')
      );

      let completedQueries = 0;
      const totalQueries = 2;

      const checkCompletion = () => {
        completedQueries++;
        if (completedQueries === totalQueries) {
          // Sortiere alle Chats nach letztem Update
          const sortedChats = allChats.sort((a, b) => {
            const aTime = a.lastMessage.timestamp?.toDate() || new Date(0);
            const bTime = b.lastMessage.timestamp?.toDate() || new Date(0);
            return bTime.getTime() - aTime.getTime();
          });
          setChats(sortedChats);
          setLoadingChats(false);
        }
      };

      // Normale Chats abonnieren
      const unsubscribeChats = onSnapshot(
        chatsQuery,
        snapshot => {
          const normalChats = snapshot.docs.map(chatDoc => {
            const chatData = chatDoc.data();
            const otherUserId = chatData.users.find((id: string) => id !== currentUser.uid);
            const userDetails = otherUserId ? chatData.userDetails?.[otherUserId] : null;

            const otherUser: OtherUser = {
              id: otherUserId,
              name: userDetails?.name || UNKNOWN_USER_NAME,
              avatarUrl: userDetails?.avatarUrl || null,
            };

            return {
              id: chatDoc.id,
              otherUser,
              lastMessage: {
                text: chatData.lastMessage?.text || '',
                timestamp: chatData.lastMessage?.timestamp || null,
                isRead:
                  chatData.lastMessage?.senderId === currentUser.uid
                    ? true
                    : (chatData.lastMessage?.isRead ?? false),
                senderId: chatData.lastMessage?.senderId || '',
              },
            };
          });

          // Aktualisiere normale Chats
          allChats.splice(0, allChats.length, ...normalChats);
          checkCompletion();
        },
        err => {

          checkCompletion();
        }
      );

      // Direkte Chats abonnieren
      const unsubscribeDirectChats = onSnapshot(
        directChatsQuery,
        snapshot => {
          const directChats = snapshot.docs.map(chatDoc => {
            const chatData = chatDoc.data();
            const otherUserId = chatData.participants.find((id: string) => id !== currentUser.uid);

            const otherUser: OtherUser = {
              id: otherUserId,
              name: chatData.participantNames?.[otherUserId] || UNKNOWN_USER_NAME,
              avatarUrl: null,
            };

            return {
              id: `direct_${chatDoc.id}`, // Prefix um Kollisionen zu vermeiden
              otherUser,
              lastMessage: {
                text: chatData.lastMessage?.text || '',
                timestamp: chatData.lastMessage?.timestamp || null,
                isRead:
                  chatData.lastMessage?.senderId === currentUser.uid
                    ? true
                    : (chatData.lastMessage?.isRead ?? false),
                senderId: chatData.lastMessage?.senderId || '',
              },
            };
          });

          // Füge direkte Chats hinzu
          allChats.push(...directChats);
          checkCompletion();
        },
        err => {

          checkCompletion();
        }
      );

      return () => {
        unsubscribeChats();
        unsubscribeDirectChats();
      };
    };

    return loadAllChats();
  }, [currentUser]);

  const selectedChat = useMemo(() => {
    return chats.find(chat => chat.id === selectedChatId) || null;
  }, [chats, selectedChatId]);

  useEffect(() => {
    if (!selectedChatId) {
      setSelectedOrderStatus(null);
      return;
    }

    const fetchOrderStatus = async () => {
      setLoadingOrderStatus(true);
      try {
        const orderDocRef = doc(db, 'auftraege', selectedChatId);
        const orderDocSnap = await getDoc(orderDocRef);
        if (orderDocSnap.exists()) {
          setSelectedOrderStatus(orderDocSnap.data().status || null);
        } else {
          setSelectedOrderStatus(null);
          setError('Zugehöriger Auftrag für diesen Chat nicht gefunden.');
        }
      } catch (err) {

        setError('Fehler beim Laden des Auftragsstatus.');
      } finally {
        setLoadingOrderStatus(false);
      }
    };

    fetchOrderStatus();
  }, [selectedChatId]);

  if (authLoading || loadingChats) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <FiLoader className="animate-spin text-4xl text-[#14ad9f] mr-3" />
        Lade Posteingang...
      </div>
    );
  }

  if (!currentUser || currentUser.uid !== uidFromParams) {
    return (
      <div className="text-center py-10 text-red-500">
        Zugriff verweigert oder Benutzer nicht angemeldet.
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-var(--header-height,80px))] bg-gray-50">
      {/* Linke Spalte: Chat-Liste */}
      <aside className="w-full md:w-1/3 lg:w-1/4 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-xl font-semibold text-gray-800 flex items-center">
            <FiInbox className="mr-3" /> Posteingang
          </h1>
        </div>
        <div className="overflow-y-auto flex-grow">
          {chats.length > 0 ? (
            <ul>
              {chats.map(chat => (
                <li
                  key={chat.id}
                  onClick={() => setSelectedChatId(chat.id)}
                  className={`p-4 border-b cursor-pointer hover:bg-gray-100 ${selectedChatId === chat.id ? 'bg-teal-50' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    {chat.otherUser.avatarUrl ? (
                      <Image
                        src={chat.otherUser.avatarUrl}
                        alt={chat.otherUser.name}
                        width={48}
                        height={48}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                        <FiUser />
                      </div>
                    )}
                    <div className="flex-1 overflow-hidden">
                      <div className="flex justify-between items-center">
                        <p className="font-semibold truncate">{chat.otherUser.name}</p>
                        <p className="text-xs text-gray-500 whitespace-nowrap">
                          {chat.lastMessage.timestamp
                            ?.toDate()
                            .toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <p
                        className={`text-sm truncate ${!chat.lastMessage.isRead ? 'text-gray-900 font-bold' : 'text-gray-500'}`}
                      >
                        {chat.lastMessage.text}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 text-center text-gray-500">Keine Konversationen gefunden.</div>
          )}
        </div>
      </aside>

      {/* Rechte Spalte: Chat-Ansicht */}
      <main className="flex-1 flex flex-col">
        {loadingOrderStatus ? (
          <div className="flex-1 flex justify-center items-center">
            <FiLoader className="animate-spin text-4xl text-[#14ad9f]" />
          </div>
        ) : selectedChatId &&
          (selectedOrderStatus === 'abgelehnt_vom_anbieter' ||
            selectedOrderStatus === 'STORNIERT') ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center bg-gray-100 p-4">
            <FiSlash className="text-4xl text-gray-400 mb-3" />
            <h3 className="text-lg font-semibold text-gray-700">Chat deaktiviert</h3>
            <p className="text-gray-500 text-sm">
              Für diesen Auftrag ist der Chat nicht mehr verfügbar.
            </p>
          </div>
        ) : selectedChatId && selectedChat && currentUser ? (
          // Prüfe ob es ein direkter Chat ist (hat "direct_" prefix)
          selectedChatId.startsWith('direct_') ? (
            <DirectChatComponent
              chatId={selectedChatId}
              otherUserId={selectedChat.otherUser.id}
              otherUserName={selectedChat.otherUser.name}
            />
          ) : (
            <ChatComponent
              orderId={selectedChatId}
              participants={{
                customerId: selectedChat.otherUser.id,
                providerId: currentUser.uid,
              }}
              orderStatus={selectedOrderStatus}
            />
          )
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center text-center text-gray-500 p-8">
            <FiMessageSquare size={64} className="mb-4 text-gray-300" />
            <h2 className="text-xl font-semibold">Wählen Sie einen Chat aus</h2>
            <p>Ihre Konversationen werden hier angezeigt.</p>
          </div>
        )}
      </main>
    </div>
  );
}
