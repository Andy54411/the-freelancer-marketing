'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { useAuth } from '@/contexts/AuthContext';
import { Bell as FiBell, Mail as FiMail } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface Notification {
  id: string;
  message: string;
  link: string;
  createdAt: any;
  read: boolean;
}

export default function NotificationBell() {
  const router = useRouter();
  const { firebaseUser, user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!firebaseUser || (user?.role !== 'support' && user?.role !== 'master')) {
      return;
    }

    const notificationsRef = collection(db, 'notifications');
    const q = query(notificationsRef, where('read', '==', false), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const newNotifications = snapshot.docs.map(
          doc => ({ id: doc.id, ...doc.data() }) as Notification
        );
        setNotifications(newNotifications);
        setUnreadCount(snapshot.size);
      },
      error => {
        console.error('Fehler beim Abrufen von Benachrichtigungen:', error);
      }
    );

    return () => unsubscribe();
  }, [firebaseUser, user]);

  const handleNotificationClick = async (notification: Notification) => {
    const notifDocRef = doc(db, 'notifications', notification.id);
    await updateDoc(notifDocRef, { read: true });
    router.push(notification.link);
  };

  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp?.toDate) return '';
    const seconds = Math.floor((new Date().getTime() - timestamp.toDate().getTime()) / 1000);
    let interval = seconds / 3600;
    if (interval > 24) return `${Math.floor(interval / 24)}d ago`;
    if (interval > 1) return `${Math.floor(interval)}h ago`;
    interval = seconds / 60;
    if (interval > 1) return `${Math.floor(interval)}m ago`;
    return 'jetzt';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative rounded-full p-2 hover:bg-gray-200 dark:hover:bg-gray-700">
          <FiBell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0"
            >
              {unreadCount}
            </Badge>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Benachrichtigungen</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length > 0 ? (
          notifications.map(notif => (
            <DropdownMenuItem
              key={notif.id}
              onSelect={() => handleNotificationClick(notif)}
              className="cursor-pointer flex items-start gap-3"
            >
              <FiMail className="mt-1 h-4 w-4 text-gray-500 shrink-0" />
              <p className="text-sm font-medium whitespace-normal flex-1">
                {notif.message}{' '}
                <span className="text-xs text-gray-400 ml-1">{formatTimeAgo(notif.createdAt)}</span>
              </p>
            </DropdownMenuItem>
          ))
        ) : (
          <p className="p-4 text-sm text-center text-gray-500">Keine neuen Benachrichtigungen.</p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
