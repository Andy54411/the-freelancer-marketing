/**
 * ConversationItem Component
 * 
 * Einzelne Konversation in der Chat-Liste
 */
'use client';

import React from 'react';
import { Check, CheckCheck, Clock, ImageIcon, FileText, Mic, MapPin, User, Star } from 'lucide-react';
import ChatAvatar from '@/components/whatsapp/ChatAvatar';

interface ConversationItemProps {
  conversation: {
    id: string;
    phone: string;
    name?: string;
    profilePicUrl?: string;
    lastMessage?: {
      text: string;
      timestamp: Date | string;
      direction: 'incoming' | 'outgoing';
      type?: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contacts';
      status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
    };
    unreadCount: number;
    tags?: string[];
    assignedTo?: string;
    isStarred?: boolean;
    isBlocked?: boolean;
  };
  isActive?: boolean;
  onClick: () => void;
  onStar?: () => void;
}

export function ConversationItem({ conversation, isActive, onClick, onStar }: ConversationItemProps) {
  const { phone, name, profilePicUrl, lastMessage, unreadCount, tags, isStarred, isBlocked } = conversation;

  const formatTime = (timestamp: Date | string) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Gestern';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('de-DE', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    }
  };

  const getMessageIcon = () => {
    if (!lastMessage?.type || lastMessage.type === 'text') return null;

    const icons: Record<string, React.ReactNode> = {
      image: <ImageIcon className="w-3 h-3" />,
      video: <ImageIcon className="w-3 h-3" />,
      audio: <Mic className="w-3 h-3" />,
      document: <FileText className="w-3 h-3" />,
      location: <MapPin className="w-3 h-3" />,
      contacts: <User className="w-3 h-3" />,
    };

    return icons[lastMessage.type] || null;
  };

  const getStatusIcon = () => {
    if (!lastMessage || lastMessage.direction !== 'outgoing') return null;

    switch (lastMessage.status) {
      case 'pending':
        return <Clock className="w-3 h-3 text-gray-400" />;
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      default:
        return null;
    }
  };

  const getMessagePreview = () => {
    if (!lastMessage) return 'Keine Nachrichten';

    if (lastMessage.type && lastMessage.type !== 'text') {
      const labels: Record<string, string> = {
        image: 'Bild',
        video: 'Video',
        audio: 'Sprachnachricht',
        document: 'Dokument',
        location: 'Standort',
        contacts: 'Kontakt',
      };
      return labels[lastMessage.type] || lastMessage.text;
    }

    return lastMessage.text || '';
  };

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
        isActive 
          ? 'bg-[#14ad9f]/10 border-l-4 border-[#14ad9f]' 
          : 'hover:bg-gray-50 border-l-4 border-transparent'
      } ${isBlocked ? 'opacity-50' : ''}`}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        {profilePicUrl ? (
          <div className="w-10 h-10 rounded-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={profilePicUrl} alt={name || phone} className="w-full h-full object-cover" />
          </div>
        ) : (
          <ChatAvatar 
            name={name || phone} 
            size="md"
          />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#14ad9f] text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`font-medium truncate ${unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
              {name || phone}
            </span>
            {isStarred && (
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 shrink-0" />
            )}
          </div>
          {lastMessage && (
            <span className={`text-xs shrink-0 ${unreadCount > 0 ? 'text-[#14ad9f] font-medium' : 'text-gray-400'}`}>
              {formatTime(lastMessage.timestamp)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 mt-0.5">
          {getStatusIcon()}
          {getMessageIcon()}
          <p className={`text-sm truncate flex-1 ${
            unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'
          }`}>
            {getMessagePreview()}
          </p>
        </div>

        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="flex items-center gap-1 mt-1.5">
            {tags.slice(0, 3).map(tag => (
              <span 
                key={tag} 
                className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded"
              >
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="text-[10px] text-gray-400">+{tags.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {/* Star Button */}
      {onStar && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStar();
          }}
          className="p-1.5 hover:bg-gray-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Star className={`w-4 h-4 ${isStarred ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`} />
        </button>
      )}
    </div>
  );
}
