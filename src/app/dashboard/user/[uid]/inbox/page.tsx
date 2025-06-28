'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { FiInbox, FiLoader, FiMessageSquare, FiUser } from 'react-icons/fi';
import { db } from '@/firebase/clients';
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
import ChatComponent from '@/components/ChatComponent'; // Importieren der Chat-Komponente
import Image from 'next/image';

// --- Interfaces ---
interface OtherUser {
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

export default function UserInboxPage() {
    const params = useParams();
    const uidFromParams = typeof params.uid === 'string' ? params.uid : '';
    const { currentUser, loading: authLoading } = useAuth();

    const [chats, setChats] = useState<ChatPreview[]>([]);
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [loadingChats, setLoadingChats] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!currentUser?.uid) {
            setLoadingChats(false);
            return;
        }

        setLoadingChats(true);
        const chatsCollectionRef = collection(db, 'chats');
        const q = query(
            chatsCollectionRef,
            where('users', 'array-contains', currentUser.uid),
            orderBy('lastUpdated', 'desc')
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            if (snapshot.empty) {
                setChats([]);
                setLoadingChats(false);
                return;
            }

            const chatPromises = snapshot.docs.map(async (chatDoc) => {
                const chatData = chatDoc.data();
                const otherUserId = chatData.users.find((id: string) => id !== currentUser.uid);

                let otherUser: OtherUser = { name: 'Unbekannter Nutzer', avatarUrl: null };
                if (otherUserId) {
                    const userDocRef = doc(db, 'users', otherUserId);
                    const userDocSnap = await getDoc(userDocRef);
                    if (userDocSnap.exists()) {
                        const userData = userDocSnap.data();
                        otherUser = {
                            name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.companyName || 'Unbekannter Nutzer',
                            avatarUrl: userData.profilePictureURL || null,
                        };
                    }
                }

                return {
                    id: chatDoc.id,
                    otherUser,
                    lastMessage: {
                        text: chatData.lastMessage?.text || '',
                        timestamp: chatData.lastMessage?.timestamp || null,
                        isRead: chatData.lastMessage?.senderId === currentUser.uid ? true : (chatData.lastMessage?.isRead ?? true),
                        senderId: chatData.lastMessage?.senderId || '',
                    },
                };
            });

            const resolvedChats = await Promise.all(chatPromises);
            setChats(resolvedChats);
            setLoadingChats(false);
        }, (err) => {
            console.error("Fehler beim Laden der Chats:", err);
            setError("Fehler beim Laden der Chats.");
            setLoadingChats(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const selectedChat = useMemo(() => {
        return chats.find(chat => chat.id === selectedChatId) || null;
    }, [chats, selectedChatId]);

    if (authLoading || loadingChats) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <FiLoader className="animate-spin text-4xl text-[#14ad9f] mr-3" />
                Lade Posteingang...
            </div>
        );
    }

    if (!currentUser || currentUser.uid !== uidFromParams) {
        return <div className="text-center py-10 text-red-500">Zugriff verweigert oder Benutzer nicht angemeldet.</div>;
    }

    return (
        <ProtectedRoute>
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
                                {chats.map((chat) => (
                                    <li key={chat.id} onClick={() => setSelectedChatId(chat.id)}
                                        className={`p-4 border-b cursor-pointer hover:bg-gray-100 ${selectedChatId === chat.id ? 'bg-teal-50' : ''}`}>
                                        <div className="flex items-center gap-3">
                                            {chat.otherUser.avatarUrl ? (
                                                <Image src={chat.otherUser.avatarUrl} alt={chat.otherUser.name} width={48} height={48} className="rounded-full object-cover" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center"><FiUser /></div>
                                            )}
                                            <div className="flex-1 overflow-hidden">
                                                <div className="flex justify-between items-center">
                                                    <p className="font-semibold truncate">{chat.otherUser.name}</p>
                                                    <p className="text-xs text-gray-500 whitespace-nowrap">
                                                        {chat.lastMessage.timestamp?.toDate().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                                <p className={`text-sm truncate ${!chat.lastMessage.isRead ? 'text-gray-900 font-bold' : 'text-gray-500'}`}>
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
                    {selectedChatId ? (
                        <ChatComponent orderId={selectedChatId} />
                    ) : (
                        <div className="flex-1 flex flex-col justify-center items-center text-center text-gray-500 p-8">
                            <FiMessageSquare size={64} className="mb-4 text-gray-300" />
                            <h2 className="text-xl font-semibold">Wählen Sie einen Chat aus</h2>
                            <p>Ihre Konversationen werden hier angezeigt.</p>
                        </div>
                    )}
                </main>
            </div>
        </ProtectedRoute>
    );
}