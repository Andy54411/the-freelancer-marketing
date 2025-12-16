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
import VideoCallRequestNotification from '@/components/VideoCallRequestNotification';
import TaskiloVideoCall from '@/components/video/TaskiloVideoCall';
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
  
  // Video Call State
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [videoCallData, setVideoCallData] = useState<{chatId: string, userId: string, userName: string} | null>(null);
  const [loadingChats, setLoadingChats] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrderStatus, setSelectedOrderStatus] = useState<string | null>(null);
  const [loadingOrderStatus, setLoadingOrderStatus] = useState(false);

  // Hilfsfunktion zum Laden von Benutzerdaten mit Collection-Fallback
  const fetchUserData = async (userId: string) => {
    try {
      // Zuerst in companies Collection suchen
      const companyDocRef = doc(db, 'companies', userId);
      const companyDocSnap = await getDoc(companyDocRef);

      if (companyDocSnap.exists()) {
        const companyData = companyDocSnap.data();

        // Prüfe ob profileBannerImage eine gültige URL ist (nicht blob:)
        let avatarUrl = null;
        if (
          companyData.profileBannerImage &&
          !companyData.profileBannerImage.startsWith('blob:') &&
          companyData.profileBannerImage.startsWith('http')
        ) {
          avatarUrl = companyData.profileBannerImage;
        }

        return {
          name: companyData.companyName || companyData.name || UNKNOWN_USER_NAME,
          avatarUrl: avatarUrl,
        };
      }

      // Fallback 1: Versuche die Hauptsammlung users (falls es noch alte Strukturen gibt)
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        return {
          name: userData.name || UNKNOWN_USER_NAME,
          avatarUrl: userData.avatarUrl || null,
        };
      }

      // Fallback 2: Versuche users Subcollection (users/userId/profile/data)
      const userProfileDocRef = doc(db, 'users', userId, 'profile', 'data');
      const userProfileDocSnap = await getDoc(userProfileDocRef);

      if (userProfileDocSnap.exists()) {
        const userData = userProfileDocSnap.data();
        return {
          name: userData.name || UNKNOWN_USER_NAME,
          avatarUrl: userData.avatarUrl || null,
        };
      }

      return {
        name: `User ${userId.substring(0, 8)}...`, // Zeige zumindest einen Teil der ID
        avatarUrl: null,
      };
    } catch (error) {
      // Bei Permission-Fehlern verwende zumindest einen teilweisen Namen
      return {
        name: `User ${userId.substring(0, 8)}...`, // Zeige zumindest einen Teil der ID
        avatarUrl: null,
      };
    }
  };

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
        async snapshot => {
          const normalChatsPromises = snapshot.docs.map(async chatDoc => {
            const chatData = chatDoc.data();
            const otherUserId = chatData.users.find((id: string) => id !== currentUser.uid);

            let otherUserData = {
              name: UNKNOWN_USER_NAME,
              avatarUrl: null,
            };

            // Versuche zuerst die gespeicherten userDetails zu verwenden
            const userDetails = otherUserId ? chatData.userDetails?.[otherUserId] : null;

            if (
              userDetails &&
              userDetails.name &&
              userDetails.name !== UNKNOWN_USER_NAME &&
              userDetails.name !== 'Kunde'
            ) {
              otherUserData = {
                name: userDetails.name,
                avatarUrl: userDetails.avatarUrl || null,
              };
            } else if (otherUserId) {
              // Fallback: Lade Daten mit Collection-Fallback
              otherUserData = await fetchUserData(otherUserId);
            }

            const otherUser: OtherUser = {
              id: otherUserId,
              name: otherUserData.name,
              avatarUrl: otherUserData.avatarUrl,
            };

            return {
              id: `chat_${chatDoc.id}`, // Prefix für normale Chats
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

          const normalChats = await Promise.all(normalChatsPromises);

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
        async snapshot => {
          const directChatsPromises = snapshot.docs.map(async chatDoc => {
            const chatData = chatDoc.data();
            const otherUserId = chatData.participants.find((id: string) => id !== currentUser.uid);

            let otherUserData = {
              name: UNKNOWN_USER_NAME,
              avatarUrl: null,
            };

            // Versuche zuerst die gespeicherten participantNames zu verwenden
            const participantName = chatData.participantNames?.[otherUserId];

            if (
              participantName &&
              participantName !== UNKNOWN_USER_NAME &&
              participantName !== 'Kunde'
            ) {
              otherUserData.name = participantName;
            } else if (otherUserId) {
              // Fallback: Lade Daten mit Collection-Fallback
              otherUserData = await fetchUserData(otherUserId);
            }

            const otherUser: OtherUser = {
              id: otherUserId,
              name: otherUserData.name,
              avatarUrl: otherUserData.avatarUrl,
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

          const directChats = await Promise.all(directChatsPromises);

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

  // Hilfsfunktion um echte Chat-ID aus der prefixed ID zu extrahieren
  const getRealChatId = (chatId: string) => {
    if (chatId.startsWith('chat_')) {
      return chatId.replace('chat_', '');
    }
    if (chatId.startsWith('direct_')) {
      return chatId.replace('direct_', '');
    }
    return chatId;
  };

  const selectedChat = useMemo(() => {
    if (!selectedChatId) return null;

    // Direkter Vergleich - Chats haben bereits prefixed IDs
    const foundChat = chats.find(chat => chat.id === selectedChatId);

    return foundChat || null;
  }, [chats, selectedChatId]);

  useEffect(() => {
    if (!selectedChatId) {
      setSelectedOrderStatus(null);
      return;
    }

    const fetchOrderStatus = async () => {
      setLoadingOrderStatus(true);
      try {
        // Verwende die echte Chat-ID ohne Prefix
        const realChatId = getRealChatId(selectedChatId);
        const orderDocRef = doc(db, 'auftraege', realChatId);
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

  const isOwner = currentUser?.uid === uidFromParams;
  const isEmployee = currentUser?.user_type === 'mitarbeiter' && currentUser?.companyId === uidFromParams;

  if (!currentUser || (!isOwner && !isEmployee)) {
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
        <div className="overflow-y-auto grow">
          {/* Video Call Request Notifications */}
          {currentUser?.uid && (
            <div className="p-4">
              <VideoCallRequestNotification
                companyId={currentUser.uid}
                chatIds={chats.map(c => getRealChatId(c.id))}
                onRequestHandled={(request, action) => {
                  console.log(`Video call request ${request.requestId} ${action}`);
                  if (action === 'approved') {
                    setVideoCallData({
                      chatId: request.chatId,
                      userId: currentUser.uid,
                      userName: currentUser.companyName || `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email || 'Company',
                    });
                    setIsVideoCallOpen(true);
                  }
                }}
              />
            </div>
          )}
          {chats.length > 0 ? (
            <ul>
              {chats.map((chat, index) => (
                <li
                  key={`${chat.id}_${index}`}
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
              chatId={getRealChatId(selectedChatId)} // Verwende echte Chat-ID ohne Prefix
              otherUserId={selectedChat.otherUser.id}
              otherUserName={selectedChat.otherUser.name}
            />
          ) : (
            <ChatComponent
              orderId={getRealChatId(selectedChatId)} // Verwende echte Auftrags-ID ohne Prefix
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

      {/* Video Call Modal */}
      {videoCallData && (
        <TaskiloVideoCall
          chatId={videoCallData.chatId}
          userId={videoCallData.userId}
          userName={videoCallData.userName}
          isInitiator={true}
          isOpen={isVideoCallOpen}
          onClose={() => {
            setIsVideoCallOpen(false);
            setVideoCallData(null);
          }}
        />
      )}
    </div>
  );
}
