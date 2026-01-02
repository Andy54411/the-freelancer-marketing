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
import { Send as FiSend, Loader2 as FiLoader, User as FiUser, AlertTriangle, Video } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TaskiloVideoService } from '@/services/TaskiloVideoService';
import Image from 'next/image';
import { validateSensitiveData, getSensitiveDataWarning } from '@/lib/sensitiveDataValidator';
import { toast } from 'sonner';

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
  const [userProfiles, setUserProfiles] = useState<{ [key: string]: UserProfile }>({});
  const [newMessageText, setNewMessageText] = useState('');
  const [chatLoading, setChatLoading] = useState(true);
  const [userProfileLoading, setUserProfileLoading] = useState(true);
  const [chatError, setChatError] = useState<string | null>(null);
  const [loggedInUserProfile, setLoggedInUserProfile] = useState<UserProfileData | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false); // Neuer State für Sende-Button
  const [validationError, setValidationError] = useState<string>(''); // Für Validierungsfehler
  const [isVideoRequestPending, setIsVideoRequestPending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const videoService = new TaskiloVideoService();

  // Hilfsfunktion zum Laden von Benutzerprofilen für Chat-Nachrichten
  const loadUserProfile = async (userId: string): Promise<UserProfile | null> => {
    if (userProfiles[userId]) return userProfiles[userId];

    try {
      // Versuche zuerst in companies collection
      const companyDoc = await getDoc(doc(db, 'companies', userId));
      if (companyDoc.exists()) {
        const data = companyDoc.data();

        const profile: UserProfile = {
          name: data.companyName || data.name || 'Unbekanntes Unternehmen',
          avatar:
            data.profilePictureFirebaseUrl ||
            data.profilePictureURL ||
            data.logoUrl ||
            data.avatarUrl,
          companyData: {
            companyName: data.companyName || data.name || 'Unbekanntes Unternehmen',
            logoUrl: data.profilePictureFirebaseUrl || data.profilePictureURL || data.logoUrl,
          },
        };

        setUserProfiles(prev => ({ ...prev, [userId]: profile }));
        return profile;
      }

      // Fallback: Versuche in users collection
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const profile: UserProfile = {
          name: data.name || data.firstName || 'Unbekannter Nutzer',
          avatar:
            data.profilePictureFirebaseUrl ||
            data.profilePictureURL ||
            data.avatarUrl ||
            data.profilePicture,
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

    // Finale Validierung vor dem Senden
    const validation = validateSensitiveData(messageToSend);
    if (!validation.isValid) {
      toast.error(getSensitiveDataWarning(validation.blockedType!), {
        duration: 5000,
        action: {
          label: 'Verstanden',
          onClick: () => {},
        },
      });
      return;
    }

    setIsSendingMessage(true); // Sende-Vorgang starten
    setChatError(null); // Fehler zurücksetzen
    setValidationError(''); // Validierungsfehler zurücksetzen

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

  // Video Call Request Functions
  const sendVideoCallRequest = async () => {
    if (!currentUser || isVideoRequestPending) return;

    setIsVideoRequestPending(true);

    try {
      // Send video call request
      await videoService.sendCallRequest({
        chatId: orderId,
        companyId: participants.providerId,
        requesterId: currentUser.uid,
        requesterName: loggedInUserProfile?.firstName || loggedInUserProfile?.companyName || 'User',
        message: 'Video-Call Anfrage',
      });

      // Send a chat message about the video call request
      const videoRequestMessage = '🎥 Einladung zum Taskilo Video-Call';
      setNewMessageText(videoRequestMessage);
      await sendMessage(new Event('submit') as FormEvent<HTMLFormElement>);
      setNewMessageText('');

    } catch (error) {
      setChatError(`Fehler beim Senden der Video-Call-Anfrage: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    } finally {
      setIsVideoRequestPending(false);
    }
  };

  const approveVideoCallRequest = async (requestId: string) => {
    if (!currentUser) return;

    try {
      await videoService.approveCallRequest(requestId, currentUser.uid);
      // Optional: Send confirmation message
      const approvalMessage = '✅ Video-Call wurde genehmigt';
      setNewMessageText(approvalMessage);
      await sendMessage(new Event('submit') as FormEvent<HTMLFormElement>);
      setNewMessageText('');
    } catch (error) {
      setChatError(`Fehler beim Genehmigen der Video-Call-Anfrage: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  };

  // Validiere Eingabe bei jeder Änderung
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewMessageText(value);

    // Lösche vorherige Validierungsfehler wenn Eingabe leer ist
    if (!value.trim()) {
      setValidationError('');
      return;
    }

    // Validiere auf sensible Daten
    const validation = validateSensitiveData(value);
    if (!validation.isValid) {
      setValidationError(getSensitiveDataWarning(validation.blockedType!));
    } else {
      setValidationError('');
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
            <Badge variant="outline" className="shrink-0">
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

            return (
              <div key={msg.id} className={`flex items-start gap-3`}>
                {/* Profilbild - immer links */}
                <div className="shrink-0">
                  {userProfile?.avatar ? (
                    <Image
                      src={userProfile.avatar}
                      alt={userProfile.name || msg.senderName}
                      width={40}
                      height={40}
                      className="rounded-full object-cover w-10 h-10"
                      onError={e => {}}
                    />
                  ) : (
                    <>
                      {null}
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <FiUser size={20} className="text-gray-600" />
                      </div>
                    </>
                  )}
                </div>

                {/* Nachrichteninhalt mit Name daneben */}
                <div
                  className={`flex flex-col max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}
                >
                  {/* Nachrichtenblase mit allem in einer Reihe */}
                  <div
                    className={`p-3 rounded-lg ${
                      isOwnMessage ? 'bg-[#14ad9f] text-white' : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    {/* Name und Text in einer Reihe */}
                    <div className="flex items-start gap-2">
                      <span
                        className={`text-xs font-semibold shrink-0 ${isOwnMessage ? 'text-teal-100' : 'text-gray-600'}`}
                      >
                        {userProfile?.name || msg.senderName}
                        <span className="ml-1 opacity-75">
                          ({msg.senderType === 'kunde' ? 'Kunde' : 'Anbieter'}):
                        </span>
                      </span>
                      
                      {/* Check for video call invite */}
                      {msg.text.includes('🎥 Einladung zum Taskilo Video-Call') ? (
                        <div className="flex-1">
                          <p className="text-sm font-semibold">🎥 Video-Call Einladung</p>
                          {!isOwnMessage && (
                            <button
                              onClick={() => approveVideoCallRequest(orderId)}
                              className="mt-2 px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded-md transition-colors"
                            >
                              ✅ Video-Call beitreten
                            </button>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm break-words flex-1">{msg.text}</p>
                      )}
                    </div>

                    {/* Uhrzeit unten rechts */}
                    <p
                      className={`text-right text-xs mt-1 opacity-75 ${
                        isOwnMessage ? 'text-white' : 'text-gray-600'
                      }`}
                    >
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
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
        {/* Validierungsfehler anzeigen */}
        {validationError && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">{validationError}</p>
          </div>
        )}

        <div className="flex items-center">
          <textarea
            value={newMessageText}
            onChange={handleMessageChange}
            placeholder="Nachricht eingeben..."
            className={`flex-1 p-2 border rounded-md resize-none mr-2 focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
              validationError
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300 focus:ring-[#14ad9f]'
            }`}
            rows={1}
            onKeyPress={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
          />

          <button
            type="button"
            onClick={sendVideoCallRequest}
            disabled={isVideoRequestPending}
            className="bg-blue-500 text-white p-3 rounded-full hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center mr-2"
            title="Video-Call Anfrage senden"
          >
            {isVideoRequestPending ? <FiLoader className="animate-spin" /> : <Video size={20} />}
          </button>

          <button
            type="submit"
            className="bg-[#14ad9f] text-white p-3 rounded-full hover:bg-[#129a8f] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            disabled={
              !newMessageText.trim() || overallLoading || isSendingMessage || !!validationError
            }
          >
            {isSendingMessage ? <FiLoader className="animate-spin" /> : <FiSend size={20} />}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatComponent;
