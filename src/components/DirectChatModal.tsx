'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle, User } from 'lucide-react';
import Image from 'next/image';
import { db } from '@/firebase/clients';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { ResponseTimeTracker } from '@/lib/responseTimeTracker';

interface DirectChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  providerId: string;
  providerName: string;
  companyId: string;
  companyName: string;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderType: 'company' | 'provider';
  text: string;
  timestamp: any;
}

interface UserProfile {
  name: string;
  avatar?: string;
  companyData?: {
    companyName: string;
    logoUrl?: string;
  };
}

export default function DirectChatModal({
  isOpen,
  onClose,
  providerId,
  providerName,
  companyId,
  companyName,
}: DirectChatModalProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [chatId, setChatId] = useState<string>('');
  const [userProfiles, setUserProfiles] = useState<{[key: string]: UserProfile}>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Generiere eine eindeutige Chat-ID basierend auf beiden Teilnehmern
  const generateChatId = (companyId: string, providerId: string) => {
    return [companyId, providerId].sort().join('_');
  };

  // Lade Benutzerprofil
  const loadUserProfile = async (userId: string): Promise<UserProfile | null> => {
    if (userProfiles[userId]) {
      return userProfiles[userId];
    }

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

  useEffect(() => {
    if (!isOpen || !companyId || !providerId) return;

    const chatId = generateChatId(companyId, providerId);
    setChatId(chatId);

    // Chat-Dokument erstellen falls es nicht existiert
    const initializeChat = async () => {
      const chatRef = doc(db, 'directChats', chatId);
      const chatDoc = await getDoc(chatRef);

      if (!chatDoc.exists()) {
        await setDoc(chatRef, {
          participants: [companyId, providerId],
          participantNames: {
            [companyId]: companyName,
            [providerId]: providerName,
          },
          companyId,
          providerId,
          companyName,
          providerName,
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
        });
      }
    };

    initializeChat();

    // Nachrichten in Echtzeit abhören
    const messagesRef = collection(db, 'directChats', chatId, 'messages');
    const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(messagesQuery, snapshot => {
      const messagesList: Message[] = [];
      snapshot.forEach(doc => {
        messagesList.push({
          id: doc.id,
          ...doc.data(),
        } as Message);
      });
      setMessages(messagesList);
    });

    return () => unsubscribe();
  }, [isOpen, companyId, providerId, companyName, providerName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !user) return;

    setSending(true);
    try {
      const messagesRef = collection(db, 'directChats', chatId, 'messages');
      const messageDoc = await addDoc(messagesRef, {
        senderId: user.uid,
        senderName: companyName,
        senderType: 'company',
        text: newMessage.trim(),
        timestamp: serverTimestamp(),
      });

      // Start Response Time Tracking für Provider
      // Hole Provider Garantie-Stunden (Standard: 24h)
      let guaranteeHours = 24;
      try {
        // Verwende users Collection als Hauptcollection
        const userDoc = await getDoc(doc(db, 'users', providerId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          guaranteeHours = userData?.responseTimeGuaranteeHours || 24;
        }
      } catch (error) {

      }

      // Starte Response Time Tracking
      await ResponseTimeTracker.startTracking(providerId, chatId, messageDoc.id, guaranteeHours);

      // Update last message in chat document
      const chatRef = doc(db, 'directChats', chatId);
      await setDoc(
        chatRef,
        {
          lastMessage: {
            text: newMessage.trim(),
            senderId: user.uid,
            senderName: companyName,
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md h-96 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#14ad9f] rounded-full flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Chat mit {providerName}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Direktnachricht</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Starten Sie die Unterhaltung mit {providerName}</p>
            </div>
          ) : (
            messages.map(message => {
              const isOwnMessage = message.senderId === user?.uid;
              const userProfile = userProfiles[message.senderId];
              
              return (
                <div
                  key={message.id}
                  className={`flex items-start gap-3 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
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
                        <User size={20} className="text-gray-600" />
                      </div>
                    )}
                  </div>

                  {/* Nachrichteninhalt */}
                  <div className={`flex flex-col max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`px-3 py-2 rounded-lg ${
                        isOwnMessage
                          ? 'bg-[#14ad9f] text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                      }`}
                    >
                      {/* Name und Text in einer Reihe */}
                      <div className="flex items-start gap-2">
                        <span className={`text-xs font-semibold flex-shrink-0 ${
                          isOwnMessage
                            ? 'text-teal-100'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {userProfile?.name || message.senderName}:
                        </span>
                        <p className="text-sm flex-1">{message.text}</p>
                      </div>
                      
                      {/* Uhrzeit unten rechts */}
                      <p
                        className={`text-xs text-right mt-1 ${
                          isOwnMessage
                            ? 'text-teal-100'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {message.timestamp?.toDate?.()?.toLocaleTimeString('de-DE', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <form onSubmit={sendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Nachricht eingeben..."
              className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="px-4 py-2 bg-[#14ad9f] hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
