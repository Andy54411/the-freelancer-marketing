'use client';

import { useParams, useRouter } from 'next/navigation'; // useRouter hinzugefügt
import React, { useState, useEffect } from 'react';
import { FiInbox, FiLoader, FiAlertCircle } from 'react-icons/fi'; // Icons für Lade-/Fehlerzustand
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'; // Firestore-Funktionen
import { db } from '@/firebase/clients'; // Firestore-Instanz
import { RawFirestoreUserData } from '@/components/SettingsPage'; // Typ für Benutzerdaten
import { useAuth } from '@/contexts/AuthContext'; // Auth-Hook (moved below Header import)

interface ChatPreview {
    orderId: string;
    customerName: string;
    lastMessage: string;
    lastMessageAt: Date;
}

export default function CompanyInboxPage() {
    const params = useParams();
    const router = useRouter(); // useRouter initialisiert

    const uid = typeof params.uid === 'string' ? params.uid : '';

    const { currentUser, loading: authLoading } = useAuth(); // Aktuellen Benutzer und Ladezustand der Authentifizierung abrufen
    const [companyName, setCompanyName] = useState<string | null>(null);
    const [loadingData, setLoadingData] = useState(true); // Ladezustand für Firmendaten
    const [error, setError] = useState<string | null>(null);
    const [companyLogoUrl, setCompanyLogoUrl] = useState<string | undefined>(undefined); // State für Logo-URL
    const [chats, setChats] = useState<ChatPreview[]>([]);

    useEffect(() => {
        if (!uid) {
            setError("Keine Firmen-UID in der URL gefunden.");
            setLoadingData(false);
            return;
        }

        const fetchCompanyName = async () => {
            // Warten, bis die Authentifizierung abgeschlossen ist und eine UID vorhanden ist
            if (!uid || authLoading) {
                return;
            }

            // Überprüfen, ob der angemeldete Benutzer der UID in der URL entspricht
            if (!currentUser || currentUser.uid !== uid) {
                setError("Zugriff verweigert oder Benutzer nicht angemeldet.");
                setLoadingData(false);
                return;
            }

            setLoadingData(true);
            setError(null);
            try {
                const userDocRef = doc(db, "users", uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data() as RawFirestoreUserData;
                    // Firmennamen aus step2 oder direkt aus dem Root-Objekt abrufen
                    const fetchedCompanyName = userData.step2?.companyName || userData.companyName;
                    const fetchedLogoUrl = userData.step3?.profilePictureURL || userData.profilePictureURL; // Logo-URL abrufen
                    const fetchedFirebaseLogoUrl = userData.profilePictureFirebaseUrl; // NEU: Firebase URL abrufen
                    if (typeof fetchedCompanyName === 'string' && fetchedCompanyName.trim() !== '') {
                        setCompanyName(fetchedCompanyName);
                    } else {
                        setCompanyName("Unbekannte Firma"); // Fallback, falls Name leer ist
                    }
                    setCompanyLogoUrl(typeof fetchedFirebaseLogoUrl === 'string' && fetchedFirebaseLogoUrl.trim() !== '' ? fetchedFirebaseLogoUrl : undefined); // Verwende die Firebase URL
                } else {
                    setError("Firmendaten nicht gefunden.");
                }
            } catch (err: any) {
                console.error("Fehler beim Laden des Firmennamens:", err);
                setError(`Fehler beim Laden der Firmendaten: ${err.message || 'Unbekannter Fehler'}`);
            } finally {
                setLoadingData(false);
            }
        };

        const fetchChats = async () => {
            if (!uid || authLoading) return;
            // 1. Alle Aufträge dieser Firma laden
            const auftraegeRef = collection(db, "auftraege");
            const auftraegeQ = query(auftraegeRef, where("selectedAnbieterId", "==", uid));
            const auftraegeSnap = await getDocs(auftraegeQ);

            const chatPreviews: ChatPreview[] = [];

            for (const docSnap of auftraegeSnap.docs) {
                const auftrag = docSnap.data();
                const orderId = docSnap.id;
                // 2. Letzte Nachricht aus Untercollection "nachrichten" holen
                const nachrichtenRef = collection(db, "auftraege", orderId, "nachrichten");
                // KORREKTUR: Die Abfrage muss die 'where'-Klausel enthalten, um den Sicherheitsregeln zu entsprechen.
                const nachrichtenQ = query(
                    nachrichtenRef,
                    where("chatUsers", "array-contains", uid), // Stellt sicher, dass nur erlaubte Chats gelesen werden
                    orderBy("timestamp", "desc"),
                    limit(1)
                );
                const nachrichtenSnap = await getDocs(nachrichtenQ);
                const lastMsgDoc = nachrichtenSnap.docs[0];
                chatPreviews.push({
                    orderId,
                    customerName: auftrag.customerFirstName + " " + auftrag.customerLastName,
                    lastMessage: lastMsgDoc ? lastMsgDoc.data().text : "Noch keine Nachrichten",
                    lastMessageAt: lastMsgDoc ? lastMsgDoc.data().timestamp.toDate() : new Date(0),
                });
            }
            setChats(chatPreviews);
        };

        if (!authLoading) {
            fetchCompanyName();
            fetchChats();
        }
    }, [uid, currentUser, authLoading]); // Abhängigkeiten: uid, currentUser, authLoading

    if (authLoading || loadingData) {
        return (
            <div className="flex justify-center items-center min-h-[300px]">
                <FiLoader className="animate-spin text-4xl text-[#14ad9f] mr-3" />
                Lade Posteingang...
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center min-h-[300px] text-red-500">
                <FiAlertCircle className="mr-2" /> {error}
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 flex-grow pt-[var(--global-header-height)]">
            <h1 className="text-3xl font-semibold text-gray-800 mb-6 flex items-center">
                <FiInbox className="mr-3" /> Posteingang für {companyName || 'Ihre Firma'}
            </h1>
            <div className="bg-white shadow rounded-lg p-6">
                {chats.length === 0 ? (
                    <p className="text-gray-600">Noch keine Chats vorhanden.</p>
                ) : (
                    <ul>
                        {chats.map(chat => (
                            <li key={chat.orderId} className="mb-4 border-b pb-2">
                                <div className="font-semibold">{chat.customerName}</div>
                                <div className="text-sm text-gray-500">{chat.lastMessage}</div>
                                <div className="text-xs text-gray-400">{chat.lastMessageAt.toLocaleString()}</div>
                                <a
                                    href={`/dashboard/company/${uid}/inbox/chat/${chat.orderId}`}
                                    className="text-blue-600 hover:underline text-sm"
                                >
                                    Zum Chat
                                </a>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}