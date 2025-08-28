'use client';

import React from 'react';

interface ChatNotificationBellProps {
  unreadCount: number;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function ChatNotificationBell({
  unreadCount,
  onClick,
  size = 'md',
  className = '',
}: ChatNotificationBellProps) {
  if (unreadCount === 0) return null;

  const sizeClasses = {
    sm: 'w-4 h-4 text-xs',
    md: 'w-5 h-5 text-sm',
    lg: 'w-6 h-6 text-base',
  };

  const badgeSizeClasses = {
    sm: 'min-w-[16px] h-4 text-xs px-1',
    md: 'min-w-[18px] h-5 text-xs px-1.5',
    lg: 'min-w-[20px] h-6 text-sm px-2',
  };

  return (
    <div
      className={`relative cursor-pointer ${className}`}
      onClick={onClick}
      title={`${unreadCount} ungelesene Nachricht${unreadCount !== 1 ? 'en' : ''}`}
    >
      {/* Notification Bell */}
      <div className={`flex items-center justify-center ${sizeClasses[size]}`}>
        <div
          className={`
          ${sizeClasses[size]} 
          border-2 border-[#14ad9f] 
          bg-[#14ad9f] 
          rounded-full 
          flex items-center justify-center
          animate-pulse
        `}
        >
          <div className="w-2 h-2 bg-white rounded-full"></div>
        </div>
      </div>

      {/* Unread Count Badge */}
      <div
        className={`
        absolute -top-2 -right-2 
        ${badgeSizeClasses[size]}
        bg-red-500 
        text-white 
        rounded-full 
        font-bold 
        flex items-center justify-center
        shadow-lg
        animate-bounce
      `}
      >
        {unreadCount > 99 ? '99+' : unreadCount}
      </div>
    </div>
  );
}
