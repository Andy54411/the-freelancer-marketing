'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/firebase/clients';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';

interface ChatNotification {
  quoteId: string;
  unreadCount: number;
  lastMessage: {
    text: string;
    senderName: string;
    timestamp: Timestamp;
  } | null;
}

export function useChatNotifications() {
  const [notifications, setNotifications] = useState<ChatNotification[]>([]);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const { firebaseUser } = useAuth();

  // Verwende Refs statt Arrays um Listener-Akkumulation zu vermeiden
  const chatListenersRef = useRef<Map<string, () => void>>(new Map());
  const quotesListenersRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    if (!firebaseUser?.uid) {
      setNotifications([]);
      setTotalUnreadCount(0);
      return;
    }

    // Cleanup alte Listener BEVOR neue erstellt werden
    chatListenersRef.current.forEach(unsubscribe => unsubscribe());
    chatListenersRef.current.clear();
    quotesListenersRef.current.forEach(unsubscribe => unsubscribe());
    quotesListenersRef.current = [];

    const setupChatListener = (quoteId: string, userRole: 'customer' | 'provider') => {
      // Prüfe ob bereits ein Listener für diese Quote existiert
      if (chatListenersRef.current.has(quoteId)) {
        return; // Bereits registriert, nicht nochmal
      }

      const chatRef = collection(db, 'quotes', quoteId, 'chat');
      const chatQuery = query(
        chatRef,
        where('senderId', '!=', firebaseUser.uid), // Nur Nachrichten von anderen
        where('read', '==', false), // Nur ungelesene
        orderBy('senderId'), // Required for != queries
        orderBy('timestamp', 'desc')
      );

      const unsubscribeChat = onSnapshot(chatQuery, chatSnapshot => {
        const unreadMessages = chatSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            text: data.text || '',
            senderName: data.senderName || '',
            timestamp: data.timestamp,
          };
        });

        const unreadCount = unreadMessages.length;
        const lastMessage =
          unreadMessages.length > 0
            ? {
                text: unreadMessages[0].text || '',
                senderName: unreadMessages[0].senderName || '',
                timestamp: unreadMessages[0].timestamp,
              }
            : null;

        setNotifications(prev => {
          const updated = prev.filter(n => n.quoteId !== quoteId);
          if (unreadCount > 0) {
            updated.push({
              quoteId,
              unreadCount,
              lastMessage,
            });
          }
          return updated;
        });
      });

      // Speichere Listener in Map mit quoteId als Key
      chatListenersRef.current.set(quoteId, unsubscribeChat);
    };

    // Alle Quotes des Users finden (sowohl als Customer als auch als Provider)
    const quotesRef = collection(db, 'quotes');
    const customerQuery = query(quotesRef, where('customerUid', '==', firebaseUser.uid));
    const providerQuery = query(quotesRef, where('providerId', '==', firebaseUser.uid));

    // Customer Quotes überwachen
    const unsubscribeCustomer = onSnapshot(customerQuery, snapshot => {
      snapshot.docs.forEach(quoteDoc => {
        setupChatListener(quoteDoc.id, 'customer');
      });
    });

    // Provider Quotes überwachen
    const unsubscribeProvider = onSnapshot(providerQuery, snapshot => {
      snapshot.docs.forEach(quoteDoc => {
        setupChatListener(quoteDoc.id, 'provider');
      });
    });

    quotesListenersRef.current.push(unsubscribeCustomer, unsubscribeProvider);

    return () => {
      // Cleanup: Alle Chat-Listener
      chatListenersRef.current.forEach(unsubscribe => unsubscribe());
      chatListenersRef.current.clear();
      // Cleanup: Quotes-Listener
      quotesListenersRef.current.forEach(unsubscribe => unsubscribe());
      quotesListenersRef.current = [];
    };
  }, [firebaseUser?.uid]);

  // Gesamtanzahl berechnen
  useEffect(() => {
    const total = notifications.reduce((sum, notification) => sum + notification.unreadCount, 0);
    setTotalUnreadCount(total);
  }, [notifications]);

  return {
    notifications,
    totalUnreadCount,
    getUnreadCountForQuote: (quoteId: string) => {
      const notification = notifications.find(n => n.quoteId === quoteId);
      return notification?.unreadCount || 0;
    },
  };
}
