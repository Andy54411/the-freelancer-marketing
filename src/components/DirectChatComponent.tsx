'use client';

import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { db } from '@/firebase/clients';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  Timestamp,
  doc,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { Send as FiSend, Loader2 as FiLoader, User as FiUser } from 'lucide-react';
import Image from 'next/image';

interface DirectChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderType: 'company' | 'provider';
  text: string;
  timestamp: Timestamp;
  senderAvatar?: string;
}

interface UserProfile {
  name: string;
  avatar?: string;
  companyData?: {
    companyName: string;
    logoUrl?: string;
  };
}

interface DirectChatComponentProps {
  chatId: string;
  otherUserId: string;
  otherUserName: string;
}

export default function DirectChatComponent({
  chatId,
  otherUserId,
  otherUserName,
}: DirectChatComponentProps) {
  const { user: currentUser } = useAuth();
  const [messages, setMessages] = useState<DirectChatMessage[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, { name: string; avatar?: string | null }>>({});
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Clean chatId - entferne "direct_" prefix falls vorhanden
  const cleanChatId = chatId.startsWith('direct_') ? chatId.substring(7) : chatId;

  // Hilfsfunktion zum Laden von Benutzerprofilen
  const loadUserProfile = async (userId: string) => {
    if (userProfiles[userId]) return userProfiles[userId];

    try {
      // Versuche zuerst in companies collection
      const companyDoc = await getDoc(doc(db, 'companies', userId));
      if (companyDoc.exists()) {
        const data = companyDoc.data();
        const profile: UserProfile = {
          name: data.companyName || data.name || 'Unbekanntes Unternehmen',
          avatar: data.profilePictureFirebaseUrl || data.profilePictureURL || data.logoUrl || data.avatarUrl,
          companyData: {
            companyName: data.companyName || data.name || 'Unbekanntes Unternehmen',
            logoUrl: data.profilePictureFirebaseUrl || data.profilePictureURL || data.logoUrl
          }
        };
        setUserProfiles(prev => ({ ...prev, [userId]: profile }));
        return profile;
      }            // Fallback: Versuche in users collection
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

      const fallbackProfile = { name: 'Unbekannter User', avatar: null };
      setUserProfiles(prev => ({ ...prev, [userId]: fallbackProfile }));
      return fallbackProfile;
    } catch (error) {
      const fallbackProfile = { name: 'Unbekannter User', avatar: null };
      setUserProfiles(prev => ({ ...prev, [userId]: fallbackProfile }));
      return fallbackProfile;
    }
  };

  useEffect(() => {
    if (!currentUser || !cleanChatId) return;

    const messagesRef = collection(db, 'directChats', cleanChatId, 'messages');
    const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(
      messagesQuery,
      async snapshot => {
        const messagesList: DirectChatMessage[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          messagesList.push({
            id: doc.id,
            senderId: data.senderId,
            senderName: data.senderName,
            senderType: data.senderType,
            text: data.text,
            timestamp: data.timestamp,
            senderAvatar: data.senderAvatar,
          });
        });

        // Lade Benutzerprofile für alle einzigartigen Sender
        const uniqueSenderIds = [...new Set(messagesList.map(msg => msg.senderId))];
        await Promise.all(uniqueSenderIds.map(senderId => loadUserProfile(senderId)));

        setMessages(messagesList);
        setLoading(false);
      },
      error => {

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser, cleanChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !currentUser) return;

    setSending(true);
    try {
      const messagesRef = collection(db, 'directChats', cleanChatId, 'messages');
      await addDoc(messagesRef, {
        senderId: currentUser.uid,
        senderName:
          `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'Unbekannt',
        senderType: 'company', // TODO: Bestimme dynamisch basierend auf User-Typ
        text: newMessage.trim(),
        timestamp: serverTimestamp(),
      });

      // Update last message in chat document
      const chatRef = doc(db, 'directChats', cleanChatId);
      await setDoc(
        chatRef,
        {
          lastMessage: {
            text: newMessage.trim(),
            senderId: currentUser.uid,
            senderName:
              `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'Unbekannt',
            timestamp: serverTimestamp(),
          },
          lastUpdated: serverTimestamp(),
        },
        { merge: true }
      );

      setNewMessage('');
    } catch (error) {

    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center">
        <FiLoader className="animate-spin text-4xl text-[#14ad9f]" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header */}
      <div className="border-b border-gray-200 p-4 bg-white">
        <h2 className="text-lg font-semibold text-gray-800">{otherUserName}</h2>
        <p className="text-sm text-gray-500">Direkter Chat</p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length > 0 ? (
          messages.map(message => {
            const isOwnMessage = message.senderId === currentUser?.uid;
            const userProfile = userProfiles[message.senderId];
            
            return (
              <div
                key={message.id}
                className={`flex items-start gap-3`}
              >
                {/* Profilbild - immer links */}
                <div className="flex-shrink-0">
                  {userProfile?.avatar ? (
                    <Image
                      src={userProfile.avatar}
                      alt={userProfile.name || message.senderName}
                      width={40}
                      height={40}
                      className="rounded-full object-cover w-10 h-10"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <FiUser size={20} className="text-gray-600" />
                    </div>
                  )}
                </div>

                {/* Nachrichteninhalt */}
                <div className={`flex flex-col max-w-xs lg:max-w-md ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                  {/* Nachrichtenblase mit allem in einer Reihe */}
                  <div
                    className={`px-4 py-2 rounded-lg ${
                      isOwnMessage
                        ? 'bg-[#14ad9f] text-white'
                        : 'bg-white text-gray-800 border border-gray-200'
                    }`}
                  >
                    {/* Name und Text in einer Reihe */}
                    <div className="flex items-start gap-2">
                      <span className={`text-xs font-semibold flex-shrink-0 ${isOwnMessage ? 'text-teal-100' : 'text-gray-600'}`}>
                        {userProfile?.name || message.senderName}:
                      </span>
                      <div className="text-sm flex-1">{message.text}</div>
                    </div>
                    
                    {/* Uhrzeit unten rechts */}
                    <div
                      className={`text-xs text-right mt-1 ${isOwnMessage ? 'text-teal-100' : 'text-gray-500'}`}
                    >
                      {message.timestamp?.toDate().toLocaleTimeString('de-DE', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex justify-center items-center h-full text-gray-500">
            <div className="text-center">
              <p className="text-lg">Noch keine Nachrichten</p>
              <p className="text-sm">Starten Sie die Unterhaltung!</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={sendMessage} className="border-t border-gray-200 p-4 bg-white flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          placeholder="Nachricht eingeben..."
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-[#14ad9f] focus:ring-1 focus:ring-[#14ad9f]"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || sending}
          className="bg-[#14ad9f] text-white px-4 py-2 rounded-lg hover:bg-[#0d8a7a] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {sending ? <FiLoader className="animate-spin" size={16} /> : <FiSend size={16} />}
          Senden
        </button>
      </form>
    </div>
  );
}
