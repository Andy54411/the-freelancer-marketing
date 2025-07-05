'use client';

import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients'; // KORREKTUR: Singleton DB-Instanz verwenden
import { FiSend, FiLoader } from 'react-icons/fi';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface ChatWindowProps {
    chatId: string;
}

interface Message {
    id: string;
    text: string;
    senderId: string;
    timestamp: any;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ chatId }) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [customerName, setCustomerName] = useState<string>('Kunde');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setLoading(true);

        const chatDocRef = doc(db, 'chats', chatId);

        // Lade den Chat-Header und markiere Nachrichten nur bei Bedarf als gelesen.
        // Dies verhindert unnötige Schreibvorgänge und potenzielle Race-Conditions.
        getDoc(chatDocRef).then(docSnap => {
            if (docSnap.exists()) {
                const chatData = docSnap.data();
                // Find the customer ID (the one that is not a placeholder)
                const customerId = chatData.users.find((uid: string) => !['support_user_placeholder', 'master_user_placeholder'].includes(uid));
                if (customerId && chatData.userDetails && chatData.userDetails[customerId]) {
                    setCustomerName(chatData.userDetails[customerId].name || 'Kunde');
                }

                // KORREKTUR: Markiere nur als gelesen, wenn die letzte Nachricht ungelesen ist UND nicht vom aktuellen Support-Benutzer stammt.
                if (chatData.lastMessage && !chatData.lastMessage.isReadBySupport && chatData.lastMessage.senderId !== user?.uid) {
                    updateDoc(chatDocRef, { 'lastMessage.isReadBySupport': true });
                }
            }
        });

        const messagesRef = collection(chatDocRef, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));

        const unsubscribeMessages = onSnapshot(q, (snapshot) => {
            const fetchedMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
            setMessages(fetchedMessages);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching messages:", error);
            setLoading(false);
        });

        return () => unsubscribeMessages();
    }, [chatId, user?.uid]); // user.uid als Abhängigkeit hinzugefügt

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (e: FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user) return;

        const chatRef = doc(db, 'chats', chatId);
        const messagesRef = collection(chatRef, 'messages');

        const messageData = {
            text: newMessage,
            senderId: user.uid, // Admin/Support user's UID
            timestamp: serverTimestamp(),
        };

        try {
            await addDoc(messagesRef, messageData);

            // Update last message on the chat document
            await updateDoc(chatRef, {
                lastMessage: {
                    text: newMessage,
                    timestamp: serverTimestamp(),
                    senderId: user.uid,
                    isReadBySupport: true, // Message from support is always "read" by support
                },
                lastUpdated: serverTimestamp(),
            });

            setNewMessage('');
        } catch (error) {
            console.error("Error sending message: ", error);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white">
            <header className="p-4 border-b border-gray-200 bg-gray-50">
                <h2 className="font-semibold text-gray-800">{customerName}</h2>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading ? (
                    <div className="flex justify-center items-center h-full">
                        <FiLoader className="animate-spin text-2xl text-teal-500" />
                    </div>
                ) : (
                    messages.map(message => (
                        <div key={message.id} className={`flex ${message.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs lg:max-w-md p-3 rounded-lg ${message.senderId === user?.uid ? 'bg-teal-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                                <p>{message.text}</p>
                                <p className={`text-xs mt-1 ${message.senderId === user?.uid ? 'text-teal-100' : 'text-gray-500'} text-right`}>
                                    {message.timestamp ? format(message.timestamp.toDate(), 'HH:mm', { locale: de }) : ''}
                                </p>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-gray-50 flex gap-2">
                <input
                    type="text"
                    className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Nachricht schreiben..."
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    disabled={loading}
                />
                <button
                    type="submit"
                    className="bg-teal-500 text-white px-4 py-2 rounded-md hover:bg-teal-600 transition-colors flex items-center"
                    disabled={loading || !newMessage.trim()}
                >
                    <FiSend className="mr-1" />
                    Senden
                </button>
            </form>
        </div>
    );
};