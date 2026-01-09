/**
 * MessageBubble Component
 * 
 * Zeigt einzelne Nachrichten im Chat an (eingehend/ausgehend)
 */
'use client';

import React from 'react';
import { Check, CheckCheck, Clock, AlertCircle, Reply, MoreVertical, Copy, Trash2, Forward } from 'lucide-react';
import { MessageMedia } from './MessageMedia';

export interface WhatsAppMessage {
  id: string;
  wamid?: string;
  from: string;
  to?: string;
  direction: 'incoming' | 'outgoing';
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'location' | 'contacts' | 'interactive' | 'template' | 'reaction';
  content: {
    text?: string;
    caption?: string;
    mediaUrl?: string;
    mimeType?: string;
    filename?: string;
    latitude?: number;
    longitude?: number;
    locationName?: string;
    address?: string;
    contacts?: Array<{
      name: { formatted_name: string };
      phones?: Array<{ phone: string }>;
    }>;
    interactive?: {
      type: 'button_reply' | 'list_reply';
      button_reply?: { id: string; title: string };
      list_reply?: { id: string; title: string; description?: string };
    };
    reaction?: {
      emoji: string;
      message_id: string;
    };
    template?: {
      name: string;
      language: string;
    };
  };
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: Date | string;
  replyTo?: {
    id: string;
    text?: string;
    from?: string;
  };
  reactions?: Array<{
    emoji: string;
    from: string;
  }>;
}

interface MessageBubbleProps {
  message: WhatsAppMessage;
  showAvatar?: boolean;
  isGrouped?: boolean;
  onReply?: (message: WhatsAppMessage) => void;
  onReact?: (message: WhatsAppMessage, emoji: string) => void;
  onCopy?: (text: string) => void;
  onDelete?: (message: WhatsAppMessage) => void;
  onForward?: (message: WhatsAppMessage) => void;
}

export function MessageBubble({
  message,
  showAvatar: _showAvatar = true,
  isGrouped = false,
  onReply,
  onReact,
  onCopy,
  onDelete,
  onForward,
}: MessageBubbleProps) {
  const [showMenu, setShowMenu] = React.useState(false);
  const [showReactions, setShowReactions] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const isOutgoing = message.direction === 'outgoing';
  const timestamp = typeof message.timestamp === 'string' 
    ? new Date(message.timestamp) 
    : message.timestamp;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusIcon = () => {
    switch (message.status) {
      case 'pending':
        return <Clock className="w-3 h-3 text-gray-400" />;
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      default:
        return null;
    }
  };

  const handleCopy = () => {
    if (message.content.text) {
      navigator.clipboard.writeText(message.content.text);
      onCopy?.(message.content.text);
    }
    setShowMenu(false);
  };

  const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  // Click outside handler
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
        setShowReactions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderContent = () => {
    switch (message.type) {
      case 'text':
        return (
          <p className="whitespace-pre-wrap break-words text-[15px]">
            {message.content.text}
          </p>
        );

      case 'image':
      case 'video':
      case 'audio':
      case 'document':
      case 'sticker':
        return (
          <MessageMedia
            type={message.type}
            url={message.content.mediaUrl}
            mimeType={message.content.mimeType}
            filename={message.content.filename}
            caption={message.content.caption}
          />
        );

      case 'location':
        return (
          <div className="space-y-2">
            <div className="w-48 h-32 bg-gray-200 rounded-lg overflow-hidden">
              <iframe
                src={`https://maps.google.com/maps?q=${message.content.latitude},${message.content.longitude}&z=15&output=embed`}
                width="100%"
                height="100%"
                frameBorder="0"
                title="Standort"
              />
            </div>
            {message.content.locationName && (
              <p className="font-medium text-sm">{message.content.locationName}</p>
            )}
            {message.content.address && (
              <p className="text-xs text-gray-500">{message.content.address}</p>
            )}
          </div>
        );

      case 'contacts':
        return (
          <div className="space-y-2">
            {message.content.contacts?.map((contact, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium">
                    {contact.name.formatted_name.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-sm">{contact.name.formatted_name}</p>
                  {contact.phones?.[0] && (
                    <p className="text-xs text-gray-500">{contact.phones[0].phone}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        );

      case 'interactive':
        const interactive = message.content.interactive;
        return (
          <div className="p-2 bg-gray-100 rounded-lg">
            <p className="text-sm">
              {interactive?.button_reply?.title || interactive?.list_reply?.title}
            </p>
            {interactive?.list_reply?.description && (
              <p className="text-xs text-gray-500">{interactive.list_reply.description}</p>
            )}
          </div>
        );

      case 'reaction':
        return (
          <span className="text-2xl">{message.content.reaction?.emoji}</span>
        );

      case 'template':
        return (
          <div className="p-2 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-xs text-blue-600 font-medium mb-1">Template-Nachricht</p>
            <p className="text-sm">{message.content.template?.name}</p>
          </div>
        );

      default:
        return <p className="text-gray-500 italic">Nicht unterstützter Nachrichtentyp</p>;
    }
  };

  return (
    <div
      className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} ${isGrouped ? 'mt-0.5' : 'mt-3'} group`}
    >
      <div className={`relative max-w-[85%] md:max-w-[65%]`} ref={menuRef}>
        {/* Reply Context */}
        {message.replyTo && (
          <div
            className={`flex items-center gap-1 text-xs text-gray-500 mb-1 ${
              isOutgoing ? 'justify-end' : 'justify-start'
            }`}
          >
            <Reply className="w-3 h-3" />
            <span className="truncate max-w-[200px]">
              {message.replyTo.text || 'Nachricht'}
            </span>
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={`relative px-3 py-2 rounded-2xl ${
            isOutgoing
              ? 'bg-[#dcf8c6] rounded-br-sm'
              : 'bg-white border border-gray-200 rounded-bl-sm'
          }`}
        >
          {renderContent()}

          {/* Timestamp & Status */}
          <div className={`flex items-center gap-1 mt-1 ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
            <span className="text-[11px] text-gray-500">
              {formatTime(timestamp)}
            </span>
            {isOutgoing && getStatusIcon()}
          </div>

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="absolute -bottom-3 left-2 flex items-center gap-0.5 bg-white rounded-full px-1.5 py-0.5 shadow-sm border border-gray-100">
              {message.reactions.slice(0, 3).map((reaction, idx) => (
                <span key={idx} className="text-sm">{reaction.emoji}</span>
              ))}
              {message.reactions.length > 3 && (
                <span className="text-xs text-gray-500">+{message.reactions.length - 3}</span>
              )}
            </div>
          )}
        </div>

        {/* Hover Actions */}
        <div
          className={`absolute top-0 ${
            isOutgoing ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'
          } opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2`}
        >
          <button
            onClick={() => setShowReactions(!showReactions)}
            className="p-1.5 rounded-full hover:bg-gray-100"
            title="Reagieren"
          >
            😊
          </button>
          <button
            onClick={() => onReply?.(message)}
            className="p-1.5 rounded-full hover:bg-gray-100"
            title="Antworten"
          >
            <Reply className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-full hover:bg-gray-100"
            title="Mehr"
          >
            <MoreVertical className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Reactions Picker */}
        {showReactions && (
          <div
            className={`absolute ${isOutgoing ? 'right-0' : 'left-0'} -top-10 bg-white rounded-full shadow-lg border border-gray-200 flex items-center gap-1 px-2 py-1 z-10`}
          >
            {quickReactions.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onReact?.(message, emoji);
                  setShowReactions(false);
                }}
                className="text-xl hover:scale-125 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Context Menu */}
        {showMenu && (
          <div
            className={`absolute ${isOutgoing ? 'right-0' : 'left-0'} top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[150px]`}
          >
            {message.content.text && (
              <button
                onClick={handleCopy}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Kopieren
              </button>
            )}
            <button
              onClick={() => {
                onReply?.(message);
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              <Reply className="w-4 h-4" />
              Antworten
            </button>
            <button
              onClick={() => {
                onForward?.(message);
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              <Forward className="w-4 h-4" />
              Weiterleiten
            </button>
            {isOutgoing && (
              <button
                onClick={() => {
                  onDelete?.(message);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-red-600"
              >
                <Trash2 className="w-4 h-4" />
                Löschen
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
