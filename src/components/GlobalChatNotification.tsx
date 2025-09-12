'use client';

import React from 'react';
import { useChatNotifications } from '@/hooks/useChatNotifications';
import ChatNotificationBell from './chat/ChatNotificationBell';

interface GlobalChatNotificationProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function GlobalChatNotification({
  className = '',
  size = 'md',
}: GlobalChatNotificationProps) {
  const { totalUnreadCount, notifications } = useChatNotifications();

  if (totalUnreadCount === 0) return null;

  const handleClick = () => {};

  return (
    <div className={`relative ${className}`}>
      <ChatNotificationBell
        unreadCount={totalUnreadCount}
        onClick={handleClick}
        size={size}
        className="cursor-pointer hover:scale-110 transition-transform"
      />

      {/* Optional: Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 pointer-events-none hover:opacity-100 transition-opacity">
        {totalUnreadCount} neue Chat-Nachricht{totalUnreadCount !== 1 ? 'en' : ''}
      </div>
    </div>
  );
}
