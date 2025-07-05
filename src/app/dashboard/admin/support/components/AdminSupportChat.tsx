'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import ChatList from './ChatList';
import { ChatWindow } from './ChatWindow';
import { FiMessageSquare, FiLoader } from 'react-icons/fi';

export interface ChatSession {
    id: string;
    lastMessage: {
        text: string;
        timestamp: any; // Firestore Timestamp
        senderId: string;
        isReadBySupport: boolean; // Renamed for clarity
    };
    users: string[];
    customerName?: string;
    customerProfilePicture?: string;
}

const AdminSupportChat = () => {
    const [chats, setChats] = useState<ChatSession[]>([]);
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null); // NEU

    useEffect(() => {
        const q = query(
            collection(db, 'chats'),
            where('isLocked', '==', false),
            where('lastMessage.timestamp', '!=', null),
            orderBy('lastMessage.timestamp', 'desc')
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const chatSessions = querySnapshot.docs.map((chatDoc) => {
                const chatData = chatDoc.data();
                const customerId = chatData.users.find((uid: string) => !['support_user_placeholder', 'master_user_placeholder'].includes(uid));
                const customerDetails = customerId ? chatData.userDetails?.[customerId] : null;

                return {
                    id: chatDoc.id,
                    ...chatData,
                    customerName: customerDetails?.name || 'Unbekannter Benutzer',
                    customerProfilePicture: customerDetails?.avatarUrl || undefined,
                } as ChatSession;
            });

            setChats(chatSessions);
            setLoading(false);
            setError(null); // Fehler zurücksetzen
        }, (error) => {
            console.error("Error fetching chat sessions: ", error);
            setError("Fehler beim Laden der Chats. Bitte prüfe die Datenstruktur in Firestore.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <div className="h-screen flex bg-gray-100">
            <ChatList chats={chats} selectedChatId={selectedChatId} onSelectChat={setSelectedChatId} loading={loading} />
            <div className="flex-1 flex flex-col">
                {error && <div className="text-red-500 p-4">{error}</div>}
                {selectedChatId
                    ? <ChatWindow chatId={selectedChatId} key={selectedChatId} />
                    : <div className="flex flex-col justify-center items-center h-full text-gray-500">
                        <FiMessageSquare size={48} />
                        <p className="mt-4 text-lg">Wählen Sie einen Chat aus, um zu beginnen.</p>
                      </div>
                }
            </div>
        </div>
    );
};

export default AdminSupportChat;