// src/components/ChatComponent.tsx
'use client';

import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { db, auth } from '@/firebase/clients'; // Firestore- und Auth-Instanzen
import {
    collection,
    query,
    orderBy,
    limit,
    onSnapshot,
    addDoc,
    serverTimestamp,
    QueryDocumentSnapshot,
    Timestamp,
    doc,
    getDoc,
} from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { FiSend, FiLoader } from 'react-icons/fi';

// Interface für ein Chat-Nachrichten-Dokument in Firestore
interface ChatMessage {
    id: string; // Dokument-ID von Firestore
    senderId: string;
    senderName: string;
    senderType: 'kunde' | 'anbieter';
    text: string;
    timestamp: Timestamp; // Firestore Timestamp Typ
}

// Interface für das Benutzerprofil aus Firestore (für senderType und senderName)
interface UserProfileData {
    firstName?: string;
    lastName?: string;
    companyName?: string;
    // FEHLER BEHOBEN: 'firma' zu user_type hinzugefügt
    user_type?: 'kunde' | 'anbieter' | 'firma'; // <--- HIER ANPASSEN!
}

interface ChatComponentProps {
    orderId: string;
}

const ChatComponent: React.FC<ChatComponentProps> = ({ orderId }) => {
    const authContext = useAuth();
    const currentUser = authContext?.currentUser || null;

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessageText, setNewMessageText] = useState('');
    const [chatLoading, setChatLoading] = useState(true);
    const [userProfileLoading, setUserProfileLoading] = useState(true);
    const [chatError, setChatError] = useState<string | null>(null);
    const [loggedInUserProfile, setLoggedInUserProfile] = useState<UserProfileData | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scrollen zum Ende des Chats bei neuen Nachrichten
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Laden des Benutzerprofils, sobald currentUser verfügbar ist
    useEffect(() => {
        if (currentUser) {
            const fetchUserProfile = async () => {
                setUserProfileLoading(true);
                try {
                    const userDocRef = doc(db, 'users', currentUser.uid);
                    const userDocSnap = await getDoc(userDocRef);
                    if (userDocSnap.exists()) {
                        setLoggedInUserProfile(userDocSnap.data() as UserProfileData);
                    } else {
                        console.warn("ChatComponent: Benutzerprofil nicht in Firestore gefunden für:", currentUser.uid);
                        setLoggedInUserProfile(null);
                    }
                } catch (error) {
                    console.error("ChatComponent: Fehler beim Laden des Benutzerprofils:", error);
                    setChatError("Fehler beim Laden Ihres Profils für den Chat.");
                } finally {
                    setUserProfileLoading(false);
                }
            };
            fetchUserProfile();
        } else {
            setLoggedInUserProfile(null);
            setUserProfileLoading(false);
        }
    }, [currentUser]);

    // Echtzeit-Nachrichten laden
    useEffect(() => {
        if (!authContext || userProfileLoading || !currentUser || !orderId) {
            if (!currentUser) {
                setChatError('Bitte melden Sie sich an, um den Chat zu nutzen.');
            } else if (userProfileLoading) {
                setChatLoading(true);
            } else if (!orderId) {
                setChatError('Auftrags-ID fehlt für den Chat.');
            }
            return;
        }

        setChatLoading(true);
        setChatError(null);

        const messagesCollectionRef = collection(db, 'auftraege', orderId, 'nachrichten');
        const q = query(messagesCollectionRef, orderBy('timestamp', 'asc'), limit(50));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedMessages: ChatMessage[] = [];
            snapshot.forEach((doc: QueryDocumentSnapshot) => {
                const data = doc.data();
                fetchedMessages.push({
                    id: doc.id,
                    senderId: data.senderId,
                    senderName: data.senderName,
                    senderType: data.senderType,
                    text: data.text,
                    timestamp: data.timestamp as Timestamp,
                });
            });
            setMessages(fetchedMessages);
            setChatLoading(false);
        }, (error) => {
            console.error("Fehler beim Laden der Chat-Nachrichten:", error);
            setChatError('Fehler beim Laden der Nachrichten. Bitte versuchen Sie es später erneut.');
            setChatLoading(false);
        });

        return () => unsubscribe();
    }, [authContext, currentUser, orderId, userProfileLoading]);

    // Nachricht senden
    const handleSendMessage = async (e: FormEvent) => {
        e.preventDefault();
        if (!newMessageText.trim() || !currentUser || !orderId || userProfileLoading) {
            return;
        }

        let senderName: string = currentUser.displayName || loggedInUserProfile?.firstName || 'Unbekannt';
        let senderType: 'kunde' | 'anbieter' = 'kunde';

        // FEHLER BEHOBEN: Prüfung auf 'firma' als user_type
        if (loggedInUserProfile?.user_type === 'firma') {
            senderType = 'anbieter';
            senderName = loggedInUserProfile.companyName || loggedInUserProfile.firstName || 'Anbieter';
        }


        try {
            await addDoc(collection(db, 'auftraege', orderId, 'nachrichten'), {
                senderId: currentUser.uid,
                senderName: senderName,
                senderType: senderType,
                text: newMessageText.trim(),
                timestamp: serverTimestamp(),
            });
            setNewMessageText('');
        } catch (error) {
            console.error('Fehler beim Senden der Nachricht:', error);
            setChatError('Nachricht konnte nicht gesendet werden. Bitte versuchen Sie es erneut.');
        }
    };

    const overallLoading = chatLoading || userProfileLoading;

    if (overallLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <FiLoader className="animate-spin text-3xl text-[#14ad9f] mr-2" />
                {chatLoading ? "Chat wird geladen..." : "Benutzerdaten werden geladen..."}
            </div>
        );
    }

    if (!currentUser || !loggedInUserProfile) {
        return (
            <div className="text-center p-4 text-gray-600">
                {chatError || 'Bitte melden Sie sich an oder Ihr Profil konnte nicht geladen werden, um den Chat zu nutzen.'}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">Chat zum Auftrag: {orderId}</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-10">Noch keine Nachrichten in diesem Chat. Seien Sie der Erste!</div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.senderId === currentUser.uid ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[70%] p-3 rounded-lg ${msg.senderId === currentUser.uid
                                        ? 'bg-[#14ad9f] text-white'
                                        : 'bg-gray-200 text-gray-800'
                                    }`}
                            >
                                <p className="text-xs font-semibold mb-1">
                                    {msg.senderName} ({msg.senderType === 'kunde' ? 'Kunde' : 'Anbieter'})
                                </p>
                                <p className="text-sm break-words">{msg.text}</p>
                                <p className="text-right text-xs mt-1 opacity-75">
                                    {msg.timestamp?.toDate().toLocaleTimeString()}
                                </p>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 flex items-center">
                <textarea
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    placeholder="Nachricht eingeben..."
                    className="flex-1 p-2 border border-gray-300 rounded-md resize-none mr-2 focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
                    rows={1}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(e);
                        }
                    }}
                />
                <button
                    type="submit"
                    className="bg-[#14ad9f] text-white p-3 rounded-full hover:bg-[#129a8f] transition-colors flex items-center justify-center"
                    disabled={!newMessageText.trim() || overallLoading}
                >
                    <FiSend size={20} />
                </button>
            </form>
        </div>
    );
};

export default ChatComponent;