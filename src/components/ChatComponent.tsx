'use client';

import React, { useState, useEffect, useRef, FormEvent } from 'react';
import {
  addDoc,
  serverTimestamp,
  Timestamp,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from '@/firebase/clients'; // Client Firebase for realtime updates
import { useAuth } from '@/contexts/AuthContext';
import { Send as FiSend, Loader2 as FiLoader, User as FiUser } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

// Interface für ein Chat-Nachrichten-Dokument in Firestore
interface ChatMessage {
  id: string; // Dokument-ID von Firestore
  senderId: string;
  senderName: string;
  senderType: 'kunde' | 'anbieter';
  text: string;
  timestamp: Timestamp; // Firestore Timestamp Typ
}

interface UserProfile {
  name: string;
  avatar?: string;
  companyData?: {
    companyName: string;
    logoUrl?: string;
  };
}

// Interface für das Benutzerprofil aus Firestore (für senderType und senderName)
interface UserProfileData {
  firstName?: string;
  lastName?: string;
  companyName?: string;
  user_type?: 'kunde' | 'anbieter' | 'firma'; // Korrigierter Typ wie besprochen
}

interface ChatComponentProps {
  orderId: string;
  participants: {
    customerId: string;
    providerId: string;
  };
  orderStatus?: string | null; // NEU: Prop für den Auftragsstatus
}

// NEUE HILFSFUNKTION: Formatiert den Zeitstempel für eine bessere Lesbarkeit
const formatMessageTimestamp = (timestamp: any): string => {
  if (!timestamp) return '';

  let date: Date;

  // Handle different timestamp formats
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    // Firestore Timestamp object
    date = timestamp.toDate();
  } else if (timestamp.seconds) {
    // Firestore Timestamp-like object with seconds
    date = new Date(timestamp.seconds * 1000);
  } else if (timestamp instanceof Date) {
    // Regular Date object
    date = timestamp;
  } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    // String or number timestamp
    date = new Date(timestamp);
  } else {
    return '';
  }

  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

  if (date >= startOfToday) {
    // Heute: Nur Uhrzeit
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }
  if (date >= startOfYesterday) {
    // Gestern: "Gestern, HH:mm"
    return `Gestern, ${date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
  }
  // Älter: "TT.MM.JJJJ"
  return date.toLocaleDateString('de-DE');
};

// NEU: Hilfsfunktion zum Formatieren des Status
const formatStatus = (status: string | null | undefined): string => {
  if (!status) return 'Unbekannt';
  // Ersetzt Unterstriche durch Leerzeichen und macht den ersten Buchstaben jedes Wortes groß
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const ChatComponent: React.FC<ChatComponentProps> = ({ orderId, participants, orderStatus }) => {
  const authContext = useAuth();
  const currentUser = authContext?.user || null;
  const firebaseUser = authContext?.firebaseUser || null;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userProfiles, setUserProfiles] = useState<{[key: string]: UserProfile}>({});
  const [newMessageText, setNewMessageText] = useState('');
  const [chatLoading, setChatLoading] = useState(true);
  const [userProfileLoading, setUserProfileLoading] = useState(true);
  const [chatError, setChatError] = useState<string | null>(null);
  const [loggedInUserProfile, setLoggedInUserProfile] = useState<UserProfileData | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false); // Neuer State für Sende-Button

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Hilfsfunktion zum Laden von Benutzerprofilen für Chat-Nachrichten
  const loadUserProfile = async (userId: string): Promise<UserProfile | null> => {
    if (userProfiles[userId]) return userProfiles[userId];

    try {
      // Versuche zuerst in companies collection
      const companyDoc = await getDoc(doc(db, 'companies', userId));
      if (companyDoc.exists()) {
        const data = companyDoc.data();
        console.log('Company data for userId', userId, ':', data);
        const profile: UserProfile = {
          name: data.companyName || data.name || 'Unbekanntes Unternehmen',
          avatar: data.profilePictureFirebaseUrl || data.profilePictureURL || data.logoUrl || data.avatarUrl,
          companyData: {
            companyName: data.companyName || data.name || 'Unbekanntes Unternehmen',
            logoUrl: data.profilePictureFirebaseUrl || data.profilePictureURL || data.logoUrl
          }
        };
        console.log('Loaded company profile:', profile);
        setUserProfiles(prev => ({ ...prev, [userId]: profile }));
        return profile;
      }

      // Fallback: Versuche in users collection
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const profile: UserProfile = {
          name: data.name || data.firstName || 'Unbekannter Nutzer',
          avatar: data.profilePictureFirebaseUrl || data.profilePictureURL || data.avatarUrl || data.profilePicture
        };
        setUserProfiles(prev => ({ ...prev, [userId]: profile }));
        return profile;
      }
    } catch (error) {
      console.error('Fehler beim Laden des Benutzerprofils:', error);
    }

    return null;
  };

  // Lade Profile für alle Nachrichten
  useEffect(() => {
    const loadProfilesForMessages = async () => {
      const uniqueSenderIds = [...new Set(messages.map(msg => msg.senderId))];
      await Promise.all(uniqueSenderIds.map(senderId => loadUserProfile(senderId)));
    };

    if (messages.length > 0) {
      loadProfilesForMessages();
    }
  }, [messages]);

  // Auto-Scroll to bottom when new messages arrive (re-enabled for realtime updates)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Laden des Benutzerprofils, sobald currentUser verfügbar ist
  useEffect(() => {
    if (currentUser) {
      const fetchUserProfile = async () => {
        setUserProfileLoading(true);
        setChatError(null);
        try {
          // Try to get user profile from available currentUser properties
          if (currentUser.firstName || currentUser.lastName) {
            setLoggedInUserProfile({
              firstName: currentUser.firstName,
              lastName: currentUser.lastName,
              user_type: 'kunde', // Default fallback
            });
            setUserProfileLoading(false);
            return;
          }

          // Fallback: Direct Firebase read (with error handling)
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setLoggedInUserProfile(userDocSnap.data() as UserProfileData);
          } else {
            // Try companies collection if user not found
            const companyDocRef = doc(db, 'companies', currentUser.uid);
            const companyDocSnap = await getDoc(companyDocRef);
            if (companyDocSnap.exists()) {
              const companyData = companyDocSnap.data();
              setLoggedInUserProfile({
                companyName: companyData.companyName || companyData.name,
                user_type: 'firma',
              });
            } else {
              // Set basic profile if nothing found
              setLoggedInUserProfile({
                firstName: 'Benutzer',
                user_type: 'kunde',
              });
            }
          }
        } catch (error) {
          // Set basic profile instead of showing error
          setLoggedInUserProfile({
            firstName: 'Benutzer',
            user_type: 'kunde',
          });
          // Don't set error - just use fallback profile
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

  // Load chat messages with realtime updates instead of polling
  useEffect(() => {
    if (!currentUser?.uid || !orderId) {
      return;
    }

    setChatLoading(true);
    setChatError(null);

    // Set up realtime listener for chat messages
    const messagesQuery = query(
      collection(db, 'auftraege', orderId, 'nachrichten'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      async querySnapshot => {
        try {
          const fetchedMessages: ChatMessage[] = querySnapshot.docs.map(doc => {
            const data = doc.data() as DocumentData;
            return {
              id: doc.id,
              senderId: data.senderId,
              senderName: data.senderName,
              senderType: data.senderType,
              text: data.text,
              timestamp: data.timestamp,
              senderAvatar: data.senderAvatar,
            };
          });

          // Lade Benutzerprofile für alle einzigartigen Sender
          const uniqueSenderIds = [...new Set(fetchedMessages.map(msg => msg.senderId))];
          await Promise.all(uniqueSenderIds.map(senderId => loadUserProfile(senderId)));

          setMessages(fetchedMessages);
          setChatLoading(false);
        } catch (error) {
          setChatError('Fehler beim Laden der Nachrichten');
          setChatLoading(false);
        }
      },
      error => {
        setChatError('Fehler beim Laden der Nachrichten');
        setChatLoading(false);
      }
    );

    // Cleanup function to unsubscribe from the listener
    return () => {
      unsubscribe();
    };
  }, [currentUser?.uid, orderId]);

  // Nachricht senden
  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    const messageToSend = newMessageText.trim();

    // Deaktiviere das Senden, wenn Text leer, Benutzer nicht angemeldet oder Profil noch lädt/fehlt
    if (
      !messageToSend ||
      !currentUser ||
      !orderId ||
      !loggedInUserProfile ||
      isSendingMessage ||
      !participants
    ) {
      return;
    }

    // --- EXTREM STRENGE VALIDIERUNG ---
    // Normalisierter Text für alle Prüfungen
    const normalizedText = messageToSend
      .toLowerCase()
      .replace(/\s+/g, ' ') // Mehrfache Leerzeichen zu einem
      .replace(/[^a-zA-Z0-9äöüÄÖÜß@.\-+()\/\s]/g, '') // Entferne Sonderzeichen außer wichtigen
      .trim();

    // EXTREM STRENGE E-MAIL BLOCKIERUNG
    const emailVariations = [
      // Standard E-Mail Formate
      /[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,}/gi,
      // Umschreibungen wie "at" und "dot"
      /[a-zA-Z0-9._-]+\s*(at|AT|\(at\)|\[at\])\s*[a-zA-Z0-9._-]+\s*(dot|DOT|\(dot\)|\[dot\])\s*[a-zA-Z]{2,}/gi,
      // Mit Leerzeichen getrennt
      /[a-zA-Z0-9._-]+\s+@\s+[a-zA-Z0-9._-]+\s+\.\s+[a-zA-Z]{2,}/gi,
      // Vertikale Striche oder andere Trenner
      /[a-zA-Z0-9._-]+\s*\|\s*@\s*\|\s*[a-zA-Z0-9._-]+/gi,
      // Ohne @ aber mit typischen E-Mail-Domains
      /[a-zA-Z0-9._-]+(gmail|yahoo|outlook|hotmail|web|gmx|t-online|freenet|aol|icloud)/gi,
    ];

    for (const pattern of emailVariations) {
      if (pattern.test(normalizedText)) {
        setChatError('E-Mail-Adressen sind nicht erlaubt');
        return;
      }
    }

    // EXTREM STRENGE TELEFONNUMMER BLOCKIERUNG
    // Entferne alle Nicht-Ziffern für Telefonnummer-Check
    const digitsOnly = messageToSend.replace(/\D/g, '');
    
    // Deutsche/Europäische Telefonnummern erkennen
    const phonePatterns = [
      // Mindestens 6 aufeinanderfolgende Ziffern
      /\d{6,}/,
      // Deutsche Vorwahlen
      /(\+49|0049|49|0)\s*[1-9]\d{8,}/gi,
      // Internationale Formate
      /(\+43|\+41|\+34|\+33|\+39|\+31|\+32|\+45|\+46|\+47|\+48)\s*\d{8,}/gi,
      // Mobilfunk-Präfixe
      /(015|016|017|018|019)\d{7,}/gi,
      // Formatierte Nummern mit Bindestrichen/Leerzeichen
      /\d{2,4}[\s\-\.\/]\d{2,4}[\s\-\.\/]\d{2,8}/gi,
      // Klammern um Vorwahl
      /\(\d{2,5}\)\s*\d{6,}/gi,
    ];

    if (digitsOnly.length >= 6) {
      setChatError('Telefonnummern sind nicht erlaubt');
      return;
    }

    for (const pattern of phonePatterns) {
      if (pattern.test(messageToSend)) {
        setChatError('Telefonnummern sind nicht erlaubt');
        return;
      }
    }

    // EXTREM STRENGE ADRESS-BLOCKIERUNG
    const addressPatterns = [
      // Deutsche Postleitzahlen (5 Ziffern)
      /\b\d{5}\b/gi,
      // Straßennamen mit typischen Endungen
      /[a-zA-ZäöüÄÖÜß]+(straße|strasse|str\.?|weg|platz|allee|gasse|ring|damm|ufer|berg|tal|feld|park|hof|markt)/gi,
      // Hausnummern-Muster (Wort + Zahl)
      /[a-zA-ZäöüÄÖÜß]+\s+\d+[a-zA-Z]?/gi,
      // Typische deutsche Städte (erweiterte Liste)
      /(berlin|hamburg|münchen|köln|frankfurt|stuttgart|düsseldorf|dortmund|essen|leipzig|bremen|dresden|hannover|nürnberg|duisburg|bochum|wuppertal|bielefeld|bonn|münster|karlsruhe|mannheim|augsburg|wiesbaden|gelsenkirchen|mönchengladbach|braunschweig|chemnitz|kiel|aachen|halle|magdeburg|freiburg|krefeld|lübeck|oberhausen|erfurt|mainz|rostock|kassel|hagen|hamm|saarbrücken|mülheim|potsdam|ludwigshafen|oldenburg|leverkusen|osnabrück|solingen|heidelberg|herne|neuss|darmstadt|paderborn|regensburg|ingolstadt|würzburg|fürth|wolfsburg|offenbach|ulm|heilbronn|pforzheim|göttingen|bottrop|trier|recklinghausen|reutlingen|bremerhaven|koblenz|bergisch|gladbach|jena|remscheid|erlangen|moers|siegen|hildesheim|salzgitter)/gi,
      // Österreichische/Schweizer Städte
      /(wien|graz|linz|salzburg|innsbruck|klagenfurt|villach|wels|dornbirn|steyr|zürich|genf|basel|bern|lausanne|winterthur|luzern|st\.?\s*gallen|lugano|biel|thun|köniz|la\s*chaux|schaffhausen|fribourg|vernier|chur|uster)/gi,
      // Vollständige Adressformate
      /[a-zA-ZäöüÄÖÜß]+\s+\d+[a-zA-Z]?\s*,?\s*\d{5}\s+[a-zA-ZäöüÄÖÜß]+/gi,
    ];

    for (const pattern of addressPatterns) {
      if (pattern.test(messageToSend)) {
        setChatError('Adressen sind nicht erlaubt');
        return;
      }
    }

    // URL und LINK BLOCKIERUNG
    const urlPatterns = [
      // Standard URLs
      /(https?:\/\/[^\s]+)/gi,
      // URLs ohne Protokoll
      /www\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
      // Domain-ähnliche Strukturen
      /[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/[^\s]*)?/gi,
      // Versteckte Links
      /[a-zA-Z0-9-]+\s*(punkt|dot|\(dot\))\s*[a-zA-Z]{2,}/gi,
    ];

    for (const pattern of urlPatterns) {
      if (pattern.test(messageToSend)) {
        setChatError('Links und URLs sind nicht erlaubt');
        return;
      }
    }

    // EXTERNE PLATTFORMEN UND KONTAKT-APPS
    const contactPlatforms = [
      /\b(whatsapp|telegram|skype|discord|snapchat|instagram|facebook|messenger|viber|signal|threema|wickr|kik|line)\b/gi,
      /\b(linkedin|xing|twitter|tiktok|youtube|twitch)\b/gi,
      /\b(zoom|teams|meet|facetime|hangouts)\b/gi,
      /\b(paypal|venmo|cashapp|revolut|wise|n26)\b/gi,
    ];

    for (const pattern of contactPlatforms) {
      if (pattern.test(messageToSend)) {
        setChatError('Externe Kontaktplattformen sind nicht erlaubt');
        return;
      }
    }

    // FINANZIELLE INFORMATIONEN
    const financialPatterns = [
      // IBAN-ähnliche Muster
      /\b[A-Z]{2}\d{2}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{2}\b/gi,
      // Kreditkarten-ähnliche Muster (4x4 Ziffern)
      /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/gi,
      // BIC/SWIFT Codes
      /\b[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?\b/gi,
      // Kontonummern
      /\b(konto|account|iban|bic|swift|routing)\b/gi,
    ];

    for (const pattern of financialPatterns) {
      if (pattern.test(messageToSend)) {
        setChatError('Finanzielle Informationen sind nicht erlaubt');
        return;
      }
    }
    // --- ENDE VALIDIERUNG ---

    setIsSendingMessage(true); // Sende-Vorgang starten
    setChatError(null); // Fehler zurücksetzen

    let senderName: string = loggedInUserProfile.firstName || 'Unbekannt';
    let senderType: 'kunde' | 'anbieter' = 'kunde';

    // Check if user is a company by presence of company name
    if (loggedInUserProfile.companyName) {
      senderType = 'anbieter';
      senderName = loggedInUserProfile.companyName || loggedInUserProfile.firstName || 'Anbieter';
    }

    // Ensure current user is in chatUsers array
    const chatUsers = [participants.customerId, participants.providerId];
    if (!chatUsers.includes(currentUser.uid)) {
      chatUsers.push(currentUser.uid);
    }

    const messagePayload = {
      senderId: currentUser.uid,
      senderName: senderName,
      senderType: senderType,
      text: messageToSend,
      timestamp: serverTimestamp(),
      chatUsers: chatUsers, // Hinzufügen, um die Sicherheitsregel zu erfüllen
    };

    const lastMessagePayload = {
      text: messageToSend,
      senderId: currentUser.uid,
      timestamp: serverTimestamp(),
      isRead: false, // Wichtig für die Benachrichtigung!
    };

    try {
      // 1. Nachricht zur Chat-History hinzufügen (wie bisher)
      const messagesRef = collection(db, 'auftraege', orderId, 'nachrichten');
      await addDoc(messagesRef, messagePayload);

      // 2. Top-Level Chat-Dokument für Benachrichtigungen aktualisieren
      const chatDocRef = doc(db, 'chats', orderId);
      // KORREKTUR: setDoc mit { merge: true } verwenden. Dies erstellt das Dokument, falls es nicht existiert,
      // oder aktualisiert es, ohne andere Felder (wie isLocked) zu überschreiben.
      await setDoc(
        chatDocRef,
        {
          users: [participants.customerId, participants.providerId], // Beide Teilnehmer
          lastMessage: lastMessagePayload,
          lastUpdated: serverTimestamp(),
        },
        { merge: true }
      );

      setNewMessageText(''); // Eingabefeld nach erfolgreichem Senden leeren
    } catch (error) {
      setChatError(
        `Fehler beim Senden der Nachricht: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      );
    } finally {
      setIsSendingMessage(false); // Sende-Vorgang beenden
    }
  };

  const overallLoading = chatLoading || userProfileLoading;

  if (overallLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <FiLoader className="animate-spin text-3xl text-[#14ad9f] mr-2" />
        {chatLoading ? 'Lade Chat...' : 'Lade Benutzerdaten...'}
      </div>
    );
  }

  // Zeige Fehler, wenn kein Benutzer angemeldet ist oder Profil nicht geladen werden konnte
  if (!currentUser || !loggedInUserProfile) {
    return (
      <div className="text-center p-4 text-gray-600">
        {chatError || 'Fehler beim Laden des Profils'}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        {/* Header mit Auftrags-ID und Status-Badge */}
        <div className="flex justify-between items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-800 truncate">Chat: {orderId}</h3>
          {/* Zeige den Status-Badge nur an, wenn ein Status übergeben wurde */}
          {orderStatus && (
            <Badge variant="outline" className="flex-shrink-0">
              {formatStatus(orderStatus)}
            </Badge>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-10">Keine Nachrichten vorhanden</div>
        ) : (
          messages.map(msg => {
            const userProfile = userProfiles[msg.senderId];
            const isOwnMessage = msg.senderId === currentUser.uid;
            
            console.log('Rendering message for userId:', msg.senderId, 'userProfile:', userProfile);
            
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3`}
              >
                {/* Profilbild - immer links */}
                <div className="flex-shrink-0">
                  {userProfile?.avatar ? (
                    <Image
                      src={userProfile.avatar}
                      alt={userProfile.name || msg.senderName}
                      width={40}
                      height={40}
                      className="rounded-full object-cover w-10 h-10"
                      onError={(e) => {
                        console.log('Image load error for:', userProfile.avatar);
                      }}
                    />
                  ) : (
                    <>
                      {console.log('No avatar found for user:', msg.senderId, 'userProfile:', userProfile)}
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <FiUser size={20} className="text-gray-600" />
                      </div>
                    </>
                  )}
                </div>

                {/* Nachrichteninhalt mit Name daneben */}
                <div className={`flex flex-col max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                  {/* Nachrichtenblase mit allem in einer Reihe */}
                  <div
                    className={`p-3 rounded-lg ${
                      isOwnMessage
                        ? 'bg-[#14ad9f] text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    {/* Name und Text in einer Reihe */}
                    <div className="flex items-start gap-2">
                      <span className={`text-xs font-semibold flex-shrink-0 ${isOwnMessage ? 'text-teal-100' : 'text-gray-600'}`}>
                        {userProfile?.name || msg.senderName}
                        <span className="ml-1 opacity-75">
                          ({msg.senderType === 'kunde' ? 'Kunde' : 'Anbieter'}):
                        </span>
                      </span>
                      <p className="text-sm break-words flex-1">{msg.text}</p>
                    </div>
                    
                    {/* Uhrzeit unten rechts */}
                    <p className={`text-right text-xs mt-1 opacity-75 ${
                      isOwnMessage ? 'text-white' : 'text-gray-600'
                    }`}>
                      {formatMessageTimestamp(msg.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 flex items-center">
        <textarea
          value={newMessageText}
          onChange={e => setNewMessageText(e.target.value)}
          placeholder="Nachricht eingeben..."
          className="flex-1 p-2 border border-gray-300 rounded-md resize-none mr-2 focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
          rows={1}
          onKeyPress={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage(e);
            }
          }}
        />

        <button
          type="submit"
          className="bg-[#14ad9f] text-white p-3 rounded-full hover:bg-[#129a8f] transition-colors flex items-center justify-center"
          disabled={!newMessageText.trim() || overallLoading || isSendingMessage}
        >
          {isSendingMessage ? <FiLoader className="animate-spin" /> : <FiSend size={20} />}
        </button>
      </form>
    </div>
  );
};

export default ChatComponent;
